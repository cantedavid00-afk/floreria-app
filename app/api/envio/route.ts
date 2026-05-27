// app/api/envio/route.tsimport { NextRequest, NextResponse } from 'next/server';
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

// ── POST: Buscar CP con diagnóstico de errores
export async function POST(req: NextRequest) {
  try {
    const { codigo_postal } = await req.json();

    if (!codigo_postal) {
      return NextResponse.json({ error: 'Falta código postal.' }, { status: 400 });
    }

    const cpString = String(codigo_postal).trim();

    // Consultamos
    const { data, error } = await supabaseAdmin
      .from('catalogo_cp')
      .select(`
        cp,
        asentamiento,
        zonas_envio (
          id,
          nombre_zona,
          precio
        )
      `)
      .eq('cp', cpString)
      .maybeSingle();

    // 1. Error de comunicación con Supabase
    if (error) {
      console.error("Error en Supabase:", error);
      return NextResponse.json({ encontrado: false, mensaje: 'Error de conexión con la base de datos.' });
    }

    // 2. CP no existe
    if (!data) {
      return NextResponse.json({ encontrado: false, mensaje: `CP ${cpString} no encontrado en la base de datos.` });
    }

    // 3. Existe el CP pero no tiene zona (zona_id era NULL)
    if (!data.zonas_envio) {
      return NextResponse.json({ encontrado: false, mensaje: `El CP ${cpString} existe, pero no tiene una zona de envío asignada (zona_id es NULL).` });
    }

    // Si todo está bien, extraemos los datos
    const zonaData = data.zonas_envio;
    const zona = Array.isArray(zonaData) ? zonaData[0] : zonaData;

    return NextResponse.json({
      encontrado: true,
      zona: {
        id: zona.id,
        nombre: zona.nombre_zona,
        descripcion: `Zona de entrega para ${data.asentamiento}`,
        precio: zona.precio,
      },
    });
    
  } catch (err) {
    console.error('Error crítico en API:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
