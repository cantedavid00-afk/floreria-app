// components/ui/EditorCotizacion.tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Flor, ItemCotizacion, PapelEnvoltura, TamanoRamo, Accesorio, AvisoSustitucion } from '@/types'
import TarjetaFlor from './TarjetaFlor'
import BuscadorFlores from './BuscadorFlores'
import SelectorTamano from './SelectorTamano'
import SelectorAccesorios from './SelectorAccesorios'
import SelectorEnvio from './SelectorEnvio' // ← 1. IMPORTAMOS EL COMPONENTE

const MARGEN = 0.35  // 35% oculto al cliente

export interface DatosCotizacion {
  id?:                  string
  imagen_url:           string
  imagen_path:          string
  ia_exitosa:           boolean
  ia_mensaje?:          string
  follaje_descripcion?: string
  detalle:              ItemCotizacion[]
  papel:                PapelEnvoltura
  tamano:               TamanoRamo
  accesorios_seleccionados: Accesorio[]
  avisos?:              AvisoSustitucion[]
  total:                number
  nota?:                string
  envio?: { tipo: 'domicilio' | 'sucursal'; zona?: { id: string; nombre: string; descripcion: string; precio: number }; sucursal?: { id: string; nombre: string; direccion: string }; precio: number } | null
  sucursales?:          { id: string; nombre: string; direccion: string; maps_url?: string }[]
  catalogo: {
    flores:      Flor[]
    papeles:     PapelEnvoltura[]
    tamanos:     TamanoRamo[]
    accesorios:  Accesorio[]
  }
}

interface EditorCotizacionProps {
  datos:             DatosCotizacion
  onActualizar:      (cambios: Partial<DatosCotizacion>) => void
  onAprobar:         () => void
  onNuevaCotizacion: () => void
}

// ── Total con margen oculto ───────────────────────────────────
const calcularTotal = (
  detalle:      ItemCotizacion[],
  tamano:       TamanoRamo,
  accesorios:   Accesorio[],
  costoEnvio:   number = 0
) => {
  const subtotalFlores     = detalle.reduce((acc, i) => acc + i.flor.precio_unit * i.cantidad, 0)
  const subtotalAccesorios = accesorios.reduce((acc, a) => acc + a.precio_unit, 0)
  const papelPrecio        = tamano.papel_precio ?? 0
  const subtotalBase       = subtotalFlores + subtotalAccesorios + papelPrecio + costoEnvio
  return Math.ceil(subtotalBase * (1 + MARGEN))  // redondear hacia arriba
}

const agruparPorNombre = (flores: Flor[]): Record<string, Flor[]> =>
  flores.reduce<Record<string, Flor[]>>((acc, flor) => {
    acc[flor.nombre] = [...(acc[flor.nombre] ?? []), flor]
    return acc
  }, {})

const FOLLAJE_KEYS = ['nube', 'gypsophila', 'follaje', 'eucalipto', 'helecho', 'ruscus', 'hierba', 'pampas']
const esFollaje = (nombre: string) =>
  FOLLAJE_KEYS.some(f => nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(f))

