// lib/admin-session.ts
//
// Sesión del panel de administración.
//
// Antes la cookie `admin_session` valía literalmente "true", así que cualquiera
// podía fabricarla. Ahora contiene un token firmado con HMAC-SHA256
// (ADMIN_SESSION_SECRET) y con fecha de expiración, que el servidor verifica en
// cada petición. Usa Web Crypto para funcionar igual en `proxy.ts` y en los
// route handlers, y no importa nada para poder probarse con Node sin Next.js.

export const ADMIN_COOKIE = 'admin_session'
export const SESSION_TTL_SECONDS = 8 * 60 * 60
const MIN_SECRET_LENGTH = 32
const TOKEN_VERSION = 1

type Env = Record<string, string | undefined>

const encoder = new TextEncoder()

function getSecret(env: Env): string | null {
  const secret = env.ADMIN_SESSION_SECRET ?? ''
  return secret.length >= MIN_SECRET_LENGTH ? secret : null
}

export function isAdminAuthConfigured(env: Env = process.env): boolean {
  return getSecret(env) !== null && Boolean(env.ADMIN_PASSWORD_HASH || env.ADMIN_PASSWORD)
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4)
  try {
    const bin = atob(b64)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
  } catch {
    return null
  }
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(data)))
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

// ─── Tokens ────────────────────────────────────────────────────────────────

export async function createSessionToken(env: Env = process.env, now: number = Date.now()): Promise<string> {
  const secret = getSecret(env)
  if (!secret) throw new Error('ADMIN_SESSION_SECRET no configurado')
  const nonce = new Uint8Array(16)
  crypto.getRandomValues(nonce)
  const payload = {
    v: TOKEN_VERSION,
    sub: 'admin',
    iat: now,
    exp: now + SESSION_TTL_SECONDS * 1000,
    jti: toBase64Url(nonce),
  }
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)))
  return `${body}.${toBase64Url(await hmac(secret, body))}`
}

export async function verifySessionToken(
  token: string | undefined | null,
  env: Env = process.env,
  now: number = Date.now()
): Promise<boolean> {
  const secret = getSecret(env)
  if (!secret || !token) return false
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [body, sig] = parts
  const given = fromBase64Url(sig)
  if (!given || !constantTimeEqual(given, await hmac(secret, body))) return false
  const raw = fromBase64Url(body)
  if (!raw) return false
  try {
    const payload = JSON.parse(new TextDecoder().decode(raw))
    return payload.v === TOKEN_VERSION && payload.sub === 'admin' &&
      typeof payload.exp === 'number' && payload.exp > now
  } catch {
    return false
  }
}

// ─── Contraseña ────────────────────────────────────────────────────────────
// Preferido: ADMIN_PASSWORD_HASH = "pbkdf2$<iteraciones>$<salt>$<hash>" (base64url,
// PBKDF2-SHA256). Legado: ADMIN_PASSWORD en texto plano, comparado en tiempo constante.

const PBKDF2_ITERATIONS = 310_000

async function pbkdf2(password: string, salt: Uint8Array, iterations: number, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, key, length * 8
  )
  return new Uint8Array(bits)
}

export async function hashAdminPassword(password: string): Promise<string> {
  const salt = new Uint8Array(16)
  crypto.getRandomValues(salt)
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS, 32)
  return ['pbkdf2', PBKDF2_ITERATIONS, toBase64Url(salt), toBase64Url(hash)].join('$')
}

export async function verifyAdminPassword(input: unknown, env: Env = process.env): Promise<boolean> {
  if (typeof input !== 'string' || input.length === 0 || input.length > 512) return false
  const stored = env.ADMIN_PASSWORD_HASH
  if (stored) {
    const [scheme, iterStr, saltB64, hashB64] = stored.split('$')
    const iterations = Number(iterStr)
    const salt = fromBase64Url(saltB64 ?? '')
    const expected = fromBase64Url(hashB64 ?? '')
    if (scheme !== 'pbkdf2' || !Number.isInteger(iterations) || iterations < 100_000 || !salt || !expected) {
      return false
    }
    return constantTimeEqual(await pbkdf2(input, salt, iterations, expected.length), expected)
  }
  const legacy = env.ADMIN_PASSWORD
  const secret = getSecret(env)
  if (!legacy || !secret) return false
  // HMAC de ambos lados: longitud fija, sin filtrar longitud ni contenido por tiempo.
  return constantTimeEqual(await hmac(secret, input), await hmac(secret, legacy))
}

// ─── Política de acceso ────────────────────────────────────────────────────

export type AccessDecision = 'allow' | 'redirect-login' | 'unauthorized' | 'forbidden'

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/**
 * Decide el acceso a rutas de administración. Pura: recibe todo lo necesario.
 * - /admin/login y POST /api/admin/auth son públicas.
 * - /admin/* sin sesión → redirect al login; /api/admin/* sin sesión → 401.
 * - Peticiones que modifican datos con un Origin distinto al host → 403 (CSRF),
 *   como defensa adicional a SameSite=Strict.
 */
export async function decideAdminAccess(
  input: { pathname: string; method: string; token?: string | null; origin?: string | null; host?: string | null },
  env: Env = process.env,
  now: number = Date.now()
): Promise<AccessDecision> {
  const path = input.pathname.toLowerCase()
  const isAdminPage = path === '/admin' || path.startsWith('/admin/')
  const isAdminApi = path === '/api/admin' || path.startsWith('/api/admin/')
  if (!isAdminPage && !isAdminApi) return 'allow'
  if (path === '/admin/login' || path.startsWith('/admin/login/')) return 'allow'
  if (path === '/api/admin/auth' || path === '/api/admin/auth/') return 'allow'

  if (MUTATING.has(input.method.toUpperCase()) && input.origin) {
    let originHost: string | null = null
    try { originHost = new URL(input.origin).host } catch { originHost = null }
    if (!originHost || !input.host || originHost.toLowerCase() !== input.host.toLowerCase()) return 'forbidden'
  }

  if (await verifySessionToken(input.token, env, now)) return 'allow'
  return isAdminApi ? 'unauthorized' : 'redirect-login'
}

// ─── Límite de intentos de login (por instancia) ──────────────────────────

const LOGIN_WINDOW_MS = 15 * 60 * 1000
export const LOGIN_MAX_FAILURES = 5
const failures = new Map<string, { count: number; resetAt: number }>()

export function loginRetryAfterSeconds(ip: string, now: number = Date.now()): number {
  const e = failures.get(ip)
  if (!e || e.resetAt <= now || e.count < LOGIN_MAX_FAILURES) return 0
  return Math.ceil((e.resetAt - now) / 1000)
}

export function recordLoginFailure(ip: string, now: number = Date.now()): void {
  if (failures.size > 10_000) failures.clear()
  const e = failures.get(ip)
  if (!e || e.resetAt <= now) failures.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS })
  else e.count += 1
}

export function clearLoginFailures(ip?: string): void {
  if (ip === undefined) failures.clear()
  else failures.delete(ip)
}

export function clientIp(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || 'unknown'
}
