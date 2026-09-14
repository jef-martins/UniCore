import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard, type AuthenticatedRequest } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { UpdateCourseSettingDto } from './dto/update-course-setting.dto'
import { UnimestreService } from './unimestre.service'

@Controller('unimestre')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'master', 'coordenacao')
export class UnimestreController {
  constructor(private readonly unimestreService: UnimestreService) {}

  @Get('status')
  status() {
    return this.unimestreService.status()
  }

  @Get('courses')
  courses(@Req() req: AuthenticatedRequest, @Query('semester') semester?: string) {
    return this.unimestreService.courses(semester?.trim(), req.user)
  }

  @Get('classes')
  classes(
    @Req() req: AuthenticatedRequest,
    @Query('semester') semester?: string,
    @Query('course') course?: string,
  ) {
    return this.unimestreService.classes(
      this.requireQuery(semester, 'semester'),
      this.requireQuery(course, 'course'),
      req.user,
    )
  }

  @Get('students')
  students(
    @Req() req: AuthenticatedRequest,
    @Query('semester') semester?: string,
    @Query('course') course?: string,
    @Query('subject') subject?: string,
    @Query('classGroup') classGroup?: string,
  ) {
    return this.unimestreService.students(
      this.requireQuery(semester, 'semester'),
      this.requireQuery(course, 'course'),
      this.requireQuery(subject, 'subject'),
      this.requireQuery(classGroup, 'classGroup'),
      req.user,
    )
  }

  @Get('coordinators')
  @Roles('admin', 'master')
  coordinators() {
    return this.unimestreService.getCoordinators()
  }

  @Get('course-settings')
  @Roles('admin', 'master')
  courseSettings() {
    return this.unimestreService.getCourseSettings()
  }

  @Put('course-settings/:courseId')
  @Roles('admin', 'master')
  updateCourseSetting(
    @Param('courseId') courseId: string,
    @Body() body: UpdateCourseSettingDto,
  ) {
    return this.unimestreService.updateCourseSetting(courseId, body)
  }

  private requireQuery(value: string | undefined, name: string): string {
    const normalized = value?.trim()
    if (!normalized) throw new BadRequestException(`O parâmetro ${name} é obrigatório.`)
    return normalized
  }
}
