// app/(admin)/admin/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// ── Tipos ─────────────────────────────────────────────────────
interface Flor {
  id: string; nombre: string; color: string
  precio_unit: number; disponible: boolean
}
interface Papel {
  id: string; nombre: string; precio_unit: number; disponible: boolean
}
interface Tamano {
  id: string; clave: string; nombre: string
  flores_base: number; precio_extra: number; descripcion: string
}
interface Accesorio {
  id: string; nombre: string; emoji: string
  precio_unit: number; disponible: boolean
}

type Tab = 'flores' | 'papel' | 'tamanos' | 'accesorios'

// ── Componente ────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter()

  const [tab,      setTab]      = useState<Tab>('flores')
  const [flores,   setFlores]   = useState<Flor[]>([])
  const [papeles,  setPapeles]  = useState<Papel[]>([])
  const [tamanos,  setTamanos]  = useState<Tamano[]>([])
  const [accesorios, setAccesorios] = useState<Accesorio[]>([])
  
  const [cargando, setCargando] = useState(false)
  const [msg,      setMsg]      = useState<{ texto: string; tipo: 'ok' | 'err' } | null>(null)

  // Nueva flor
  const [nNombre,  setNNombre]  = useState('')
  const [nColor,   setNColor]   = useState('')
  const [nPrecio,  setNPrecio]  = useState('')
  
  // Nuevo papel
  const [pNombre,  setPNombre]  = useState('')
  const [pPrecio,  setPPrecio]  = useState('')

  // Nuevo accesorio
  const [aNombre, setANombre] = useState('')
  const [aEmoji,  setAEmoji]  = useState('')
  const [aPrecio, setAPrecio] = useState('')

  const mostrarMsg = (texto: string, tipo: 'ok' | 'err') => {
    setMsg({ texto, tipo })
    setTimeout(() => setMsg(null), 3000)
  }

  const cargar = useCallback(async () => {
    setCargando(true)
    const [rf, rp, rt, ra] = await Promise.all([
      fetch('/api/admin/flores').then(r => r.json()),
      fetch('/api/admin/papel').then(r => r.json()),
      fetch('/api/admin/tamanos').then(r => r.json()),
      fetch('/api/admin/accesorios').then(r => r.json()),
    ])
    setFlores(rf.flores ?? [])
    setPapeles(rp.papeles ?? [])
    setTamanos(rt.tamanos ?? [])
    setAccesorios(ra.accesorios ?? [])
    setCargando(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const cerrarSesion = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
    router.refresh()
  }

  // ── CRUD Flores ──────────────────────────────────────────
  const crearFlor = async () => {
    if (!nNombre || !nColor || !nPrecio) { mostrarMsg('Completa todos los campos.', 'err'); return }
    const res = await fetch('/api/admin/flores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nNombre, color: nColor, precio_unit: nPrecio }),
    })
    if (res.ok) { mostrarMsg('✅ Flor creada', 'ok'); setNNombre(''); setNColor(''); setNPrecio(''); cargar() }
    else mostrarMsg('❌ Error al crear flor', 'err')
  }

  const actualizarPrecioFlor = async (id: string, precio: string) => {
    await fetch('/api/admin/flores', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, precio_unit: precio }),
    })
    mostrarMsg('✅ Precio actualizado', 'ok')
    cargar()
  }

  const toggleFlor = async (id: string, disponible: boolean) => {
    await fetch('/api/admin/flores', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, disponible: !disponible }),
    })
    cargar()
  }

  const eliminarFlor = async (id: string) => {
    if (!confirm('¿Eliminar esta flor?')) return
    await fetch('/api/admin/flores', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    mostrarMsg('🗑️ Flor eliminada', 'ok')
    cargar()
  }

  // ── CRUD Papel ───────────────────────────────────────────
  const crearPapel = async () => {
    const res = await fetch('/api/admin/papel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: pNombre, precio_unit: pPrecio }),
    })
    if (res.ok) { mostrarMsg('✅ Papel creado', 'ok'); setPNombre(''); setPPrecio(''); cargar() }
  }

  const actualizarPrecioP = async (id: string, precio: string) => {
    await fetch('/api/admin/papel', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, precio_unit: precio }),
    })
    mostrarMsg('✅ Actualizado', 'ok'); cargar()
  }

  // ── Tamaños ──────────────────────────────────────────────
  const actualizarTamano = async (id: string, campo: string, valor: string) => {
    await fetch('/api/admin/tamanos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, [campo]: valor }),
    })
    mostrarMsg('✅ Tamaño actualizado', 'ok'); cargar()
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-rose-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">💐 Panel de Administración</h1>
            <p className="text-xs text-gray-400 mt-0.5">Florería RoCé — Gestión de precios</p>
          </div>
          <div className="flex items-center gap-4">
            <a href="/" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
              ← Ver tienda
            </a>
            <button
              onClick={cerrarSesion}
              className="text-sm text-rose-500 hover:text-rose-700 font-medium px-4 py-2 rounded-xl hover:bg-rose-50 transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {msg && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium
          ${msg.tipo === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {msg.texto}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 py-6">

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['flores', 'papel', 'tamanos', 'accesorios'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all
                ${tab === t
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-rose-300'}`}
            >
              {t === 'flores' ? '🌸 Flores' : t === 'papel' ? '🎁 Envolturas' : t === 'tamanos' ? '📐 Tamaños' : '🎀 Accesorios'}
            </button>
          ))}
        </div>

        {cargando && (
          <div className="text-center py-10 text-gray-400">Cargando...</div>
        )}

        {/* ── TAB FLORES ─────────────────────────────────── */}
        {tab === 'flores' && !cargando && (
          <div className="space-y-4">

            {/* Crear nueva flor */}
            <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm">
              <h2 className="font-semibold text-gray-700 mb-4">➕ Agregar nueva flor</h2>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <input
                  value={nNombre} onChange={e => setNNombre(e.target.value)}
                  placeholder="Nombre (ej: Rosa)"
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-rose-400"
                />
                <input
                  value={nColor} onChange={e => setNColor(e.target.value)}
                  placeholder="Color (ej: Rojo)"
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-rose-400"
                />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number" value={nPrecio} onChange={e => setNPrecio(e.target.value)}
                    placeholder="Precio"
                    className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-rose-400"
                  />
                </div>
              </div>
              <button
                onClick={crearFlor}
                className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-2 rounded-xl text-sm font-semibold transition-colors"
              >
                Agregar flor
              </button>
            </div>

            {/* Lista de flores */}
            <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden">
              <div className="grid grid-cols-[1fr_80px_100px_90px_40px] gap-3 px-5 py-3 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                <span>Flor</span><span>Color</span><span>Precio c/u</span>
                <span>Estado</span><span></span>
              </div>

              <div className="divide-y divide-gray-50">
                {flores.map((flor) => (
                  <FilaFlor
                    key={flor.id}
                    flor={flor}
                    onGuardar={(precio) => actualizarPrecioFlor(flor.id, precio)}
                    onToggle={() => toggleFlor(flor.id, flor.disponible)}
                    onEliminar={() => eliminarFlor(flor.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB PAPEL ──────────────────────────────────── */}
        {tab === 'papel' && !cargando && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm">
              <h2 className="font-semibold text-gray-700 mb-4">➕ Agregar envoltura</h2>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input
                  value={pNombre} onChange={e => setPNombre(e.target.value)}
                  placeholder="Nombre (ej: Kraft Natural)"
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-rose-400"
                />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number" value={pPrecio} onChange={e => setPPrecio(e.target.value)}
                    placeholder="Precio"
                    className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-rose-400"
                  />
                </div>
              </div>
              <button onClick={crearPapel}
                className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-2 rounded-xl text-sm font-semibold">
                Agregar
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden">
              <div className="grid grid-cols-[1fr_120px_90px] gap-3 px-5 py-3 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                <span>Envoltura</span><span>Precio</span><span>Estado</span>
              </div>
              <div className="divide-y divide-gray-50">
                {papeles.map((p) => (
                  <FilaPapel
                    key={p.id}
                    papel={p}
                    onGuardar={(precio) => actualizarPrecioP(p.id, precio)}
                    onToggle={() => {
                      fetch('/api/admin/papel', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: p.id, disponible: !p.disponible }),
                      }).then(() => cargar())
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB TAMAÑOS ────────────────────────────────── */}
        {tab === 'tamanos' && !cargando && (
          <div className="space-y-3">
            {tamanos.map((t) => (
              <FilaTamano
                key={t.id}
                tamano={t}
                onGuardar={(campo, valor) => actualizarTamano(t.id, campo, valor)}
              />
            ))}
          </div>
        )}

        {/* ── TAB ACCESORIOS ─────────────────────────────── */}
        {tab === 'accesorios' && !cargando && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm">
              <h2 className="font-semibold text-gray-700 mb-4">➕ Agregar accesorio</h2>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <input value={aNombre} onChange={e => setANombre(e.target.value)}
                  placeholder="Nombre (ej: Moño)"
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-rose-400" />
                <input value={aEmoji} onChange={e => setAEmoji(e.target.value)}
                  placeholder="Emoji (ej: 🎀)"
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-rose-400 text-center text-xl" />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" value={aPrecio} onChange={e => setAPrecio(e.target.value)}
                    placeholder="Precio"
                    className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-rose-400" />
                </div>
              </div>
              <button onClick={async () => {
                if (!aNombre || !aEmoji || !aPrecio) { mostrarMsg('Completa todos los campos.', 'err'); return }
                const res = await fetch('/api/admin/accesorios', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ nombre: aNombre, emoji: aEmoji, precio_unit: aPrecio })
                })
                if (res.ok) { mostrarMsg('✅ Accesorio creado', 'ok'); setANombre(''); setAEmoji(''); setAPrecio(''); cargar() }
                else mostrarMsg('❌ Error', 'err')
              }} className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-2 rounded-xl text-sm font-semibold">
                Agregar accesorio
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden">
              <div className="grid grid-cols-[40px_1fr_80px_90px_40px] gap-3 px-5 py-3 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                <span></span><span>Accesorio</span><span>Precio</span><span>Estado</span><span></span>
              </div>
              <div className="divide-y divide-gray-50">
                {accesorios.map(acc => (
                  <FilaAccesorio
                    key={acc.id}
                    acc={acc}
                    onGuardar={async (precioNuevo) => {
                      await fetch('/api/admin/accesorios', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: acc.id, precio_unit: precioNuevo }),
                      })
                      mostrarMsg('✅ Precio actualizado', 'ok')
                      cargar()
                    }}
                    onToggle={async () => {
                      await fetch('/api/admin/accesorios', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: acc.id, disponible: !acc.disponible })
                      })
                      cargar()
                    }}
                    onEliminar={async () => {
                      if (!confirm('¿Eliminar este accesorio?')) return
                      await fetch('/api/admin/accesorios', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: acc.id })
                      })
                      mostrarMsg('🗑️ Accesorio eliminado', 'ok')
                      cargar()
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Subcomponentes de filas ───────────────────────────────────

function FilaFlor({ flor, onGuardar, onToggle, onEliminar }:
  { flor: Flor; onGuardar:(p:string)=>void; onToggle:()=>void; onEliminar:()=>void }) {
  const [precio, setPrecio] = useState(String(flor.precio_unit))
  const [editando, setEditando] = useState(false)

  return (
    <div className="grid grid-cols-[1fr_80px_100px_90px_40px] gap-3 px-5 py-3 items-center">
      <span className="font-medium text-gray-800 text-sm">{flor.nombre}</span>
      <span className="text-sm text-gray-500">{flor.color}</span>
      <div className="flex items-center gap-1">
        {editando ? (
          <>
            <span className="text-gray-400 text-sm">$</span>
            <input
              type="number" value={precio}
              onChange={e => setPrecio(e.target.value)}
              className="w-16 border border-rose-300 rounded-lg px-2 py-1 text-sm text-gray-800 focus:outline-none"
            />
            <button onClick={() => { onGuardar(precio); setEditando(false) }}
              className="text-emerald-500 text-xs font-bold ml-1">✓</button>
          </>
        ) : (
          <button onClick={() => setEditando(true)}
            className="text-sm text-gray-700 hover:text-rose-500 font-medium transition-colors">
            ${flor.precio_unit.toFixed(2)} ✎
          </button>
        )}
      </div>
      <button onClick={onToggle}
        className={`text-xs px-3 py-1 rounded-full font-medium transition-colors
          ${flor.disponible ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
        {flor.disponible ? 'Activa' : 'Oculta'}
      </button>
      <button onClick={onEliminar}
        className="text-gray-300 hover:text-red-400 transition-colors text-lg">
        🗑
      </button>
    </div>
  )
}

function FilaPapel({ papel, onGuardar, onToggle }:
  { papel: Papel; onGuardar:(p:string)=>void; onToggle:()=>void }) {
  const [precio, setPrecio] = useState(String(papel.precio_unit))
  const [editando, setEditando] = useState(false)

  return (
    <div className="grid grid-cols-[1fr_120px_90px] gap-3 px-5 py-3 items-center">
      <span className="font-medium text-gray-800 text-sm">{papel.nombre}</span>
      <div className="flex items-center gap-1">
        {editando ? (
          <>
            <span className="text-gray-400 text-sm">$</span>
            <input type="number" value={precio}
              onChange={e => setPrecio(e.target.value)}
              className="w-16 border border-rose-300 rounded-lg px-2 py-1 text-sm text-gray-800 focus:outline-none" />
            <button onClick={() => { onGuardar(precio); setEditando(false) }}
              className="text-emerald-500 text-xs font-bold ml-1">✓</button>
          </>
        ) : (
          <button onClick={() => setEditando(true)}
            className="text-sm text-gray-700 hover:text-rose-500 font-medium">
            ${papel.precio_unit.toFixed(2)} ✎
          </button>
        )}
      </div>
      <button onClick={onToggle}
        className={`text-xs px-3 py-1 rounded-full font-medium
          ${papel.disponible ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
        {papel.disponible ? 'Activa' : 'Oculta'}
      </button>
    </div>
  )
}

function FilaAccesorio({ acc, onGuardar, onToggle, onEliminar }:
  { acc: Accesorio; onGuardar: (p: string) => void; onToggle: () => void; onEliminar: () => void }) {
  const [precio, setPrecio] = useState(String(acc.precio_unit))
  const [editando, setEditando] = useState(false)

  return (
    <div className="grid grid-cols-[40px_1fr_80px_90px_40px] gap-3 px-5 py-3 items-center">
      <span className="text-2xl text-center">{acc.emoji}</span>
      <span className="font-medium text-gray-800 text-sm">{acc.nombre}</span>
      
      <div className="flex items-center gap-1">
        {editando ? (
          <>
            <span className="text-gray-400 text-sm">$</span>
            <input 
              type="number" value={precio} 
              onChange={e => setPrecio(e.target.value)}
              className="w-16 border border-rose-300 rounded-lg px-2 py-1 text-sm text-gray-800 focus:outline-none" 
            />
            <button onClick={() => { onGuardar(precio); setEditando(false) }}
              className="text-emerald-500 text-xs font-bold ml-1">✓</button>
          </>
        ) : (
          <button onClick={() => setEditando(true)}
            className="text-sm text-gray-700 hover:text-rose-500 font-medium">
            ${acc.precio_unit.toFixed(2)} ✎
          </button>
        )}
      </div>

      <button onClick={onToggle}
        className={`text-xs px-3 py-1 rounded-full font-medium transition-colors
          ${acc.disponible ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
        {acc.disponible ? 'Activo' : 'Oculto'}
      </button>
      <button onClick={onEliminar} className="text-gray-300 hover:text-red-400 text-lg transition-colors">
        🗑
      </button>
    </div>
  )
}

function FilaTamano({ tamano, onGuardar }:
  { tamano: Tamano; onGuardar:(campo:string, valor:string)=>void }) {
  const [precio, setPrecio]  = useState(String(tamano.precio_extra))
  const [flores, setFlores]  = useState(String(tamano.flores_base))
  const [edit,   setEdit]    = useState(false)

  return (
    <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 font-bold flex items-center justify-center">
          {tamano.clave}
        </span>
        <div>
          <p className="font-semibold text-gray-800">{tamano.nombre}</p>
          <p className="text-xs text-gray-400">{tamano.descripcion}</p>
        </div>
      </div>
      {edit ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Flores base</label>
            <input type="number" value={flores} onChange={e => setFlores(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-rose-400" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Precio extra ($)</label>
            <input type="number" value={precio} onChange={e => setPrecio(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-rose-400" />
          </div>
          <button
            onClick={() => { onGuardar('flores_base', flores); onGuardar('precio_extra', precio); setEdit(false) }}
            className="col-span-2 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-xl text-sm font-semibold">
            ✓ Guardar cambios
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex gap-6">
            <div>
              <p className="text-xs text-gray-400">Flores sugeridas</p>
              <p className="font-bold text-gray-800">{tamano.flores_base} pzas</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Precio extra</p>
              <p className="font-bold text-rose-600">
                {tamano.precio_extra === 0 ? 'Sin costo' : `+$${tamano.precio_extra}`}
              </p>
            </div>
          </div>
          <button onClick={() => setEdit(true)}
            className="text-sm text-rose-500 hover:text-rose-700 font-medium border border-rose-200 px-4 py-2 rounded-xl">
            Editar ✎
          </button>
        </div>
      )}
    </div>
  )
}
