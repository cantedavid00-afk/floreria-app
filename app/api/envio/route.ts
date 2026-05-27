// app/api/envio/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// ── GET: Cargar datos iniciales para la interfaz
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

// ── POST: Buscar CP y obtener precio automáticamente
export async function POST(req: NextRequest) {
  try {
    const { codigo_postal } = await req.json();

    if (!codigo_postal) {
      return NextResponse.json({ error: 'Falta código postal.' }, { status: 400 });
    }

    // Normalizamos el CP a 5 dígitos
    const cpString = String(codigo_postal).trim().padStart(5, '0');

    // 1. Buscar CP: .limit(1) soluciona el problema de múltiples colonias por CP
    const { data: cpData, error: cpError } = await supabaseAdmin
      .from('catalogo_cp')
      .select('cp, asentamiento, zona_id')
      .eq('cp', cpString)
      .limit(1)
      .maybeSingle();

    if (cpError || !cpData) {
      return NextResponse.json({ 
        encontrado: false, 
        mensaje: `CP ${cpString} no encontrado en el catálogo.` 
      });
    }

    // 2. Verificar que tenga zona asignada
    if (!cpData.zona_id) {
      return NextResponse.json({ 
        encontrado: false, 
        mensaje: 'Este CP existe pero no tiene una zona de envío asignada.' 
      });
    }

    // 3. Buscar la configuración de precio en zonas_envio
    const { data: zonaData, error: zonaError } = await supabaseAdmin
      .from('zonas_envio')
      .select('*')
      .eq('id', cpData.zona_id)
      .single();

    if (zonaError || !zonaData) {
      return NextResponse.json({ encontrado: false, mensaje: 'Zona no encontrada.' });
    }

    // 4. Respuesta exitosa
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
    console.error('Error interno en API:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
