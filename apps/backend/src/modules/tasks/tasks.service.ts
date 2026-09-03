import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { CreateTaskDto } from './dto/create-task.dto'

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(user: { sub: string; role: string }, sector?: string) {
    if (sector) {
      const accessRole = sector.toUpperCase() as any;
      const canAccessSector = 
        user.role === 'admin' || 
        user.role === 'master' || 
        (accessRole === 'ALUNO' && user.role !== 'aluno') ||
        (accessRole === 'PROFESSOR' && user.role === 'coordenacao');

      if (canAccessSector) {
        if (accessRole === 'MASTER' && user.role === 'admin') {
          // Ignora query se admin tentar buscar MASTER
        } else {
          return this.prisma.task.findMany({
            where: { user: { role: accessRole } },
            orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
          })
        }
      }
    }

    return this.prisma.task.findMany({
      where: { userId: user.sub },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    })
  }

  create(userId: string, body: CreateTaskDto) {
    const title = body.title.trim()
    if (!title) throw new BadRequestException('O título da tarefa é obrigatório.')

    return this.prisma.task.create({
      data: {
        title,
        description: body.description?.trim() || null,
        date: this.parseDate(body.date),
        type: body.type,
        userId: body.userId || userId,
        isPriority: body.isPriority || false,
      },
    })
  }

  async update(userId: string, id: string, body: any) {
    const task = await this.prisma.task.findFirst({ where: { id, userId } })
    if (!task) throw new NotFoundException('Tarefa não encontrada.')

    const data: any = {}
    if (body.completed !== undefined) {
      data.completed = body.completed
      data.completedAt = body.completed ? new Date() : null
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
    })
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
      include: { user: { select: { username: true } } }
    })

    const totalCreated = tasks.length
    const totalResolved = tasks.filter(t => t.completed).length

    const byType = tasks.reduce((acc, task) => {
      if (!acc[task.type]) {
        acc[task.type] = { created: 0, resolved: 0 }
      }
      acc[task.type].created++
      if (task.completed) {
        acc[task.type].resolved++
      }
      return acc
    }, {} as Record<string, { created: number, resolved: number }>)

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
