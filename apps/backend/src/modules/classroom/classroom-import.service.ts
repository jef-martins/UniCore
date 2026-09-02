import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { GoogleClassroomService } from './classroom-google.service';

export interface ImportResult {
  linha: number;
  materia?: string;
  courseId?: string;
  professor?: string;
  status: 'SUCCESS' | 'COURSE_NOT_FOUND' | 'AMBIGUOUS_COURSE' | 'ALREADY_EXISTS' | 'ERROR' | 'IGNORED' | 'VALIDATION_ERROR';
  mensagem: string;
}

export interface ImportResponse {
  total: number;
  sucesso: number;
  ignorados: number;
  erros: number;
  resultados: ImportResult[];
}

@Injectable()
export class ClassroomImportService {
  private readonly logger = new Logger(ClassroomImportService.name);

  constructor(private readonly googleService: GoogleClassroomService) {}

  private normalizeString(str: string): string {
    if (!str) return '';
    return str
      .trim()
      .toLowerCase()
      .replace(/\\s+/g, ' ')
      .normalize('NFD')
      .replace(/[\\u0300-\\u036f]/g, '');
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async executeWithRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        const isRateLimit = error.code === 429 || error.status === 429;
        const isServerError = (error.code >= 500 && error.code < 600) || (error.status >= 500 && error.status < 600);
        
        if ((isRateLimit || isServerError) && attempt < maxRetries) {
          const backoff = Math.pow(2, attempt - 1) * 1000;
          this.logger.warn(`Erro transiente (\${error.code || error.status}). Tentativa \${attempt}/\${maxRetries}. Aguardando \${backoff}ms...`);
          await this.delay(backoff);
          continue;
        }
        throw error;
      }
    }
    throw new Error('Max retries exceeded');
  }

  async processImport(buffer: Buffer): Promise<ImportResponse> {
    this.logger.log('Iniciando importação');
    
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer);
    } catch {
      throw new BadRequestException('O arquivo enviado não é um Excel (.xlsx) válido.');
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('A planilha está vazia.');
    }

    const rows: any[] = [];
    let headers: string[] = [];
    
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        headers = row.values as string[];
        headers = headers.map(h => h ? h.toString().trim().toLowerCase() : '');
        return;
      }
      
      const rowData: Record<string, string> = {};
      let hasData = false;
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber];
        if (header) {
          const val = cell.value ? cell.value.toString().trim() : '';
          rowData[header] = val;
          if (val) hasData = true;
        }
      });
      
      if (hasData) {
        rows.push({ rowNumber, data: rowData });
      }
    });

    this.logger.log(`\${rows.length} linhas encontradas`);

    if (!headers.includes('materia') || !headers.includes('professor')) {
      throw new BadRequestException('As colunas obrigatórias "materia" e "professor" não foram encontradas.');
    }

    const resultados: ImportResult[] = [];
    let sucesso = 0;
    let ignorados = 0;
    let erros = 0;

    const validRows: Array<{ rowNum: number; materia: string; courseId: string; professor: string }> = [];
    const processedKeys = new Set<string>();

    for (const item of rows) {
      const rowNum = item.rowNumber;
      const data = item.data;
      const materia = data['materia'] || '';
      const professorRaw = data['professor'] || '';
      let courseId = data['courseid'] || data['courseId'] || '';
      
      if (!materia && !courseId) {
        resultados.push({ linha: rowNum, materia, professor: professorRaw, status: 'VALIDATION_ERROR', mensagem: 'Matéria ou courseId é obrigatório' });
        erros++;
        continue;
      }

      if (!professorRaw) {
        resultados.push({ linha: rowNum, materia, courseId, professor: professorRaw, status: 'VALIDATION_ERROR', mensagem: 'Professor é obrigatório' });
        erros++;
        continue;
      }

      const professor = professorRaw.toLowerCase();
      const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
      if (!emailRegex.test(professor)) {
        resultados.push({ linha: rowNum, materia, courseId, professor, status: 'VALIDATION_ERROR', mensagem: 'Formato de e-mail inválido' });
        erros++;
        continue;
      }

      const dedupKey = courseId ? `\${courseId}-\${professor}` : `\${this.normalizeString(materia)}-\${professor}`;
      if (processedKeys.has(dedupKey)) {
        resultados.push({ linha: rowNum, materia, courseId, professor, status: 'IGNORED', mensagem: 'Associação duplicada no arquivo' });
        ignorados++;
        continue;
      }
      processedKeys.add(dedupKey);

      validRows.push({ rowNum, materia, courseId, professor });
    }

    this.logger.log(`\${validRows.length} linhas válidas`);

    if (validRows.length > 0) {
      this.logger.log('Buscando cursos do Classroom');
      const courses = await this.googleService.listCourses();
      this.logger.log(`\${courses.length} cursos encontrados`);

      const courseMap = new Map<string, any[]>();
      for (const c of courses) {
        const norm = this.normalizeString(c.name || '');
        if (!courseMap.has(norm)) {
          courseMap.set(norm, []);
        }
        courseMap.get(norm)!.push(c);
      }

      const CONCURRENCY_LIMIT = 5;
      let currentIndex = 0;

      const worker = async () => {
        while (currentIndex < validRows.length) {
          const index = currentIndex++;
          const row = validRows[index];
          this.logger.log(`Processando \${index + 1}/\${validRows.length}`);
          
          let targetCourseId = row.courseId;
          
          if (!targetCourseId) {
            const normMateria = this.normalizeString(row.materia);
            const matches = courseMap.get(normMateria);
            
            if (!matches || matches.length === 0) {
              resultados.push({ linha: row.rowNum, materia: row.materia, professor: row.professor, status: 'COURSE_NOT_FOUND', mensagem: 'Curso não encontrado no Google Classroom' });
              erros++;
              continue;
            } else if (matches.length > 1) {
              resultados.push({ linha: row.rowNum, materia: row.materia, professor: row.professor, status: 'AMBIGUOUS_COURSE', mensagem: 'Múltiplos cursos encontrados com o mesmo nome' });
              erros++;
              continue;
            } else {
              targetCourseId = matches[0].id;
            }
          }

          try {
            await this.executeWithRetry(() => this.googleService.addTeacher(targetCourseId, row.professor));
            resultados.push({ linha: row.rowNum, materia: row.materia, courseId: targetCourseId, professor: row.professor, status: 'SUCCESS', mensagem: 'Professor adicionado com sucesso' });
            sucesso++;
          } catch (error: any) {
            if (error.code === 409 || error.status === 409 || error.message === 'ALREADY_EXISTS') {
              resultados.push({ linha: row.rowNum, materia: row.materia, courseId: targetCourseId, professor: row.professor, status: 'ALREADY_EXISTS', mensagem: 'Professor já está cadastrado no curso' });
              ignorados++;
            } else {
              this.logger.error(`Erro ao adicionar professor na linha \${row.rowNum}: \${error.message}`);
              resultados.push({ linha: row.rowNum, materia: row.materia, courseId: targetCourseId, professor: row.professor, status: 'ERROR', mensagem: 'Erro na integração com Google Classroom' });
              erros++;
            }
          }
        }
      };

      const workers = [];
      for (let i = 0; i < Math.min(CONCURRENCY_LIMIT, validRows.length); i++) {
        workers.push(worker());
      }
      await Promise.all(workers);
    }

    this.logger.log('Importação finalizada');

    return {
      total: rows.length,
      sucesso,
      ignorados,
      erros,
      resultados: resultados.sort((a, b) => a.linha - b.linha),
    };
  }
}
