// lib/cotizador.ts  (reemplaza todo el archivo)
import { supabaseAdmin } from './supabase'
import type { FloresDetectada } from './huggingface'
import type { Cotizacion, Flor, ItemCotizacion, PapelEnvoltura } from '@/types'

export interface TamanoRamo {
  id: string
  clave: string
  nombre: string
  descripcion: string
  multiplicador: number
  flores_base: number
  precio_extra: number
}

export async function obtenerCatalogo(): Promise<{
  flores: Flor[]
  papeles: PapelEnvoltura[]
  tamanos: TamanoRamo[]
}> {
  const [{ data: flores }, { data: papeles }, { data: tamanos }] =
    await Promise.all([
      supabaseAdmin.from('flores').select('*').eq('disponible', true).order('nombre'),
      supabaseAdmin.from('papel_envoltura').select('*').eq('disponible', true).order('nombre'),
      supabaseAdmin.from('tamanos_ramo').select('*').order('multiplicador'),
    ])

  return {
    flores:   flores  ?? [],
    papeles:  papeles ?? [],
    tamanos:  tamanos ?? [],
  }
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

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

      console.log(`[Cotizador] Buscando: "${nombreBuscado}" color "${colorBuscado}"`)

      // 1. Match exacto nombre + color
      let florEnBD = colorBuscado
        ? catalogo.find((f) =>
            normalizar(f.nombre) === nombreBuscado &&
            normalizar(f.color)  === colorBuscado
          )
        : undefined

      // 2. Solo nombre (primer resultado disponible)
      if (!florEnBD) {
        florEnBD = catalogo.find((f) =>
          normalizar(f.nombre) === nombreBuscado
        )
      }

      // 3. Nombre parcial
      if (!florEnBD) {
        florEnBD = catalogo.find((f) =>
          normalizar(f.nombre).includes(nombreBuscado) ||
          nombreBuscado.includes(normalizar(f.nombre))
        )
      }

      if (florEnBD) {
        console.log(`[Cotizador] ✅ Match: ${florEnBD.nombre} ${florEnBD.color}`)
        const cantidad = Math.max(
          1,
          Math.round((detectada.cantidad_estimada ?? 5) * tamanoDefault.multiplicador / 2)
        )
        detalle.push({
          flor:     florEnBD,
          cantidad,
          subtotal: florEnBD.precio_unit * cantidad,
        })
      } else {
        console.warn(`[Cotizador] ❌ No encontrado: "${detectada.nombre_es}" ${colorBuscado}`)
      }
    }
  }

  // Ramo default si no detectó nada
  if (detalle.length === 0) {
    const rosa = catalogo.find((f) => f.nombre === 'Rosa' && f.color === 'Rosa')
      ?? catalogo.find((f) => f.nombre === 'Rosa')
    if (rosa) {
      detalle.push({
        flor:     rosa,
        cantidad: tamanoDefault.flores_base,
        subtotal: rosa.precio_unit * tamanoDefault.flores_base,
      })
    }
  }

  // Follaje automático si no viene detectado
  const yaHayFollaje = detalle.some((i) =>
    ['gypsophila', 'follaje', 'eucalipto', 'helecho', 'ruscus'].some((f) =>
      normalizar(i.flor.nombre).includes(f)
    )
  )
  if (!yaHayFollaje) {
    const follaje =
      catalogo.find((f) => f.nombre === 'Gypsophila') ??
      catalogo.find((f) => f.nombre === 'Follaje Ruscus')
    if (follaje) {
      detalle.push({ flor: follaje, cantidad: 3, subtotal: follaje.precio_unit * 3 })
    }
  }

  const subtotalFlores = detalle.reduce((acc, i) => acc + i.subtotal, 0)
  const total = subtotalFlores + papelDefault.precio_unit + tamanoDefault.precio_extra

  return { detalle, papel: papelDefault, total, estado: 'borrador' }
}

export function recalcularTotal(
  detalle: ItemCotizacion[],
  papel: PapelEnvoltura,
  precioExtraTamano: number = 0
): number {
  const subtotalFlores = detalle.reduce(
    (acc, item) => acc + item.flor.precio_unit * item.cantidad, 0
  )
  return subtotalFlores + papel.precio_unit + precioExtraTamano
}