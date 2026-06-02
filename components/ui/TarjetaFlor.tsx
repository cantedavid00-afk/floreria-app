// components/ui/TarjetaFlor.tsx
'use client'

import { Flor, ItemCotizacion } from '@/types'

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
  'Ave del Paraíso':'🦜',
  'Anthurium':      '🌺',
}

interface TarjetaFlorProps {
  item:              ItemCotizacion
  variantes:         Flor[]
  onCambiarCantidad: (nueva: number) => void
  onCambiarFlor:     (nuevaFlor: Flor) => void
  onEliminar:        () => void
}

export default function TarjetaFlor({
  item,
  variantes,
  onCambiarCantidad,
  onCambiarFlor,
  onEliminar,
}: TarjetaFlorProps) {
  const emoji    = EMOJIS[item.flor.nombre] ?? '🌺'

  return (
    <div className="bg-white border border-rose-100 rounded-2xl p-4 shadow-sm">
      <div className="flex items-start gap-3">

        <span className="text-3xl select-none mt-0.5">{emoji}</span>

        <div className="flex-1 min-w-0">

          {/* Nombre + eliminar */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-800">{item.flor.nombre}</h3>
            <button
              onClick={onEliminar}
              className="text-gray-300 hover:text-red-400 transition-colors text-xl leading-none ml-2"
              title="Eliminar"
            >
              ✕
            </button>
          </div>

          {/* Selector de color */}
          {variantes.length > 1 ? (
            <div className="mb-3">
              <label className="text-xs text-gray-500 mb-1 block">Color:</label>
              <select
                value={item.flor.id}
                onChange={(e) => {
                  const nueva = variantes.find((v) => v.id === e.target.value)
                  if (nueva) onCambiarFlor(nueva)
                }}
                className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-rose-400 bg-white appearance-none cursor-pointer"
                // ↑ text-gray-800 es el fix del bug de texto blanco
              >
                {variantes.map((v) => (
                  <option key={v.id} value={v.id} className="text-gray-800 bg-white">
                    {v.color}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-sm text-gray-500 mb-3">
              {item.flor.color}
            </p>
          )}

          {/* Cantidad */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onCambiarCantidad(Math.max(1, item.cantidad - 1))}
                className="w-8 h-8 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-600 font-bold text-xl flex items-center justify-center transition-colors"
              >
                −
              </button>
              <span className="w-8 text-center font-bold text-gray-800 text-lg">
                {item.cantidad}
              </span>
              <button
                onClick={() => onCambiarCantidad(item.cantidad + 1)}
                className="w-8 h-8 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-600 font-bold text-xl flex items-center justify-center transition-colors"
              >
                +
              </button>
            </div>
            <span className="font-bold text-rose-600 text-lg">
              {item.cantidad} pzas
            </span>
          </div>

        </div>
      </div>
    </div>
  )
}