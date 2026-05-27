'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ItemCotizacion, PapelEnvoltura, TamanoRamo } from '@/types'
import SubirImagen from '@/components/ui/SubirImagen'
import EditorCotizacion, { DatosCotizacion } from '@/components/ui/EditorCotizacion'
import SelectorTamano from '@/components/ui/SelectorTamano'

type Paso = 'subir' | 'procesando' | 'editar'

// Helper: detectar follaje
const FOLLAJE_KEYS = ['nube', 'gypsophila', 'follaje', 'eucalipto', 'helecho', 'ruscus', 'hierba', 'pampas']
const esFollaje = (nombre: string) =>
  FOLLAJE_KEYS.some(f => nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(f))

function IndicadorPasos({ paso }: { paso: Paso }) {
  const pasos: { key: Paso; label: string }[] = [
    { key: 'subir',      label: '1. Foto'      },
    { key: 'procesando', label: '2. Análisis'  },
    { key: 'editar',     label: '3. Ajustar'   },
  ]
  const orden: Paso[] = ['subir', 'procesando', 'editar']

  return (
    <div className="flex items-end gap-3 mb-8">
      {pasos.map((p, i) => {
        const indexActual = orden.indexOf(paso)
        const indexP      = orden.indexOf(p.key)
        const completado  = indexP < indexActual
        const activo      = indexP === indexActual

        return (
          <div key={p.key} className="flex items-center gap-3 flex-1">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm
                ${completado ? 'bg-rose-500 text-white'
                  : activo   ? 'bg-rose-100 text-rose-600 ring-2 ring-rose-400'
                             : 'bg-gray-100 text-gray-400'}`}>
                {completado ? '✓' : i + 1}
              </div>
              <span className={`text-xs ${activo ? 'text-rose-600' : 'text-gray-400'}`}>
                {p.label}
              </span>
            </div>
            {i < pasos.length - 1 && (
              <div className={`flex-1 h-0.5 mb-4 ${completado ? 'bg-rose-300' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function CotizadorPage() {
  const [paso, setPaso] = useState<Paso>('subir')
  const [datos, setDatos] = useState<DatosCotizacion | null>(null)
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null)
  const [tamanos, setTamanos] = useState<TamanoRamo[]>([])
  const [tamanoElegido, setTamanoElegido] = useState<TamanoRamo | null>(null)
  const [cargandoTamanos, setCargandoTamanos] = useState(true)

  useEffect(() => {
    const cargarTamanos = async () => {
      try {
        const res = await fetch('/api/tamanos')
        if (!res.ok) throw new Error('Error al conectar')
        const json = await res.json()
        const lista = json.tamanos ?? []
        setTamanos(lista)
        setTamanoElegido(lista.find((t: TamanoRamo) => t.clave === 'M') ?? lista[0])
      } catch (err) {
        console.error('Error tamaños:', err)
        const rescate = [
          { id: '1', clave: 'S', nombre: 'Pequeño', flores_base: 12, precio_extra: 0, multiplicador: 1, descripcion: 'Ideal para detalle', papel_precio: 0 },
          { id: '2', clave: 'M', nombre: 'Mediano', flores_base: 24, precio_extra: 150, multiplicador: 1.5, descripcion: 'Tamaño estándar', papel_precio: 0 },
        ]
        setTamanos(rescate)
        setTamanoElegido(rescate[1])
      } finally {
        setCargandoTamanos(false)
      }
    }
    cargarTamanos()
  }, [])

  const manejarEnvioImagen = async (archivo: File) => {
    setErrorGlobal(null)
    setPaso('procesando')
    try {
      const formData = new FormData()
      formData.append('imagen', archivo)
      if (tamanoElegido) formData.append('tamano_id', tamanoElegido.id)
      const res = await fetch('/api/cotizar', { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error')
      const envioRes = await fetch('/api/envio')
      const envioData = await envioRes.json()
      setDatos({
        ...json,
        sucursales: envioData.sucursales ?? [],
        accesorios_seleccionados: [],
      })
      setPaso('editar')
    } catch (err: any) {
      setErrorGlobal(err.message)
      setPaso('subir')
    }
  }

  // --- ESTA ERA LA FUNCIÓN QUE FALTABA ---
  const actualizarCotizacion = (cambios: Partial<DatosCotizacion>) => {
    setDatos((prev) => (prev ? { ...prev, ...cambios } : null))
  }

  const aprobarCotizacion = () => {
    if (!datos) return
    const floresPrincipales = datos.detalle.filter(item => !esFollaje(item.flor.nombre))
    const lineasFlores = floresPrincipales.map(i => `• ${i.cantidad}x ${i.flor.nombre} (${i.flor.color}) — $${(i.flor.precio_unit * i.cantidad).toFixed(2)}`).join('\n')
    const subtotalFlores = floresPrincipales.reduce((acc, i) => acc + (i.flor.precio_unit * i.cantidad), 0)
    
    const mensaje = [
      '🌸 *NUEVO PEDIDO — Florería RoCé*',
      '━━━━━━━━━━━━━━━━━━━━━━━━',
      '🌺 *Flores:',
      lineasFlores,
      '',
      datos.papel ? `🎁 *Envoltura:* ${datos.papel.nombre} ($${datos.papel.precio_unit.toFixed(2)})` : '',
      `💵 *TOTAL ESTIMADO: $${datos.total.toFixed(2)} MXN*`,
      '🖼️ *Imagen:*',
      datos.imagen_url
    ].join('\n')

    window.open(`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`, '_blank')
  }

  const nuevaCotizacion = () => { setDatos(null); setPaso('subir') }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50">
      <div className="max-w-lg mx-auto px-6 pt-8 pb-12">
        <IndicadorPasos paso={paso} />
        {paso === 'editar' && datos && (
          <EditorCotizacion
            datos={datos}
            onActualizar={actualizarCotizacion}
            onAprobar={aprobarCotizacion}
            onNuevaCotizacion={nuevaCotizacion}
          />
        )}
        {/* ... resto de tu UI original ... */}
      </div>
    </div>
  )
}
