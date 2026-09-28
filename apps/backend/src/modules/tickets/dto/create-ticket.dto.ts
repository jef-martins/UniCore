import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator'
import { AccessRole, TicketPriority } from '@prisma/client'

export class CreateTicketDto {
  @IsNotEmpty({ message: 'O título do chamado é obrigatório.' })
  @IsString()
  title!: string

  @IsNotEmpty({ message: 'A descrição do chamado é obrigatória.' })
  @IsString()
  description!: string

  @IsNotEmpty({ message: 'O setor é obrigatório.' })
  @IsEnum(AccessRole, { message: 'Setor inválido.' })
  sector!: AccessRole

  @IsOptional()
  @IsEnum(TicketPriority, { message: 'Prioridade inválida.' })
  priority?: TicketPriority

  @IsOptional()
  @IsUUID('4', { message: 'ID de usuário inválido.' })
  userId?: string
}
