import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { detectarFlores } from '@/lib/huggingface'
import { obtenerCatalogo, construirCotizacion } from '@/lib/cotizador'
import { v4 as uuidv4 } from 'uuid'


export const maxDuration = 10

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const archivo  = formData.get('imagen') as File | null
    const tamanoId = formData.get('tamano_id') as string | null

    if (!archivo) {
      return NextResponse.json({ error: 'No se recibió ninguna imagen.' }, { status: 400 })
    }

    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp']
    if (!tiposPermitidos.includes(archivo.type)) {
      return NextResponse.json({ error: 'Solo JPG, PNG o WEBP.' }, { status: 400 })
    }
    if (archivo.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'La imagen no debe superar 5 MB.' }, { status: 400 })
    }

    const buffer      = await archivo.arrayBuffer()
    const extension   = archivo.name.split('.').pop() ?? 'jpg'
    const rutaArchivo = `cotizaciones/${uuidv4()}.${extension}`

    // Subir imagen original a Storage
    const { error: errorStorage } = await supabaseAdmin.storage
      .from('imagenes-cotizaciones')
      .upload(rutaArchivo, buffer, { contentType: archivo.type, upsert: false })

    if (errorStorage) {
      console.error('[Storage] Error:', errorStorage)
      return NextResponse.json({ error: 'Error al subir la imagen.' }, { status: 500 })
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('imagenes-cotizaciones')
      .getPublicUrl(rutaArchivo)

    // Llamar a la IA
    const resultadoIA = await detectarFlores(buffer, 55000)

    // Obtener catálogo
    const { flores, papeles, tamanos } = await obtenerCatalogo()

    // En obtenerCatalogo (lib/cotizador.ts), agrega accesorios:
    const [{ data: flores }, { data: papeles }, { data: tamanos }, { data: accesorios }] =
      await Promise.all([
        supabaseAdmin.from('flores').select('*').eq('disponible', true).order('nombre'),
        supabaseAdmin.from('papel_envoltura').select('*').eq('disponible', true).order('nombre'),
        supabaseAdmin.from('tamanos_ramo').select('*').order('multiplicador'),
        supabaseAdmin.from('accesorios').select('*').eq('disponible', true).order('nombre'),
      ])
    
    return {
      flores:     flores     ?? [],
      papeles:    papeles    ?? [],
      tamanos:    tamanos    ?? [],
      accesorios: accesorios ?? [],
    }
    
    // Y en el return del route.ts agrega accesorios al catálogo:
    catalogo: { flores, papeles, tamanos, accesorios },

    

    if (flores.length === 0) {
      return NextResponse.json({ error: 'No hay flores en el catálogo.' }, { status: 500 })
    }

    const tamanoElegido =
      tamanos.find((t) => t.id === tamanoId) ??
      tamanos.find((t) => t.clave === 'M') ??
      tamanos[0]

    const papelDefault =
      papeles.find((p) => p.nombre === 'Kraft Natural') ?? papeles[0]

    const cotizacionBase = construirCotizacion(
      resultadoIA.flores_detectadas,
      flores,
      papelDefault,
      tamanoElegido
    )

    const { data: guardada } = await supabaseAdmin
      .from('cotizaciones')
      .insert({
        imagen_url:  urlData.publicUrl,
        imagen_path: rutaArchivo,
        detalle:     cotizacionBase.detalle,
        papel_id:    papelDefault.id,
        total:       cotizacionBase.total,
        estado:      'borrador',
      })
      .select()
      .single()

    return NextResponse.json({
      ok:            true,
      cotizacion_id: guardada?.id ?? null,
      imagen_url:    urlData.publicUrl,
      imagen_path:   rutaArchivo,
      ia_exitosa:    resultadoIA.exitoso,
      ia_mensaje:    resultadoIA.mensaje_debug ?? null,
      ...cotizacionBase,
      tamano:        tamanoElegido,
      catalogo:      { flores, papeles, tamanos },
    })

  } catch (error) {
    console.error('[/api/cotizar]', error)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}
