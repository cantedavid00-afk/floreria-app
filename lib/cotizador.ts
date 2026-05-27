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

// Normaliza textos ignorando acentos, espacios y plurales (es/s)
function normalizar(texto: string): string {
  let limpio = texto.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

  // Eliminar plurales comunes en español para mejorar el match
  return limpio.replace(/(es|s)$/, '')
}

const MARGEN = 0.35

export function construirCotizacion(
  floresDetectadas: FloresDetectada[],
  catalogo: Flor[],
  papelDefault: PapelEnvoltura,
  tamanoDefault: TamanoRamo
): Omit<Cotizacion, 'imagen_url' | 'imagen_path'> {
  const detalle: ItemCotizacion[] = []
  const avisos: AvisoSustitucion[] = [] 

  // Flor "comodín" para casos donde la IA detecta algo inexistente en inventario
  const florPorDefecto = catalogo.find(f => f.nombre === 'Rosas' && f.color === 'Rojas') 
                      ?? catalogo.find(f => f.nombre === 'Rosas') 
                      ?? catalogo[0]; 

  if (floresDetectadas.length > 0) {
    for (const detectada of floresDetectadas) {
      const nombreBuscado = normalizar(detectada.nombre_es)
      const colorBuscado  = normalizar(detectada.color ?? '')
      const nombreOriginalDetectado = `${detectada.nombre_es} ${detectada.color ?? ''}`.trim()

      let florFinal: Flor | undefined = undefined;

      // 1. Match Exacto (Nombre + Color)
      if (colorBuscado) {
        florFinal = catalogo.find(f =>
          normalizar(f.nombre) === nombreBuscado &&
          normalizar(f.color)  === colorBuscado
        )
      }

      // 2. Match por Nombre (color diferente, pero es la misma flor)
      if (!florFinal) {
        florFinal = catalogo.find(f => normalizar(f.nombre) === nombreBuscado)
        if (florFinal) {
           avisos.push({
             detectado: nombreOriginalDetectado,
             motivo: 'No disponible en este color',
             sugerencia: `${florFinal.nombre} ${florFinal.color}`
           })
        }
      }

      // 3. Match Parcial (búsqueda flexible)
      if (!florFinal) {
        florFinal = catalogo.find(f =>
          normalizar(f.nombre).includes(nombreBuscado) ||
          nombreBuscado.includes(normalizar(f.nombre))
        )
        if (florFinal) {
            avisos.push({
              detectado: nombreOriginalDetectado,
              motivo: 'Variedad no disponible',
              sugerencia: `${florFinal.nombre} ${florFinal.color}`
            })
        }
      }

      // 4. Si la tienda NO VENDE ese tipo de flor -> Usar comodín
      // (Lista de exclusión de follajes para no generar avisos innecesarios)
      const esFollaje = ['gypsophila', 'nube', 'eucalipto', 'ruscus', 'baby', 'dolar', 'helecho'].some(f => nombreBuscado.includes(f));
      
      if (!florFinal && !esFollaje) {
         florFinal = florPorDefecto;
         if (florFinal) {
             avisos.push({
                detectado: nombreOriginalDetectado,
                motivo: 'No manejamos este tipo de flor',
                sugerencia: `${florFinal.nombre} ${florFinal.color}`
             })
         }
      }

      // Agregar al detalle
      if (florFinal) {
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

  // Safety net: Si el detalle quedó vacío tras todo el proceso, forzamos la flor por defecto
  if (detalle.length === 0 && florPorDefecto) {
    detalle.push({
      flor:      florPorDefecto,
      cantidad: tamanoDefault.flores_base,
      subtotal: florPorDefecto.precio_unit * tamanoDefault.flores_base,
    })
  }

  // Calcular total
  const subtotalFlores = detalle.reduce((acc, i) => acc + i.subtotal, 0)
  const papelPrecio    = tamanoDefault.papel_precio ?? 0
  const subtotalBase   = subtotalFlores + papelPrecio
  const total          = Math.ceil(subtotalBase * (1 + MARGEN))

  // Eliminar avisos duplicados
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
    avisos: avisosUnicos 
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
