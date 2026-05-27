// lib/huggingface.ts

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
  _timeoutMs = 15000
): Promise<ResultadoIA> {
  console.log('\n--- 🚀 INICIANDO DETECCIÓN DE FLORES ---')
  try {
    const base64   = Buffer.from(imagenBuffer).toString('base64')
    const mimeType = detectarMimeType(imagenBuffer)
    const dataUrl  = `data:${mimeType};base64,${base64}`

    const token = process.env.GITHUB_TOKEN
    if (!token) throw new Error('Falta GITHUB_TOKEN en .env.local')

    const prompt = `Eres un florista experto con 20 años de experiencia. Analiza esta imagen con MÁXIMO detalle e identifica TODAS las flores y follajes visibles.

═══ INVENTARIO ACTUAL DE LA TIENDA ═══
Intenta clasificar las flores usando estos nombres y colores si coinciden visualmente:
Nombres: Anath, Baby, Chabela, Claveles, Crisantemo, Dólar, Espuela, Gerberas, Girasoles, Hortensia, Lirios, Lishianthus, Lisianthus, Matzumoto, Rosas, Santa Maria
Colores: Rosa intenso, Blanca, Rosa palo, Verde, Blanco, Amarillo, Rosa, Azul, Lila, Blanco verdoso, Morado, Blanca y rosa, Rojas, Blanco melon

═══ GUÍA VISUAL DE IDENTIFICACIÓN ═══
🌹 ROSA: Pétalos en espiral enrollados hacia adentro.
🌷 TULIPÁN: Forma de copa/huevo CERRADO.
🌼 GERBERA: Flor grande con pétalos PLANOS, como margarita gigante.
💠 HORTENSIA: RACIMOS grandes de flores PEQUEÑAS en pompón esférico.
🌸 CLAVEL: Pétalos con bordes DENTADOS o rizados, muy compacto.
🌺 LIRIOS: Pétalos grandes que se abren hacia afuera como trompeta.
🌻 GIRASOL: Centro café/negro grande y pétalos amarillos largos.
🌿 FOLLAJES: Baby / Nube (florecitas blancas diminutas), Dólar / Eucalipto (hojas redondeadas).

═══ REGLAS IMPORTANTES ═══
1. Cuenta SEPARADO cada combinación única de flor+color.
2. Si la flor o follaje existe en el INVENTARIO ACTUAL, usa ese nombre y color exacto.
3. Si es una flor que NO está en el inventario actual, identifícala con su nombre real (nosotros sugeriremos un reemplazo).
4. Sé generoso con las cantidades.
5. IMPORTANTE: Trata el follaje (Baby, Dólar, etc.) como un elemento más y mételo directamente en la lista de "flores". No lo separes.

Responde ÚNICAMENTE con este JSON válido, sin texto extra:

{
  "flores": [
    {
      "nombre": "Nombre de la flor o follaje",
      "color": "Color",
      "cantidad_estimada": número entero
    }
  ]
}`

    console.log('[Paso 1] Enviando imagen a GitHub Models...')

    const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:    'gpt-4o-mini',
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
        color:             f.color ?? '',
        confianza:         0.95,
        cantidad_estimada: f.cantidad_estimada ?? 5,
      })
    )

    return {
      exitoso:           true,
      flores_detectadas,
      mensaje_debug:     'IA procesó la imagen correctamente',
    }

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return { exitoso: false, flores_detectadas: [], mensaje_debug: `Error: ${msg}` }
  }
}
