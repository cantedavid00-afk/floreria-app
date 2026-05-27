import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// ── GET: Cargar sucursales y zonas iniciales
export async function GET() {
  const [{ data: zonas }, { data: sucursales }] = await Promise.all([
    supabaseAdmin.from('zonas_envio').select('*').order('precio'),
    supabaseAdmin.from('sucursales').select('*').eq('activa', true),
  ]);
  return NextResponse.json({ zonas: zonas ?? [], sucursales: sucursales ?? [] });
}

// ── POST: Buscar CP y obtener precio automáticamente
export async function POST(req: NextRequest) {
  try {
    const { codigo_postal } = await req.json();

    if (!codigo_postal) {
      return NextResponse.json({ error: 'Falta código postal.' }, { status: 400 });
    }

    // Buscamos el CP en la tabla maestra 'catalogo_cp' 
    // y hacemos un JOIN hacia 'zonas_envio' para obtener el precio relacionado
    const { data, error } = await supabaseAdmin
      .from('catalogo_cp')
      .select(`
        cp,
        asentamiento,
        zonas_envio (
          id,
          nombre,
          descripcion,
          precio
        )
      `)
      .eq('cp', String(codigo_postal).trim())
      .single();
    console.log("Datos de Supabase recibidos:", JSON.stringify(data, null, 2));

    if (error || !data || !data.zonas_envio) {
       // ...
    }
    
    const zonaData = data.zonas_envio;

    // Si hay error en la consulta o el CP no existe
    if (error || !data || !data.zonas_envio) {
      return NextResponse.json({
        encontrado: false,
        mensaje: 'Código postal no disponible para entrega a domicilio.',
      });
    }

    // Extraemos la información de la zona que viene relacionada
    const zona = data.zonas_envio;

    return NextResponse.json({
      encontrado: true,
      zona: {
        id: zona.id,
        nombre: zona.nombre,
        descripcion: zona.descripcion,
        precio: zona.precio,
      },
    });
    
  } catch (err) {
    console.error('Error en API de envío:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
