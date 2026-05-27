// app/api/cron/limpiar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    // Borrar imágenes de más de 7 días
    const hace7dias = new Date()
    hace7dias.setDate(hace7dias.getDate() - 7)

    const { data: cotizaciones } = await supabaseAdmin
      .from('cotizaciones')
      .select('id, imagen_path')
      .lt('created_at', hace7dias.toISOString())
      .not('imagen_path', 'is', null)
      .limit(50)

    if (!cotizaciones || cotizaciones.length === 0) {
      return NextResponse.json({ ok: true, eliminadas: 0 })
    }

    const paths = cotizaciones
      .map(c => c.imagen_path)
      .filter(Boolean) as string[]

    await supabaseAdmin.storage
      .from('imagenes-cotizaciones')
      .remove(paths)

    await supabaseAdmin
      .from('cotizaciones')
      .update({ imagen_path: null })
      .in('id', cotizaciones.map(c => c.id))

    return NextResponse.json({ ok: true, eliminadas: paths.length })

  } catch (error) {
    console.error('[Cron]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
