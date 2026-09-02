import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, classroom_v1 } from 'googleapis';

@Injectable()
export class GoogleClassroomService {
  private readonly logger = new Logger(GoogleClassroomService.name);
  private classroom: classroom_v1.Classroom;

  constructor(private configService: ConfigService) {
    const clientEmail = this.configService.get<string>('GOOGLE_CLIENT_EMAIL');
    const privateKey = this.configService.get<string>('GOOGLE_PRIVATE_KEY')?.replace(/\\n/g, '\n');

    if (clientEmail && privateKey) {
      const auth = new google.auth.JWT({
        email: clientEmail,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/classroom.courses.readonly', 'https://www.googleapis.com/auth/classroom.rosters'],
      });
      this.classroom = google.classroom({ version: 'v1', auth });
    } else {
      this.logger.warn('Credenciais do Google (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY) não configuradas. A integração do Classroom funcionará com mock local ou falhará ao usar.');
      this.classroom = google.classroom({ version: 'v1' });
    }
  }

  async listCourses(): Promise<classroom_v1.Schema$Course[]> {
    try {
      const courses: classroom_v1.Schema$Course[] = [];
      let pageToken: string | undefined = undefined;

      do {
        const response: any = await this.classroom.courses.list({
          pageSize: 100,
          pageToken,
          courseStates: ['ACTIVE'],
        });
        
        if (response.data.courses) {
          courses.push(...response.data.courses);
        }
        pageToken = response.data.nextPageToken || undefined;
      } while (pageToken);

      return courses;
    } catch (error: any) {
      this.logger.error(`Erro ao buscar cursos: ${error.message}`);
      throw new InternalServerErrorException('Falha ao comunicar com o Google Classroom API');
    }
  }

  async addTeacher(courseId: string, teacherEmail: string): Promise<void> {
    try {
      await this.classroom.courses.teachers.create({
        courseId,
        requestBody: {
          userId: teacherEmail,
        },
      });
    } catch (error: any) {
      if (error.code === 409 || error.status === 409) {
        const customError: any = new Error('ALREADY_EXISTS');
        customError.code = 409;
        throw customError;
      }
      throw error;
    }
  }
}
