// app/(admin)/admin/login/page.tsx
'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirect     = searchParams.get('redirect') ?? '/admin'

  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  const handleLogin = async () => {
    if (!password) { setError('Ingresa la contraseña.'); return }
    setCargando(true)
    setError(null)

    try {
      const res  = await fetch('/api/admin/auth', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ password }),
      })
      const data = await res.json()

     if (data.success) {
        window.location.href = redirect
     } else {
        setError('Contraseña incorrecta. Intenta de nuevo.')
        setCargando(false)
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-100 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="text-6xl mb-3 select-none">💐</div>
          <h1 className="text-2xl font-bold text-rose-800">Florería Bella</h1>
          <p className="text-sm text-rose-500 mt-1">Panel de administración</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 border border-rose-100">
          <h2 className="font-bold text-gray-800 text-lg mb-1">Iniciar sesión</h2>
          <p className="text-sm text-gray-400 mb-6">
            Ingresa tu contraseña para continuar
          </p>

          <div className="mb-4">
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null) }}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:border-rose-400 transition-colors"
            />
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={cargando}
            className="w-full bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-bold py-3.5 rounded-xl transition-colors shadow-md"
          >
            {cargando ? 'Verificando...' : 'Entrar al panel'}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          <a href="/" className="text-rose-400 hover:text-rose-600 transition-colors">
            ← Volver a la tienda
          </a>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-rose-50 flex items-center justify-center">
        <p className="text-rose-400">Cargando...</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}