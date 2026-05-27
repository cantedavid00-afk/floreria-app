// lib/cotizador.ts
import { supabaseAdmin } from './supabase'
import type { FloresDetectada } from './huggingface'
import type { Cotizacion, Flor, ItemCotizacion, PapelEnvoltura, Accesorio, TamanoRamo, AvisoSustitucion } from '@/types'

export async function obtenerCatalogo(): Promise<{
  flores:     Flor[]
  papeles:    PapelEnvoltura[]
  tamanos:    TamanoRamo[]
  accesorios: Accesorio[]
}> {
  const [
    { data: flores },
    { data: papeles },
    { data: tamanos },
    { data: accesorios },
  ] = await Promise.all([
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
}

function normalizar(texto: string): string {
  return texto.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

const MARGEN = 0.35

export function construirCotizacion(
  floresDetectadas: FloresDetectada[],
  catalogo: Flor[],
  papelDefault: PapelEnvoltura,
  tamanoDefault: TamanoRamo
): Omit<Cotizacion, 'imagen_url' | 'imagen_path'> {
  const detalle: ItemCotizacion[] = []
  const avisos: AvisoSustitucion[] = [] // Arreglo para guardar nuestras sugerencias

  // Flor "comodín" si de plano no tenemos nada parecido a lo que detectó la IA
  const florPorDefecto = catalogo.find(f => f.nombre === 'Rosas' && f.color === 'Rojas') 
                      ?? catalogo.find(f => f.nombre === 'Rosas') 
                      ?? catalogo[0]; // Caída segura si no hay rosas

  if (floresDetectadas.length > 0) {
    for (const detectada of floresDetectadas) {
      const nombreBuscado = normalizar(detectada.nombre_es)
      const colorBuscado  = normalizar(detectada.color ?? '')
      const nombreOriginalDetectado = `${detectada.nombre_es} ${detectada.color ?? ''}`.trim()

      let florFinal: Flor | undefined = undefined;

      // 1. Intentar Match Exacto (Nombre + Color)
      if (colorBuscado) {
        florFinal = catalogo.find(f =>
          normalizar(f.nombre) === nombreBuscado &&
          normalizar(f.color)  === colorBuscado
        )
      }

      // 2. Si no hay match exacto, buscar por puro Nombre (mismo tipo de flor, diferente color)
      if (!florFinal) {
        florFinal = catalogo.find(f => normalizar(f.nombre) === nombreBuscado)
        
        if (florFinal) {
           // Generar aviso: Encontramos la flor, pero no en el color que pidió
           avisos.push({
             detectado: nombreOriginalDetectado,
             motivo: 'No disponible en este color',
             sugerencia: `${florFinal.nombre} ${florFinal.color}`
           })
        }
      }

      // 3. Nombre parcial (ej: "Rosa" vs "Rosas")
      if (!florFinal) {
        florFinal = catalogo.find(f =>
          normalizar(f.nombre).includes(nombreBuscado) ||
          nombreBuscado.includes(normalizar(f.nombre))
        )
        if (florFinal) {
            avisos.push({
              detectado: nombreOriginalDetectado,
              motivo: 'Color/Variedad no disponible',
              sugerencia: `${florFinal.nombre} ${florFinal.color}`
            })
        }
      }

      // 4. Si la tienda NO VENDE ese tipo de flor en absoluto
      if (!florFinal && !['gypsophila', 'nube', 'follaje', 'eucalipto', 'helecho', 'ruscus'].some(f => nombreBuscado.includes(f))) {
         // Si no es follaje y no lo encontramos, usamos la flor comodín (Rosas)
         florFinal = florPorDefecto;
         if (florFinal) {
             avisos.push({
                detectado: nombreOriginalDetectado,
                motivo: 'No manejamos este tipo de flor',
                sugerencia: `${florFinal.nombre} ${florFinal.color}`
             })
         }
      }

      // Si encontramos una flor (ya sea la exacta o la sugerida), la agregamos al detalle
      if (florFinal) {
        // Verificar si ya agregamos esta misma flor para no duplicar líneas
        const indexExistente = detalle.findIndex(i => i.flor.id === florFinal?.id);
        
        const cantidadAIncrementar = Math.max(
          1,
          Math.round((detectada.cantidad_estimada ?? 5) * tamanoDefault.multiplicador / 2)
        )

        if (indexExistente >= 0) {
            detalle[indexExistente].cantidad += cantidadAIncrementar;
            detalle[indexExistente].subtotal = detalle[indexExistente].flor.precio_unit * detalle[indexExistente].cantidad;
        } else {
            detalle.push({
              flor:      florFinal,
              cantidad:  cantidadAIncrementar,
              subtotal:  florFinal.precio_unit * cantidadAIncrementar,
            })
        }
      }
    }
  }

  // Ramo default extremo (si la IA no detectó nada de nada)
  if (detalle.length === 0 && florPorDefecto) {
    detalle.push({
      flor:      florPorDefecto,
      cantidad: tamanoDefault.flores_base,
      subtotal: florPorDefecto.precio_unit * tamanoDefault.flores_base,
    })
  }

  // Follaje automático
  const yaHayFollaje = detalle.some(i =>
    ['gypsophila', 'nube', 'follaje', 'eucalipto', 'helecho', 'ruscus']
      .some(f => normalizar(i.flor.nombre).includes(f))
  )
  if (!yaHayFollaje) {
    const follaje =
      catalogo.find(f => f.nombre === 'Nube') ??
      catalogo.find(f => f.nombre === 'Gypsophila') ??
      catalogo.find(f => f.nombre === 'Follaje Ruscus')
    if (follaje) {
      detalle.push({ flor: follaje, cantidad: 3, subtotal: follaje.precio_unit * 3 })
    }
  }

  // Calcular total con margen oculto
  const subtotalFlores = detalle.reduce((acc, i) => acc + i.subtotal, 0)
  const papelPrecio    = tamanoDefault.papel_precio ?? 0
  const subtotalBase   = subtotalFlores + papelPrecio
  const total          = Math.ceil(subtotalBase * (1 + MARGEN))

  // Eliminar avisos duplicados (por si la IA detectó 3 Lirios Amarillos separados)
  const avisosUnicos = avisos.filter((aviso, index, self) =>
    index === self.findIndex((t) => (
      t.detectado === aviso.detectado && t.sugerencia === aviso.sugerencia
    ))
  )

  return {
    detalle,
    papel:  papelDefault,
    total,
    estado: 'borrador',
    avisos: avisosUnicos // Retornamos los avisos para que los vea el UI
  }
}

export function recalcularTotal(
  detalle:    ItemCotizacion[],
  papel:      PapelEnvoltura,
  tamano:     TamanoRamo,
  accesorios: Accesorio[] = []
): number {
  const subtotalFlores     = detalle.reduce((acc, i) => acc + i.flor.precio_unit * i.cantidad, 0)
  const subtotalAccesorios = accesorios.reduce((acc, a) => acc + a.precio_unit, 0)
  const papelPrecio        = tamano.papel_precio ?? 0
  const subtotalBase       = subtotalFlores + subtotalAccesorios + papelPrecio
  return Math.ceil(subtotalBase * (1 + MARGEN))
}
