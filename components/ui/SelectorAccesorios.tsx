// components/ui/SelectorAccesorios.tsx
'use client'

import { Accesorio } from '@/types'

interface SelectorAccesoriosProps {
  accesorios:      Accesorio[]
  seleccionados:   Accesorio[]
  onToggle:        (accesorio: Accesorio) => void
}

export default function SelectorAccesorios({
  accesorios,
  seleccionados,
  onToggle,
}: SelectorAccesoriosProps) {
  if (accesorios.length === 0) return null

  return (
    <section className="bg-white border border-rose-100 rounded-2xl p-4 shadow-sm">
      <h3 className="font-semibold text-gray-700 mb-1">🎀 Accesorios extras</h3>
      <p className="text-xs text-gray-400 mb-3">
        Agrega detalles especiales a tu arreglo
      </p>

      <div className="grid grid-cols-2 gap-2">
        {accesorios.map((acc) => {
          const activo = seleccionados.some(s => s.id === acc.id)
          return (
            <button
              key={acc.id}
              onClick={() => onToggle(acc)}
              className={`
                flex items-center gap-2 p-3 rounded-xl border-2 text-left
                transition-all duration-150
                ${activo
                  ? 'border-rose-400 bg-rose-50'
                  : 'border-gray-100 hover:border-rose-200 hover:bg-rose-50/50'}
              `}
            >
              <span className="text-2xl flex-shrink-0">{acc.emoji}</span>
              <div className="min-w-0">
                <p className={`text-xs font-semibold truncate ${activo ? 'text-rose-700' : 'text-gray-700'}`}>
                  {acc.nombre}
                </p>
                <p className={`text-xs ${activo ? 'text-rose-500' : 'text-gray-400'}`}>
                  +${acc.precio_unit.toFixed(2)}
                </p>
              </div>
              {activo && (
                <span className="text-rose-400 text-sm ml-auto flex-shrink-0">✓</span>
              )}
            </button>
          )
        })}
      </div>

      {seleccionados.length > 0 && (
        <div className="mt-3 pt-3 border-t border-rose-50 flex justify-between text-sm">
          <span className="text-gray-500">
            {seleccionados.length} accesorio{seleccionados.length !== 1 ? 's' : ''} seleccionado{seleccionados.length !== 1 ? 's' : ''}
          </span>
          <span className="font-semibold text-rose-600">
            +${seleccionados.reduce((acc, a) => acc + a.precio_unit, 0).toFixed(2)}
          </span>
        </div>
      )}
    </section>
  )
}
