import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Response } from 'express'
import 'multer'
import { JwtAuthGuard, type AuthenticatedRequest } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { CreateTaskDto } from './dto/create-task.dto'
import { UpdateTaskDto } from './dto/update-task.dto'
import { CompleteTaskDto } from './dto/complete-task.dto'
import { TasksService } from './tasks.service'

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(@Req() request: AuthenticatedRequest, @Query('sector') sector?: string) {
    return this.tasksService.findAll(request.user, sector)
  }

  @Get('dashboard')
  @UseGuards(RolesGuard)
  @Roles('admin', 'master')
  getDashboardStats(@Req() request: AuthenticatedRequest) {
    return this.tasksService.getDashboardStats(request.user)
  }

  @Post()
  @UseInterceptors(FileInterceptor('attachment', { limits: { fileSize: 25 * 1024 * 1024 } }))
  create(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateTaskDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.tasksService.create(request.user.sub, body, file)
  }

  @Patch(':id/complete')
  @UseInterceptors(FileInterceptor('completionAttachment', { limits: { fileSize: 25 * 1024 * 1024 } }))
  complete(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: CompleteTaskDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.tasksService.complete(id, request.user, body.completionNotes, file)
  }

  @Patch(':id')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateTaskDto,
  ) {
    return this.tasksService.update(request.user, id, body)
  }

  @Get(':id/attachment/creation')
  async getCreationAttachment(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res() response: Response,
  ) {
    const { path, filename } = await this.tasksService.getAttachment(id, request.user, 'creation')
    return response.download(path, filename)
  }

  @Get(':id/attachment/completion')
  async getCompletionAttachment(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res() response: Response,
  ) {
    const { path, filename } = await this.tasksService.getAttachment(id, request.user, 'completion')
    return response.download(path, filename)
  }
}
