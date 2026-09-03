import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator'
import { AuthRole } from '../auth.service'

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  username!: string

  @IsEmail()
  email!: string

  @IsString()
  @MinLength(6)
  password!: string

  @IsString()
  role!: AuthRole
}
