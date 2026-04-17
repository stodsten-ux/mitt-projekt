import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getISOWeek, getWeekSunday } from '../../lib/dates'

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

    // Hämta butikslista
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

    // Veckometadata
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + weekOffset * 7)
    const weekNum = getISOWeek(targetDate)
    const year = targetDate.getFullYear()
    const weekLabel = `vecka ${weekNum} ${year}`
    const validUntil = getWeekSunday(targetDate)

    // 1. Kontrollera cache per butik (parallellt)
    const cacheResults = await Promise.all(
      storeList.map(store =>
        supabase
          .from('campaign_cache')
          .select('store, payload')
          .eq('store', store)
          .eq('week_number', weekNum)
          .eq('year', year)
          .maybeSingle()
      )
    )

    const cachedPayloads = {}
    const uncachedStores = []
    for (let i = 0; i < storeList.length; i++) {
      const store = storeList[i]
      const { data } = cacheResults[i]
      if (data?.payload) {
        cachedPayloads[store] = { ...data.payload, source: 'cache' }
      } else {
        uncachedStores.push(store)
      }
    }

    // 2. Hämta AI för butiker som saknas i cache
    const warnings = []
    const aiPayloads = {}

    if (uncachedStores.length > 0) {
      const itemSection = items?.length
        ? `\nFokusera särskilt på kampanjer för dessa varor: ${items.slice(0, 15).join(', ')}.`
        : ''

      let aiResult = null
      try {
        console.time('campaigns-ai')
        const message = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 2000,
          system: `Du är en expert på svenska butikskedjors kampanjmönster och erbjudanden.
Du känner till typiska kampanjcykler för ICA, Willys, Coop, Lidl, Hemköp, Citygross och Netto.
Svara alltid på svenska. Ge konkreta och rimliga uppskattningar baserade på historiska mönster.`,
          messages: [{
            role: 'user',
            content: `Kampanjer/erbjudanden hos ${uncachedStores.join(', ')} under ${weekLabel}.${itemSection}
Inkludera: säsongsvaror på rea, rekommendationer om när specifika varor är billigast, generella inköpstips.
Returnera ENDAST JSON utan markdown:
{"weekLabel":"${weekLabel}","campaigns":[{"store":"","item":"","campaignPrice":"","regularPrice":"","savings":"","confidence":"hög|medel|låg"}],"recommendations":[{"item":"","action":"Köp nu|Vänta","reason":"","bestStore":"","urgency":"hög|medel|låg"}],"seasonalTips":"","disclaimer":"Uppskattningar baserade på historiska mönster."}`,
          }],
        })
        console.timeEnd('campaigns-ai')

        const raw = message.content[0].text.trim()
        const start = raw.indexOf('{')
        if (start !== -1) {
          let depth = 0, end = -1
          for (let i = start; i < raw.length; i++) {
            if (raw[i] === '{') depth++
            else if (raw[i] === '}') { depth--; if (depth === 0) { end = i; break } }
          }
          if (end !== -1) aiResult = JSON.parse(raw.slice(start, end + 1))
        }
      } catch (err) {
        console.error('campaigns AI error:', err)
        uncachedStores.forEach(s => warnings.push(s))
      }

      if (aiResult && Array.isArray(aiResult.campaigns)) {
        for (const store of uncachedStores) {
          const storePayload = {
            weekLabel: aiResult.weekLabel,
            campaigns: aiResult.campaigns.filter(c => c.store === store),
            recommendations: (aiResult.recommendations || []).filter(r => r.bestStore === store),
            seasonalTips: aiResult.seasonalTips || '',
            disclaimer: aiResult.disclaimer || '',
          }
          aiPayloads[store] = { ...storePayload, source: 'ai' }

          // Spara i cache (blockerar inte svaret vid fel)
          supabase
            .from('campaign_cache')
            .upsert(
              { store, week_number: weekNum, year, payload: storePayload, valid_until: validUntil },
              { onConflict: 'store,week_number,year' }
            )
            .then(({ error }) => {
              if (error) console.error(`campaign_cache upsert misslyckades för ${store}:`, error)
            })
        }
      } else {
        uncachedStores.forEach(s => { if (!warnings.includes(s)) warnings.push(s) })
      }
    }

    // 3. Merga alla payloads
    const allPayloads = { ...cachedPayloads, ...aiPayloads }

    if (Object.keys(allPayloads).length === 0) {
      return Response.json({
        success: true,
        weekLabel,
        campaigns: [],
        recommendations: [],
        seasonalTips: 'Kampanjinformation är inte tillgänglig just nu.',
        disclaimer: '',
        warnings,
        source: 'none',
      })
    }

    let allCampaigns = []
    let allRecommendations = []
    let seasonalTips = ''
    let disclaimer = ''
    for (const payload of Object.values(allPayloads)) {
      allCampaigns = allCampaigns.concat(payload.campaigns || [])
      allRecommendations = allRecommendations.concat(payload.recommendations || [])
      if (!seasonalTips && payload.seasonalTips) seasonalTips = payload.seasonalTips
      if (!disclaimer && payload.disclaimer) disclaimer = payload.disclaimer
    }

    // 4. Filtrera på items[] om skickade
    if (items?.length) {
      const itemsLower = items.map(i => i.toLowerCase())
      allCampaigns = allCampaigns.filter(c =>
        itemsLower.some(item => c.item?.toLowerCase().includes(item))
      )
      allRecommendations = allRecommendations.filter(r =>
        itemsLower.some(item => r.item?.toLowerCase().includes(item))
      )
    }

    const hasAi = Object.values(allPayloads).some(p => p.source === 'ai')
    const hasCache = Object.values(allPayloads).some(p => p.source === 'cache')

    return Response.json({
      success: true,
      weekLabel,
      campaigns: allCampaigns,
      recommendations: allRecommendations,
      seasonalTips,
      disclaimer,
      ...(warnings.length ? { warnings } : {}),
      source: hasAi && hasCache ? 'mixed' : hasAi ? 'ai' : 'cache',
    }, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' },
    })
  } catch (error) {
    console.error('campaigns error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
