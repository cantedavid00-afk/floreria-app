// app/api/envio/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// ── GET: Cargar datos iniciales
export async function GET() {
  try {
    const [{ data: zonas }, { data: sucursales }] = await Promise.all([
      supabaseAdmin.from('zonas_envio').select('*').order('precio'),
      supabaseAdmin.from('sucursales').select('*').eq('activa', true),
    ]);

    return NextResponse.json({ 
      zonas: zonas ?? [], 
      sucursales: sucursales ?? [] 
    });
  } catch (error) {
    console.error('Error en GET:', error);
    return NextResponse.json({ error: 'Error al cargar datos' }, { status: 500 });
  }
}

// ── POST: Buscar CP (Lógica en dos pasos para mayor seguridad)
export async function POST(req: NextRequest) {
  try {
    const { codigo_postal } = await req.json();

    if (!codigo_postal) {
      return NextResponse.json({ error: 'Falta código postal.' }, { status: 400 });
    }

    const cpString = String(codigo_postal).trim();

    // 1. Buscar CP
    const { data: cpData, error: cpError } = await supabaseAdmin
      .from('catalogo_cp')
      .select('cp, asentamiento, zona_id')
      .eq('cp', cpString)
      .maybeSingle();

    if (cpError || !cpData) {
      return NextResponse.json({ encontrado: false, mensaje: 'CP no encontrado.' });
    }

    // 2. Buscar Zona manualmente
    const { data: zonaData, error: zonaError } = await supabaseAdmin
      .from('zonas_envio')
      .select('*')
      .eq('id', cpData.zona_id)
      .single();

    if (zonaError || !zonaData) {
      return NextResponse.json({ encontrado: false, mensaje: 'Zona no encontrada para este CP.' });
    }

    return NextResponse.json({
      encontrado: true,
      zona: {
        id: zonaData.id,
        nombre: zonaData.nombre_zona,
        descripcion: `Zona de entrega para ${cpData.asentamiento}`,
        precio: zonaData.precio,
      },
    });
    
  } catch (err) {
    console.error('Error en API:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
