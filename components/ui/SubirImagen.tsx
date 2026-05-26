// components/ui/SubirImagen.tsx
'use client'

import { useState, ChangeEvent } from 'react'

interface SubirImagenProps {
  onEnviar: (archivo: File) => void
  cargando: boolean
}

// Comprime la imagen antes de enviarla
// Reduce fotos de 8-12 MB a ~400 KB manteniendo buena calidad
async function comprimirImagen(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      // Máximo 1200px en el lado más largo (suficiente para la IA)
      const MAX = 1200
      let { width, height } = img

      if (width > MAX || height > MAX) {
        if (width > height) {
          height = Math.round((height * MAX) / width)
          width  = MAX
        } else {
          width  = Math.round((width * MAX) / height)
          height = MAX
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width  = width
      canvas.height = height

      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return }
          const comprimido = new File([blob], file.name, { type: 'image/jpeg' })
          console.log(
            `[Compresión] ${(file.size / 1024 / 1024).toFixed(1)} MB → ` +
            `${(comprimido.size / 1024).toFixed(0)} KB`
          )
          resolve(comprimido)
        },
        'image/jpeg',
        0.82  // calidad 82% — buen balance calidad/tamaño
      )
    }

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

export default function SubirImagen({ onEnviar, cargando }: SubirImagenProps) {
  const [archivo,       setArchivo]       = useState<File | null>(null)
  const [preview,       setPreview]       = useState<string | null>(null)
  const [comprimiendo,  setComprimiendo]  = useState(false)
  const [infoTamano,    setInfoTamano]    = useState<string | null>(null)

  const alCambiarInput = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]

    // Comprimir antes de mostrar preview
    setComprimiendo(true)
    setInfoTamano(null)

    const comprimido = await comprimirImagen(file)

    setArchivo(comprimido)
    setInfoTamano(
      `${(file.size / 1024 / 1024).toFixed(1)} MB → ${(comprimido.size / 1024).toFixed(0)} KB`
    )
    setPreview(URL.createObjectURL(comprimido))
    setComprimiendo(false)
  }

  return (
    <div className="w-full max-w-lg mx-auto bg-white p-6 rounded-2xl border-2 border-rose-200 shadow-sm">
      <h2 className="text-lg font-bold text-gray-800 mb-4">📸 Sube tu foto de referencia</h2>

      {/* Input nativo — funciona en todos los celulares */}
      <input
        type="file"
        accept="image/*"
        onChange={alCambiarInput}
        disabled={cargando || comprimiendo}
        className="block w-full text-sm text-gray-500 mb-4
          file:mr-4 file:py-3 file:px-6
          file:rounded-xl file:border-0
          file:text-sm file:font-semibold
          file:bg-rose-100 file:text-rose-700
          hover:file:bg-rose-200 cursor-pointer"
      />

      {/* Estado comprimiendo */}
      {comprimiendo && (
        <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-600 rounded-xl px-4 py-3 text-sm text-center">
          ⚙️ Optimizando imagen para el análisis...
        </div>
      )}

      {/* Info de compresión */}
      {infoTamano && !comprimiendo && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-2 text-xs text-center font-medium">
          ✅ Imagen optimizada: {infoTamano}
        </div>
      )}

      {/* Preview */}
      {preview && !comprimiendo && (
        <div className="mb-4">
          <img
            src={preview}
            alt="Vista previa"
            className="w-full max-h-64 object-contain rounded-xl border border-gray-200"
          />
        </div>
      )}

      {/* Botón analizar */}
      {archivo && !cargando && !comprimiendo && (
        <button
          onClick={() => onEnviar(archivo)}
          className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-4 rounded-xl shadow-md transition-colors"
        >
          🤖 Analizar con IA y cotizar
        </button>
      )}

      {/* Estado analizando */}
      {cargando && (
        <div className="bg-rose-50 text-rose-700 font-semibold p-4 rounded-xl text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="animate-spin">🌸</span>
            <span>Analizando flores...</span>
          </div>
          <p className="text-xs text-rose-400 mt-1 font-normal">
            Esto puede tomar hasta 10 segundos
          </p>
        </div>
      )}
    </div>
  )
}