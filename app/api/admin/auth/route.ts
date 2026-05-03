// app/api/admin/auth/route.ts

import { NextResponse } from 'next/server'

import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { password } = await request.json()
    const adminPass = process.env.ADMIN_PASSWORD

    // Comparamos la contraseña que escribió con la del .env
    if (password === adminPass) {
      
      // 🔥 LA SOLUCIÓN: Agregamos "await" porque en Next.js nuevo es asíncrono
      const cookieStore = await cookies()
      
      cookieStore.set('admin_session', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 // 24 horas
      })
      
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, message: 'Contraseña incorrecta' }, { status: 401 })
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}