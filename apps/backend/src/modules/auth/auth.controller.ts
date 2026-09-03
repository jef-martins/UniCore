import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { CreateUserDto } from './dto/create-user.dto'
import { JwtAuthGuard, type AuthenticatedRequest } from './jwt-auth.guard'
import { RolesGuard } from './roles.guard'
import { Roles } from './roles.decorator'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: LoginDto) {
    return this.authService.login(body.identifier, body.password)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return { user: request.user }
  }

  @Get('users')
  @UseGuards(JwtAuthGuard)
  getUsers(@Req() request: AuthenticatedRequest) {
    return this.authService.findAllUsers(request.user)
  }

  @Post('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'master')
  createUser(@Body() body: CreateUserDto) {
    return this.authService.createUser(body)
  }
}
