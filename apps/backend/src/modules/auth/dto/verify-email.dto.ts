import { IsNotEmpty, IsString } from 'class-validator'

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty({ message: 'O token de verificação é obrigatório.' })
  token!: string
}
