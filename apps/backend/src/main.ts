import 'reflect-metadata'

import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { existsSync, readFileSync } from 'node:fs'
import https from 'node:https'
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

  // Servir arquivos do desafio ACME (Let's Encrypt / win-acme)
  const acmeChallengeDir = join(frontendRoot, '.well-known/acme-challenge')
  app.use('/.well-known/acme-challenge', express.static(acmeChallengeDir, {
    setHeaders: (res) => {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    },
  }))

  // Servir arquivos estáticos do frontend (JS, CSS, imagens, fontes, etc.)
  app.use(express.static(frontendRoot))

  // Entrega o index do Angular apenas para navegação HTML (SPA fallback); a API e arquivos estáticos nunca caem no SPA fallback.
  app.use((request: Request, response: Response, next: NextFunction) => {
    const isApiRequest = request.path === '/api' || request.path.startsWith('/api/')
    const isAcme = request.path.startsWith('/.well-known')
    const isNavigation = request.method === 'GET' || request.method === 'HEAD'
    const hasFileExtension = /\.[a-zA-Z0-9]+$/.test(request.path)

    if (!isApiRequest && !isAcme && isNavigation && !hasFileExtension && existsSync(frontendIndex)) {
      return response.sendFile(frontendIndex)
    }

    return next()
  })

  await app.listen(port, '0.0.0.0')
  console.log(`UniCore backend running on http://0.0.0.0:${port}`)

  // Iniciar servidor HTTPS na porta 443 caso os certificados SSL existam
  const certDir = join(process.cwd(), 'certs')
  const certKeyPath = join(certDir, 'waeweb.faip.edu.br-key.pem')
  const certChainPath = join(certDir, 'waeweb.faip.edu.br-chain.pem')

  if (existsSync(certKeyPath) && existsSync(certChainPath)) {
    try {
      const httpsOptions = {
        key: readFileSync(certKeyPath),
        cert: readFileSync(certChainPath),
      }
      const httpsServer = https.createServer(httpsOptions, app.getHttpAdapter().getInstance())
      httpsServer.listen(443, '0.0.0.0', () => {
        console.log('UniCore HTTPS server running on https://0.0.0.0:443')
      })
    } catch (err) {
      console.error('Failed to start HTTPS server on port 443:', err)
    }
  }
}

void bootstrap()
