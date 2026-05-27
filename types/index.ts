// types/index.ts

export interface Flor {
  id: string
  nombre: string
  color: string
  precio_unit: number
  disponible: boolean
}

export interface PapelEnvoltura {
  id: string
  nombre: string
  precio_unit: number
  disponible: boolean
}

export interface TamanoRamo {
  id: string
  clave: string
  nombre: string
  descripcion: string
  multiplicador: number
  flores_base: number
  precio_extra: number
  papel_precio: number   // ← precio de envoltura por tamaño
}

export interface Accesorio {
  id: string
  nombre: string
  emoji: string
  precio_unit: number
  disponible: boolean
}

export interface ItemCotizacion {
  flor: Flor
  cantidad: number
  subtotal: number
}

// NUEVO TIPO: Para avisarle al usuario si cambiamos algo
export interface AvisoSustitucion {
  detectado: string; // Ej: "Lirios Amarillos"
  motivo: string;    // Ej: "No disponible en ese color" o "No manejamos ese tipo de flor"
  sugerencia: string; // Ej: "Girasoles" o "Lirios Rosas"
}

export interface Cotizacion {
  id?: string
  imagen_url?: string
  imagen_path?: string
  detalle: ItemCotizacion[]
  papel?: PapelEnvoltura
  tamano?: TamanoRamo
  accesorios_seleccionados?: Accesorio[]
  total: number
  estado: 'borrador' | 'aprobada' | 'enviada'
  cliente_nombre?: string
  avisos?: AvisoSustitucion[] // ← Agregamos los avisos a la cotización
}
