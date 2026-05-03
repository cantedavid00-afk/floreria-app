// app/api/cotizar/route.ts  (reemplaza todo el archivo)
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
    if (archivo.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'La imagen no debe superar 5 MB.' }, { status: 400 })
    }

    const extension    = archivo.name.split('.').pop() ?? 'jpg'
    const rutaArchivo  = `cotizaciones/${uuidv4()}.${extension}`
    const buffer       = await archivo.arrayBuffer()

    // Subir imagen a Storage
    const { error: errorStorage } = await supabaseAdmin.storage
      .from('imagenes-cotizaciones')
      .upload(rutaArchivo, buffer, { contentType: archivo.type, upsert: false })

    if (errorStorage) {
      return NextResponse.json({ error: 'Error al subir la imagen.' }, { status: 500 })
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('imagenes-cotizaciones')
      .getPublicUrl(rutaArchivo)

    // Llamar a Claude Vision
    const resultadoIA = await detectarFlores(buffer, 8000)
    console.log('═══════════════════════════════════')
    console.log('IA exitosa:', resultadoIA.exitoso)
    console.log('Flores detectadas:', JSON.stringify(resultadoIA.flores_detectadas, null, 2))
    console.log('Mensaje:', resultadoIA.mensaje_debug)
    console.log('═══════════════════════════════════')

    // Obtener catálogo
    const { flores, papeles, tamanos } = await obtenerCatalogo()

    if (flores.length === 0) {
      return NextResponse.json({ error: 'No hay flores en el catálogo.' }, { status: 500 })
    }

    // Tamaño elegido por el usuario (o M por defecto)
    const tamanoElegido =
      tamanos.find((t) => t.id === tamanoId) ??
      tamanos.find((t) => t.clave === 'M') ??
      tamanos[0]

    const papelDefault =
      papeles.find((p) => p.nombre === 'Kraft Natural') ?? papeles[0]

    // Construir cotización
    const cotizacionBase = construirCotizacion(
      resultadoIA.flores_detectadas,
      flores,
      papelDefault,
      tamanoElegido
    )

    // Guardar en BD
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
      ok:          true,
      cotizacion_id: guardada?.id ?? null,
      imagen_url:  urlData.publicUrl,
      imagen_path: rutaArchivo,
      ia_exitosa:  resultadoIA.exitoso,
      ia_mensaje:  resultadoIA.mensaje_debug ?? null,
      ...cotizacionBase,
      tamano:      tamanoElegido,
      catalogo:    { flores, papeles, tamanos },
    })

  } catch (error) {
    console.error('[/api/cotizar]', error)
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 })
  }
}