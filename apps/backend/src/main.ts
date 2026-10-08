import 'reflect-metadata'

import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import express, { json, urlencoded, type NextFunction, type Request, type Response } from 'express'
import { AppModule } from './app.module'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bodyParser: false })
  const config = app.get(ConfigService)
  const port = config.get<number>('port', 3000)
  const corsOrigin = config.get<string>('corsOrigin', '*')
  const frontendRoot = join(process.cwd(), 'dist/apps/frontend/browser')
  const frontendIndex = join(frontendRoot, 'index.html')

  app.use(json({ limit: '50mb' }))
  app.use(urlencoded({ limit: '50mb', extended: true }))

  app.setGlobalPrefix('api')
  app.enableCors({
    origin: corsOrigin === '*' ? true : corsOrigin,
    credentials: true,
  })
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }))

  // Servir arquivos estáticos do frontend (JS, CSS, imagens, fontes, etc.)
  app.use(express.static(frontendRoot))

  // Entrega o index do Angular apenas para navegação HTML (SPA fallback); a API e arquivos estáticos nunca caem no SPA fallback.
  app.use((request: Request, response: Response, next: NextFunction) => {
    const isApiRequest = request.path === '/api' || request.path.startsWith('/api/')
    const isNavigation = request.method === 'GET' || request.method === 'HEAD'
    const hasFileExtension = /\.[a-zA-Z0-9]+$/.test(request.path)

    if (!isApiRequest && isNavigation && !hasFileExtension && existsSync(frontendIndex)) {
      return response.sendFile(frontendIndex)
    }

    return next()
  })

  await app.listen(port, '0.0.0.0')
  console.log(`UniCore backend running on http://0.0.0.0:${port}`)
}

void bootstrap()
