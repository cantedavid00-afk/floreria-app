// app/api/envio/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// ── GET: Cargar sucursales y zonas iniciales
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
    console.error('Error en GET de envío:', error);
    return NextResponse.json({ error: 'Error al cargar datos iniciales' }, { status: 500 });
  }
}

// ── POST: Buscar CP con normalización de formato
export async function POST(req: NextRequest) {
  try {
    const { codigo_postal } = await req.json();

    if (!codigo_postal) {
      return NextResponse.json({ error: 'Falta código postal.' }, { status: 400 });
    }

    // Normalizamos: trim elimina espacios, padStart asegura 5 dígitos (ej: 90300)
    const cpString = String(codigo_postal).trim().padStart(5, '0');

    // 1. Buscar CP en la tabla maestra
    const { data: cpData, error: cpError } = await supabaseAdmin
      .from('catalogo_cp')
      .select('cp, asentamiento, zona_id')
      .eq('cp', cpString)
      .maybeSingle();

    if (cpError || !cpData) {
      return NextResponse.json({ 
        encontrado: false, 
        mensaje: `CP ${cpString} no encontrado en el catálogo.` 
      });
    }

    // 2. Buscar Zona manualmente usando el ID obtenido
    if (!cpData.zona_id) {
      return NextResponse.json({ 
        encontrado: false, 
        mensaje: 'Este CP existe pero no tiene una zona de envío asignada.' 
      });
    }

    const { data: zonaData, error: zonaError } = await supabaseAdmin
      .from('zonas_envio')
      .select('*')
      .eq('id', cpData.zona_id)
      .single();

    if (zonaError || !zonaData) {
      return NextResponse.json({ encontrado: false, mensaje: 'Zona no encontrada.' });
    }

    // 3. Respuesta exitosa
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
