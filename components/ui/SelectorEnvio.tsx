// components/ui/SelectorEnvio.tsx
'use client'

import { useState } from 'react'

export interface OpcionEnvio {
  tipo:        'domicilio' | 'sucursal'
  zona?:       { id: string; nombre: string; descripcion: string; precio: number }
  sucursal?:   { id: string; nombre: string; direccion: string }
  precio:      number
}

interface Sucursal {
  id:        string
  nombre:    string
  direccion: string
  maps_url?: string
}

interface SelectorEnvioProps {
  sucursales:  Sucursal[]
  seleccionado?: OpcionEnvio | null
  onChange: (nuevoEnvio: OpcionEnvio) => void
}

export default function SelectorEnvio({
  sucursales,
  seleccionado,
  onChange,
}: SelectorEnvioProps) {
  const [modo,         setModo]         = useState<'domicilio' | 'sucursal' | null>(null)
  const [cp,           setCp]           = useState('')
  const [buscando,     setBuscando]     = useState(false)
  const [resultado,    setResultado]    = useState<OpcionEnvio['zona'] | null>(null)
  const [error,        setError]        = useState<string | null>(null)
  const [cpBuscado,    setCpBuscado]    = useState('')

  const buscarCP = async () => {
    if (cp.length < 5) { setError('Ingresa un código postal de 5 dígitos.'); return }
    setBuscando(true)
    setError(null)
    setResultado(null)

    const res  = await fetch('/api/envio', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ codigo_postal: cp }),
    })
    const data = await res.json()
    setBuscando(false)
    setCpBuscado(cp)

    if (data.encontrado) {
      setResultado(data.zona)
      onChange({ tipo: 'domicilio', zona: data.zona, precio: data.zona.precio })
    } else {
      setError(data.mensaje)
    }
  }

  const elegirSucursal = (suc: Sucursal) => {
    onChange({ tipo: 'sucursal', sucursal: suc, precio: 0 })
  }

  return (
    <section className="bg-white border border-rose-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4">
        <h3 className="font-semibold text-gray-700 mb-1">🚚 Entrega o recolección</h3>
        <p className="text-xs text-gray-400 mb-4">
          Elige cómo quieres recibir tu arreglo
        </p>

        {/* Botones de modo */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => { setModo('domicilio'); setResultado(null); setError(null) }}
            className={`p-3 rounded-xl border-2 text-sm font-medium transition-all
              ${modo === 'domicilio'
                ? 'border-rose-400 bg-rose-50 text-rose-700'
                : 'border-gray-200 text-gray-500 hover:border-rose-200'}`}
          >
            🏠 Envío a domicilio
          </button>
          <button
            onClick={() => { setModo('sucursal'); setResultado(null); setError(null) }}
            className={`p-3 rounded-xl border-2 text-sm font-medium transition-all
              ${modo === 'sucursal'
                ? 'border-rose-400 bg-rose-50 text-rose-700'
                : 'border-gray-200 text-gray-500 hover:border-rose-200'}`}
          >
            🏪 Recoger en tienda
          </button>
        </div>

        {/* ── Envío a domicilio ─────────────────────────── */}
        {modo === 'domicilio' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={5}
                value={cp}
                onChange={(e) => { setCp(e.target.value.replace(/\D/g, '')); setError(null); setResultado(null) }}
                onKeyDown={(e) => e.key === 'Enter' && buscarCP()}
                placeholder="Código postal (5 dígitos)"
                className="flex-1 min-w-0 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-rose-400"
              />
              <button
                onClick={buscarCP}
                disabled={buscando || cp.length < 5}
                className="flex-shrink-0 bg-rose-500 hover:bg-rose-600 disabled:bg-gray-200 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                {buscando ? '...' : 'Buscar'}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
                ⚠️ {error}
                <p className="text-xs mt-1 text-red-400">
                  Puedes elegir recoger en sucursal sin costo adicional.
                </p>
              </div>
            )}

            {/* Resultado encontrado */}
            {resultado && (
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">✅</span>
                    <div>
                      <p className="font-semibold text-emerald-800 text-sm">
                        Entrega disponible — CP {cpBuscado}
                      </p>
                      <p className="text-xs text-emerald-600">{resultado.nombre}</p>
                    </div>
                  </div>
                  <span className="text-xl font-bold text-emerald-700">
                    +${resultado.precio.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-emerald-600 ml-8">{resultado.descripcion}</p>
              </div>
            )}
          </div>
        )}

       {/* ── Recoger en sucursal ───────────────────────── */}
        {modo === 'sucursal' && (
          <div className="space-y-2">
            {sucursales.map((suc) => {
              const activa =
                seleccionado?.tipo === 'sucursal' &&
                seleccionado.sucursal?.id === suc.id
        
              return (
                <button
                  key={suc.id}
                  onClick={() => elegirSucursal(suc)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all
                    ${activa
                      ? 'border-rose-400 bg-rose-50'
                      : 'border-gray-200 hover:border-rose-200 hover:bg-rose-50/50'}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p
                        className={`font-semibold text-sm ${
                          activa ? 'text-rose-700' : 'text-gray-700'
                        }`}
                      >
                        🏪 {suc.nombre}
                      </p>
        
                      <p className="text-xs text-gray-400 mt-0.5">
                        {suc.direccion}
                      </p>
        
                      {/* 🌍 Link a Google Maps */}
                      {suc.maps_url && (
                        <a
                          href={suc.maps_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 mt-1.5 font-medium"
                        >
                          📍 Ver en Google Maps ↗
                        </a>
                      )}
                    </div>
        
                    <span className="text-emerald-600 font-bold text-sm flex-shrink-0 ml-2">
                      Gratis
                    </span>
                  </div>
        
                  {activa && (
                    <p className="text-xs text-rose-500 mt-2 font-medium">
                      ✓ Seleccionada
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
