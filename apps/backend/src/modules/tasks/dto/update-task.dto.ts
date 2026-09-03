import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class UpdateTaskDto {
  @IsOptional()
  @IsBoolean()
  completed?: boolean

  @IsOptional()
  @IsBoolean()
  isPriority?: boolean

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title?: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string
}
