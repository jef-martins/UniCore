import { ArrayMaxSize, IsArray, IsEmail, IsOptional } from 'class-validator'

export class SyncClassroomMembersDto {
  @IsOptional()
  @IsEmail()
  teacherEmail?: string

  @IsArray()
  @ArrayMaxSize(500)
  @IsEmail({}, { each: true })
  studentEmails!: string[]
}
