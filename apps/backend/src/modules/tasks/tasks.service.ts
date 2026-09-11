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
          return this.prisma.task.findMany({
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
    }

    const userRole = user.role.toUpperCase() as AccessRole
    return this.prisma.task.findMany({
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
      whereClause.user = { role: { not: 'MASTER' } }
    }

    const tasks = await this.prisma.task.findMany({
      where: whereClause,
      orderBy: [{ createdAt: 'desc' }],
      include: { user: { select: { username: true } } },
    })

    const totalCreated = tasks.length
    const totalResolved = tasks.filter((t) => t.completed).length

    const byType = tasks.reduce(
      (acc, task) => {
        if (!acc[task.type]) {
          acc[task.type] = { created: 0, resolved: 0 }
        }
        acc[task.type].created++
        if (task.completed) {
          acc[task.type].resolved++
        }
        return acc
      },
      {} as Record<string, { created: number; resolved: number }>,
    )

    return { totalCreated, totalResolved, byType, tasks }
  }

  private parseDate(value: string): Date {
    const date = new Date(`${value}T00:00:00.000Z`)
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      throw new BadRequestException('A data deve ser válida e estar no formato YYYY-MM-DD.')
    }
    return date
  }
}
