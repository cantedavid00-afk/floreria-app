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

    // 🌸 PROMPT MEJORADO 🌸
    // Se han añadido descripciones específicas para Peonías, Rosas Inglesas y flores de relleno.
    const prompt = `Eres un experto en botánica y floristería. Analiza esta imagen de un ramo con MUCHO detalle.

INSTRUCCIONES CRÍTICAS PARA IDENTIFICACIÓN:
- Las PEONÍAS tienen forma esférica o redondeada, con muchísimos pétalos apretados, arrugados o rizados, dando apariencia de repollo o pompón denso. Suelen confundirse con rosas, pero son más globosas, llenas y sin el centro en espiral clásico.
- Las ROSAS INGLESAS también tienen forma de copa profunda con multitud de pétalos concéntricos muy apretados, parecidas a las peonías.
- Las ROSAS TRADICIONALES tienen pétalos lisos en espiral enrollados hacia adentro y un centro puntiagudo.
- Los TULIPANES tienen forma de copa/huevo cerrado con pétalos lisos y tallo largo.
- Las GERBERAS son flores grandes con pétalos planos irradiando desde un centro oscuro.
- Las DALIAS tienen pétalos en punta como estrella o cactus, organizados en capas concéntricas.
- Las HORTENSIAS son racimos grandes de flores pequeñas agrupadas como pompón.
- La GYPSOPHILA o flores de relleno secas (como el Limonium) son pequeños racimos de florecitas diminutas que acompañan a las principales.

REGLAS DE CONTEO Y FORMATO:
- Cuenta cada tipo de flor POR COLOR de forma independiente.
- Si hay 35 Peonías rosas y 12 Peonías blancas, crea DOS entradas separadas.
- Sé preciso con las cantidades. Si ves un ramo masivo (ej. 40-50 flores), la cantidad_estimada debe reflejar ese volumen total.
- Nombres VÁLIDOS (usa exactamente estos):
Rosa, Rosa Mini, Rosa Inglesa, Tulipán, Lilium, Lirio, Clavel, Gerbera,
Dalia, Orquídea, Margarita, Girasol, Alstroemeria, Hortensia, Peonía,
Lavanda, Fresia, Anémona, Ranúnculo, Lisianthus, Snapdragon, Gypsophila, Limonium,
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
        model: 'gpt-4o-mini', // Nota: gpt-4o-mini es rápido, pero si la precisión sigue fallando, podrías probar con 'gpt-4o'
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
        temperature:     0.1, // Temperatura baja para que sea consistente
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
