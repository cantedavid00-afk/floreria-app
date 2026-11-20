// app/api/admin/logout/route.ts
// Borra la cookie de sesión del navegador. El token es sin estado: si alguien lo
// hubiera copiado seguiría siendo válido hasta su expiración (8 h); para invalidar
// todas las sesiones de inmediato se rota ADMIN_SESSION_SECRET.
import { NextResponse } from 'next/server'
import { ADMIN_COOKIE } from '@/lib/admin-session'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(ADMIN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  })
  return response
}
