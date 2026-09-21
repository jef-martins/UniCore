import { IsEmail, IsNotEmpty } from 'class-validator'

export class RequestFirstAccessDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string
}
