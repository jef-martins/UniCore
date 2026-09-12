import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator'

export class CreateClassroomRoomDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  academicCourseId!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  subjectId!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  classGroup!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  semester!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  subjectName!: string

  @IsEmail()
  @MaxLength(254)
  teacherEmail!: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  studentEmails?: string[]
}
