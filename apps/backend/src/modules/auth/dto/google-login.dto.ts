import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class GoogleLoginDto {
  @IsString()
  @IsNotEmpty()
  code!: string

  @IsString()
  @IsOptional()
  redirectUri?: string
}
