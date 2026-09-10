import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Response } from 'express'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { GoogleClassroomService } from './classroom-google.service'

@Controller('classroom/google')
export class ClassroomOauthController {
  constructor(
    private readonly googleService: GoogleClassroomService,
    private readonly config: ConfigService,
  ) {}

  @Get('auth-url')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'master')
  getAuthUrl(@Query('redirectUri') redirectUri?: string) {
    return { url: this.googleService.getAuthUrl(redirectUri) }
  }

  @Post('exchange-code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'master')
  exchangeCode(@Body('code') code: string, @Body('redirectUri') redirectUri?: string) {
    if (!code || typeof code !== 'string') {
      throw new BadRequestException('O código de autorização é obrigatório.')
    }
    return this.googleService.exchangeCode(code, redirectUri)
  }

  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    const corsOrigin = this.config.get<string>('corsOrigin') || 'http://localhost:4200'
    const targetUrl = `${corsOrigin}/administracao/classroom`

    if (error) {
      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>UniCore - Erro na Autenticação Google</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; display: grid; place-items: center; min-height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }
    .card { background: #1e293b; padding: 32px; border-radius: 12px; max-width: 480px; text-align: center; border: 1px solid #ef4444; }
    h1 { color: #ef4444; font-size: 20px; margin-bottom: 12px; }
    p { color: #94a3b8; font-size: 14px; margin-bottom: 24px; }
    a { display: inline-block; background: #3b82f6; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 500; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Autorização Cancelada ou Falhou</h1>
    <p>O Google retornou o seguinte erro: ${error}</p>
    <a href="${targetUrl}">Voltar ao UniCore</a>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: 'google-auth-error', error: '${error}' }, '*');
      setTimeout(() => window.close(), 3000);
    }
  </script>
</body>
</html>`
      return res.status(400).send(html)
    }

    if (!code) {
      throw new BadRequestException('Código de autorização não recebido.')
    }

    try {
      await this.googleService.exchangeCode(code)
      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>UniCore - Google Classroom Conectado</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; display: grid; place-items: center; min-height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }
    .card { background: #1e293b; padding: 32px; border-radius: 12px; max-width: 480px; text-align: center; border: 1px solid #10b981; }
    h1 { color: #10b981; font-size: 20px; margin-bottom: 12px; }
    p { color: #94a3b8; font-size: 14px; margin-bottom: 24px; }
    a { display: inline-block; background: #10b981; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 500; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Google Classroom Conectado com Sucesso!</h1>
    <p>A integração foi autorizada. Você pode fechar esta página ou clicar no botão abaixo para retornar ao painel.</p>
    <a href="${targetUrl}?googleConnected=true">Continuar no UniCore</a>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: 'google-auth-success' }, '*');
      setTimeout(() => window.close(), 1500);
    } else {
      setTimeout(() => {
        window.location.href = '${targetUrl}?googleConnected=true';
      }, 2000);
    }
  </script>
</body>
</html>`
      return res.status(200).send(html)
    } catch (err) {
      const message = (err as Error).message
      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>UniCore - Erro ao Vincular Google</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; display: grid; place-items: center; min-height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }
    .card { background: #1e293b; padding: 32px; border-radius: 12px; max-width: 480px; text-align: center; border: 1px solid #ef4444; }
    h1 { color: #ef4444; font-size: 20px; margin-bottom: 12px; }
    p { color: #94a3b8; font-size: 14px; margin-bottom: 24px; }
    a { display: inline-block; background: #3b82f6; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 500; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Falha na troca de autorização</h1>
    <p>${message}</p>
    <a href="${targetUrl}">Voltar ao UniCore</a>
  </div>
</body>
</html>`
      return res.status(400).send(html)
    }
  }
}
