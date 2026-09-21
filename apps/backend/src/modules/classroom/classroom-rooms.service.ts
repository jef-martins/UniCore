import { Injectable, Logger } from '@nestjs/common'
import { AccessRole, ClassroomRoomStatus, type ClassroomRoom } from '@prisma/client'
import { randomBytes } from 'node:crypto'
import argon2 from 'argon2'
import { PrismaService } from '../database/prisma.service'
import type { JwtPayload } from '../auth/jwt-auth.guard'
import { GoogleClassroomService } from './classroom-google.service'
import { CreateClassroomRoomDto } from './dto/create-classroom-room.dto'
import { SyncClassroomMembersDto } from './dto/sync-classroom-members.dto'

@Injectable()
export class ClassroomRoomsService {
  private readonly logger = new Logger(ClassroomRoomsService.name)

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

    // 1. Provisiona docentes e co-professores no Google Workspace e pré-cadastra no UniCore
    for (const email of teachersToSync) {
      await this.google.ensureWorkspaceUser({
        email,
        role: 'PROFESSOR',
      })
      await this.ensureLocalUserPreRegistered(email, AccessRole.PROFESSOR)
    }

    // 2. Provisiona alunos no Google Workspace e pré-cadastra no UniCore
    for (const email of studentEmails) {
      await this.google.ensureWorkspaceUser({
        email,
        role: 'ALUNO',
      })
      await this.ensureLocalUserPreRegistered(email, AccessRole.ALUNO)
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

  private async ensureLocalUserPreRegistered(email: string, role: AccessRole): Promise<void> {
    const normalized = email.trim().toLowerCase()
    if (!normalized) return
    try {
      const existing = await this.prisma.user.findFirst({
        where: { email: { equals: normalized, mode: 'insensitive' } },
      })
      if (!existing) {
        const baseUsername = normalized.split('@')[0]
        const count = await this.prisma.user.count({
          where: { username: { startsWith: baseUsername } },
        })
        const username = count === 0 ? baseUsername : `${baseUsername}_${count}`
        const tempPassword = randomBytes(16).toString('hex')
        const passwordHash = await argon2.hash(tempPassword)

        await this.prisma.user.create({
          data: {
            username,
            email: normalized,
            passwordHash,
            role,
            isActive: true,
            emailVerified: false,
          },
        })
        this.logger.log(`Usuário pré-cadastrado no UniCore: ${username} (${normalized}, ${role}, emailVerified: false).`)
      }
    } catch (err) {
      this.logger.debug?.(`Usuário já existente ou erro de concorrência ao pré-cadastrar ${normalized}: ${(err as Error).message}`)
    }
  }
}
