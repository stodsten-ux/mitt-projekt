import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

export async function POST(request) {
  try {
    const { stores, items, householdId, weekOffset = 0 } = await request.json()

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    )

    // Hämta hushållets föredragna butiker om inte skickade
    let storeList = stores
    if (!storeList?.length && householdId) {
      const { data: prefs } = await supabase
        .from('household_preferences')
        .select('preferred_stores')
        .eq('household_id', householdId)
        .maybeSingle()
      storeList = prefs?.preferred_stores?.length ? prefs.preferred_stores : ['ICA', 'Willys', 'Coop', 'Lidl']
    }
    if (!storeList?.length) storeList = ['ICA', 'Willys', 'Coop', 'Lidl']

    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + weekOffset * 7)
    const weekNum = getISOWeek(targetDate)
    const year = targetDate.getFullYear()
    const weekLabel = `vecka ${weekNum} ${year}`

    const itemSection = items?.length
      ? `\nFokusera särskilt på kampanjer för dessa varor: ${items.slice(0, 15).join(', ')}.`
      : ''

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4000,
      system: `Du är en expert på svenska butikskedjors kampanjmönster och erbjudanden.
Du känner till typiska kampanjcykler för ICA, Willys, Coop, Lidl, Hemköp, Citygross och Netto.
Svara alltid på svenska. Ge konkreta och rimliga uppskattningar baserade på historiska mönster.`,
      messages: [{
        role: 'user',
        content: `Vilka kampanjer och erbjudanden kan man förvänta sig hos dessa butiker under ${weekLabel}: ${storeList.join(', ')}?${itemSection}

Inkludera även:
1. Vilka varor brukar vara på rea denna vecka på året (säsong, högtider etc.)
2. Om någon av de specifika varorna ovan brukar vara billigare en annan vecka — rekommendera när man bör köpa
3. Generella inköpstips för veckan

Returnera ENDAST detta JSON utan markdown:
{
  "weekLabel": "${weekLabel}",
  "campaigns": [
    {
      "store": "ICA",
      "item": "Kycklingfilé",
      "campaignPrice": "ca 45 kr/kg",
      "regularPrice": "ca 85 kr/kg",
      "savings": "ca 40 kr/kg",
      "period": "${weekLabel}",
      "confidence": "hög"
    }
  ],
  "recommendations": [
    {
      "item": "Kaffe",
      "action": "Köp nu",
      "reason": "Brukar vara på extrapris hos ICA varannan vecka, nästa tillfälle troligen om 2 veckor",
      "bestStore": "ICA",
      "urgency": "hög"
    }
  ],
  "seasonalTips": "Påskvecka — bra priser på ägg, lax och choklad hos de flesta butiker.",
  "disclaimer": "Kampanjerna är uppskattningar baserade på historiska mönster och kan avvika från faktiska priser."
}`,
      }],
    })

    const raw = message.content[0].text.trim()
    const start = raw.indexOf('{')
    if (start === -1) return Response.json({ error: 'Inget JSON i AI-svar' }, { status: 500 })
    let depth = 0, end = -1
    for (let i = start; i < raw.length; i++) {
      if (raw[i] === '{') depth++
      else if (raw[i] === '}') { depth--; if (depth === 0) { end = i; break } }
    }
    if (end === -1) return Response.json({ error: 'Ofullständigt JSON från AI' }, { status: 500 })

    let result
    try { result = JSON.parse(raw.slice(start, end + 1)) }
    catch (e) { return Response.json({ error: 'Kunde inte tolka AI-svar' }, { status: 500 }) }

    if (!Array.isArray(result.campaigns)) return Response.json({ error: 'Oväntat format från AI' }, { status: 500 })

    return Response.json({ success: true, ...result })
  } catch (error) {
    console.error('campaigns error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
