'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Flor, ItemCotizacion, PapelEnvoltura, TamanoRamo } from '@/types'
import TarjetaFlor from './TarjetaFlor'
import BuscadorFlores from './BuscadorFlores'
import SelectorTamano from './SelectorTamano'
import SelectorEnvio, { OpcionEnvio } from './SelectorEnvio'

// ── Tipos ─────────────────────────────────────────────────────
export interface DatosCotizacion {
  id?:                  string
  imagen_url:           string
  imagen_path:          string
  ia_exitosa:           boolean
  ia_mensaje?:          string
  follaje_descripcion?: string   // ← texto del follaje detectado por IA
  detalle:              ItemCotizacion[]
  papel:                PapelEnvoltura
  tamano:               TamanoRamo
  total:                number
  catalogo: {
    flores:  Flor[]
    papeles: PapelEnvoltura[]
    tamanos: TamanoRamo[]
  }
  envio?:               OpcionEnvio | null
  nota?:                string
  sucursales?:          { id: string; nombre: string; direccion: string }[]
}

interface EditorCotizacionProps {
  datos:             DatosCotizacion
  onActualizar:      (cambios: Partial<DatosCotizacion>) => void
  onAprobar:         () => void
  onNuevaCotizacion: () => void
}

// ── Helpers ───────────────────────────────────────────────────
const calcularTotal = (
  detalle: ItemCotizacion[],
  papel:   PapelEnvoltura,
  tamano:  TamanoRamo,
  envio?:  OpcionEnvio | null
) =>
  detalle.reduce((acc, item) => acc + item.flor.precio_unit * item.cantidad, 0) +
  papel.precio_unit +
  tamano.precio_extra +
  (envio?.precio ?? 0)

const agruparPorNombre = (flores: Flor[]): Record<string, Flor[]> =>
  flores.reduce<Record<string, Flor[]>>((acc, flor) => {
    acc[flor.nombre] = [...(acc[flor.nombre] ?? []), flor]
    return acc
  }, {})

// Palabras clave que identifican un item como follaje
const NOMBRES_FOLLAJE = [
  'nube', 'gypsophila', 'baby', 'follaje', 'eucalipto',
  'helecho', 'ruscus', 'hierba', 'pampas', 'salal',
  'monstera', 'palma', 'pitto', 'trigo',
]

const esFollaje = (nombre: string) => {
  const n = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return NOMBRES_FOLLAJE.some((f) => n.includes(f))
}

// Info descriptiva de follajes comunes
const INFO_FOLLAJE: Record<string, { emoji: string; descripcion: string }> = {
  'nube':       { emoji: '☁️', descripcion: 'Pequeñas flores blancas en racimo que dan volumen y delicadeza' },
  'gypsophila': { emoji: '☁️', descripcion: 'Pequeñas flores blancas en racimo que dan volumen y delicadeza' },
  'eucalipto':  { emoji: '🌿', descripcion: 'Hojas redondeadas de aroma fresco con color verde plateado' },
  'ruscus':     { emoji: '🌿', descripcion: 'Hojas alargadas y brillantes que dan estructura y elegancia' },
  'helecho':    { emoji: '🌿', descripcion: 'Hojas verdes en abanico, frescas y naturales' },
  'pampas':     { emoji: '🌾', descripcion: 'Espigas beige suaves que aportan textura y movimiento' },
  'default':    { emoji: '🌿', descripcion: 'Verdes frescos seleccionados por el florista' },
}

const getInfoFollaje = (nombre: string) => {
  const n = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const key = Object.keys(INFO_FOLLAJE).find((k) => n.includes(k))
  return INFO_FOLLAJE[key ?? 'default']
}

