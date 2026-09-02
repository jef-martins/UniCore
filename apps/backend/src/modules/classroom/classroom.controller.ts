import { Controller, Post, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ClassroomImportService } from './classroom-import.service';
import { Express } from 'express';
import 'multer';

@Controller('classroom')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassroomController {
  constructor(private readonly importService: ClassroomImportService) {}

  @Post('importar-professores')
  @Roles('admin', 'master')
  @UseInterceptors(FileInterceptor('arquivo'))
  async importTeachers(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Arquivo não enviado');
    }

    if (!file.originalname.endsWith('.xlsx') && file.mimetype !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      throw new BadRequestException('Formato inválido. Envie um arquivo .xlsx');
    }

    return this.importService.processImport(file.buffer);
  }
}
