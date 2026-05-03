import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET — listar todas (incluyendo no disponibles)
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('flores')
    .select('*')
    .order('nombre')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ flores: data })
}

// POST — crear nueva flor
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { nombre, color, precio_unit } = body
  if (!nombre || !color || precio_unit == null)
    return NextResponse.json({ error: 'Faltan campos.' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('flores')
    .insert({ nombre, color, precio_unit: parseFloat(precio_unit) })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ flor: data })
}

// PATCH — actualizar precio o disponibilidad
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, precio_unit, disponible } = body
  if (!id) return NextResponse.json({ error: 'Falta id.' }, { status: 400 })

  const campos: Record<string, unknown> = {}
  if (precio_unit != null) campos.precio_unit = parseFloat(precio_unit)
  if (disponible  != null) campos.disponible  = disponible

  const { data, error } = await supabaseAdmin
    .from('flores')
    .update(campos)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ flor: data })
}

// DELETE — eliminar flor
export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Falta id.' }, { status: 400 })

  const { error } = await supabaseAdmin.from('flores').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}