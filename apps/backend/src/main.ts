import 'reflect-metadata'

import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { NextFunction, Request, Response } from 'express'
import { AppModule } from './app.module'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule)
  const config = app.get(ConfigService)
  const port = config.get<number>('port', 3000)
  const frontendRoot = join(process.cwd(), 'dist/apps/frontend/browser')
  const frontendIndex = join(frontendRoot, 'index.html')

  app.setGlobalPrefix('api')
  app.enableCors({
    origin: config.get<string>('corsOrigin', 'http://localhost:4200'),
    credentials: true,
  })
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }))

  // Entrega o index do Angular apenas para navegação HTML; a API nunca cai no SPA fallback.
  app.use((request: Request, response: Response, next: NextFunction) => {
    const acceptsHtml = request.accepts('html') !== false
    const isApiRequest = request.path === '/api' || request.path.startsWith('/api/')
    const isNavigation = request.method === 'GET' || request.method === 'HEAD'

    if (!isApiRequest && isNavigation && acceptsHtml && existsSync(frontendIndex)) {
      return response.sendFile(frontendIndex)
    }

    return next()
  })

  await app.listen(port)
  console.log(`UniCore backend running on http://localhost:${port}`)
}

void bootstrap()
