import { Module } from '@nestjs/common';
import { ClassroomController } from './classroom.controller';
import { ClassroomImportService } from './classroom-import.service';
import { GoogleClassroomService } from './classroom-google.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ClassroomController],
  providers: [ClassroomImportService, GoogleClassroomService],
})
export class ClassroomModule {}
