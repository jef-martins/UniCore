import { Component, ElementRef, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

interface ImportResult {
  linha: number;
  materia?: string;
  courseId?: string;
  professor?: string;
  status: 'SUCCESS' | 'COURSE_NOT_FOUND' | 'AMBIGUOUS_COURSE' | 'ALREADY_EXISTS' | 'ERROR' | 'IGNORED' | 'VALIDATION_ERROR';
  mensagem: string;
}

interface ImportResponse {
  total: number;
  sucesso: number;
  ignorados: number;
  erros: number;
  resultados: ImportResult[];
}

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="admin-page">
      <header class="page-header">
        <p class="hero-eyebrow">Administrador / Master</p>
        <h1 class="page-title">Administração do Sistema</h1>
        <p class="page-description">Gerencie configurações globais e integrações.</p>
      </header>

      <div class="card card-outlined admin-section">
        <div class="section-header">
          <h2>Google Classroom - Importação em Lote</h2>
          <p>Associe professores a matérias enviando uma planilha Excel (.xlsx).</p>
        </div>

        <form (submit)="uploadFile($event)" class="import-form">
          <div class="file-upload-container">
            <label for="file-upload" class="file-label">
              <span>Selecione a planilha (.xlsx)</span>
              <input 
                id="file-upload" 
                type="file" 
                accept=".xlsx" 
                (change)="onFileSelected($event)" 
                #fileInput 
                [disabled]="isUploading"
              />
            </label>
            <div class="file-name" *ngIf="selectedFile">
              Arquivo selecionado: <strong>{{ selectedFile.name }}</strong>
            </div>
          </div>

          <button class="button button-primary" type="submit" [disabled]="!selectedFile || isUploading">
            {{ isUploading ? 'Processando...' : 'Iniciar Importação' }}
          </button>
        </form>

        <div *ngIf="errorMessage" class="error-banner">
          {{ errorMessage }}
        </div>

        <div *ngIf="importResponse" class="import-results">
          <div class="summary-cards">
            <div class="summary-card">
              <span class="value">{{ importResponse.total }}</span>
              <span class="label">Total</span>
            </div>
            <div class="summary-card success">
              <span class="value">{{ importResponse.sucesso }}</span>
              <span class="label">Sucesso</span>
            </div>
            <div class="summary-card warning">
              <span class="value">{{ importResponse.ignorados }}</span>
              <span class="label">Ignorados</span>
            </div>
            <div class="summary-card error">
              <span class="value">{{ importResponse.erros }}</span>
              <span class="label">Erros</span>
            </div>
          </div>

          <h3>Detalhes da Importação</h3>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Linha</th>
                  <th>Matéria</th>
                  <th>Professor</th>
                  <th>Status</th>
                  <th>Mensagem</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let res of importResponse.resultados" [ngClass]="res.status.toLowerCase()">
                  <td>{{ res.linha }}</td>
                  <td>{{ res.materia || '-' }}</td>
                  <td>{{ res.professor || '-' }}</td>
                  <td>
                    <span class="badge" [ngClass]="getBadgeClass(res.status)">{{ res.status }}</span>
                  </td>
                  <td>{{ res.mensagem }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .admin-page { padding: 2rem; }
    .page-header { margin-bottom: 2.5rem; }
    .page-title { font-size: 2.25rem; margin-bottom: 0.5rem; }
    .page-description { color: var(--text-color-secondary, #a1a1aa); }
    .admin-section { padding: 2rem; }
    .section-header { margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color, #3f3f46); padding-bottom: 1rem; }
    .section-header h2 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    
    .import-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      max-width: 500px;
      margin-bottom: 2rem;
    }
    .file-upload-container {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .file-label {
      display: inline-block;
      padding: 0.75rem 1rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px dashed var(--border-color, #52525b);
      border-radius: 8px;
      cursor: pointer;
      text-align: center;
      transition: all 0.2s;
    }
    .file-label:hover { background: rgba(255, 255, 255, 0.1); border-color: var(--primary-color, #3b82f6); }
    .file-label input { display: none; }
    .file-name { font-size: 0.9rem; color: var(--text-color-secondary, #a1a1aa); }
    
    .error-banner {
      padding: 1rem;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 8px;
      color: #fca5a5;
      margin-bottom: 2rem;
    }
    
    .import-results { margin-top: 3rem; }
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .summary-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-color, #3f3f46);
      border-radius: 8px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }
    .summary-card .value { font-size: 2rem; font-weight: 700; }
    .summary-card .label { font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-color-secondary, #a1a1aa); }
    
    .summary-card.success { border-color: rgba(16, 185, 129, 0.3); }
    .summary-card.success .value { color: #34d399; }
    .summary-card.warning { border-color: rgba(245, 158, 11, 0.3); }
    .summary-card.warning .value { color: #fbbf24; }
    .summary-card.error { border-color: rgba(239, 68, 68, 0.3); }
    .summary-card.error .value { color: #f87171; }
    
    .import-results h3 { font-size: 1.25rem; margin-bottom: 1rem; }
    .table-responsive { overflow-x: auto; }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }
    .data-table th, .data-table td {
      border: 1px solid var(--border-color, #3f3f46);
      padding: 0.75rem 1rem;
      text-align: left;
    }
    .data-table th { background: rgba(255, 255, 255, 0.05); font-weight: 600; }
    .data-table tbody tr:hover { background: rgba(255, 255, 255, 0.02); }
    
    .badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge.bg-success { background: rgba(16, 185, 129, 0.2); color: #6ee7b7; }
    .badge.bg-warning { background: rgba(245, 158, 11, 0.2); color: #fcd34d; }
    .badge.bg-danger { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }
    .badge.bg-secondary { background: rgba(255, 255, 255, 0.1); color: #e4e4e7; }
  `]
})
export class AdminPageComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  selectedFile: File | null = null;
  isUploading = false;
  importResponse: ImportResponse | null = null;
  errorMessage = '';

  constructor(private http: HttpClient) {}

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (!file.name.endsWith('.xlsx')) {
        this.errorMessage = 'Por favor, selecione um arquivo .xlsx válido.';
        this.selectedFile = null;
        this.fileInput.nativeElement.value = '';
        return;
      }
      this.selectedFile = file;
      this.errorMessage = '';
      this.importResponse = null;
    }
  }

  uploadFile(event: Event) {
    event.preventDefault();
    if (!this.selectedFile) return;

    this.isUploading = true;
    this.errorMessage = '';
    this.importResponse = null;

    const formData = new FormData();
    formData.append('arquivo', this.selectedFile);

    this.http.post<ImportResponse>('/api/classroom/importar-professores', formData)
      .pipe(finalize(() => { this.isUploading = false; }))
      .subscribe({
        next: (response) => {
          this.importResponse = response;
          // Limpa o input
          this.selectedFile = null;
          if (this.fileInput) {
            this.fileInput.nativeElement.value = '';
          }
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Ocorreu um erro ao processar o arquivo. Tente novamente.';
        }
      });
  }

  getBadgeClass(status: string): string {
    switch (status) {
      case 'SUCCESS': return 'bg-success';
      case 'ALREADY_EXISTS': 
      case 'IGNORED': return 'bg-warning';
      case 'COURSE_NOT_FOUND':
      case 'AMBIGUOUS_COURSE':
      case 'ERROR':
      case 'VALIDATION_ERROR': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }
}
