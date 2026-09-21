export interface JwtTokenPayload {
  sub?: string
  username?: string
  role?: string
  iat?: number
  exp?: number
  [key: string]: unknown
}

/**
 * Decodifica com segurança o payload de um token JWT.
 */
export function parseJwtPayload<T extends JwtTokenPayload = JwtTokenPayload>(
  token: string | null | undefined,
): T | null {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length < 2) return null

  try {
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4 !== 0) {
      base64 += '='
    }
    const binary = atob(base64)
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    const jsonStr = new TextDecoder().decode(bytes)
    return JSON.parse(jsonStr) as T
  } catch {
    return null
  }
}

/**
 * Verifica se o token JWT está expirado com base no campo `exp` (timestamp em segundos).
 * @param token O token JWT a ser validado
 * @param marginSeconds Margem de segurança em segundos (padrão 5 segundos)
 */
export function isTokenExpired(
  token: string | null | undefined,
  marginSeconds = 5,
): boolean {
  if (!token || typeof token !== 'string') return true
  const payload = parseJwtPayload(token)
  if (!payload) return true
  if (typeof payload.exp !== 'number') {
    // Tokens sem o atributo exp são considerados inválidos/expirados por segurança
    return true
  }

  const expirationMs = (payload.exp - marginSeconds) * 1000
  return expirationMs <= Date.now()
}
