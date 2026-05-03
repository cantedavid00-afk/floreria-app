'use client'

import { useState, ChangeEvent } from 'react'

interface SubirImagenProps {
  onEnviar: (archivo: File) => void
  cargando: boolean
}

export default function SubirImagen({ onEnviar, cargando }: SubirImagenProps) {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const alCambiarInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      alert("⚠️ El celular no devolvió ningún archivo.")
      return
    }

    const file = e.target.files[0]
    setArchivo(file)

    const reader = new FileReader()
    reader.onload = (ev) => {
      if (ev.target?.result) setPreview(ev.target.result as string)
    }
    reader.onerror = () => alert("❌ Error interno al leer el archivo.")
    
    reader.readAsDataURL(file)
  }

  return (
    <div className="w-full max-w-lg mx-auto bg-white p-6 rounded-2xl border-2 border-rose-200 shadow-sm">
      <h2 className="text-xl font-bold text-gray-800 mb-4">📸 Sube tu foto (Modo Seguro)</h2>

      {/* INPUT NATIVO - SIN OCULTAR, SIN TRUCOS CSS */}
      <input
        type="file"
        accept="image/*"
        onChange={alCambiarInput}
        disabled={cargando}
        className="block w-full text-sm text-gray-500 mb-6
          file:mr-4 file:py-3 file:px-6
          file:rounded-xl file:border-0
          file:text-sm file:font-semibold
          file:bg-rose-100 file:text-rose-700
          hover:file:bg-rose-200 cursor-pointer"
      />

      {preview && (
        <div className="mb-6">
          <img src={preview} alt="Vista previa" className="w-full max-h-64 object-contain rounded-xl border border-gray-200" />
        </div>
      )}

      {archivo && !cargando && (
        <button
          onClick={() => onEnviar(archivo)}
          className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-4 rounded-xl shadow-md transition-colors"
        >
          🤖 Analizar con IA y cotizar
        </button>
      )}

      {cargando && (
        <div className="bg-rose-50 text-rose-700 font-semibold p-4 rounded-xl text-center">
          Analizando imagen...
        </div>
      )}
    </div>
  )
}