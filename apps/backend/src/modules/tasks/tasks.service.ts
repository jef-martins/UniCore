import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { CreateTaskDto } from './dto/create-task.dto'

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.task.findMany({
      where: { userId },
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
        userId,
      },
    })
  }

  async updateStatus(userId: string, id: string, completed: boolean) {
    const task = await this.prisma.task.findFirst({ where: { id, userId } })
    if (!task) throw new NotFoundException('Tarefa não encontrada.')

    return this.prisma.task.update({
      where: { id: task.id },
      data: {
        completed,
        completedAt: completed ? new Date() : null,
      },
    })
  }

  private parseDate(value: string): Date {
    const date = new Date(`${value}T00:00:00.000Z`)
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      throw new BadRequestException('A data deve ser válida e estar no formato YYYY-MM-DD.')
    }
    return date
  }
}
