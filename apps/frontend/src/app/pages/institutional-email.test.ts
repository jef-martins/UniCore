import { describe, expect, it } from 'vitest'

describe('Validação de E-mail Institucional', () => {
  function isInstitutional(email: string): boolean {
    const clean = (email || '').trim().toLowerCase()
    if (!clean.includes('@')) return false
    return (
      clean.endsWith('@faip.edu.br') ||
      /@([a-zA-Z0-9-]+\.)?faip\.edu\.br$/.test(clean) ||
      clean.endsWith('@unicore.local')
    )
  }

  it('deve aceitar e-mails do domínio principal @faip.edu.br', () => {
    expect(isInstitutional('usuario@faip.edu.br')).toBe(true)
    expect(isInstitutional('COORDENACAO@FAIP.EDU.BR')).toBe(true)
    expect(isInstitutional('joao.silva@faip.edu.br')).toBe(true)
  })

  it('deve aceitar subdomínios institucionais como @professor.faip.edu.br e @aluno.faip.edu.br', () => {
    expect(isInstitutional('professor.carlos@professor.faip.edu.br')).toBe(true)
    expect(isInstitutional('marina@aluno.faip.edu.br')).toBe(true)
    expect(isInstitutional('secretaria@pos.faip.edu.br')).toBe(true)
  })

  it('deve aceitar @unicore.local para testes em ambiente de desenvolvimento', () => {
    expect(isInstitutional('teste@unicore.local')).toBe(true)
  })

  it('deve rejeitar e-mails não institucionais e domínios genéricos', () => {
    expect(isInstitutional('usuario@gmail.com')).toBe(false)
    expect(isInstitutional('usuario@hotmail.com')).toBe(false)
    expect(isInstitutional('usuario@yahoo.com.br')).toBe(false)
    expect(isInstitutional('usuario@outlook.com')).toBe(false)
    expect(isInstitutional('usuario@fakefaip.edu.br')).toBe(false)
  })

  it('deve rejeitar entradas vazias ou sem @', () => {
    expect(isInstitutional('')).toBe(false)
    expect(isInstitutional('faip.edu.br')).toBe(false)
    expect(isInstitutional('   ')).toBe(false)
  })
})

describe('Normalização e Geração de E-mail de Aluno', () => {
  function formatStudentEmail(name: string): string {
    const clean = (name || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
    return clean ? `${clean}@aluno.faip.edu.br` : ''
  }

  it('deve normalizar o nome completo removendo acentos e espaços', () => {
    expect(formatStudentEmail('Ana Carolina Jardim Fernandes')).toBe('anacarolinajardimfernandes@aluno.faip.edu.br')
    expect(formatStudentEmail('João da Silva Santos')).toBe('joaodasilvasantos@aluno.faip.edu.br')
    expect(formatStudentEmail('Érica Müller Conceição')).toBe('ericamullerconceicao@aluno.faip.edu.br')
  })

  it('deve remover caracteres especiais, pontuações e apóstrofes', () => {
    expect(formatStudentEmail("Maria D'Ávila-Souza")).toBe('mariadavilasouza@aluno.faip.edu.br')
  })

  it('deve retornar vazio se o nome for vazio ou inválido', () => {
    expect(formatStudentEmail('')).toBe('')
    expect(formatStudentEmail('   ')).toBe('')
  })
})

describe('Payload do Google Workspace Directory API e Troca Obrigatória de Senha', () => {
  function buildWorkspaceUserPayload(email: string, name: string, role: 'PROFESSOR' | 'ALUNO', defaultPassword = 'Faip@2026!') {
    const parts = (name || '').trim().split(/\s+/)
    const givenName = parts[0] || (role === 'PROFESSOR' ? 'Docente' : 'Aluno')
    const familyName = parts.slice(1).join(' ') || 'FAIP'

    return {
      primaryEmail: email.trim().toLowerCase(),
      name: {
        givenName,
        familyName,
      },
      password: defaultPassword,
      changePasswordAtNextLogin: true, // Força a troca no primeiro login
    }
  }

  function detectRoleFromEmail(email: string): 'professor' | 'aluno' | 'coordenacao' {
    const lower = email.trim().toLowerCase()
    if (lower.includes('@professor.') || lower.endsWith('professor.faip.edu.br')) {
      return 'professor'
    }
    if (lower.includes('@coordenacao.') || lower.endsWith('coordenacao.faip.edu.br')) {
      return 'coordenacao'
    }
    return 'aluno'
  }

  it('deve gerar payload com changePasswordAtNextLogin = true e senha padrão', () => {
    const payload = buildWorkspaceUserPayload('danila.berto@professor.faip.edu.br', 'Danila Berto', 'PROFESSOR')
    expect(payload.primaryEmail).toBe('danila.berto@professor.faip.edu.br')
    expect(payload.name.givenName).toBe('Danila')
    expect(payload.name.familyName).toBe('Berto')
    expect(payload.password).toBe('Faip@2026!')
    expect(payload.changePasswordAtNextLogin).toBe(true)
  })

  it('deve preencher sobrenome padrão FAIP se o nome for composto por apenas uma palavra', () => {
    const payload = buildWorkspaceUserPayload('marina@aluno.faip.edu.br', 'Marina', 'ALUNO')
    expect(payload.name.givenName).toBe('Marina')
    expect(payload.name.familyName).toBe('FAIP')
    expect(payload.changePasswordAtNextLogin).toBe(true)
  })

  it('deve identificar corretamente os papéis a partir do subdomínio institucional', () => {
    expect(detectRoleFromEmail('danila.berto@professor.faip.edu.br')).toBe('professor')
    expect(detectRoleFromEmail('joao.silva@aluno.faip.edu.br')).toBe('aluno')
    expect(detectRoleFromEmail('coordenacao.pedagogia@coordenacao.faip.edu.br')).toBe('coordenacao')
    expect(detectRoleFromEmail('aluno123@faip.edu.br')).toBe('aluno')
  })
})
