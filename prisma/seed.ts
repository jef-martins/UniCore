import 'dotenv/config'

import argon2 from 'argon2'
import { AccessRole, PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const initialUsers = [
  { username: 'master', email: 'master@unicore.local', role: AccessRole.MASTER },
  { username: 'admin', email: 'admin@unicore.local', role: AccessRole.ADMIN },
  { username: 'tesouraria', email: 'tesouraria@unicore.local', role: AccessRole.TESOURARIA },
  { username: 'vestibular', email: 'vestibular@unicore.local', role: AccessRole.VESTIBULAR },
] as const

async function main(): Promise<void> {
  const defaultPassword = process.env['SEED_DEFAULT_PASSWORD']
  if (!defaultPassword) {
    throw new Error('SEED_DEFAULT_PASSWORD não configurada para o seed inicial.')
  }

  const passwordHash = await argon2.hash(defaultPassword, { type: argon2.argon2id })

  for (const user of initialUsers) {
    await prisma.user.upsert({
      where: { username: user.username },
      create: { ...user, passwordHash },
      update: { email: user.email, role: user.role, isActive: true },
    })
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error)
    await prisma.$disconnect()
    process.exitCode = 1
  })
