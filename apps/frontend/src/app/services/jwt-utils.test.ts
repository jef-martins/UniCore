import { describe, expect, it, beforeEach, vi } from 'vitest'
import { isTokenExpired, parseJwtPayload } from './jwt-utils'

function createFakeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `${header}.${body}.signature`
}

describe('jwt-utils', () => {
  it('decodifica corretamente o payload de um token JWT válido', () => {
    const payload = { sub: '123', username: 'pedro', role: 'admin', exp: 1999999999 }
    const token = createFakeJwt(payload)

    const parsed = parseJwtPayload(token)
    expect(parsed).toMatchObject(payload)
  })

  it('retorna null para tokens nulos, vazios ou mal formatados', () => {
    expect(parseJwtPayload(null)).toBeNull()
    expect(parseJwtPayload('')).toBeNull()
    expect(parseJwtPayload('token-invalido-sem-pontos')).toBeNull()
    expect(parseJwtPayload('a.b')).toBeNull()
  })

  it('identifica token expirado quando exp está no passado', () => {
    const nowInSeconds = Math.floor(Date.now() / 1000)
    const expiredToken = createFakeJwt({
      sub: '123',
      exp: nowInSeconds - 3600, // 1 hora atrás
    })

    expect(isTokenExpired(expiredToken)).toBe(true)
  })

  it('identifica token válido quando exp está no futuro distante', () => {
    const nowInSeconds = Math.floor(Date.now() / 1000)
    const validToken = createFakeJwt({
      sub: '123',
      exp: nowInSeconds + 3600, // daqui a 1 hora
    })

    expect(isTokenExpired(validToken)).toBe(false)
  })

  it('considera expirado quando está dentro da margem de segurança de 5 segundos', () => {
    const nowInSeconds = Math.floor(Date.now() / 1000)
    const borderlineToken = createFakeJwt({
      sub: '123',
      exp: nowInSeconds + 3, // expira em 3s, menor que a margem de 5s
    })

    expect(isTokenExpired(borderlineToken, 5)).toBe(true)
  })

  it('considera expirado se o token não tiver atributo exp', () => {
    const tokenWithoutExp = createFakeJwt({
      sub: '123',
      username: 'usuario',
    })

    expect(isTokenExpired(tokenWithoutExp)).toBe(true)
  })

  it('considera expirado se o token for null ou undefined', () => {
    expect(isTokenExpired(null)).toBe(true)
    expect(isTokenExpired(undefined)).toBe(true)
  })
})
