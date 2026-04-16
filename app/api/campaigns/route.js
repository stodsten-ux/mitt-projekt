import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getISOWeek } from '../../lib/dates'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

    console.time('campaigns-ai')
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: `Du är en expert på svenska butikskedjors kampanjmönster och erbjudanden.
Du känner till typiska kampanjcykler för ICA, Willys, Coop, Lidl, Hemköp, Citygross och Netto.
Svara alltid på svenska. Ge konkreta och rimliga uppskattningar baserade på historiska mönster.`,
      messages: [{
        role: 'user',
        content: `Kampanjer/erbjudanden hos ${storeList.join(', ')} under ${weekLabel}.${itemSection}
Inkludera: säsongsvaror på rea, rekommendationer om när specifika varor är billigast, generella inköpstips.
Returnera ENDAST JSON utan markdown:
{"weekLabel":"${weekLabel}","campaigns":[{"store":"","item":"","campaignPrice":"","regularPrice":"","savings":"","confidence":"hög|medel|låg"}],"recommendations":[{"item":"","action":"Köp nu|Vänta","reason":"","bestStore":"","urgency":"hög|medel|låg"}],"seasonalTips":"","disclaimer":"Uppskattningar baserade på historiska mönster."}`,
      }],
    })

    console.timeEnd('campaigns-ai')

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

    return Response.json({ success: true, ...result }, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' }
    })
  } catch (error) {
    console.error('campaigns error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
