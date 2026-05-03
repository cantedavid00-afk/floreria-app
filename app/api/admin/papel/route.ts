import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('papel_envoltura').select('*').order('nombre')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ papeles: data })
}

export async function POST(req: NextRequest) {
  const { nombre, precio_unit } = await req.json()
  const { data, error } = await supabaseAdmin
    .from('papel_envoltura')
    .insert({ nombre, precio_unit: parseFloat(precio_unit) })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ papel: data })
}

export async function PATCH(req: NextRequest) {
  const { id, precio_unit, disponible } = await req.json()
  const campos: Record<string, unknown> = {}
  if (precio_unit != null) campos.precio_unit = parseFloat(precio_unit)
  if (disponible  != null) campos.disponible  = disponible
  const { data, error } = await supabaseAdmin
    .from('papel_envoltura').update(campos).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ papel: data })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  const { error } = await supabaseAdmin.from('papel_envoltura').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}