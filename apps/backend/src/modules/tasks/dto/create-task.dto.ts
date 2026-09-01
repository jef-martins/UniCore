import { TaskType } from '@prisma/client'
import { IsDateString, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'

export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title!: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string

  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string

  @IsEnum(TaskType)
  type!: TaskType
}
