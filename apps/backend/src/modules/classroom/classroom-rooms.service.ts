import { Injectable } from '@nestjs/common'
import { ClassroomRoomStatus, type ClassroomRoom } from '@prisma/client'
import { PrismaService } from '../database/prisma.service'
import type { JwtPayload } from '../auth/jwt-auth.guard'
import { GoogleClassroomService } from './classroom-google.service'
import { CreateClassroomRoomDto } from './dto/create-classroom-room.dto'
import { SyncClassroomMembersDto } from './dto/sync-classroom-members.dto'

@Injectable()
export class ClassroomRoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly google: GoogleClassroomService,
  ) {}

  async list(
    semester?: string,
    user?: JwtPayload,
    coordinationOnly = false,
    coordinatorEmail?: string,
    coordinatorUserId?: string,
  ) {
    let allowedCourseIds: string[] | undefined
    const shouldFilterCoordination = coordinationOnly || user?.role === 'coordenacao'
    if (shouldFilterCoordination && user) {
      let targetUserId = coordinatorUserId?.trim() || null
      let targetUserEmail = coordinatorEmail?.trim().toLowerCase() || null

      if (user.role === 'coordenacao') {
        const dbUser = await this.prisma.user.findUnique({ where: { id: user.sub } })
        targetUserId = dbUser?.id || user.sub
        targetUserEmail = (dbUser?.email || (user as any).email || '').trim().toLowerCase()
      } else {
        if (targetUserId && !targetUserEmail) {
          const found = await this.prisma.user.findUnique({ where: { id: targetUserId } })
          if (found) targetUserEmail = found.email.trim().toLowerCase()
        } else if (targetUserEmail && !targetUserId) {
          const found = await this.prisma.user.findFirst({
            where: { email: { equals: targetUserEmail, mode: 'insensitive' } },
          })
          if (found) targetUserId = found.id
        } else if (!targetUserId && !targetUserEmail) {
          const dbUser = await this.prisma.user.findUnique({ where: { id: user.sub } })
          targetUserId = dbUser?.id || user.sub
          targetUserEmail = (dbUser?.email || (user as any).email || '').trim().toLowerCase()
        }
      }

      const settings = await this.prisma.academicCourseSetting.findMany({
        include: { coordinatorUser: true },
      })
      const ids = new Set<string>()
      for (const s of settings) {
        if (targetUserId && s.coordinatorUserId && (s.coordinatorUserId === targetUserId || s.coordinatorUserId === user.sub)) {
          ids.add(s.academicCourseId)
        } else if (
          targetUserEmail &&
          ((s.coordinatorEmail && s.coordinatorEmail.trim().toLowerCase() === targetUserEmail) ||
            (s.coordinatorUser?.email && s.coordinatorUser.email.trim().toLowerCase() === targetUserEmail))
        ) {
          ids.add(s.academicCourseId)
        }
      }
      allowedCourseIds = [...ids]
    }

    return this.prisma.classroomRoom.findMany({
      where: {
        ...(semester ? { semester } : {}),
        ...(allowedCourseIds !== undefined ? { academicCourseId: { in: allowedCourseIds } } : {}),
      },
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

    // Buscar configurações do curso para incluir o Coordenador e o E-mail do Curso como co-professores
    const courseSetting = await this.prisma.academicCourseSetting.findUnique({
      where: { academicCourseId: room.academicCourseId },
      include: { coordinatorUser: true },
    })

    const teachersToSync = new Set<string>()
    if (teacherEmail) teachersToSync.add(teacherEmail)
    if (courseSetting?.courseEmail?.trim()) {
      teachersToSync.add(courseSetting.courseEmail.trim().toLowerCase())
    }
    const coordinatorEmail = courseSetting?.coordinatorEmail?.trim() || courseSetting?.coordinatorUser?.email?.trim()
    if (coordinatorEmail) {
      teachersToSync.add(coordinatorEmail.toLowerCase())
    }

    for (const email of teachersToSync) {
      try {
        await this.google.addTeacher(room.googleCourseId, email)
      } catch {
        warnings.push(`Não foi possível sincronizar o docente/coordenador/curso ${email}.`)
      }
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
