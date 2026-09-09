import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { UnimestreService } from './unimestre.service'

@Controller('unimestre')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'master')
export class UnimestreController {
  constructor(private readonly unimestreService: UnimestreService) {}

  @Get('status')
  status() {
    return this.unimestreService.status()
  }

  @Get('courses')
  courses(@Query('semester') semester?: string) {
    return this.unimestreService.courses(semester?.trim())
  }

  @Get('classes')
  classes(@Query('semester') semester?: string, @Query('course') course?: string) {
    return this.unimestreService.classes(this.requireQuery(semester, 'semester'), this.requireQuery(course, 'course'))
  }

  @Get('students')
  students(
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
    )
  }

  private requireQuery(value: string | undefined, name: string): string {
    const normalized = value?.trim()
    if (!normalized) throw new BadRequestException(`O parâmetro ${name} é obrigatório.`)
    return normalized
  }
}
