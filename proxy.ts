// proxy.ts
// Protege las páginas /admin y las rutas /api/admin verificando la firma y la
// expiración del token de sesión (antes bastaba con una cookie "true").
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ADMIN_COOKIE, decideAdminAccess } from './lib/admin-session'

export async function proxy(request: NextRequest) {
  const decision = await decideAdminAccess({
    pathname: request.nextUrl.pathname,
    method: request.method,
    token: request.cookies.get(ADMIN_COOKIE)?.value,
    origin: request.headers.get('origin'),
    host: request.headers.get('host'),
  })

  if (decision === 'allow') return NextResponse.next()
  if (decision === 'forbidden') {
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 })
  }
  if (decision === 'unauthorized') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }
  return NextResponse.redirect(new URL('/admin/login', request.url))
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
