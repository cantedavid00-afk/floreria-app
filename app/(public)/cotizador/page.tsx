// app/(public)/cotizador/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ItemCotizacion, PapelEnvoltura, TamanoRamo } from '@/types'
import SubirImagen from '@/components/ui/SubirImagen'
import EditorCotizacion, { DatosCotizacion } from '@/components/ui/EditorCotizacion'
import SelectorTamano from '@/components/ui/SelectorTamano'

type Paso = 'subir' | 'procesando' | 'editar'

function IndicadorPasos({ paso }: { paso: Paso }) {
  const pasos: { key: Paso; label: string }[] = [
    { key: 'subir',      label: '1. Foto'      },
    { key: 'procesando', label: '2. Análisis'  },
    { key: 'editar',     label: '3. Ajustar'   },
  ]
  const orden: Paso[] = ['subir', 'procesando', 'editar']

  return (
    <div className="flex items-end gap-3 mb-8">
      {pasos.map((p, i) => {
        const indexActual = orden.indexOf(paso)
        const indexP      = orden.indexOf(p.key)
        const completado  = indexP < indexActual
        const activo      = indexP === indexActual

        return (
          <div key={p.key} className="flex items-center gap-3 flex-1">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm
                ${completado ? 'bg-rose-500 text-white'
                  : activo   ? 'bg-rose-100 text-rose-600 ring-2 ring-rose-400'
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

// ── Helper: detectar si un item es follaje ────────────────────
const FOLLAJE_KEYS = ['nube', 'gypsophila', 'follaje', 'eucalipto', 'helecho', 'ruscus', 'hierba', 'pampas']
const esFollaje = (nombre: string) =>
  FOLLAJE_KEYS.some(f => nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(f))

export default function CotizadorPage() {
  const [paso,            setPaso]            = useState<Paso>('subir')
  const [datos,           setDatos]           = useState<DatosCotizacion | null>(null)
  const [errorGlobal,     setErrorGlobal]     = useState<string | null>(null)
  const [tamanos,         setTamanos]         = useState<TamanoRamo[]>([])
  const [tamanoElegido,   setTamanoElegido]   = useState<TamanoRamo | null>(null)
  const [cargandoTamanos, setCargandoTamanos] = useState(true)

  useEffect(() => {
    const cargarTamanos = async () => {
      try {
        const res  = await fetch('/api/tamanos')
        if (!res.ok) throw new Error('Error al conectar')
        const json = await res.json()
        const lista = json.tamanos ?? []
        if (lista.length === 0) throw new Error('Lista vacía')
        setTamanos(lista)
        setTamanoElegido(lista.find((t: TamanoRamo) => t.clave === 'M') ?? lista[0])
      } catch (err) {
        console.error('Error tamaños:', err)
        const rescate: TamanoRamo[] = [
          { id: '1', clave: 'S',  nombre: 'Pequeño',      flores_base: 12,  precio_extra: 0,   multiplicador: 1,   descripcion: 'Ideal para detalle', papel_precio: 0 },
          { id: '2', clave: 'M',  nombre: 'Mediano',      flores_base: 24,  precio_extra: 150, multiplicador: 1.5, descripcion: 'Tamaño estándar',    papel_precio: 0 },
          { id: '3', clave: 'L',  nombre: 'Grande',       flores_base: 50,  precio_extra: 300, multiplicador: 2,   descripcion: 'Para impresionar',   papel_precio: 0 },
          { id: '4', clave: 'XL', nombre: 'Extra Grande', flores_base: 100, precio_extra: 600, multiplicador: 3,   descripcion: 'Máximo impacto',     papel_precio: 0 },
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

      const res  = await fetch('/api/cotizar', { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al procesar la imagen')

      // Cargar sucursales para el selector de envío
      const envioRes  = await fetch('/api/envio')
      const envioData = await envioRes.json()

      setDatos({
        id:          json.cotizacion_id ?? undefined,
        imagen_url:  json.imagen_url,
        imagen_path: json.imagen_path,
        ia_exitosa:  json.ia_exitosa,
        ia_mensaje:  json.ia_mensaje ?? undefined,
        detalle:     json.detalle   as ItemCotizacion[],
        papel:       json.papel     as PapelEnvoltura,
        tamano:      json.tamano    as TamanoRamo,
        avisos:      json.avisos    ?? [], // ← AQUÍ ESTÁ EL AJUSTE IMPORTANTE
        total:       json.total,
        sucursales:  envioData.sucursales ?? [],
        accesorios_seleccionados: [],
        catalogo: {
          flores:     json.catalogo.flores,
          papeles:    json.catalogo.papeles,
          tamanos:    json.catalogo.tamanos,
          accesorios: json.catalogo.accesorios ?? [],
        },
      })
      setPaso('editar')
    } catch (err: unknown) {
      setErrorGlobal(err instanceof Error ? err.message : 'Error inesperado')
      setPaso('subir')
    }
  }

  const actualizarCotizacion = (cambios: Partial<DatosCotizacion>) => {
    setDatos((prev) => (prev ? { ...prev, ...cambios } : null))
  }

  // ── WhatsApp con TODOS los detalles ──────────────────────────
  const aprobarCotizacion = () => {
    if (!datos) return

    // Separar flores principales de follajes
    const floresPrincipales = datos.detalle.filter(item => !esFollaje(item.flor.nombre))
    const follajes          = datos.detalle.filter(item =>  esFollaje(item.flor.nombre))

    const lineasFlores = floresPrincipales.length > 0
      ? floresPrincipales.map(item =>
          `   • ${item.cantidad}x ${item.flor.nombre} ${item.flor.color} — $${(item.flor.precio_unit * item.cantidad).toFixed(2)}`
        ).join('\n')
      : '   • Sin especificar'

    const lineasFollaje = follajes.length > 0
      ? follajes.map(item => `   • ${item.flor.nombre}`).join('\n')
      : null

    // Sección de accesorios
    const accesorios = datos.accesorios_seleccionados ?? []
    const lineasAccesorios = accesorios.length > 0
      ? accesorios.map(a => `   ${a.emoji} ${a.nombre}: $${a.precio_unit.toFixed(2)}`).join('\n')
      : null

    // Sección de entrega
    let seccionEntrega = '📦 *Entrega:* Por confirmar con el negocio'
    if (datos.envio?.tipo === 'domicilio') {
      seccionEntrega = [
        '🏠 *Envío a domicilio*',
        `   Zona: ${datos.envio.zona?.nombre}`,
        `   Descripción: ${datos.envio.zona?.descripcion}`,
        `   Costo de envío: $${datos.envio.precio.toFixed(2)} MXN`,
      ].join('\n')
    } else if (datos.envio?.tipo === 'sucursal') {
      seccionEntrega = [
        '🏪 *Recolección en tienda* (Sin costo)',
        `   ${datos.envio.sucursal?.nombre}`,
        `   ${datos.envio.sucursal?.direccion}`,
      ].join('\n')
    }

    // Calcular subtotales
    const subtotalFlores     = floresPrincipales.reduce((acc, i) => acc + i.flor.precio_unit * i.cantidad, 0)
    const subtotalFollaje    = follajes.reduce((acc, i) => acc + i.flor.precio_unit * i.cantidad, 0)
    const subtotalAccesorios = accesorios.reduce((acc, a) => acc + a.precio_unit, 0)
    const costoEnvio         = datos.envio?.precio ?? 0

    // Construir mensaje completo
    const mensaje = [
      '🌸 *NUEVO PEDIDO — Florería RoCé*',
      '━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      '🌺 *Flores del arreglo:*',
      lineasFlores,
      '',
      lineasFollaje
        ? `🌿 *Follaje incluido:*\n${lineasFollaje}\n`
        : '',
      lineasAccesorios 
        ? `🎀 *Accesorios:*\n${lineasAccesorios}\n` 
        : '',
      `🎁 *Envoltura:* ${datos.papel?.nombre ?? 'Por definir'}`,
      `📐 *Tamaño:* ${datos.tamano?.nombre ?? 'Por definir'}`,
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━',
      seccionEntrega,
      '━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      datos.nota
        ? `📝 *Nota del cliente:*\n   ${datos.nota}\n`
        : '',
      '💰 *Desglose del costo:*',
      `   Flores: $${subtotalFlores.toFixed(2)}`,
      subtotalFollaje > 0 ? `   Follaje: $${subtotalFollaje.toFixed(2)}` : '',
      datos.papel?.precio_unit > 0
        ? `   Envoltura: $${datos.papel.precio_unit.toFixed(2)}`
        : '',
      datos.tamano?.precio_extra > 0
        ? `   Tamaño (${datos.tamano.nombre}): $${datos.tamano.precio_extra.toFixed(2)}`
        : '',
      subtotalAccesorios > 0 
        ? `   Accesorios: $${subtotalAccesorios.toFixed(2)}` 
        : '',
      costoEnvio > 0
        ? `   Envío: $${costoEnvio.toFixed(2)}`
        : '',
      '',
      `💵 *TOTAL ESTIMADO: $${datos.total.toFixed(2)} MXN*`,
      '_Precio sujeto a confirmación_',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━',
      '🖼️ *Imagen de referencia:*',
      datos.imagen_url,
      '',
      `🕐 ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`,
      `🔖 Pedido ID: ${datos.id ?? 'sin-id'}`,
    ]
      .filter(line => line !== null && line !== '')
      .join('\n')

    const numero = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? ''
    window.open(
      `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`,
      '_blank'
    )
  }

  const nuevaCotizacion = () => {
    setDatos(null)
    setErrorGlobal(null)
    setPaso('subir')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50">
      <nav className="bg-white border-b border-rose-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/" className="text-rose-600 font-bold text-lg">
            💐 Florería RoCé
          </Link>
          {paso === 'editar' && (
            <button
              onClick={nuevaCotizacion}
              className="text-sm text-rose-400 hover:text-rose-600 transition-colors"
            >
              ← Nueva cotización
            </button>
          )}
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-6 pt-8 pb-12">
        <IndicadorPasos paso={paso} />

        {errorGlobal && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
            <span>⚠️</span>
            <span>{errorGlobal}</span>
          </div>
        )}

        {/* ── Paso 1 y 2: Subir imagen ─────────────────── */}
        {(paso === 'subir' || paso === 'procesando') && (
          <div>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Sube tu foto de referencia</h1>
              <p className="text-gray-500 text-sm mt-1">
                Elige el tamaño y sube una imagen del arreglo que deseas
              </p>
            </div>

            {/* Selector de tamaño */}
            <div className="mb-5">
              {cargandoTamanos ? (
                <div className="bg-white border border-rose-100 rounded-2xl p-8 animate-pulse">
                  <div className="h-4 w-32 bg-gray-100 mx-auto rounded mb-4" />
                  <div className="flex gap-2">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="h-24 w-full bg-gray-50 rounded-xl" />
                    ))}
                  </div>
                </div>
              ) : (
                <SelectorTamano
                  tamanos={tamanos}
                  seleccionado={tamanoElegido}
                  onChange={setTamanoElegido}
                />
              )}
            </div>

            <SubirImagen
              onEnviar={manejarEnvioImagen}
              cargando={paso === 'procesando'}
            />
          </div>
        )}

        {/* ── Paso 3: Editor de cotización ─────────────── */}
        {paso === 'editar' && datos && (
          <EditorCotizacion
            datos={datos}
            onActualizar={actualizarCotizacion}
            onAprobar={aprobarCotizacion}
            onNuevaCotizacion={nuevaCotizacion}
          />
        )}
      </div>
    </div>
  )
}
