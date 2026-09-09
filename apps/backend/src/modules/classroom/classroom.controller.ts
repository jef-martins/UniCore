import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Express } from 'express'
import 'multer'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { ClassroomImportService } from './classroom-import.service'
import { GoogleClassroomService } from './classroom-google.service'
import { ClassroomRoomsService } from './classroom-rooms.service'
import { CreateClassroomRoomDto } from './dto/create-classroom-room.dto'
import { SyncClassroomMembersDto } from './dto/sync-classroom-members.dto'

@Controller('classroom')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'master')
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
  listRooms(@Query('semester') semester?: string) {
    return this.roomsService.list(semester?.trim() || undefined)
  }

  @Get('courses')
  async listGoogleCourses() {
    const courses = await this.googleService.listCourses()
    return courses.map((course) => ({ id: course.id, name: course.name, alternateLink: course.alternateLink }))
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
