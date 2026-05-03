// lib/huggingface.ts — reemplaza todo el archivo

export interface ResultadoIA {
  exitoso: boolean
  flores_detectadas: FloresDetectada[]
  mensaje_debug?: string
}

export interface FloresDetectada {
  nombre_en: string
  nombre_es: string
  color: string           // ← NUEVO campo
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
  _timeoutMs = 15000
): Promise<ResultadoIA> {
  console.log('\n--- 🚀 INICIANDO DETECCIÓN DE FLORES ---')

  try {
    const base64   = Buffer.from(imagenBuffer).toString('base64')
    const mimeType = detectarMimeType(imagenBuffer)
    const dataUrl  = `data:${mimeType};base64,${base64}`

    const token = process.env.GITHUB_TOKEN
    if (!token) throw new Error('Falta GITHUB_TOKEN en .env.local')

    const prompt = `Eres un experto en flores. Analiza esta imagen de un ramo con MUCHO detalle.

INSTRUCCIONES CRÍTICAS:
- Los TULIPANES tienen forma de copa/huevo cerrado con pétalos lisos y tallo largo.
- Las ROSAS tienen pétalos en espiral enrollados hacia adentro.
- Las GERBERAS son flores grandes con pétalos planos irradiando desde un centro oscuro.
- Las DALIAS tienen pétalos en punta como estrella o cactus, organizados en capas concéntricas.
- Los ANTHURIUMS tienen forma de corazón brillante con espádice central.
- Las HORTENSIAS son racimos grandes de flores pequeñas agrupadas como pompón.
- Cuenta cada tipo de flor POR COLOR de forma independiente.
- Si hay 6 Gerberas rosas y 2 Gerberas fucsia, crea DOS entradas separadas.
- Sé generoso con las cantidades.
- Nombres VÁLIDOS (usa exactamente estos):
Rosa, Rosa Mini, Rosa Inglesa, Tulipán, Lilium, Lirio, Clavel, Gerbera,
Dalia, Orquídea, Margarita, Girasol, Alstroemeria, Hortensia, Peonía,
Lavanda, Fresia, Anémona, Ranúnculo, Lisianthus, Snapdragon, Gypsophila,
Ave del Paraíso, Anthurium

Responde ÚNICAMENTE con JSON válido:

{
  "flores": [
    {
      "nombre": "nombre exacto en español",
      "color": "color en español",
      "cantidad_estimada": número entero mayor a 0
    }
  ],
  "tiene_follaje": true,
  "tipo_follaje": "descripción o null"
}

Nombres VÁLIDOS:
Rosa, Rosa Mini, Rosa Inglesa, Tulipán, Lilium, Lirio, Clavel, Gerbera, Orquídea, Margarita, Girasol, Alstroemeria, Hortensia, Peonía, Lavanda, Fresia, Anémona, Ranúnculo, Lisianthus, Snapdragon, Gypsophila, Ave del Paraíso, Anthurium

Colores VÁLIDOS:
Rojo, Rosa, Rosado, Blanco, Amarillo, Naranja, Morado, Azul, Verde, Fucsia, Coral, Bicolor, Lila, Crema, Beige`

    console.log('[Paso 1] Enviando imagen a GitHub Models...')

    const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role:    'user',
            content: [
              { type: 'text',      text: prompt },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        temperature:     0.1,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`HTTP ${response.status}: ${err}`)
    }

    const jsonResponse = await response.json()
    console.log('[Paso 2] Respuesta OK recibida.')

    const texto = jsonResponse.choices?.[0]?.message?.content
    if (!texto) throw new Error('El modelo no devolvió texto.')

    const limpio = texto.replace(/```json|```/gi, '').trim()
    const parsed = JSON.parse(limpio)

    if (!parsed.flores || parsed.flores.length === 0) {
      return { exitoso: false, flores_detectadas: [], mensaje_debug: 'No se detectaron flores.' }
    }

    const flores_detectadas: FloresDetectada[] = parsed.flores.map(
      (f: { nombre: string; color: string; cantidad_estimada: number }) => ({
        nombre_en:         f.nombre,
        nombre_es:         f.nombre,
        color:             f.color ?? '',   // ← GUARDAMOS EL COLOR
        confianza:         0.95,
        cantidad_estimada: f.cantidad_estimada ?? 5,
      })
    )

    console.log('[ÉXITO] 🌸 Flores detectadas:', JSON.stringify(flores_detectadas, null, 2))

    return {
      exitoso:           true,
      flores_detectadas,
      mensaje_debug:     parsed.tiene_follaje
        ? `Follaje: ${parsed.tipo_follaje ?? 'verde'}`
        : undefined,
    }

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    console.error('💥 Error:', msg)
    return { exitoso: false, flores_detectadas: [], mensaje_debug: `Error: ${msg}` }
  } finally {
    console.log('--- 🏁 FIN ---\n')
  }
}
