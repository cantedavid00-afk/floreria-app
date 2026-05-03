import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const [{ data: zonas }, { data: sucursales }] = await Promise.all([
    supabaseAdmin.from('zonas_envio').select('*').order('precio'),
    supabaseAdmin.from('sucursales').select('*').eq('activa', true),
  ])
  return NextResponse.json({ zonas: zonas ?? [], sucursales: sucursales ?? [] })
}

export async function POST(req: NextRequest) {
  const { codigo_postal } = await req.json()
  if (!codigo_postal)
    return NextResponse.json({ error: 'Falta código postal.' }, { status: 400 })

  // Buscar zona que contenga el código postal
  const { data: zonas } = await supabaseAdmin
    .from('zonas_envio')
    .select('*')

  const zona = zonas?.find((z) =>
    z.codigos_postales.includes(String(codigo_postal).trim())
  )

  if (!zona) {
    return NextResponse.json({
      encontrado: false,
      mensaje: 'Código postal no disponible para entrega. Puedes recoger en sucursal.',
    })
  }

  return NextResponse.json({
    encontrado: true,
    zona: {
      id:          zona.id,
      nombre:      zona.nombre,
      descripcion: zona.descripcion,
      precio:      zona.precio,
    },
  })
}