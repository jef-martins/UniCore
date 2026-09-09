import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module'
import { DatabaseModule } from '../database/database.module'
import { ClassroomController } from './classroom.controller'
import { ClassroomImportService } from './classroom-import.service'
import { GoogleClassroomService } from './classroom-google.service'
import { ClassroomRoomsService } from './classroom-rooms.service'

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [ClassroomController],
  providers: [ClassroomImportService, GoogleClassroomService, ClassroomRoomsService],
})
export class ClassroomModule {}
