import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('tamanos_ramo').select('*').order('multiplicador')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tamanos: data })
}

export async function PATCH(req: NextRequest) {
  const { id, precio_extra, flores_base, descripcion } = await req.json()
  const campos: Record<string, unknown> = {}
  if (precio_extra != null) campos.precio_extra = parseFloat(precio_extra)
  if (flores_base  != null) campos.flores_base  = parseInt(flores_base)
  if (descripcion  != null) campos.descripcion  = descripcion
  const { data, error } = await supabaseAdmin
    .from('tamanos_ramo').update(campos).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tamano: data })
}