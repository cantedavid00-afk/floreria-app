// app/api/cotizar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { detectarFlores } from '@/lib/huggingface'
import { obtenerCatalogo, construirCotizacion } from '@/lib/cotizador'
import { v4 as uuidv4 } from 'uuid'

export const maxDuration = 60

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
      return NextResponse.json({ error: 'La imagen no debe superar 10 MB.' }, { status: 400 })
    }

    const buffer      = await archivo.arrayBuffer()
    const extension   = archivo.name.split('.').pop() ?? 'jpg'
    const rutaArchivo = `cotizaciones/${uuidv4()}.${extension}`

    // 1. Subir imagen a Storage
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

    // 2. OBTENER CATÁLOGO PRIMERO (Para enviarlo a la IA)
    const catalogo = await obtenerCatalogo()
    const { flores, papeles, tamanos, accesorios } = catalogo

    if (flores.length === 0) {
      return NextResponse.json({ error: 'No hay flores disponibles en el catálogo.' }, { status: 500 })
    }

    // 3. LLAMAR A LA IA PASÁNDOLE EL CATÁLOGO ACTUAL
    const resultadoIA = await detectarFlores(buffer, flores)

    // 4. Lógica de selección de tamaño y papel
    const tamanoElegido =
      tamanos.find((t) => t.id === tamanoId) ??
      tamanos.find((t) => t.clave === 'M') ??
      tamanos[0]

    const papelDefault =
      papeles.find((p) => p.nombre === 'Kraft Natural') ?? papeles[0]

    // 5. Construir cotización (esto ahora incluye los 'avisos' de sustitución)
    const cotizacionBase = construirCotizacion(
      resultadoIA.flores_detectadas,
      flores,
      papelDefault,
      tamanoElegido
    )

    // 6. Guardar en BD
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

    // 7. Retornar respuesta con todos los datos y avisos
    return NextResponse.json({
      ok:            true,
      cotizacion_id: guardada?.id ?? null,
      imagen_url:    urlData.publicUrl,
      imagen_path:   rutaArchivo,
      ia_exitosa:    resultadoIA.exitoso,
      ia_mensaje:    resultadoIA.mensaje_debug ?? null,
      avisos:        cotizacionBase.avisos, // <--- Enviamos los avisos de sustitución al frontend
      ...cotizacionBase,
      tamano:        tamanoElegido,
      catalogo:      { flores, papeles, tamanos, accesorios },
    })

  } catch (error) {
    console.error('[/api/cotizar]', error)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}
