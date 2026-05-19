// lib/huggingface.ts HOla

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

    const prompt = `Eres un florista experto con 20 años de experiencia. Analiza esta imagen con MÁXIMO detalle e identifica TODAS las flores visibles.

═══ GUÍA VISUAL DE IDENTIFICACIÓN ═══

🌹 ROSA: Pétalos en espiral enrollados hacia adentro, muchas capas, centro apretado. Colores: rojo, rosa, blanco, amarillo, coral, morado.

🌹 ROSA INGLESA: Como la rosa pero con forma más redondeada/esférica y pétalos muy densamente empacados. Aspecto de peonía pequeña.

🌹 ROSA MINI: Rosa pero muy pequeña, del tamaño de una moneda o menos.

🌷 TULIPÁN: Forma de copa/huevo CERRADO con pétalos lisos SIN textura. Tallo largo y recto. NUNCA tiene el centro visible.

🌼 GERBERA: Flor grande con pétalos PLANOS que irradian desde un centro oscuro circular. Parecida a margarita grande. Pétalos de una sola capa.

🌸 DALIA: Pétalos en punta como ESTRELLA o cactus, organizados en muchas capas concéntricas. Centro compacto. MUY diferente a la gerbera.

🌸 CLAVEL: Pétalos con bordes DENTADOS o rizados, flor compacta y redonda. Fragante. Tamaño mediano.

💐 PEONÍA: Flor muy grande y exuberante con MUCHÍSIMOS pétalos suaves, redondeados y sedosos. Aspecto lujoso y voluminoso.

💠 HORTENSIA: RACIMOS grandes de flores PEQUEÑAS agrupadas en pompón esférico o plano. Una sola cabeza puede medir 15-20cm.

🌺 ANTHURIUM: Forma de CORAZÓN o escudo con superficie brillante/cerosa. Tiene un espádice (palito) que sale del centro. Colores: rojo, naranja, rosa, blanco.

💐 LILIUM: Pétalos grandes que se abren hacia afuera como una trompeta o estrella. Centro con estambres visibles y prominentes. Olor intenso.

🌺 ORQUÍDEA: Flor de simetría especial con pétalos delicados. Tiene labelo (pétalo modificado diferente). Tallos arqueados con varias flores.

🌸 ALSTROEMERIA: Flores pequeñas en grupos, con pétalos internos moteados/rayados. Parecida a lirio pequeño.

🌸 LISIANTHUS: Pétalos suaves y sedosos, semiabiertos como rosa pero más delicados y arrugados. Colores pasteles.

🌸 RANÚNCULO: Capas y capas de pétalos muy finos y delicados, como papel de seda. Más pequeño que la peonía.

🌸 FRESIA: Flores pequeñas en forma de embudo agrupadas a lo largo de un tallo arqueado. Fragante.

🌸 ANÉMONA: Flor simple con pétalos amplios y centro negro oscuro muy prominente y llamativo.

🌻 GIRASOL: Centro café/negro grande y prominente rodeado de pétalos amarillos largos. Tamaño grande.

🌾 SNAPDRAGON: Flores tubulares apiladas a lo largo de un tallo vertical, como dragoncitos.

═══ FOLLAJES COMUNES ═══
- Nube/Gypsophila: pequeñas flores blancas en nube
- Eucalipto: hojas redondeadas grises/verdes
- Ruscus: hojas alargadas y brillantes
- Palma seca: hojas de abanico grandes beige/café
- Hojas secas: follaje decorativo café/dorado

═══ REGLAS IMPORTANTES ═══
1. Cuenta SEPARADO cada combinación única de flor+color
2. Si hay 5 dalias coral Y 3 dalias blancas = DOS entradas
3. El follaje NO cuenta como flor, va en "tipo_follaje"
4. Si no estás seguro entre dos flores, elige la más probable y anótalo
5. Sé generoso con las cantidades (mejor estimar de más)
6. NUNCA confundas: Dalia≠Gerbera, Tulipán≠Rosa, Peonía≠Rosa Inglesa

Responde ÚNICAMENTE con este JSON válido, sin texto extra:

{
  "flores": [
    {
      "nombre": "nombre exacto de la lista",
      "color": "color exacto de la lista",
      "cantidad_estimada": número entero
    }
  ],
  "tiene_follaje": true o false,
  "tipo_follaje": "descripción detallada del follaje o null"
}

Nombres VÁLIDOS (usa EXACTAMENTE estos):
Rosa, Rosa Mini, Rosa Inglesa, Tulipán, Lilium, Lirio, Clavel, Gerbera, Dalia, Orquídea, Margarita, Girasol, Alstroemeria, Hortensia, Peonía, Lavanda, Fresia, Anémona, Ranúnculo, Lisianthus, Snapdragon, Gypsophila, Ave del Paraíso, Anthurium

Colores VÁLIDOS (usa EXACTAMENTE estos):
Rojo, Rosa, Rosado, Blanco, Amarillo, Naranja, Morado, Azul, Verde, Fucsia, Coral, Bicolor, Lila, Crema, Beige, Café, Terracota`

    console.log('[Paso 1] Enviando imagen a GitHub Models...')

    const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:    'gpt-4o',
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

    // ✅ BUG CORREGIDO: era [parsed.flores.map](...) con link corrupto
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
