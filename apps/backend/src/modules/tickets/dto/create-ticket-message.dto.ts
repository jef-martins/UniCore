import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { TicketStatus } from '@prisma/client'

export class CreateTicketMessageDto {
  @IsNotEmpty({ message: 'A mensagem não pode ser vazia.' })
  @IsString()
  message!: string

  @IsOptional()
  @IsEnum(TicketStatus, { message: 'Status inválido.' })
  statusChange?: TicketStatus
}
