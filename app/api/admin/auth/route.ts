// app/api/admin/auth/route.ts
//
// Login del panel. Verifica la contraseña (hash PBKDF2 o legado en tiempo constante),
// limita intentos por IP y emite una cookie con un token firmado y con expiración.
// La cookie es HttpOnly (no la lee JavaScript), Secure en producción y SameSite=Strict
// (el panel y la API comparten origen, así que no se envía desde otros sitios).

import { NextRequest, NextResponse } from 'next/server'
import {
  ADMIN_COOKIE,
  SESSION_TTL_SECONDS,
  clearLoginFailures,
  clientIp,
  createSessionToken,
  isAdminAuthConfigured,
  loginRetryAfterSeconds,
  recordLoginFailure,
  verifyAdminPassword,
} from '@/lib/admin-session'

export async function POST(request: NextRequest) {
  if (!isAdminAuthConfigured()) {
    // Fail-closed: sin secreto de sesión o sin contraseña no se puede entrar al panel.
    return NextResponse.json(
      { success: false, message: 'El acceso de administrador no está configurado en el servidor.' },
      { status: 503 }
    )
  }

  const ip = clientIp(request.headers)
  const retryAfter = loginRetryAfterSeconds(ip)
  if (retryAfter > 0) {
    return NextResponse.json(
      { success: false, message: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  let password: unknown
  try {
    ;({ password } = await request.json())
  } catch {
    return NextResponse.json({ success: false, message: 'Solicitud inválida.' }, { status: 400 })
  }

  if (!(await verifyAdminPassword(password))) {
    recordLoginFailure(ip)
    return NextResponse.json({ success: false, message: 'Contraseña incorrecta' }, { status: 401 })
  }

  clearLoginFailures(ip)
  const response = NextResponse.json({ success: true })
  response.cookies.set(ADMIN_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
  response.headers.set('Cache-Control', 'no-store')
  return response
}
