import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { items, stores } = await request.json()
    if (!items || items.length === 0) return Response.json({ error: 'items saknas' }, { status: 400 })

    const storeList = stores?.length ? stores.join(', ') : 'ICA, Willys, Coop, Lidl'

    // Begränsa till max 20 varor för att hålla svaret hanterbart
    const itemsToPrice = items.slice(0, 20)

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4000,
      system: 'Du är en hjälpsam assistent med kunskap om svenska matpriser. Svara alltid på svenska. Ge alltid rimliga uppskattningar baserade på din träningsdata om svenska livsmedelspriser.',
      messages: [{
        role: 'user',
        content: `Uppskatta ungefärliga priser för följande matvaror i svenska butiker (${storeList}):
${itemsToPrice.map((item, i) => `${i + 1}. ${item}`).join('\n')}

Returnera ENDAST detta JSON-objekt, utan förklaringar eller markdown:
{
  "items": [
    {"name": "Kycklingfilé", "bestPrice": "ca 45 kr/kg", "store": "Willys", "tip": "Köp hel kyckling och stycka själv för bättre pris"},
    {"name": "Pasta", "bestPrice": "ca 12 kr/500g", "store": "Lidl", "tip": "Husmanskost eller Eldorado är billigast"}
  ],
  "disclaimer": "Priserna är uppskattningar och kan variera. Kontrollera alltid aktuella priser i butiken."
}`,
      }],
    })

    const raw = message.content[0].text.trim()

    // Försök tolka JSON — leta efter { ... } om Claude råkar skriva något extra
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return Response.json({ error: 'Kunde inte tolka AI-svar' }, { status: 500 })
    }

    const result = JSON.parse(jsonMatch[0])

    // Säkerställ att strukturen är rätt
    if (!Array.isArray(result.items)) {
      return Response.json({ error: 'Oväntat format från AI' }, { status: 500 })
    }

    return Response.json({ success: true, ...result })
  } catch (error) {
    console.error('prices error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
