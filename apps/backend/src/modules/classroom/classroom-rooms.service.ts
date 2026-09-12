import { Injectable } from '@nestjs/common'
import { ClassroomRoomStatus, type ClassroomRoom } from '@prisma/client'
import { PrismaService } from '../database/prisma.service'
import { GoogleClassroomService } from './classroom-google.service'
import { CreateClassroomRoomDto } from './dto/create-classroom-room.dto'
import { SyncClassroomMembersDto } from './dto/sync-classroom-members.dto'

@Injectable()
export class ClassroomRoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly google: GoogleClassroomService,
  ) {}

  list(semester?: string) {
    return this.prisma.classroomRoom.findMany({
      where: semester ? { semester } : undefined,
      orderBy: [{ semester: 'desc' }, { academicCourseId: 'asc' }, { classGroup: 'asc' }, { subjectName: 'asc' }],
    })
  }

  async create(input: CreateClassroomRoomDto) {
    const data = this.normalizeRoom(input)
    const existing = await this.prisma.classroomRoom.findUnique({
      where: { academicCourseId_subjectId_classGroup_semester: this.roomKey(data) },
    })
    if (existing?.googleCourseId) return { room: existing, created: false, warnings: [] as string[] }

    const room = existing
      ? await this.prisma.classroomRoom.update({
        where: { id: existing.id },
        data: { ...data, status: ClassroomRoomStatus.PROCESSING, lastMessage: null },
      })
      : await this.prisma.classroomRoom.create({
        data: { ...data, status: ClassroomRoomStatus.PROCESSING },
      })

    try {
      const course = await this.google.createCourse({
        name: `${room.semester} — ${room.subjectName} — Turma ${room.classGroup}`,
        section: room.semester,
        descriptionHeading: `Curso ${room.academicCourseId} · Disciplina ${room.subjectId}`,
      })
      const createdRoom = await this.prisma.classroomRoom.update({
        where: { id: room.id },
        data: { googleCourseId: course.id, alternateLink: course.alternateLink },
      })
      const sync = await this.syncMembers(createdRoom.id, {
        teacherEmail: createdRoom.teacherEmail,
        studentEmails: input.studentEmails ?? [],
      })
      return { room: sync.room, created: true, warnings: sync.warnings }
    } catch (error) {
      await this.markFailed(room.id)
      throw error
    }
  }

  async syncMembers(roomId: string, input: SyncClassroomMembersDto) {
    const room = await this.prisma.classroomRoom.findUniqueOrThrow({ where: { id: roomId } })
    if (!room.googleCourseId) return { room, addedStudents: 0, existingStudents: 0, warnings: ['A sala ainda não possui um identificador do Google Classroom.'] }

    const teacherEmail = input.teacherEmail?.trim().toLowerCase() || room.teacherEmail
    const studentEmails = [...new Set(input.studentEmails.map((email) => email.trim().toLowerCase()))]
    const warnings: string[] = []
    let addedStudents = 0
    let existingStudents = 0

    try {
      await this.google.addTeacher(room.googleCourseId, teacherEmail)
    } catch {
      warnings.push(`Não foi possível sincronizar o professor ${teacherEmail}.`)
    }

    for (const email of studentEmails) {
      try {
        const result = await this.google.addStudent(room.googleCourseId, email)
        if (result === 'added') addedStudents += 1
        else existingStudents += 1
      } catch {
        warnings.push(`Não foi possível sincronizar o aluno ${email}.`)
      }
    }

    const updatedRoom = await this.prisma.classroomRoom.update({
      where: { id: room.id },
      data: {
        teacherEmail,
        status: warnings.length ? ClassroomRoomStatus.CREATED_WITH_WARNINGS : ClassroomRoomStatus.CREATED,
        lastMessage: warnings.length ? warnings.join(' ') : 'Sala e participantes sincronizados com o Google Classroom.',
      },
    })
    return { room: updatedRoom, addedStudents, existingStudents, warnings }
  }

  private normalizeRoom(input: CreateClassroomRoomDto) {
    return {
      academicCourseId: input.academicCourseId.trim(),
      subjectId: input.subjectId.trim(),
      classGroup: input.classGroup.trim(),
      semester: input.semester.trim(),
      subjectName: input.subjectName.trim(),
      teacherEmail: input.teacherEmail.trim().toLowerCase(),
    }
  }

  private roomKey(room: Pick<ClassroomRoom, 'academicCourseId' | 'subjectId' | 'classGroup' | 'semester'>) {
    return {
      academicCourseId: room.academicCourseId,
      subjectId: room.subjectId,
      classGroup: room.classGroup,
      semester: room.semester,
    }
  }

  private async markFailed(roomId: string): Promise<void> {
    await this.prisma.classroomRoom.update({
      where: { id: roomId },
      data: { status: ClassroomRoomStatus.FAILED, lastMessage: 'Não foi possível criar a sala no Google Classroom.' },
    })
  }
}
