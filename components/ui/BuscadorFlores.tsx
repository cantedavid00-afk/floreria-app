// components/ui/BuscadorFlores.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Flor } from '@/types'

const EMOJIS: Record<string, string> = {
  'Rosa':           '🌹',
  'Rosa Inglesa':   '🌹',
  'Rosa Mini':      '🌹',
  'Girasol':        '🌻',
  'Girasol Mini':   '🌻',
  'Tulipán':        '🌷',
  'Lilium':         '💐',
  'Lirio':          '💐',
  'Clavel':         '🌸',
  'Gerbera':        '🌼',
  'Orquídea':       '🌺',
  'Margarita':      '🌼',
  'Alstroemeria':   '🌸',
  'Hortensia':      '💠',
  'Peonía':         '🌸',
  'Lavanda':        '💜',
  'Fresia':         '🌸',
  'Anémona':        '🌺',
  'Ranúnculo':      '🌸',
  'Lisianthus':     '💐',
  'Snapdragon':     '🌸',
  'Gypsophila':     '🤍',
  'Eucalipto':      '🌿',
  'Helecho':        '🌿',
  'Follaje':        '🌿',
  'Ave del Paraíso':'🦜',
  'Anthurium':      '🌺',
  'Heliconia':      '🌺',
  'Bromelia':       '🌺',
}

const COLORES_BADGE: Record<string, string> = {
  'Rojo':     'bg-red-100 text-red-700',
  'Rosa':     'bg-pink-100 text-pink-700',
  'Blanco':   'bg-gray-100 text-gray-600',
  'Amarillo': 'bg-yellow-100 text-yellow-700',
  'Naranja':  'bg-orange-100 text-orange-700',
  'Morado':   'bg-purple-100 text-purple-700',
  'Azul':     'bg-blue-100 text-blue-700',
  'Verde':    'bg-green-100 text-green-700',
  'Fucsia':   'bg-fuchsia-100 text-fuchsia-700',
  'Coral':    'bg-rose-100 text-rose-700',
  'Bicolor':  'bg-gradient-to-r from-pink-100 to-yellow-100 text-gray-700',
  'Rosado':   'bg-pink-100 text-pink-600',
}

interface BuscadorFloresProps {
  flores:       Flor[]
  onAgregar:    (flor: Flor, cantidad: number) => void
}

