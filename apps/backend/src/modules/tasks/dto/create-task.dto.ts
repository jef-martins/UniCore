import { TaskType } from '@prisma/client'
import { Transform } from 'class-transformer'
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator'

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

  @IsOptional()
  @Transform(({ value }) => (!value || value === 'none' || value === 'null' ? undefined : value))
  @ValidateIf((o) => !!o.userId)
  @IsUUID()
  userId?: string

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  isPriority?: boolean

  @IsOptional()
  @IsString()
  sector?: string
}
