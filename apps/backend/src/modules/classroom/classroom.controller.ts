import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Express } from 'express'
import 'multer'
import { JwtAuthGuard, type AuthenticatedRequest } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { ClassroomImportService } from './classroom-import.service'
import { GoogleClassroomService } from './classroom-google.service'
import { ClassroomRoomsService } from './classroom-rooms.service'
import { CreateClassroomRoomDto } from './dto/create-classroom-room.dto'
import { SyncClassroomMembersDto } from './dto/sync-classroom-members.dto'

@Controller('classroom')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'master', 'coordenacao')
export class ClassroomController {
  constructor(
    private readonly importService: ClassroomImportService,
    private readonly roomsService: ClassroomRoomsService,
    private readonly googleService: GoogleClassroomService,
  ) {}

  @Get('status')
  status() {
    return this.googleService.getStatus()
  }

  @Get('rooms')
  listRooms(
    @Req() req: AuthenticatedRequest,
    @Query('semester') semester?: string,
    @Query('coordinationOnly') coordinationOnly?: string,
    @Query('coordinatorEmail') coordinatorEmail?: string,
    @Query('coordinatorUserId') coordinatorUserId?: string,
  ) {
    const isCoordination = coordinationOnly === 'true' || req.user.role === 'coordenacao'
    return this.roomsService.list(
      semester?.trim() || undefined,
      req.user,
      isCoordination,
      coordinatorEmail?.trim(),
      coordinatorUserId?.trim(),
    )
  }

  @Get('courses')
  async listGoogleCourses(
    @Req() req: AuthenticatedRequest,
    @Query('coordinationOnly') coordinationOnly?: string,
    @Query('coordinatorEmail') coordinatorEmail?: string,
    @Query('coordinatorUserId') coordinatorUserId?: string,
  ) {
    const isCoordination = coordinationOnly === 'true' || req.user.role === 'coordenacao'
    return this.googleService.listCoursesWithTeachers(
      req.user,
      isCoordination,
      coordinatorEmail?.trim(),
      coordinatorUserId?.trim(),
    )
  }

  @Get('courses/:id/students')
  async listGoogleCourseStudents(@Param('id') courseId: string) {
    return this.googleService.listCourseStudents(courseId)
  }

  @Post('rooms')
  createRoom(@Body() body: CreateClassroomRoomDto) {
    return this.roomsService.create(body)
  }

  @Post('rooms/:id/members')
  syncMembers(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: SyncClassroomMembersDto,
  ) {
    return this.roomsService.syncMembers(id, body)
  }

  @Post('importar-professores')
  @Roles('admin', 'master')
  @UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: 5 * 1024 * 1024 } }))
  importTeachers(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Arquivo não enviado.')
    const isXlsx = file.originalname.toLowerCase().endsWith('.xlsx')
    const expectedMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    if (!isXlsx || file.mimetype !== expectedMime) {
      throw new BadRequestException('Formato inválido. Envie um arquivo .xlsx válido.')
    }
    return this.importService.processImport(file.buffer)
  }
}
