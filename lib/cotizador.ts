// lib/cotizador.ts
import { supabaseAdmin } from './supabase'
import type { FloresDetectada } from './huggingface'
import type { Cotizacion, Flor, ItemCotizacion, PapelEnvoltura, Accesorio } from '@/types'

export interface TamanoRamo {
  id: string
  clave: string
  nombre: string
  descripcion: string
  multiplicador: number
  flores_base: number
  precio_extra: number
  papel_precio: number
}

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

  if (floresDetectadas.length > 0) {
    for (const detectada of floresDetectadas) {
      const nombreBuscado = normalizar(detectada.nombre_es)
      const colorBuscado  = normalizar(detectada.color ?? '')

      // 1. Match exacto nombre + color
      let florEnBD = colorBuscado
        ? catalogo.find(f =>
            normalizar(f.nombre) === nombreBuscado &&
            normalizar(f.color)  === colorBuscado
          )
        : undefined

      // 2. Solo por nombre
      if (!florEnBD) {
        florEnBD = catalogo.find(f => normalizar(f.nombre) === nombreBuscado)
      }

      // 3. Nombre parcial
      if (!florEnBD) {
        florEnBD = catalogo.find(f =>
          normalizar(f.nombre).includes(nombreBuscado) ||
          nombreBuscado.includes(normalizar(f.nombre))
        )
      }

      if (florEnBD) {
        const cantidad = Math.max(
          1,
          Math.round((detectada.cantidad_estimada ?? 5) * tamanoDefault.multiplicador / 2)
        )
        detalle.push({
          flor:     florEnBD,
          cantidad,
          subtotal: florEnBD.precio_unit * cantidad,
        })
      }
    }
  }

  // Ramo default
  if (detalle.length === 0) {
    const rosa = catalogo.find(f => f.nombre === 'Rosa' && f.color === 'Rosa')
      ?? catalogo.find(f => f.nombre === 'Rosa')
    if (rosa) {
      detalle.push({
        flor:     rosa,
        cantidad: tamanoDefault.flores_base,
        subtotal: rosa.precio_unit * tamanoDefault.flores_base,
      })
    }
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

  return {
    detalle,
    papel:  papelDefault,
    total,
    estado: 'borrador',
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