export default function BuscadorFlores({ flores, onAgregar }: BuscadorFloresProps) {
  const [query,        setQuery]        = useState('')
  const [abierto,      setAbierto]      = useState(false)
  const [florSel,      setFlorSel]      = useState<Flor | null>(null)
  const [cantidad,     setCantidad]     = useState(3)
  const [indexActivo,  setIndexActivo]  = useState(0)
  const inputRef   = useRef<HTMLInputElement>(null)
  const listaRef   = useRef<HTMLUListElement>(null)

  // ── Filtrar flores según el texto buscado ──────────────
  const resultados = query.trim().length === 0
    ? flores  // Sin búsqueda → mostrar todas
    : flores.filter((f) => {
        const texto = `${f.nombre} ${f.color}`.toLowerCase()
        return query.toLowerCase().split(' ').every((palabra) =>
          texto.includes(palabra)
        )
      })

  // Resetear índice activo cuando cambia la búsqueda
  useEffect(() => { setIndexActivo(0) }, [query])

  // ── Navegación con teclado ─────────────────────────────
  const manejarTeclado = (e: React.KeyboardEvent) => {
    if (!abierto) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndexActivo((i) => Math.min(i + 1, resultados.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndexActivo((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && resultados[indexActivo]) {
      e.preventDefault()
      seleccionarFlor(resultados[indexActivo])
    } else if (e.key === 'Escape') {
      setAbierto(false)
    }
  }

  // Hacer scroll automático al item activo
  useEffect(() => {
    const lista = listaRef.current
    if (!lista) return
    const item = lista.children[indexActivo] as HTMLElement
    item?.scrollIntoView({ block: 'nearest' })
  }, [indexActivo])

  // ── Seleccionar flor del dropdown ─────────────────────
  const seleccionarFlor = (flor: Flor) => {
    setFlorSel(flor)
    setQuery(`${flor.nombre} ${flor.color}`)
    setAbierto(false)
  }

  // ── Confirmar y agregar al arreglo ────────────────────
  const confirmarAgregar = () => {
    if (!florSel) return
    onAgregar(florSel, cantidad)
    // Limpiar formulario
    setFlorSel(null)
    setQuery('')
    setCantidad(3)
    inputRef.current?.focus()
  }

  return (
    <div className="space-y-3">

      {/* ── Input de búsqueda ─────────────────────────── */}
      <div className="relative">
        <div className="relative">
          {/* Icono lupa */}
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            🔍
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setFlorSel(null)
              setAbierto(true)
            }}
            onFocus={() => setAbierto(true)}
            onBlur={() => setTimeout(() => setAbierto(false), 150)}
            onKeyDown={manejarTeclado}
            placeholder="Busca por nombre o color... ej: Rosa Rojo"
            className="w-full pl-10 pr-10 py-3 border-2 border-gray-200 text-gray-800 rounded-xl text-sm focus:outline-none focus:border-rose-400 transition-colors bg-white"
          />
          {/* Botón limpiar */}
          {query && (
            <button
              onClick={() => { setQuery(''); setFlorSel(null); inputRef.current?.focus() }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 text-lg leading-none"
            >
              ✕
            </button>
          )}
        </div>

        {/* ── Dropdown de resultados ──────────────────── */}
        {abierto && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">

            {/* Contador de resultados */}
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {resultados.length === flores.length
                  ? `${flores.length} flores disponibles`
                  : `${resultados.length} resultado${resultados.length !== 1 ? 's' : ''}`}
              </span>
              <span className="text-xs text-gray-300">↑↓ para navegar · Enter para seleccionar</span>
            </div>

            {resultados.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-400 text-sm">
                😕 No encontramos "{query}"
                <p className="text-xs mt-1 text-gray-300">
                  Intenta con otro nombre o color
                </p>
              </div>
            ) : (
              <ul
                ref={listaRef}
                className="max-h-64 overflow-y-auto divide-y divide-gray-50"
              >
                {resultados.map((flor, i) => {
                  const emoji      = EMOJIS[flor.nombre] ?? '🌺'
                  const badgeClass = COLORES_BADGE[flor.color] ?? 'bg-gray-100 text-gray-600'
                  const activo     = i === indexActivo

                  return (
                    <li
                      key={flor.id}
                      onMouseDown={() => seleccionarFlor(flor)}
                      onMouseEnter={() => setIndexActivo(i)}
                      className={`
                        flex items-center justify-between px-4 py-3 cursor-pointer
                        transition-colors duration-75
                        ${activo ? 'bg-rose-50' : 'hover:bg-gray-50'}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl select-none">{emoji}</span>
                        <div>
                          <span className="font-medium text-gray-800 text-sm">
                            {flor.nombre}
                          </span>
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${badgeClass}`}>
                            {flor.color}
                          </span>
                        </div>
                      </div>
                      <span className="text-rose-500 font-semibold text-sm flex-shrink-0 ml-2">
                        ${flor.precio_unit.toFixed(2)}
                        <span className="text-gray-400 font-normal"> c/u</span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* ── Panel de cantidad (visible solo si seleccionó una flor) ── */}
      {florSel && (
        <div className="bg-rose-50 border-2 border-rose-200 rounded-xl p-4 animate-in fade-in duration-200">

          {/* Confirmación de selección */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">{EMOJIS[florSel.nombre] ?? '🌺'}</span>
            <div>
              <p className="font-semibold text-gray-800 text-sm">
                {florSel.nombre} {florSel.color}
              </p>
              <p className="text-xs text-rose-500">
                ${florSel.precio_unit.toFixed(2)} por unidad
              </p>
            </div>
          </div>

          {/* Control de cantidad */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                className="w-9 h-9 rounded-full bg-white shadow-sm border border-rose-200 text-rose-500 font-bold text-xl flex items-center justify-center hover:bg-rose-100 transition-colors"
              >
                −
              </button>
              <div className="text-center">
                <span className="text-2xl font-bold text-gray-800">{cantidad}</span>
                <p className="text-xs text-gray-400 leading-none">piezas</p>
              </div>
              <button
                onClick={() => setCantidad(cantidad + 1)}
                className="w-9 h-9 rounded-full bg-white shadow-sm border border-rose-200 text-rose-500 font-bold text-xl flex items-center justify-center hover:bg-rose-100 transition-colors"
              >
                +
              </button>
            </div>

            {/* Subtotal preview */}
            <div className="text-right">
              <p className="text-xs text-gray-400">Subtotal</p>
              <p className="text-xl font-bold text-rose-600">
                ${(florSel.precio_unit * cantidad).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Botón agregar */}
          <button
            onClick={confirmarAgregar}
            className="mt-3 w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl transition-colors text-sm shadow-sm"
          >
            ➕ Agregar al arreglo
          </button>
        </div>
      )}
    </div>
  )
}