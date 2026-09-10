#!/usr/bin/env node
import { createServer } from 'node:http'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import readline from 'node:readline'
import dotenv from 'dotenv'
import { google } from 'googleapis'

dotenv.config()

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REDIRECT_PORT = 3000
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/api/classroom/google/callback`

const SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses',
  'https://www.googleapis.com/auth/classroom.rosters',
]

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET precisam estar definidos no .env')
  process.exit(1)
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: SCOPES,
})

console.log('='.repeat(80))
console.log('🔑 AUTENTICAÇÃO GOOGLE CLASSROOM (OAUTH 2.0)')
console.log('='.repeat(80))
console.log('\nPasso 1: Abra o link abaixo no navegador:')
console.log(`\n\x1b[36m${authUrl}\x1b[0m\n`)
console.log('Passo 2: Faça login com o e-mail do Google Workspace (ex: nutic@faip.edu.br).')
console.log('Passo 3: Se o backend já estiver rodando, o redirecionamento salvará o token automaticamente.')
console.log('         Caso contrário, você também pode copiar o parâmetro "code=" da URL e colar abaixo.')
console.log('='.repeat(80))

function saveRefreshToken(refreshToken) {
  const tokenFile = join(process.cwd(), '.google-token.json')
  writeFileSync(tokenFile, JSON.stringify({ refresh_token: refreshToken, updatedAt: new Date().toISOString() }, null, 2))
  console.log(`💾 Token salvo em ${tokenFile}`)

  const envFile = join(process.cwd(), '.env')
  if (existsSync(envFile)) {
    let envContent = readFileSync(envFile, 'utf8')
    if (/^GOOGLE_REFRESH_TOKEN=.*$/m.test(envContent)) {
      envContent = envContent.replace(/^GOOGLE_REFRESH_TOKEN=.*$/m, `GOOGLE_REFRESH_TOKEN=${refreshToken}`)
    } else {
      envContent += `\nGOOGLE_REFRESH_TOKEN=${refreshToken}\n`
    }
    writeFileSync(envFile, envContent, 'utf8')
    console.log(`💾 Variável GOOGLE_REFRESH_TOKEN atualizada no .env`)
  }
}

async function handleCode(code) {
  try {
    console.log('\n⏳ Trocando código de autorização por tokens...')
    const { tokens } = await oauth2Client.getToken(code.trim())
    
    if (tokens.refresh_token) {
      saveRefreshToken(tokens.refresh_token)
    } else {
      console.warn('⚠️ O Google não retornou refresh_token (provavelmente já concedido anteriormente).')
      console.warn('   Se necessário, revogue o acesso do app na sua Conta Google e tente novamente.')
    }

    oauth2Client.setCredentials(tokens)
    const classroom = google.classroom({ version: 'v1', auth: oauth2Client })

    console.log('⏳ Testando conexão com a API do Google Classroom...')
    const res = await classroom.courses.list({ pageSize: 5 })
    const courses = res.data.courses || []
    console.log(`\x1b[32m✅ Conexão bem-sucedida! ${courses.length} curso(s) encontrado(s).\x1b[0m`)
    if (courses.length > 0) {
      courses.forEach(c => console.log(`   - [${c.id}] ${c.name}`))
    }
    console.log('\n🎉 Integração finalizada com sucesso!\n')
    process.exit(0)
  } catch (err) {
    console.error(`\x1b[31m❌ Erro na autenticação: ${err.message}\x1b[0m`)
    process.exit(1)
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

rl.question('\nCole o código retornado aqui (ou pressione Ctrl+C para cancelar): ', async (code) => {
  rl.close()
  if (!code || !code.trim()) {
    console.error('Código vazio. Operação cancelada.')
    process.exit(1)
  }
  await handleCode(code.trim())
})
