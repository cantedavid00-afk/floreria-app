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

    // Prompt enriquecido: Mantiene tu súper guía visual pero prioriza tu catálogo actual
    const prompt = `Eres un florista experto con 20 años de experiencia. Analiza esta imagen con MÁXIMO detalle e identifica TODAS las flores y follajes visibles.

═══ INVENTARIO ACTUAL DE LA TIENDA ═══
Intenta clasificar las flores usando estos nombres y colores si coinciden visualmente:
Nombres: Anath, Baby, Chabela, Claveles, Crisantemo, Dólar, Espuela, Gerberas, Girasoles, Hortensia, Lirios, Lishianthus, Lisianthus, Matzumoto, Rosas, Santa Maria
Colores: Rosa intenso, Blanca, Rosa palo, Verde, Blanco, Amarillo, Rosa, Azul, Lila, Blanco verdoso, Morado, Blanca y rosa, Rojas, Blanco melon

═══ GUÍA VISUAL DE IDENTIFICACIÓN (Para referencia y futuras flores) ═══
🌹 ROSA: Pétalos en espiral enrollados hacia adentro, muchas capas.
🌹 ROSA INGLESA / MINI: Como la rosa pero más redondeada/esférica o de tamaño muy pequeño.
🌷 TULIPÁN: Forma de copa/huevo CERRADO con pétalos lisos SIN textura.
🌼 GERBERA: Flor grande con pétalos PLANOS que irradian desde un centro oscuro circular.
🌸 DALIA / CRISANTEMO / MATZUMOTO: Pétalos en punta organizados en muchas capas concéntricas. 
🌸 CLAVEL: Pétalos con bordes DENTADOS o rizados, flor compacta y redonda.
💐 PEONÍA: Flor muy grande y exuberante con MUCHÍSIMOS pétalos suaves.
💠 HORTENSIA: RACIMOS grandes de flores PEQUEÑAS agrupadas en pompón esférico o plano.
🌺 ANTHURIUM: Forma de CORAZÓN o escudo con superficie brillante/cerosa.
💐 LILIUM / LIRIOS: Pétalos grandes que se abren hacia afuera como una trompeta o estrella.
🌺 ORQUÍDEA: Flor de simetría especial con pétalos delicados.
🌸 ALSTROEMERIA / ASTROMELIA: Flores pequeñas en grupos, con pétalos internos moteados.
🌸 LISIANTHUS / LISHIANTHUS: Pétalos suaves y sedosos, semiabiertos como rosa pero más delicados.
🌸 RANÚNCULO / ANÉMONA: Capas de pétalos muy finos, o flor con centro negro llamativo.
🌻 GIRASOL: Centro café/negro grande y prominente rodeado de pétalos amarillos largos.
🌾 SNAPDRAGON / ESPUELA: Flores a lo largo de un tallo vertical.

═══ FOLLAJES COMUNES ═══
- Baby / Nube / Gypsophila: pequeñas flores blancas en nube
- Dólar / Eucalipto: hojas redondeadas grises/verdes
- Ruscus / Helecho: hojas alargadas y brillantes

═══ REGLAS IMPORTANTES ═══
1. Cuenta SEPARADO cada combinación única de flor+color.
2. Si la flor o follaje existe en el INVENTARIO ACTUAL, usa ese nombre y color exacto.
3. Si es una flor que NO está en el inventario actual, identifícala con su nombre real según la Guía Visual (la app se encargará de sugerir reemplazos).
4. Sé generoso con las cantidades (mejor estimar de más).
5. El follaje (ej. Baby, Dólar, Eucalipto) indícalo en el campo "tipo_follaje".

Responde ÚNICAMENTE con este JSON válido, sin texto extra:

{
  "flores": [
    {
      "nombre": "Nombre de la flor",
      "color": "Color de la flor",
      "cantidad_estimada": número entero
    }
  ],
  "tiene_follaje": true o false,
  "tipo_follaje": "descripción del follaje (ej. Dólar, Baby) o null"
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
        color:             f.color ?? '',
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
