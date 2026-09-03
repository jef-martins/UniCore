import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard, type AuthenticatedRequest } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { CreateTaskDto } from './dto/create-task.dto'
import { UpdateTaskDto } from './dto/update-task.dto'
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
  create(@Req() request: AuthenticatedRequest, @Body() body: CreateTaskDto) {
    return this.tasksService.create(request.user.sub, body)
  }

  @Patch(':id')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateTaskDto,
  ) {
    return this.tasksService.update(request.user.sub, id, body)
  }
}
