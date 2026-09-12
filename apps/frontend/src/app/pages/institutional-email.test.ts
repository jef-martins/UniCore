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
