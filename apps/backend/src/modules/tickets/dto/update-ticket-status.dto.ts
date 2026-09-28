import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator'
import { TicketPriority, TicketStatus } from '@prisma/client'

export class UpdateTicketStatusDto {
  @IsNotEmpty({ message: 'O status é obrigatório.' })
  @IsEnum(TicketStatus, { message: 'Status inválido.' })
  status!: TicketStatus

  @IsOptional()
  @IsString()
  resolutionNotes?: string

  @IsOptional()
  @IsUUID('4', { message: 'ID de desenvolvedor inválido.' })
  assignedToId?: string

  @IsOptional()
  @IsEnum(TicketPriority, { message: 'Prioridade inválida.' })
  priority?: TicketPriority
}
