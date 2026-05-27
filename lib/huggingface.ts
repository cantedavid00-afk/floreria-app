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
  floresDisponibles: Flor[]
): Promise<ResultadoIA> {
  console.log('\n--- 🚀 INICIANDO DETECCIÓN DE FLORES ---')
  
  // 1. Preparamos el inventario dinámico para el prompt
  const listaNombres = Array.from(new Set(floresDisponibles.map(f => f.nombre))).join(', ');
  const listaColores = Array.from(new Set(floresDisponibles.map(f => f.color))).join(', ');

  const prompt = `Eres un florista profesional con 30 años de experiencia. Analiza la imagen y extrae una lista de flores y follajes.

═══ INVENTARIO ACTUAL (PRIORIDAD ALTA) ═══
Si detectas algo que coincida con estos, usa estos nombres y colores exactos:
Nombres: ${listaNombres}
Colores: ${listaColores}

═══ BASE DE CONOCIMIENTO (IDENTIFICACIÓN TÉCNICA) ═══
Si identificas flores fuera del inventario, usa sus nombres reales según esta guía técnica:
- Rosas: Pétalos densos en espiral (Inglesas: más redondas; Mini: tamaño moneda).
- Peonías: Gran volumen, pétalos delicados como papel de seda.
- Tulipanes: Forma de copa cerrada, tallos lisos.
- Hortensias: Pompón esférico de flores diminutas.
- Lisianthus: Pétalos sedosos, aspecto romántico, bordes ondulados.
- Gerberas: Margarita grande, centro marcado, pétalo plano.
- Lirios (Lilium): Pétalos grandes, estambres largos, forma de estrella.
- Girasoles: Centro café/negro grande, pétalos amarillos radiantes.
- Claveles: Bordes dentados (rizados), flor compacta.
- Anthurium: Hoja brillante/cerosa en forma de corazón.
- Orquídeas: Flores complejas con labelo.
- Alstroemeria: Flores pequeñas con manchas en los pétalos.
- Ranúnculo: Capas infinitas de pétalos finos.
- Anémona: Pétalos amplios con centro negro oscuro y firme.
- Follajes: Nube/Baby, Dólar, Eucalipto, Ruscus, Espuela.

═══ REGLAS ═══
1. Si la flor existe en el INVENTARIO ACTUAL, usa ese nombre/color exacto.
2. Si NO está en el inventario, usa su nombre real técnico (el sistema hará el reemplazo sugerido).
3. Trata TODOS los elementos (flores y follajes) como un ítem más en la lista.
4. Sé generoso con las cantidades.

Responde ÚNICAMENTE con este JSON válido, sin texto extra:
{
  "flores": [
    {
      "nombre": "Nombre exacto",
      "color": "Color exacto",
      "cantidad_estimada": número
    }
  ]
}`

  try {
    const base64   = Buffer.from(imagenBuffer).toString('base64')
    const mimeType = detectarMimeType(imagenBuffer)
    const dataUrl  = `data:${mimeType};base64,${base64}`

    const token = process.env.GITHUB_TOKEN
    if (!token) throw new Error('Falta GITHUB_TOKEN en .env.local')

    const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Eres un experto botánico y florista.' },
          { role: 'user', content: [
              { type: 'text', text: prompt }, 
              { type: 'image_url', image_url: { url: dataUrl } }
          ]}
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Error en API de IA: ${err}`)
    }

    const jsonResponse = await response.json()
    const texto = jsonResponse.choices?.[0]?.message?.content
    if (!texto) throw new Error('La IA no devolvió respuesta')
    
    const parsed = JSON.parse(texto.replace(/```json|```/gi, '').trim())

    return {
      exitoso: true,
      flores_detectadas: parsed.flores.map((f: any) => ({
        nombre_en: f.nombre, 
        nombre_es: f.nombre, 
        color: f.color ?? 'N/A', 
        confianza: 0.95, 
        cantidad_estimada: f.cantidad_estimada ?? 1
      }))
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    console.error('💥 Error en detección:', msg)
    return { exitoso: false, flores_detectadas: [], mensaje_debug: msg }
  }
}
