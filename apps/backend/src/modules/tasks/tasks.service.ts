import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { AccessRole, TaskType } from '@prisma/client'
import { existsSync } from 'node:fs'
import * as fs from 'node:fs/promises'
import { extname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { PrismaService } from '../database/prisma.service'
import { CreateTaskDto } from './dto/create-task.dto'

@Injectable()
export class TasksService {
  private readonly uploadDir = join(process.cwd(), 'uploads/tasks')

  constructor(private readonly prisma: PrismaService) {}

  private async saveFile(file: Express.Multer.File): Promise<{ fileName: string; filePath: string; size: number; mimeType: string }> {
    if (!existsSync(this.uploadDir)) {
      await fs.mkdir(this.uploadDir, { recursive: true })
    }
    const ext = extname(file.originalname)
    const uniqueName = `${Date.now()}-${randomUUID()}${ext}`
    const destination = join(this.uploadDir, uniqueName)
    await fs.writeFile(destination, file.buffer)
    return {
      fileName: file.originalname,
      filePath: destination,
      size: file.size,
      mimeType: file.mimetype,
    }
  }

  async findAll(user: { sub: string; role: string }, sector?: string) {
    let tasks: any[] = []

    if (sector) {
      const accessRole = sector.toUpperCase() as AccessRole
      const canAccessSector =
        user.role === 'admin' ||
        user.role === 'master' ||
        (accessRole === AccessRole.ALUNO && user.role !== 'aluno') ||
        (accessRole === AccessRole.PROFESSOR && user.role === 'coordenacao')

      if (canAccessSector) {
        if (accessRole === AccessRole.MASTER && user.role === 'admin') {
          // Ignora query se admin tentar buscar MASTER
        } else {
          tasks = await this.prisma.task.findMany({
            where: {
              OR: [
                { user: { role: accessRole } },
                { sector: accessRole },
              ],
            },
            include: {
              user: { select: { id: true, username: true, role: true } },
              createdBy: { select: { id: true, username: true, role: true } },
            },
            orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
          })
        }
      }
    } else {
      const userRole = user.role.toUpperCase() as AccessRole
      tasks = await this.prisma.task.findMany({
        where: {
          OR: [
            { userId: user.sub },
            { userId: null, sector: userRole },
          ],
        },
        include: {
          user: { select: { id: true, username: true, role: true } },
          createdBy: { select: { id: true, username: true, role: true } },
        },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      })
    }

    const userRole = user.role.toUpperCase() as AccessRole
    const activeEvents = await this.prisma.certificateEvent.findMany({
      where: { isActive: true },
      orderBy: { startDate: 'asc' },
    })

    const eventTasks = activeEvents.map((ev) => {
      const descParts = [
        ev.speaker ? `Palestrante: ${ev.speaker}` : '',
        `Carga Horária: ${ev.workloadHours}h`,
        ev.location ? `Local: ${ev.location}` : '',
        ev.description || '',
      ].filter(Boolean)

      return {
        id: `ev-${ev.id}`,
        title: `🎓 [Evento] ${ev.title}`,
        description: descParts.join(' • '),
        date: ev.startDate,
        type: (userRole === AccessRole.ALUNO
          ? TaskType.ALUNOS
          : userRole === AccessRole.PROFESSOR
          ? TaskType.PROFESSORES
          : TaskType.COORDENACAO) as TaskType,
        sector: sector ? (sector.toUpperCase() as AccessRole) : userRole,
        completed: false,
        isPriority: true,
        createdAt: ev.createdAt,
        completedAt: null,
        updatedAt: ev.updatedAt,
        userId: null,
        createdById: ev.createdById,
        attachmentName: ev.logoUrl ? 'Logo do Evento' : null,
        attachmentPath: null,
        attachmentSize: null,
        attachmentMimeType: null,
        completionNotes: null,
        completionAttachmentName: null,
        completionAttachmentPath: null,
        completionAttachmentSize: null,
        completionAttachmentMimeType: null,
        user: null,
        createdBy: null,
      }
    })

    return [...tasks, ...eventTasks].sort((a, b) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      if (dateA !== dateB) return dateA - dateB
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
  }

  async create(userId: string, body: CreateTaskDto, file?: Express.Multer.File) {
    const title = body.title.trim()
    if (!title) throw new BadRequestException('O título da tarefa é obrigatório.')

    const creator = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!creator) throw new NotFoundException('Usuário criador não encontrado.')

    let sectorRole: AccessRole | null = null
    if (body.sector) {
      const normalizedSector = body.sector.toUpperCase() as AccessRole
      if (Object.values(AccessRole).includes(normalizedSector)) {
        sectorRole = normalizedSector
      }
    }

    if (!sectorRole) {
      // Default to creator's role or infer from task type
      sectorRole = creator.role
    }

    const assignedUserId = body.userId?.trim() || null

    let fileInfo: { fileName: string; filePath: string; size: number; mimeType: string } | null = null
    if (file) {
      fileInfo = await this.saveFile(file)
    }

    return this.prisma.task.create({
      data: {
        title,
        description: body.description?.trim() || null,
        date: this.parseDate(body.date),
        type: body.type,
        sector: sectorRole,
        userId: assignedUserId,
        createdById: userId,
        isPriority: body.isPriority || false,
        attachmentName: fileInfo?.fileName,
        attachmentPath: fileInfo?.filePath,
        attachmentSize: fileInfo?.size,
        attachmentMimeType: fileInfo?.mimeType,
      },
      include: {
        user: { select: { id: true, username: true, role: true } },
        createdBy: { select: { id: true, username: true, role: true } },
      },
    })
  }

  async complete(taskId: string, user: { sub: string; role: string }, notes?: string, file?: Express.Multer.File) {
    if (taskId.startsWith('ev-')) {
      throw new BadRequestException('Eventos acadêmicos devem ser gerenciados no painel de Eventos e Certificados.')
    }
    const task = await this.prisma.task.findUnique({ where: { id: taskId } })
    if (!task) throw new NotFoundException('Tarefa não encontrada.')

    const userRole = user.role.toUpperCase() as AccessRole
    const hasPermission =
      user.role === 'admin' ||
      user.role === 'master' ||
      task.userId === user.sub ||
      task.createdById === user.sub ||
      (task.userId === null && task.sector === userRole)

    if (!hasPermission) {
      throw new ForbiddenException('Você não tem permissão para concluir esta tarefa.')
    }

    let fileInfo: { fileName: string; filePath: string; size: number; mimeType: string } | null = null
    if (file) {
      fileInfo = await this.saveFile(file)
    }

    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        completed: true,
        completedAt: new Date(),
        completionNotes: notes?.trim() || null,
        ...(fileInfo
          ? {
              completionAttachmentName: fileInfo.fileName,
              completionAttachmentPath: fileInfo.filePath,
              completionAttachmentSize: fileInfo.size,
              completionAttachmentMimeType: fileInfo.mimeType,
            }
          : {}),
      },
      include: {
        user: { select: { id: true, username: true, role: true } },
        createdBy: { select: { id: true, username: true, role: true } },
      },
    })
  }

  async update(user: { sub: string; role: string }, id: string, body: any) {
    const task = await this.prisma.task.findUnique({ where: { id } })
    if (!task) throw new NotFoundException('Tarefa não encontrada.')

    const userRole = user.role.toUpperCase() as AccessRole
    const hasPermission =
      user.role === 'admin' ||
      user.role === 'master' ||
      task.userId === user.sub ||
      task.createdById === user.sub ||
      (task.userId === null && task.sector === userRole)

    if (!hasPermission) {
      throw new ForbiddenException('Você não tem permissão para alterar esta tarefa.')
    }

    const data: any = {}
    if (body.completed !== undefined) {
      data.completed = body.completed
      data.completedAt = body.completed ? new Date() : null
      if (!body.completed) {
        // Se reabriu a tarefa, preserva as notas ou zera se especificado
      }
    }
    if (body.isPriority !== undefined) {
      data.isPriority = body.isPriority
    }
    if (body.title !== undefined) {
      data.title = body.title.trim()
      if (!data.title) throw new BadRequestException('O título da tarefa não pode ser vazio.')
    }
    if (body.description !== undefined) {
      data.description = body.description?.trim() || null
    }

    return this.prisma.task.update({
      where: { id: task.id },
      data,
      include: {
        user: { select: { id: true, username: true, role: true } },
        createdBy: { select: { id: true, username: true, role: true } },
      },
    })
  }

  async getAttachment(taskId: string, user: { sub: string; role: string }, type: 'creation' | 'completion') {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } })
    if (!task) throw new NotFoundException('Tarefa não encontrada.')

    const userRole = user.role.toUpperCase() as AccessRole
    const hasPermission =
      user.role === 'admin' ||
      user.role === 'master' ||
      task.userId === user.sub ||
      task.createdById === user.sub ||
      task.sector === userRole ||
      (user.role === 'coordenacao' && task.sector === AccessRole.PROFESSOR)

    if (!hasPermission) {
      throw new ForbiddenException('Acesso não autorizado ao anexo.')
    }

    if (type === 'creation') {
      if (!task.attachmentPath || !existsSync(task.attachmentPath)) {
        throw new NotFoundException('Anexo da tarefa não encontrado.')
      }
      return { path: task.attachmentPath, filename: task.attachmentName || 'anexo' }
    } else {
      if (!task.completionAttachmentPath || !existsSync(task.completionAttachmentPath)) {
        throw new NotFoundException('Evidência de conclusão não encontrada.')
      }
      return { path: task.completionAttachmentPath, filename: task.completionAttachmentName || 'evidencia' }
    }
  }

  async getDashboardStats(user: { sub: string; role: string }) {
    const whereClause: any = {}
    if (user.role === 'master') {
      // master vê tudo
    } else if (user.role === 'admin') {
      whereClause.OR = [
        { user: { role: { not: 'MASTER' } } },
        { userId: null },
      ]
    }

    const tasks = await this.prisma.task.findMany({
      where: whereClause,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        user: { select: { id: true, username: true, role: true } },
        createdBy: { select: { id: true, username: true, role: true } },
      },
    })

    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)

    const totalCreated = tasks.length
    const totalResolved = tasks.filter((t) => t.completed).length
    const totalPending = totalCreated - totalResolved

    let totalOverdue = 0
    let totalPriority = 0
    let totalPriorityPending = 0
    let totalPriorityResolved = 0
    let tasksWithBriefing = 0
    let tasksWithEvidence = 0
    let sharedSectorTasks = 0

    let totalResolutionTimeMs = 0
    let resolvedCountWithDates = 0

    for (const t of tasks) {
      const taskDateStr = t.date ? new Date(t.date).toISOString().slice(0, 10) : ''
      const isOverdue = !t.completed && taskDateStr < todayStr
      if (isOverdue) totalOverdue++

      if (t.isPriority) {
        totalPriority++
        if (t.completed) totalPriorityResolved++
        else totalPriorityPending++
      }

      if (t.attachmentName) tasksWithBriefing++
      if (t.completionAttachmentName) tasksWithEvidence++
      if (t.userId === null) sharedSectorTasks++

      if (t.completed && t.completedAt && t.createdAt) {
        const diff = new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime()
        if (diff > 0) {
          totalResolutionTimeMs += diff
          resolvedCountWithDates++
        }
      }
    }

    const resolutionRate = totalCreated > 0 ? Math.round((totalResolved / totalCreated) * 100) : 0
    const avgResolutionTimeHours =
      resolvedCountWithDates > 0
        ? Number((totalResolutionTimeMs / (resolvedCountWithDates * 3600 * 1000)).toFixed(2))
        : 0
    const avgResolutionTimeMinutes =
      resolvedCountWithDates > 0
        ? Math.max(1, Math.round(totalResolutionTimeMs / (resolvedCountWithDates * 60 * 1000)))
        : 0

    const TYPE_LABELS: Record<string, string> = {
      VESTIBULAR: 'Vestibular',
      ADMINISTRACAO: 'Administração',
      TESOURARIA: 'Tesouraria',
      COORDENACAO: 'Coordenação',
      REGISTRO_ACADEMICO: 'Registro Acadêmico',
      ALUNOS: 'Alunos',
      PROFESSORES: 'Professores',
    }

    // Breakdown por tipo / setor
    const byTypeMap: Record<
      string,
      {
        type: string
        label: string
        total: number
        completed: number
        pending: number
        overdue: number
        priority: number
        resolutionRate: number
        totalResolutionTimeMs: number
        resolvedCountWithDates: number
        avgResolutionTimeHours: number
        avgResolutionTimeMinutes: number
      }
    > = {}

    for (const type of Object.keys(TYPE_LABELS)) {
      byTypeMap[type] = {
        type,
        label: TYPE_LABELS[type],
        total: 0,
        completed: 0,
        pending: 0,
        overdue: 0,
        priority: 0,
        resolutionRate: 0,
        totalResolutionTimeMs: 0,
        resolvedCountWithDates: 0,
        avgResolutionTimeHours: 0,
        avgResolutionTimeMinutes: 0,
      }
    }

    for (const t of tasks) {
      if (!byTypeMap[t.type]) {
        byTypeMap[t.type] = {
          type: t.type,
          label: TYPE_LABELS[t.type] || t.type,
          total: 0,
          completed: 0,
          pending: 0,
          overdue: 0,
          priority: 0,
          resolutionRate: 0,
          totalResolutionTimeMs: 0,
          resolvedCountWithDates: 0,
          avgResolutionTimeHours: 0,
          avgResolutionTimeMinutes: 0,
        }
      }
      const entry = byTypeMap[t.type]
      entry.total++
      if (t.completed) {
        entry.completed++
        if (t.completedAt && t.createdAt) {
          const diff = new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime()
          if (diff > 0) {
            entry.totalResolutionTimeMs += diff
            entry.resolvedCountWithDates++
          }
        }
      } else {
        entry.pending++
        const taskDateStr = t.date ? new Date(t.date).toISOString().slice(0, 10) : ''
        if (taskDateStr < todayStr) entry.overdue++
      }
      if (t.isPriority) entry.priority++
    }

    for (const entry of Object.values(byTypeMap)) {
      entry.resolutionRate = entry.total > 0 ? Math.round((entry.completed / entry.total) * 100) : 0
      entry.avgResolutionTimeHours =
        entry.resolvedCountWithDates > 0
          ? Number((entry.totalResolutionTimeMs / (entry.resolvedCountWithDates * 3600 * 1000)).toFixed(2))
          : 0
      entry.avgResolutionTimeMinutes =
        entry.resolvedCountWithDates > 0
          ? Math.max(1, Math.round(entry.totalResolutionTimeMs / (entry.resolvedCountWithDates * 60 * 1000)))
          : 0
    }

    // Agrupamento retrocompatível byType: { [type]: { created, resolved } }
    const legacyByType: Record<string, { created: number; resolved: number }> = {}
    for (const entry of Object.values(byTypeMap)) {
      legacyByType[entry.type] = { created: entry.total, resolved: entry.completed }
    }

    // Top Criadores
    const creatorsMap: Record<string, { username: string; role: string; totalCreated: number; completed: number }> = {}
    for (const t of tasks) {
      const username = t.createdBy?.username || 'Sistema'
      const role = t.createdBy?.role || '-'
      if (!creatorsMap[username]) {
        creatorsMap[username] = { username, role, totalCreated: 0, completed: 0 }
      }
      creatorsMap[username].totalCreated++
      if (t.completed) creatorsMap[username].completed++
    }
    const topCreators = Object.values(creatorsMap)
      .sort((a, b) => b.totalCreated - a.totalCreated)
      .slice(0, 6)

    // Top Executores / Responsáveis
    const assigneesMap: Record<
      string,
      {
        username: string
        role: string
        totalAssigned: number
        completed: number
        rate: number
        totalResolutionTimeMs: number
        resolvedCountWithDates: number
        avgResolutionTimeHours: number
        avgResolutionTimeMinutes: number
      }
    > = {}

    for (const t of tasks) {
      if (t.user?.username) {
        const username = t.user.username
        const role = t.user.role || '-'
        if (!assigneesMap[username]) {
          assigneesMap[username] = {
            username,
            role,
            totalAssigned: 0,
            completed: 0,
            rate: 0,
            totalResolutionTimeMs: 0,
            resolvedCountWithDates: 0,
            avgResolutionTimeHours: 0,
            avgResolutionTimeMinutes: 0,
          }
        }
        assigneesMap[username].totalAssigned++
        if (t.completed) {
          assigneesMap[username].completed++
          if (t.completedAt && t.createdAt) {
            const diff = new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime()
            if (diff > 0) {
              assigneesMap[username].totalResolutionTimeMs += diff
              assigneesMap[username].resolvedCountWithDates++
            }
          }
        }
      }
    }
    for (const a of Object.values(assigneesMap)) {
      a.rate = a.totalAssigned > 0 ? Math.round((a.completed / a.totalAssigned) * 100) : 0
      a.avgResolutionTimeHours =
        a.resolvedCountWithDates > 0
          ? Number((a.totalResolutionTimeMs / (a.resolvedCountWithDates * 3600 * 1000)).toFixed(2))
          : 0
      a.avgResolutionTimeMinutes =
        a.resolvedCountWithDates > 0
          ? Math.max(1, Math.round(a.totalResolutionTimeMs / (a.resolvedCountWithDates * 60 * 1000)))
          : 0
    }
    const topAssignees = Object.values(assigneesMap)
      .sort((a, b) => b.totalAssigned - a.totalAssigned)
      .slice(0, 6)

    // Lista de usuários para filtros do relatório
    const allUsers = await this.prisma.user.findMany({
      where: user.role === 'master' ? {} : { role: { not: 'MASTER' } },
      select: { id: true, username: true, role: true },
      orderBy: { username: 'asc' },
    })

    // Detalhamento de tarefas
    const detailedTasks = tasks.map((t) => {
      const taskDateStr = t.date ? new Date(t.date).toISOString().slice(0, 10) : ''
      const isOverdue = !t.completed && taskDateStr < todayStr

      let resolutionTimeMinutes: number | null = null
      let resolutionTimeHours: number | null = null
      if (t.completed && t.completedAt && t.createdAt) {
        const diff = new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime()
        if (diff > 0) {
          resolutionTimeMinutes = Math.max(1, Math.round(diff / (60 * 1000)))
          resolutionTimeHours = Number((diff / (3600 * 1000)).toFixed(2))
        }
      }

      return {
        id: t.id,
        title: t.title,
        description: t.description,
        date: t.date,
        type: t.type,
        typeLabel: TYPE_LABELS[t.type] || t.type,
        sector: t.sector,
        completed: t.completed,
        isPriority: t.isPriority,
        isOverdue,
        createdAt: t.createdAt,
        completedAt: t.completedAt,
        resolutionTimeMinutes,
        resolutionTimeHours,
        hasBriefing: !!t.attachmentName,
        attachmentName: t.attachmentName,
        hasEvidence: !!t.completionAttachmentName,
        completionAttachmentName: t.completionAttachmentName,
        completionNotes: t.completionNotes,
        user: t.user ? { id: t.user.id, username: t.user.username, role: t.user.role } : null,
        createdBy: t.createdBy ? { id: t.createdBy.id, username: t.createdBy.username, role: t.createdBy.role } : null,
        isShared: t.userId === null,
      }
    })

    return {
      totalCreated,
      totalResolved,
      byType: legacyByType,
      overview: {
        totalTasks: totalCreated,
        completedTasks: totalResolved,
        pendingTasks: totalPending,
        overdueTasks: totalOverdue,
        priorityTasks: totalPriority,
        priorityPendingTasks: totalPriorityPending,
        priorityResolvedTasks: totalPriorityResolved,
        resolutionRate,
        avgResolutionTimeHours,
        avgResolutionTimeMinutes,
        tasksWithBriefing,
        tasksWithEvidence,
        sharedSectorTasks,
      },
      bySector: Object.values(byTypeMap),
      byPriority: {
        high: {
          total: totalPriority,
          completed: totalPriorityResolved,
          pending: totalPriorityPending,
          rate: totalPriority > 0 ? Math.round((totalPriorityResolved / totalPriority) * 100) : 0,
        },
        normal: {
          total: totalCreated - totalPriority,
          completed: totalResolved - totalPriorityResolved,
          pending: totalPending - totalPriorityPending,
          rate:
            totalCreated - totalPriority > 0
              ? Math.round(((totalResolved - totalPriorityResolved) / (totalCreated - totalPriority)) * 100)
              : 0,
        },
      },
      topCreators,
      topAssignees,
      users: allUsers,
      tasks: detailedTasks,
    }
  }

  private parseDate(value: string): Date {
    const date = new Date(`${value}T00:00:00.000Z`)
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      throw new BadRequestException('A data deve ser válida e estar no formato YYYY-MM-DD.')
    }
    return date
  }
}