// ── Componente ────────────────────────────────────────────────
export default function EditorCotizacion({
  datos,
  onActualizar,
  onAprobar,
  onNuevaCotizacion,
}: EditorCotizacionProps) {

  const [presupuesto,        setPresupuesto]        = useState('')
  const [mensajePresupuesto, setMensajePresupuesto] = useState<string | null>(null)
  const [mostrarPapel,       setMostrarPapel]       = useState(false)
  const [mostrarPresupuesto, setMostrarPresupuesto] = useState(false)

  const [envio,              setEnvio]              = useState<OpcionEnvio | null>(datos.envio ?? null)
  const [nota,               setNota]               = useState(datos.nota ?? '')

  const florAgrupadas = agruparPorNombre(datos.catalogo.flores)

  // Separar flores principales de follajes
  const floresPrincipales = datos.detalle.filter((item) => !esFollaje(item.flor.nombre))
  const follajes          = datos.detalle.filter((item) =>  esFollaje(item.flor.nombre))
  const subtotalFollajes  = follajes.reduce((acc, i) => acc + i.flor.precio_unit * i.cantidad, 0)

  // ── Modificar detalle ─────────────────────────────────────
  const cambiarCantidad = (index: number, nueva: number) => {
    const nuevoDetalle = datos.detalle.map((item, i) =>
      i === index ? { ...item, cantidad: nueva, subtotal: item.flor.precio_unit * nueva } : item
    )
    onActualizar({ detalle: nuevoDetalle, total: calcularTotal(nuevoDetalle, datos.papel, datos.tamano, envio) })
  }

  const cambiarFlor = (index: number, nuevaFlor: Flor) => {
    const nuevoDetalle = datos.detalle.map((item, i) =>
      i === index ? { ...item, flor: nuevaFlor, subtotal: nuevaFlor.precio_unit * item.cantidad } : item
    )
    onActualizar({ detalle: nuevoDetalle, total: calcularTotal(nuevoDetalle, datos.papel, datos.tamano, envio) })
  }

  const eliminarItem = (index: number) => {
    const nuevoDetalle = datos.detalle.filter((_, i) => i !== index)
    onActualizar({ detalle: nuevoDetalle, total: calcularTotal(nuevoDetalle, datos.papel, datos.tamano, envio) })
  }

  const agregarFlor = (flor: Flor, cantidad: number) => {
    const indexExistente = datos.detalle.findIndex((item) => item.flor.id === flor.id)
    if (indexExistente >= 0) {
      const nuevoDetalle = datos.detalle.map((item, i) =>
        i === indexExistente
          ? { ...item, cantidad: item.cantidad + cantidad, subtotal: item.flor.precio_unit * (item.cantidad + cantidad) }
          : item
      )
      onActualizar({ detalle: nuevoDetalle, total: calcularTotal(nuevoDetalle, datos.papel, datos.tamano, envio) })
    } else {
      const nuevoDetalle = [...datos.detalle, { flor, cantidad, subtotal: flor.precio_unit * cantidad }]
      onActualizar({ detalle: nuevoDetalle, total: calcularTotal(nuevoDetalle, datos.papel, datos.tamano, envio) })
    }
  }

  const cambiarPapel = (papelId: string) => {
    const nuevo = datos.catalogo.papeles.find((p) => p.id === papelId)
    if (!nuevo) return
    onActualizar({ papel: nuevo, total: calcularTotal(datos.detalle, nuevo, datos.tamano, envio) })
  }

  const cambiarTamano = (nuevoTamano: TamanoRamo) => {
    const ratio = nuevoTamano.multiplicador / datos.tamano.multiplicador
    const nuevoDetalle = datos.detalle.map((item) => {
      const nuevaCantidad = Math.max(1, Math.round(item.cantidad * ratio))
      return { ...item, cantidad: nuevaCantidad, subtotal: item.flor.precio_unit * nuevaCantidad }
    })
    onActualizar({ tamano: nuevoTamano, detalle: nuevoDetalle, total: calcularTotal(nuevoDetalle, datos.papel, nuevoTamano, envio) })
  }

  const cambiarEnvio = (opcion: OpcionEnvio) => {
    setEnvio(opcion)
    const totalConEnvio = calcularTotal(datos.detalle, datos.papel, datos.tamano, opcion)
    onActualizar({ envio: opcion, total: totalConEnvio })
  }

  const ajustarAPresupuesto = () => {
    const monto = parseFloat(presupuesto)
    if (isNaN(monto) || monto <= 0) { setMensajePresupuesto('Ingresa un presupuesto válido.'); return }

    const costosFixed       = datos.papel.precio_unit + datos.tamano.precio_extra + (envio?.precio ?? 0)
    const presupuestoFlores = monto - costosFixed

    if (presupuestoFlores <= 0) { setMensajePresupuesto('El presupuesto es menor al costo de envoltura y envío.'); return }

    const totalFloresActual = datos.detalle.reduce((acc, item) => acc + item.flor.precio_unit * item.cantidad, 0)
    if (totalFloresActual <= presupuestoFlores) { setMensajePresupuesto('✅ Tu arreglo ya cabe en ese presupuesto.'); return }

    const factor       = presupuestoFlores / totalFloresActual
    const nuevoDetalle = datos.detalle.map((item) => {
      const nuevaCantidad = Math.max(1, Math.floor(item.cantidad * factor))
      return { ...item, cantidad: nuevaCantidad, subtotal: item.flor.precio_unit * nuevaCantidad }
    })
    onActualizar({ detalle: nuevoDetalle, total: calcularTotal(nuevoDetalle, datos.papel, datos.tamano, envio) })
    setMensajePresupuesto(`✅ Ajustado. Total: $${calcularTotal(nuevoDetalle, datos.papel, datos.tamano, envio).toFixed(2)}`)
  }

  const subtotalFloresPrincipales = floresPrincipales.reduce(
    (acc, item) => acc + item.flor.precio_unit * item.cantidad, 0
  )

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="w-full max-w-lg mx-auto space-y-4 pb-10">

      {/* ── 1. Header ────────────────────────────────────── */}
      <div className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-rose-100">
        <Image
          src={datos.imagen_url}
          alt="Referencia"
          width={80}
          height={80}
          style={{ width: '80px', height: '80px' }}
          className="object-cover rounded-xl flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-gray-800 text-lg mb-1">Tu cotización</h2>
          {datos.ia_exitosa ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />
              IA detectó {floresPrincipales.length} tipo(s) de flor
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full inline-block" />
              {datos.ia_mensaje ?? 'Ajusta manualmente el arreglo'}
            </span>
          )}
        </div>
      </div>

      {/* ── 2. Flores principales ────────────────────────── */}
      <section>
        <h3 className="font-semibold text-gray-700 mb-2 px-1 flex items-center gap-2">
          🌸 Flores del arreglo
          <span className="text-xs font-normal text-gray-400">
            ({floresPrincipales.length} tipo{floresPrincipales.length !== 1 ? 's' : ''})
          </span>
        </h3>

        {floresPrincipales.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center text-amber-700 text-sm">
            No hay flores. Agrega desde el buscador de abajo ↓
          </div>
        ) : (
          <div className="space-y-3">
            {floresPrincipales.map((item) => {
              const indexReal = datos.detalle.indexOf(item)
              return (
                <TarjetaFlor
                  key={`${item.flor.id}-${indexReal}`}
                  item={item}
                  variantes={florAgrupadas[item.flor.nombre] ?? [item.flor]}
                  onCambiarCantidad={(nueva) => cambiarCantidad(indexReal, nueva)}
                  onCambiarFlor={(nueva)     => cambiarFlor(indexReal, nueva)}
                  onEliminar={()            => eliminarItem(indexReal)}
                />
              )
            })}
          </div>
        )}
      </section>

      {/* ── 3. Sección de follaje ─────────────────────────── */}
      <section className="bg-green-50 border border-green-200 rounded-2xl overflow-hidden">
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-green-800 flex items-center gap-2">
              🌿 Follaje incluido
            </h3>
            {subtotalFollajes > 0 && (
              <span className="text-sm font-bold text-green-700">
                +${subtotalFollajes.toFixed(2)}
              </span>
            )}
          </div>

          {follajes.length > 0 ? (
            <div className="space-y-2">
              {follajes.map((item) => {
                const info      = getInfoFollaje(item.flor.nombre)
                const indexReal = datos.detalle.indexOf(item)
                return (
                  <div key={item.flor.id} className="bg-white rounded-xl p-3 border border-green-100">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1">
                        <span className="text-xl">{info.emoji}</span>
                        <div>
                          <p className="font-medium text-gray-800 text-sm">
                            {item.flor.nombre}
                            <span className="ml-2 text-xs text-gray-400 font-normal">
                              {item.cantidad} pza{item.cantidad !== 1 ? 's' : ''}
                            </span>
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                            {info.descripcion}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => eliminarItem(indexReal)}
                        className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none flex-shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* Si la IA detectó follaje pero no está en el catálogo */
            datos.ia_mensaje?.toLowerCase().includes('follaje') ? (
              <div className="bg-white rounded-xl p-3 border border-green-100">
                <div className="flex items-start gap-2">
                  <span className="text-xl">🌿</span>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">Follaje decorativo</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {datos.ia_mensaje.replace('Follaje:', '').replace('Follaje detectado:', '').trim()}
                    </p>
                    <p className="text-xs text-green-600 mt-1 font-medium">
                      El florista seleccionará el follaje más apropiado
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-green-700 opacity-70">
                El florista incluirá follaje fresco según disponibilidad
              </p>
            )
          )}
        </div>
      </section>

      {/* ── 4. Buscador para agregar flores ──────────────── */}
      <section className="bg-white border border-rose-100 rounded-2xl p-4 shadow-sm">
        <h3 className="font-semibold text-gray-700 mb-1">➕ Agregar flor o follaje</h3>
        <p className="text-xs text-gray-400 mb-3">
          Busca por nombre o color — ej: &quot;Tulipán Rosa&quot; o &quot;Nube&quot;
        </p>
        <BuscadorFlores
          flores={datos.catalogo.flores}
          onAgregar={agregarFlor}
        />
      </section>

      {/* ── 5. Selector de tamaño ────────────────────────── */}
      <SelectorTamano
        tamanos={datos.catalogo.tamanos}
        seleccionado={datos.tamano}
        onChange={cambiarTamano}
      />

      {/* ── 6. Envío ──────────────────────────────────────── */}
      <SelectorEnvio
        sucursales={datos.sucursales ?? []}
        seleccionado={envio}
        onSeleccionar={cambiarEnvio}
      />

      {/* ── 7. Nota extra del cliente ──────────────────────── */}
      <section className="bg-white border border-rose-100 rounded-2xl p-4 shadow-sm">
        <h3 className="font-semibold text-gray-700 mb-1">📝 Nota o solicitud especial</h3>
        <p className="text-xs text-gray-400 mb-2">
          ¿Algo especial para tu arreglo? Dedica, color extra, fecha de entrega...
        </p>
        <textarea
          value={nota}
          onChange={(e) => { setNota(e.target.value); onActualizar({ nota: e.target.value }) }}
          placeholder="Ej: Para el 10 de mayo, con dedicatoria que diga: Para mi mamá con amor 🌸"
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-rose-400 resize-none"
        />
      </section>

      {/* ── 8. Tipo de envoltura (colapsable) ────────────── */}
      <section className="bg-white border border-rose-100 rounded-2xl shadow-sm overflow-hidden">
        <button
          onClick={() => setMostrarPapel(!mostrarPapel)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-rose-50 transition-colors"
        >
          <div>
            <h3 className="font-semibold text-gray-700">🎁 Tipo de envoltura</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {datos.papel.nombre}
              {datos.papel.precio_unit > 0 ? ` · +$${datos.papel.precio_unit.toFixed(2)}` : ' · Incluida'}
            </p>
          </div>
          <span className={`text-gray-400 transition-transform duration-200 ${mostrarPapel ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {mostrarPapel && (
          <div className="px-4 pb-4 space-y-2 border-t border-rose-50 pt-3">
            {datos.catalogo.papeles.map((papel) => (
              <label
                key={papel.id}
                className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all
                  ${datos.papel.id === papel.id ? 'border-rose-400 bg-rose-50' : 'border-gray-100 hover:border-rose-200'}`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="papel"
                    value={papel.id}
                    checked={datos.papel.id === papel.id}
                    onChange={() => cambiarPapel(papel.id)}
                    className="accent-rose-500 w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">{papel.nombre}</span>
                </div>
                <span className={`text-sm font-semibold ${datos.papel.id === papel.id ? 'text-rose-600' : 'text-gray-400'}`}>
                  {papel.precio_unit === 0 ? 'Gratis' : `+$${papel.precio_unit.toFixed(2)}`}
                </span>
              </label>
            ))}
          </div>
        )}
      </section>

      {/* ── 9. Ajuste por presupuesto (colapsable) ───────── */}
      <section className="bg-white border border-rose-100 rounded-2xl shadow-sm overflow-hidden">
        <button
          onClick={() => setMostrarPresupuesto(!mostrarPresupuesto)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-rose-50 transition-colors"
        >
          <div>
            <h3 className="font-semibold text-gray-700">💰 Ajustar a mi presupuesto</h3>
            <p className="text-xs text-gray-400 mt-0.5">Reduce las cantidades para caber en tu monto</p>
          </div>
          <span className={`text-gray-400 transition-transform duration-200 ${mostrarPresupuesto ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {mostrarPresupuesto && (
          <div className="px-4 pb-4 border-t border-rose-50 pt-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium select-none">$</span>
                <input
                  type="number"
                  min="1"
                  value={presupuesto}
                  onChange={(e) => { setPresupuesto(e.target.value); setMensajePresupuesto(null) }}
                  placeholder="ej. 350"
                  className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-rose-400"
                />
              </div>
              <button
                onClick={ajustarAPresupuesto}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 rounded-xl font-semibold text-sm transition-colors"
              >
                Ajustar
              </button>
            </div>
            {mensajePresupuesto && (
              <p className={`mt-2 text-sm font-medium ${mensajePresupuesto.startsWith('✅') ? 'text-emerald-600' : 'text-red-500'}`}>
                {mensajePresupuesto}
              </p>
            )}
          </div>
        )}
      </section>

      {/* ── 10. Resumen y total ────────────────────────────── */}
      <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-5 text-white shadow-lg">
        <h3 className="font-semibold text-rose-100 text-sm mb-3">Resumen del pedido</h3>

        {/* Flores principales */}
        {floresPrincipales.length > 0 && (
          <div className="space-y-1 mb-2">
            {floresPrincipales.map((item, i) => (
              <div key={i} className="flex justify-between text-sm opacity-90">
                <span>{item.cantidad}× {item.flor.nombre} {item.flor.color}</span>
                <span>${(item.flor.precio_unit * item.cantidad).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Follajes */}
        {follajes.length > 0 && (
          <div className="space-y-1 mb-2">
            <p className="text-xs text-rose-200 mt-1">Follaje:</p>
            {follajes.map((item, i) => (
              <div key={i} className="flex justify-between text-sm opacity-80">
                <span>{item.flor.nombre}</span>
                <span>${(item.flor.precio_unit * item.cantidad).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-rose-400/50 my-3" />

        {/* Costos fijos */}
        <div className="space-y-1 mb-3">
          <div className="flex justify-between text-sm opacity-80">
            <span>Subtotal flores</span>
            <span>${subtotalFloresPrincipales.toFixed(2)}</span>
          </div>
          {subtotalFollajes > 0 && (
            <div className="flex justify-between text-sm opacity-80">
              <span>Follaje</span>
              <span>${subtotalFollajes.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm opacity-80">
            <span>Envoltura ({datos.papel.nombre})</span>
            <span>{datos.papel.precio_unit === 0 ? 'Incluida' : `+$${datos.papel.precio_unit.toFixed(2)}`}</span>
          </div>
          {datos.tamano.precio_extra > 0 && (
            <div className="flex justify-between text-sm opacity-80">
              <span>Tamaño {datos.tamano.nombre}</span>
              <span>+${datos.tamano.precio_extra.toFixed(2)}</span>
            </div>
          )}
          
          {/* Aquí se refleja el costo de Envío en el resumen */}
          {envio && envio.precio > 0 && (
            <div className="flex justify-between text-sm opacity-80">
              <span>Envío ({envio.zona?.nombre})</span>
              <span>+${envio.precio.toFixed(2)}</span>
            </div>
          )}
          {envio?.tipo === 'sucursal' && (
            <div className="flex justify-between text-sm opacity-80">
              <span>Recolección en {envio.sucursal?.nombre}</span>
              <span className="text-emerald-300 font-medium">Gratis</span>
            </div>
          )}
        </div>

        {/* Total */}
        <div className="border-t border-rose-400 pt-3 flex justify-between items-end">
          <div>
            <p className="text-rose-200 text-xs">Total estimado</p>
            <p className="font-bold text-4xl">${datos.total.toFixed(2)}</p>
          </div>
          <p className="text-rose-200 text-xs text-right max-w-[120px]">
            Precio sujeto a confirmación
          </p>
        </div>
      </div>

      {/* ── 11. Botones ───────────────────────────────────── */}
      <div className="space-y-3">
        <button
          onClick={onAprobar}
          className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-bold py-4 rounded-2xl text-lg shadow-md transition-colors flex items-center justify-center gap-2"
        >
          <span>💬</span>
          <span>Aprobar y pedir por WhatsApp</span>
        </button>
        <button
          onClick={onNuevaCotizacion}
          className="w-full bg-white hover:bg-rose-50 text-rose-500 font-medium py-3 rounded-2xl border border-rose-200 transition-colors"
        >
          🔄 Hacer nueva cotización
        </button>
      </div>

    </div>
  )
}