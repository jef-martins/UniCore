import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard, type AuthenticatedRequest } from '../auth/jwt-auth.guard'
import { CreateTaskDto } from './dto/create-task.dto'
import { UpdateTaskStatusDto } from './dto/update-task-status.dto'
import { TasksService } from './tasks.service'

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.tasksService.findAll(request.user.sub)
  }

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() body: CreateTaskDto) {
    return this.tasksService.create(request.user.sub, body)
  }

  @Patch(':id/status')
  updateStatus(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateTaskStatusDto,
  ) {
    return this.tasksService.updateStatus(request.user.sub, id, body.completed)
  }
}
