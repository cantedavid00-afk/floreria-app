// Pruebas de autorización del panel (sin red, sin Supabase, sin credenciales reales).
// Ejecutar: npm run test:security

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  createSessionToken,
  verifySessionToken,
  decideAdminAccess,
  verifyAdminPassword,
  hashAdminPassword,
  isAdminAuthConfigured,
  recordLoginFailure,
  loginRetryAfterSeconds,
  clearLoginFailures,
  LOGIN_MAX_FAILURES,
  SESSION_TTL_SECONDS,
} from '../lib/admin-session.ts'

const ENV = { ADMIN_SESSION_SECRET: 'secreto-de-prueba-solo-para-tests-0123456789abcdef' }
const HOST = 'floreria.example.com'
const ADMIN_API = ['/api/admin/flores', '/api/admin/papel', '/api/admin/tamanos', '/api/admin/accesorios']

test('la cookie antigua "true" ya no da acceso (vulnerabilidad original)', async () => {
  for (const pathname of [...ADMIN_API, '/admin']) {
    const d = await decideAdminAccess({ pathname, method: 'GET', token: 'true', host: HOST }, ENV)
    assert.notEqual(d, 'allow', `${pathname} no debe aceptar admin_session=true`)
  }
})

test('sin sesión: API admin → 401 y páginas admin → login', async () => {
  for (const pathname of ADMIN_API) {
    for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) {
      assert.equal(await decideAdminAccess({ pathname, method, token: undefined, host: HOST }, ENV), 'unauthorized')
    }
  }
  assert.equal(await decideAdminAccess({ pathname: '/admin', method: 'GET', host: HOST }, ENV), 'redirect-login')
  assert.equal(await decideAdminAccess({ pathname: '/ADMIN', method: 'GET', host: HOST }, ENV), 'redirect-login')
})

test('token válido: acceso permitido; firmado con otro secreto o manipulado: rechazado', async () => {
  const token = await createSessionToken(ENV)
  assert.equal(await verifySessionToken(token, ENV), true)
  assert.equal(await decideAdminAccess({ pathname: '/api/admin/flores', method: 'GET', token, host: HOST }, ENV), 'allow')

  const foreign = await createSessionToken({ ADMIN_SESSION_SECRET: 'otro-secreto-distinto-de-al-menos-32-caracteres!!' })
  assert.equal(await verifySessionToken(foreign, ENV), false)

  const [body, sig] = token.split('.')
  assert.equal(await verifySessionToken(`${body}x.${sig}`, ENV), false)
  assert.equal(await verifySessionToken(`${body}.${sig.slice(0, -2)}AA`, ENV), false)
  assert.equal(await verifySessionToken('basura', ENV), false)
})

test('sesión expirada: rechazada', async () => {
  const issuedAt = Date.now() - (SESSION_TTL_SECONDS + 60) * 1000
  const token = await createSessionToken(ENV, issuedAt)
  assert.equal(await verifySessionToken(token, ENV), false)
  assert.equal(await decideAdminAccess({ pathname: '/api/admin/flores', method: 'GET', token, host: HOST }, ENV), 'unauthorized')
})

test('CSRF: mutación con Origin de otro sitio → 403 aunque la cookie sea válida', async () => {
  const token = await createSessionToken(ENV)
  const base = { pathname: '/api/admin/flores', token, host: HOST }
  assert.equal(await decideAdminAccess({ ...base, method: 'DELETE', origin: 'https://evil.example' }, ENV), 'forbidden')
  assert.equal(await decideAdminAccess({ ...base, method: 'PATCH', origin: `https://${HOST}` }, ENV), 'allow')
  assert.equal(await decideAdminAccess({ ...base, method: 'GET', origin: 'https://evil.example' }, ENV), 'allow')
})

test('rutas públicas y login no se ven afectadas', async () => {
  for (const pathname of ['/', '/cotizador', '/api/cotizar', '/api/flores', '/api/tamanos', '/api/envio', '/api/papel', '/api/accesorios', '/api/cron/limpiar', '/admin/login', '/api/admin/auth']) {
    assert.equal(await decideAdminAccess({ pathname, method: 'POST', host: HOST }, ENV), 'allow', pathname)
  }
})

test('sin ADMIN_SESSION_SECRET: no se emiten ni aceptan sesiones (fail-closed)', async () => {
  assert.equal(isAdminAuthConfigured({ ADMIN_PASSWORD: 'x' }), false)
  await assert.rejects(() => createSessionToken({}))
  const token = await createSessionToken(ENV)
  assert.equal(await verifySessionToken(token, {}), false)
  assert.equal(await verifySessionToken(token, { ADMIN_SESSION_SECRET: 'corto' }), false)
})

test('contraseña: hash PBKDF2 y legado; incorrecta no valida', async () => {
  const hash = await hashAdminPassword('clave-de-prueba-larga-1')
  const env = { ...ENV, ADMIN_PASSWORD_HASH: hash }
  assert.equal(await verifyAdminPassword('clave-de-prueba-larga-1', env), true)
  assert.equal(await verifyAdminPassword('clave-de-prueba-larga-2', env), false)
  assert.equal(await verifyAdminPassword('legado-123', { ...ENV, ADMIN_PASSWORD: 'legado-123' }), true)
  assert.equal(await verifyAdminPassword('legado-12', { ...ENV, ADMIN_PASSWORD: 'legado-123' }), false)
  assert.equal(await verifyAdminPassword(undefined, env), false)
  assert.equal(await verifyAdminPassword(true, { ...ENV, ADMIN_PASSWORD: 'true' }), false)
})

test('límite de intentos: bloquea tras 5 fallos por IP', () => {
  clearLoginFailures()
  for (let i = 0; i < LOGIN_MAX_FAILURES - 1; i++) recordLoginFailure('1.2.3.4')
  assert.equal(loginRetryAfterSeconds('1.2.3.4'), 0)
  recordLoginFailure('1.2.3.4')
  assert.ok(loginRetryAfterSeconds('1.2.3.4') > 0)
  assert.equal(loginRetryAfterSeconds('5.6.7.8'), 0)
  clearLoginFailures('1.2.3.4')
  assert.equal(loginRetryAfterSeconds('1.2.3.4'), 0)
})
