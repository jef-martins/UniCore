import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class UpdateCourseSettingDto {
  @IsString()
  @IsNotEmpty()
  courseName!: string

  @IsOptional()
  @IsString()
  courseEmail?: string | null

  @IsOptional()
  @IsString()
  coordinatorEmail?: string | null

  @IsOptional()
  @IsString()
  coordinatorUserId?: string | null
}
