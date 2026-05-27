// app/api/accesorios/route.ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('accesorios')
    .select('*')
    .eq('disponible', true)
    .order('nombre')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ accesorios: data })
}
