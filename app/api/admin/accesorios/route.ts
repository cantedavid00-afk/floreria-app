// app/api/admin/accesorios/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('accesorios').select('*').order('nombre')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ accesorios: data })
}

export async function POST(req: NextRequest) {
  const { nombre, emoji, precio_unit } = await req.json()
  const { data, error } = await supabaseAdmin
    .from('accesorios')
    .insert({ nombre, emoji, precio_unit: parseFloat(precio_unit) })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ accesorio: data })
}

export async function PATCH(req: NextRequest) {
  const { id, nombre, emoji, precio_unit, disponible } = await req.json()
  const campos: Record<string, unknown> = {}
  if (nombre     != null) campos.nombre      = nombre
  if (emoji      != null) campos.emoji       = emoji
  if (precio_unit!= null) campos.precio_unit = parseFloat(precio_unit)
  if (disponible != null) campos.disponible  = disponible
  const { data, error } = await supabaseAdmin
    .from('accesorios').update(campos).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ accesorio: data })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  const { error } = await supabaseAdmin.from('accesorios').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
