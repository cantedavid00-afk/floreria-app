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

// ── POST: Buscar CP y obtener precio automáticamente
export async function POST(req: NextRequest) {
  try {
    const { codigo_postal } = await req.json();

    if (!codigo_postal) {
      return NextResponse.json({ error: 'Falta código postal.' }, { status: 400 });
    }

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
      .eq('cp', String(codigo_postal).trim().padStart(5, '0'))
      .maybeSingle();

    // ── VALIDACIÓN PRIMERO ──
    // Si hay error, o data es null, o no existe la relación, regresamos error.
    if (error || !data || !data.zonas_envio) {
      return NextResponse.json({
        encontrado: false,
        mensaje: 'Código postal no disponible para entrega a domicilio.',
      });
    }

    // ── ACCESO SEGURO DESPUÉS ──
    // Ahora que sabemos que data existe, podemos acceder a zonas_envio
    const zonaData = data.zonas_envio;
    const zona = Array.isArray(zonaData) ? zonaData[0] : zonaData;

    if (!zona) {
       return NextResponse.json({ encontrado: false, mensaje: 'Zona no definida.' });
    }

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
    console.error('Error en API de envío:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
