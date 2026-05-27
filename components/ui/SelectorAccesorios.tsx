'use client'

import { useState } from 'react'
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
  const [isOpen, setIsOpen] = useState(false)

  if (accesorios.length === 0) return null

  return (
    <section className="bg-white border border-rose-100 rounded-2xl shadow-sm overflow-hidden transition-all duration-300">
      {/* Botón de la pestaña */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 hover:bg-rose-50/30 transition-colors"
      >
        <div className="text-left">
          <h3 className="font-semibold text-gray-700 mb-0.5">🎀 Accesorios extras</h3>
          <p className="text-xs text-gray-400">
            {isOpen ? 'Ocultar opciones' : 'Agrega detalles especiales'}
          </p>
        </div>
        <span className={`text-rose-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* Contenido desplegable */}
      {isOpen && (
        <div className="p-4 pt-0 border-t border-rose-50 animate-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-2 gap-2 mt-4">
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
            <div className="mt-4 pt-3 border-t border-rose-50 flex justify-between text-sm">
              <span className="text-gray-500">
                {seleccionados.length} seleccionado{seleccionados.length !== 1 ? 's' : ''}
              </span>
              <span className="font-semibold text-rose-600">
                +${seleccionados.reduce((acc, a) => acc + a.precio_unit, 0).toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