export default function EditorCotizacion({
  datos, onActualizar, onAprobar, onNuevaCotizacion,
}: EditorCotizacionProps) {

  const [presupuesto,         setPresupuesto]        = useState('')
  const [mensajePresupuesto, setMensajePresupuesto] = useState<string | null>(null)
  const [mostrarPresupuesto, setMostrarPresupuesto] = useState(false)
  const [nota,                setNota]               = useState(datos.nota ?? '')

  const florAgrupadas       = agruparPorNombre(datos.catalogo.flores)
  const floresPrincipales   = datos.detalle.filter(i => !esFollaje(i.flor.nombre))
  const follajes            = datos.detalle.filter(i =>  esFollaje(i.flor.nombre))
  const costoEnvio          = datos.envio?.precio ?? 0
  const accesoriosSelec     = datos.accesorios_seleccionados ?? []

  // ── Helpers de cálculo ──────────────────────────────────────
  // 2. ACTUALIZAMOS LA FUNCIÓN PARA QUE RECIBA EL NUEVO COSTO DE ENVÍO
  const recalcular = (
    nuevoDetalle?:     ItemCotizacion[],
    nuevoTamano?:      TamanoRamo,
    nuevosAccesorios?: Accesorio[],
    nuevoCostoEnvio?:  number
  ) => calcularTotal(
    nuevoDetalle     ?? datos.detalle,
    nuevoTamano      ?? datos.tamano,
    nuevosAccesorios ?? accesoriosSelec,
    nuevoCostoEnvio !== undefined ? nuevoCostoEnvio : costoEnvio
  )

  // ── Modificar flores ────────────────────────────────────────
  const cambiarCantidad = (index: number, nueva: number) => {
    const nd = datos.detalle.map((item, i) =>
      i === index ? { ...item, cantidad: nueva, subtotal: item.flor.precio_unit * nueva } : item
    )
    onActualizar({ detalle: nd, total: recalcular(nd) })
  }

  const cambiarFlor = (index: number, nuevaFlor: Flor) => {
    const nd = datos.detalle.map((item, i) =>
      i === index ? { ...item, flor: nuevaFlor, subtotal: nuevaFlor.precio_unit * item.cantidad } : item
    )
    onActualizar({ detalle: nd, total: recalcular(nd) })
  }

  const eliminarItem = (index: number) => {
    const nd = datos.detalle.filter((_, i) => i !== index)
    onActualizar({ detalle: nd, total: recalcular(nd) })
  }

  const agregarFlor = (flor: Flor, cantidad: number) => {
    const idx = datos.detalle.findIndex(i => i.flor.id === flor.id)
    const nd = idx >= 0
      ? datos.detalle.map((item, i) => i === idx
          ? { ...item, cantidad: item.cantidad + cantidad, subtotal: item.flor.precio_unit * (item.cantidad + cantidad) }
          : item)
      : [...datos.detalle, { flor, cantidad, subtotal: flor.precio_unit * cantidad }]
    onActualizar({ detalle: nd, total: recalcular(nd) })
  }

  // ── Cambiar tamaño ──────────────────────────────────────────
  const cambiarTamano = (nuevoTamano: TamanoRamo) => {
    const ratio = nuevoTamano.multiplicador / datos.tamano.multiplicador
    const nd    = datos.detalle.map(item => {
      const c = Math.max(1, Math.round(item.cantidad * ratio))
      return { ...item, cantidad: c, subtotal: item.flor.precio_unit * c }
    })
    onActualizar({ tamano: nuevoTamano, detalle: nd, total: recalcular(nd, nuevoTamano) })
  }

  // ── Toggle accesorio ────────────────────────────────────────
  const toggleAccesorio = (acc: Accesorio) => {
    const ya = accesoriosSelec.some(a => a.id === acc.id)
    const nuevos = ya
      ? accesoriosSelec.filter(a => a.id !== acc.id)
      : [...accesoriosSelec, acc]
    onActualizar({ accesorios_seleccionados: nuevos, total: recalcular(undefined, undefined, nuevos) })
  }

  // ── Cambiar Envío ───────────────────────────────────────────
  // NUEVA FUNCIÓN: Para manejar el cambio del selector de envío
  const cambiarEnvio = (nuevoEnvio: DatosCotizacion['envio']) => {
    const nuevoCosto = nuevoEnvio?.precio ?? 0
    onActualizar({ 
      envio: nuevoEnvio, 
      total: recalcular(undefined, undefined, undefined, nuevoCosto) 
    })
  }

  // ── Ajustar a presupuesto ───────────────────────────────────
  const ajustarAPresupuesto = () => {
    const monto = parseFloat(presupuesto)
    if (isNaN(monto) || monto <= 0) { setMensajePresupuesto('Ingresa un presupuesto válido.'); return }

    // El presupuesto ya incluye el margen — calculamos cuánto pueden ser las flores
    const montoSinMargen     = monto / (1 + MARGEN)
    const costosFixed        = (datos.tamano.papel_precio ?? 0) +
                               accesoriosSelec.reduce((a, x) => a + x.precio_unit, 0) +
                               costoEnvio
    const presupuestoFlores  = montoSinMargen - costosFixed

    if (presupuestoFlores <= 0) { setMensajePresupuesto('Presupuesto muy bajo para este arreglo.'); return }

    const totalFloresActual = datos.detalle.reduce((acc, i) => acc + i.flor.precio_unit * i.cantidad, 0)
    if (totalFloresActual <= presupuestoFlores) { setMensajePresupuesto('✅ Ya cabe en ese presupuesto.'); return }

    const factor = presupuestoFlores / totalFloresActual
    const nd     = datos.detalle.map(item => {
      const c = Math.max(1, Math.floor(item.cantidad * factor))
      return { ...item, cantidad: c, subtotal: item.flor.precio_unit * c }
    })
    onActualizar({ detalle: nd, total: recalcular(nd) })
    setMensajePresupuesto(`✅ Ajustado. Total: $${recalcular(nd).toFixed(2)}`)
  }

  // ── Subtotales visibles ─────────────────────────────────────
  const subtotalFloresMostrado = floresPrincipales.reduce((acc, i) => acc + i.flor.precio_unit * i.cantidad, 0)
  const subtotalFollajeMostrado = follajes.reduce((acc, i) => acc + i.flor.precio_unit * i.cantidad, 0)
  const papelMostrado           = datos.tamano.papel_precio ?? 0

  return (
    <div className="w-full max-w-lg mx-auto space-y-4 pb-10">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-rose-100">
        <Image src={datos.imagen_url} alt="Referencia" width={80} height={80}
          style={{ width: '80px', height: '80px' }}
          className="object-cover rounded-xl flex-shrink-0" />
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

      {/* ── Avisos de Sustitución ─────────────────────────────── */}
      {datos.avisos && datos.avisos.length > 0 && (
        <section className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-start gap-2 mb-2">
            <span className="text-amber-500 text-lg leading-none mt-0.5">💡</span>
            <div>
              <h3 className="font-semibold text-amber-800 text-sm">Adaptamos el diseño para ti</h3>
              <p className="text-xs text-amber-700/80">
                Basados en nuestro catálogo actual, te sugerimos estas opciones:
              </p>
            </div>
          </div>
          <ul className="space-y-2 mt-3">
            {datos.avisos.map((aviso, idx) => (
              <li key={idx} className="text-xs bg-white/60 rounded-xl px-3 py-2 text-amber-800 flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="font-medium line-through opacity-60 capitalize">{aviso.detectado}</span>
                  <span className="text-amber-600 font-bold">→ {aviso.sugerencia}</span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">
                  Motivo: {aviso.motivo}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Flores principales ──────────────────────────────── */}
      <section>
        <h3 className="font-semibold text-gray-700 mb-2 px-1 flex items-center gap-2">
          🌸 Flores del arreglo
          <span className="text-xs font-normal text-gray-400">
            ({floresPrincipales.length} tipo{floresPrincipales.length !== 1 ? 's' : ''})
          </span>
        </h3>
        {floresPrincipales.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center text-amber-700 text-sm">
            No hay flores. Agrega desde el buscador ↓
          </div>
        ) : (
          <div className="space-y-3">
            {floresPrincipales.map((item) => {
              const indexReal = datos.detalle.indexOf(item)
              return (
                <TarjetaFlor key={`${item.flor.id}-${indexReal}`} item={item}
                  variantes={florAgrupadas[item.flor.nombre] ?? [item.flor]}
                  onCambiarCantidad={n => cambiarCantidad(indexReal, n)}
                  onCambiarFlor={f    => cambiarFlor(indexReal, f)}
                  onEliminar={()      => eliminarItem(indexReal)} />
              )
            })}
          </div>
        )}
      </section>

      {/* ── Follaje ─────────────────────────────────────────── */}
      {follajes.length > 0 && (
        <section className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <h3 className="font-semibold text-green-800 mb-2">🌿 Follaje incluido</h3>
          <div className="space-y-2">
            {follajes.map(item => {
              const indexReal = datos.detalle.indexOf(item)
              return (
                <div key={item.flor.id} className="bg-white rounded-xl p-3 border border-green-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>🌿</span>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{item.flor.nombre}</p>
                      <p className="text-xs text-gray-400">{item.cantidad} pzas</p>
                    </div>
                  </div>
                  <button onClick={() => eliminarItem(indexReal)}
                    className="text-gray-300 hover:text-red-400 text-lg">✕</button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Buscador ────────────────────────────────────────── */}
      <section className="bg-white border border-rose-100 rounded-2xl p-4 shadow-sm">
        <h3 className="font-semibold text-gray-700 mb-1">➕ Agregar flor o follaje</h3>
        <p className="text-xs text-gray-400 mb-3">Busca por nombre o color</p>
        <BuscadorFlores flores={datos.catalogo.flores} onAgregar={agregarFlor} />
      </section>

      {/* ── Tamaño ──────────────────────────────────────────── */}
      <SelectorTamano tamanos={datos.catalogo.tamanos} seleccionado={datos.tamano} onChange={cambiarTamano} />

      {/* ── Accesorios ──────────────────────────────────────── */}
      <SelectorAccesorios
        accesorios={datos.catalogo.accesorios}
        seleccionados={accesoriosSelec}
        onToggle={toggleAccesorio}
      />

      {/* ── Envío / Entrega (3. AGREGAMOS EL COMPONENTE) ────── */}
      <section className="bg-white border border-rose-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-rose-50">
           <h3 className="font-semibold text-gray-700">🚚 Método de entrega</h3>
           <p className="text-xs text-gray-400">¿A domicilio o recoges en sucursal?</p>
        </div>
        <div className="p-4 bg-gray-50/50">
          <SelectorEnvio
            sucursales={datos.sucursales ?? []}
            seleccionado={datos.envio ?? null}
            onChange={cambiarEnvio}
          />
        </div>
      </section>

      {/* ── Ajuste por presupuesto ──────────────────────────── */}
      <section className="bg-white border border-rose-100 rounded-2xl shadow-sm overflow-hidden">
        <button onClick={() => setMostrarPresupuesto(!mostrarPresupuesto)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-rose-50 transition-colors">
          <div>
            <h3 className="font-semibold text-gray-700">💰 Ajustar a mi presupuesto</h3>
            <p className="text-xs text-gray-400 mt-0.5">Reduce las cantidades para caber en tu monto</p>
          </div>
          <span className={`text-gray-400 transition-transform ${mostrarPresupuesto ? 'rotate-180' : ''}`}>▼</span>
        </button>
        {mostrarPresupuesto && (
          <div className="px-4 pb-4 border-t border-rose-50 pt-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input type="number" min="1" value={presupuesto}
                  onChange={e => { setPresupuesto(e.target.value); setMensajePresupuesto(null) }}
                  placeholder="ej. 350"
                  className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-rose-400" />
              </div>
              <button onClick={ajustarAPresupuesto}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 rounded-xl font-semibold text-sm">
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

      {/* ── Nota ────────────────────────────────────────────── */}
      <section className="bg-white border border-rose-100 rounded-2xl p-4 shadow-sm">
        <h3 className="font-semibold text-gray-700 mb-1">📝 Nota o solicitud especial</h3>
        <p className="text-xs text-gray-400 mb-2">Dedicatoria, fecha de entrega, color favorito...</p>
        <textarea value={nota}
          onChange={e => { setNota(e.target.value); onActualizar({ nota: e.target.value }) }}
          placeholder="Ej: Para el 10 de mayo, con dedicatoria: Para mi mamá con amor 🌸"
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-rose-400 resize-none" />
      </section>

      {/* ── Resumen y total ─────────────────────────────────── */}
      <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-5 text-white shadow-lg">
        <h3 className="font-semibold text-rose-100 text-sm mb-3">Resumen del pedido</h3>

        {/* Flores */}
        <div className="space-y-1 mb-2">
          {floresPrincipales.map((item, i) => (
            <div key={i} className="flex justify-between text-sm opacity-90">
              <span>{item.cantidad}× {item.flor.nombre} {item.flor.color}</span>
              <span>${(item.flor.precio_unit * item.cantidad).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Follaje */}
        {follajes.length > 0 && (
          <div className="space-y-1 mb-2">
            <p className="text-xs text-rose-200">Follaje:</p>
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
            <span>${subtotalFloresMostrado.toFixed(2)}</span>
          </div>
          {subtotalFollajeMostrado > 0 && (
            <div className="flex justify-between text-sm opacity-80">
              <span>Follaje</span>
              <span>${subtotalFollajeMostrado.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm opacity-80">
            <span>Envoltura ({datos.tamano.nombre})</span>
            <span>${papelMostrado.toFixed(2)}</span>
          </div>
          {accesoriosSelec.length > 0 && accesoriosSelec.map(acc => (
            <div key={acc.id} className="flex justify-between text-sm opacity-80">
              <span>{acc.emoji} {acc.nombre}</span>
              <span>+${acc.precio_unit.toFixed(2)}</span>
            </div>
          ))}
          {costoEnvio > 0 && (
            <div className="flex justify-between text-sm opacity-80 text-yellow-200 font-medium">
              <span>Envío ({datos.envio?.tipo === 'domicilio' ? 'A Domicilio' : 'Sucursal'})</span>
              <span>+${costoEnvio.toFixed(2)}</span>
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

      {/* ── Botones ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <button onClick={onAprobar}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-2xl text-lg shadow-md transition-colors flex items-center justify-center gap-2">
          <span>💬</span><span>Aprobar y pedir por WhatsApp</span>
        </button>
        <button onClick={onNuevaCotizacion}
          className="w-full bg-white hover:bg-rose-50 text-rose-500 font-medium py-3 rounded-2xl border border-rose-200 transition-colors">
          🔄 Hacer nueva cotización
        </button>
      </div>
    </div>
  )
}
