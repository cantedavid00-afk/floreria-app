// lib/huggingface.ts
import { Flor } from '@/types';

export interface ResultadoIA {
  exitoso: boolean
  flores_detectadas: FloresDetectada[]
  mensaje_debug?: string
}

export interface FloresDetectada {
  nombre_en: string
  nombre_es: string
  color: string
  confianza: number
  cantidad_estimada?: number
}

function detectarMimeType(buffer: ArrayBuffer): 'image/jpeg' | 'image/png' | 'image/webp' {
  const bytes = new Uint8Array(buffer.slice(0, 4))
  if (bytes[0] === 0xFF && bytes[1] === 0xD8) return 'image/jpeg'
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png'
  return 'image/webp'
}

export async function detectarFlores(
  imagenBuffer: ArrayBuffer,
  floresDisponibles: Flor[], // Recibimos el catálogo dinámico
  _timeoutMs = 15000
): Promise<ResultadoIA> {
  
  // Construimos las listas dinámicamente
  const listaNombres = Array.from(new Set(floresDisponibles.map(f => f.nombre))).join(', ');
  const listaColores = Array.from(new Set(floresDisponibles.map(f => f.color))).join(', ');

  const prompt = `Eres un florista experto. Analiza la imagen y detecta las flores y follajes.

═══ INVENTARIO DISPONIBLE (Usa estos valores primero) ═══
Nombres: ${listaNombres}
Colores: ${listaColores}

═══ REGLAS ═══
1. Si detectas algo que se parece a una flor de la lista, usa el Nombre y Color de la lista.
2. Si detectas algo que NO está en la lista, usa su nombre real (la app hará el reemplazo sugerido).
3. Incluye follajes (Baby, Dólar, etc) en la lista de flores.

Responde ÚNICAMENTE con este JSON:
{
  "flores": [ { "nombre": "...", "color": "...", "cantidad_estimada": 0 } ]
}`

  try {
    const base64   = Buffer.from(imagenBuffer).toString('base64')
    const dataUrl  = `data:${detectarMimeType(imagenBuffer)};base64,${base64}`

    const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: dataUrl } }] }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    })

    const jsonResponse = await response.json()
    const parsed = JSON.parse(jsonResponse.choices[0].message.content)

    return {
      exitoso: true,
      flores_detectadas: parsed.flores.map((f: any) => ({
        nombre_en: f.nombre, nombre_es: f.nombre, color: f.color, confianza: 0.95, cantidad_estimada: f.cantidad_estimada
      }))
    }
  } catch (error) {
    return { exitoso: false, flores_detectadas: [], mensaje_debug: String(error) }
  }
}
