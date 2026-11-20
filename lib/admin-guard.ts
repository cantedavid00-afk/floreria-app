// lib/admin-guard.ts
// Verificación de sesión dentro de cada route handler de /api/admin/*.
// Es defensa en profundidad: proxy.ts ya filtra estas rutas, pero si el matcher
// cambia o falla, los handlers que modifican el catálogo siguen protegidos.

import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, decideAdminAccess } from './admin-session'

export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  const decision = await decideAdminAccess({
    pathname: req.nextUrl.pathname,
    method: req.method,
    token: req.cookies.get(ADMIN_COOKIE)?.value,
    origin: req.headers.get('origin'),
    host: req.headers.get('host'),
  })
  if (decision === 'allow') return null
  if (decision === 'forbidden') {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 })
  }
  return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
}
