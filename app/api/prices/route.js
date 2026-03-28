import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { items, stores, includeCampaigns } = await request.json()
    if (!items || items.length === 0) return Response.json({ error: 'items saknas' }, { status: 400 })

    const storeList = stores?.length ? stores.join(', ') : 'ICA, Willys, Coop, Lidl'
    const itemsToPrice = items.slice(0, 20)
    const today = new Date().toLocaleDateString('sv-SE')
    const weekNum = getISOWeek(new Date())

    const campaignSection = includeCampaigns
      ? `\nKontrollera även om det finns kända kampanjer eller erbjudanden på dessa varor vecka ${weekNum} (${today}).
Inkludera ett "campaign" fält med kampanjinfo om du känner till något, annars null.`
      : ''

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4000,
      system: 'Du är en hjälpsam assistent med kunskap om svenska matpriser och butikskedjornas kampanjmönster. Svara alltid på svenska. Ge alltid rimliga uppskattningar baserade på din träningsdata om svenska livsmedelspriser.',
      messages: [{
        role: 'user',
        content: `Uppskatta ungefärliga priser för följande matvaror i svenska butiker (${storeList}):
${itemsToPrice.map((item, i) => `${i + 1}. ${item}`).join('\n')}
${campaignSection}

Returnera ENDAST detta JSON-objekt utan förklaringar eller markdown:
{
  "items": [
    {
      "name": "Kycklingfilé",
      "bestPrice": "ca 45 kr/kg",
      "store": "Willys",
      "tip": "Köp hel kyckling och stycka själv",
      "campaign": "Ofta på rea hos ICA varannan vecka"
    }
  ],
  "weeklyTip": "Handla torrvaror på Lidl och kött på Willys för bäst pris denna veckan.",
  "disclaimer": "Priserna är uppskattningar och kan variera. Kontrollera alltid aktuella priser i butiken."
}`,
      }],
    })

    const raw = message.content[0].text.trim()
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return Response.json({ error: 'Kunde inte tolka AI-svar' }, { status: 500 })

    const result = JSON.parse(jsonMatch[0])
    if (!Array.isArray(result.items)) return Response.json({ error: 'Oväntat format från AI' }, { status: 500 })

    return Response.json({ success: true, ...result })
  } catch (error) {
    console.error('prices error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}
