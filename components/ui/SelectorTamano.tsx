'use client'

import { TamanoRamo } from '@/types'

// Siluetas SVG inspiradas en tu imagen de referencia
const SILUETA_CONFIG = {
  S:  { ramo: 'w-8 h-8',   figura: 'h-28', label: 'Pequeño'     },
  M:  { ramo: 'w-12 h-12', figura: 'h-32', label: 'Mediano'     },
  L:  { ramo: 'w-16 h-16', figura: 'h-36', label: 'Grande'      },
  XL: { ramo: 'w-20 h-20', figura: 'h-40', label: 'Extra Grande' },
}

interface SelectorTamanoProps {
  tamanos?:     TamanoRamo[] // Hacemos que sea opcional por seguridad
  seleccionado?: TamanoRamo | null
  onChange:   (tamano: TamanoRamo) => void
}

function SiluetaMujer({ clave, activo }: { clave: string; activo: boolean }) {
  const cfg = SILUETA_CONFIG[clave as keyof typeof SILUETA_CONFIG]
  // Si la clave no existe en la config, no renderizamos nada para no romper
  if (!cfg) return null

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Ramo proporcional */}
      <div
        className={`
          ${cfg.ramo} rounded-full mb-1 transition-all duration-200
          ${activo ? 'bg-rose-300' : 'bg-gray-200'}
        `}
        style={{ boxShadow: activo ? '0 0 0 3px #fda4af' : 'none' }}
      />
      {/* Silueta (representación simple) */}
      <div
        className={`
          w-8 ${cfg.figura} rounded-t-full transition-colors duration-200
          ${activo ? 'bg-rose-200' : 'bg-gray-200'}
        `}
        style={{ clipPath: 'ellipse(50% 50% at 50% 50%)' }}
      />
    </div>
  )
}

export default function SelectorTamano({
  tamanos = [], // Por defecto un arreglo vacío si no llega nada
  seleccionado,
  onChange,
}: SelectorTamanoProps) {

  // Si no hay tamaños cargados aún, mostramos un estado de carga o no mostramos nada
  if (!tamanos || tamanos.length === 0) {
    return (
      <section className="bg-white border border-rose-100 rounded-2xl p-4 shadow-sm text-center">
        <p className="text-sm text-gray-400">Cargando tamaños...</p>
      </section>
    )
  }

  return (
    <section className="bg-white border border-rose-100 rounded-2xl p-4 shadow-sm overflow-x-auto">
      <h3 className="font-semibold text-gray-700 mb-1">📐 Tamaño del ramo</h3>
      <p className="text-xs text-gray-400 mb-4">
        El tamaño ajusta las cantidades y el precio del arreglo
      </p>

      {/* Agregué min-w-[300px] para que en celulares muy pequeños no se aplasten los botones y se pueda hacer scroll */}
      <div className="grid grid-cols-4 gap-2 min-w-[280px]">
        {tamanos.map((t) => {
          // Usamos ?. por si seleccionado llega como null en el primer render
          const activo = seleccionado?.id === t.id
          
          return (
            <button
              key={t.id}
              onClick={() => onChange(t)}
              className={`
                flex flex-col items-center justify-between gap-2 p-3 rounded-2xl border-2
                transition-all duration-200 cursor-pointer h-full
                ${activo
                  ? 'border-rose-400 bg-rose-50 shadow-md scale-[1.02]'
                  : 'border-gray-100 hover:border-rose-200 hover:bg-rose-50/40'}
              `}
            >
              {/* Ramo visual proporcional al tamaño */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    rounded-full transition-all duration-200 mb-1
                    ${activo ? 'bg-rose-300' : 'bg-gray-200'}
                    ${t.clave === 'S'  ? 'w-7 h-7'  : ''}
                    ${t.clave === 'M'  ? 'w-10 h-10' : ''}
                    ${t.clave === 'L'  ? 'w-14 h-14' : ''}
                    ${t.clave === 'XL' ? 'w-16 h-16' : ''}
                  `}
                />
                {/* Silueta */}
                <div className={`
                  w-6 rounded-sm transition-colors duration-200
                  ${activo ? 'bg-rose-200' : 'bg-gray-200'}
                  ${t.clave === 'S'  ? 'h-10' : ''}
                  ${t.clave === 'M'  ? 'h-12' : ''}
                  ${t.clave === 'L'  ? 'h-14' : ''}
                  ${t.clave === 'XL' ? 'h-16' : ''}
                `} />
              </div>

              {/* Etiqueta */}
              <div className="text-center w-full mt-auto">
                <span className={`font-bold text-xs sm:text-sm block ${activo ? 'text-rose-600' : 'text-gray-500'}`}>
                  {t.clave}
                </span>
                <span className="text-[10px] sm:text-xs text-gray-400 leading-tight block">
                  ~{t.flores_base} flrs
                </span>
                {t.precio_extra > 0 && (
                  <span className={`text-[10px] sm:text-xs font-medium block mt-0.5 ${activo ? 'text-rose-500' : 'text-gray-400'}`}>
                    +${t.precio_extra}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Descripción del tamaño seleccionado */}
      {seleccionado && (
        <div className={`mt-3 px-3 py-2 rounded-xl text-sm transition-all duration-200 ${
          seleccionado ? 'bg-rose-50 text-rose-700' : 'bg-gray-50 text-gray-400'
        }`}>
          <span className="font-semibold">{seleccionado.nombre}:</span>{' '}
          {seleccionado.descripcion}
        </div>
      )}
    </section>
  )
}