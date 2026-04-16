import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getISOWeek } from '../../lib/dates'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { items, stores, includeCampaigns } = await request.json()
    if (!items || items.length === 0) return Response.json({ error: 'items saknas' }, { status: 400 })

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    )

    const storeList = stores?.length ? stores : ['ICA', 'Willys', 'Coop', 'Lidl']
    const itemsToPrice = items.slice(0, 20)
    const today = new Date().toISOString().split('T')[0]

    // 1. Slå mot price_cache först
    const { data: cached } = await supabase
      .from('price_cache')
      .select('*')
      .in('item_name', itemsToPrice.map(i => i.toLowerCase().trim()))
      .in('store', storeList)
      .gte('valid_until', today)

    const cachedMap = {}
    if (cached?.length) {
      for (const row of cached) {
        if (!cachedMap[row.item_name]) cachedMap[row.item_name] = []
        cachedMap[row.item_name].push(row)
      }
    }

    // Dela upp: cachade vs behöver AI-uppskattning
    const cachedItems = []
    const uncachedItems = []
    for (const item of itemsToPrice) {
      const key = item.toLowerCase().trim()
      if (cachedMap[key]?.length) {
        const best = cachedMap[key].reduce((a, b) => (a.price < b.price ? a : b))
        cachedItems.push({
          name: item,
          bestPrice: `${best.price} kr/${best.unit}`,
          numericPrice: parseFloat(best.price),
          unit: best.unit || 'st',
          store: best.store,
          tip: best.is_campaign ? best.campaign_label : null,
          campaign: best.is_campaign ? best.campaign_label : null,
          source: 'cache',
        })
      } else {
        uncachedItems.push(item)
      }
    }

    // 2. Fråga Claude för varor som saknas i cache
    let aiItems = []
    let weeklyTip = null
    if (uncachedItems.length > 0) {
      console.time('prices-ai')
      const aiResult = await estimateWithAI(uncachedItems, storeList.join(', '), includeCampaigns)
      console.timeEnd('prices-ai')
      aiItems = aiResult.items || []
      weeklyTip = aiResult.weeklyTip
    }

    const allItems = [...cachedItems, ...aiItems]

    return Response.json({
      success: true,
      items: allItems,
      weeklyTip: weeklyTip || 'Jämför priser mellan butiker för att spara mest.',
      disclaimer: 'Priserna är uppskattningar och kan variera. Kontrollera alltid aktuella priser i butiken.',
      cachedCount: cachedItems.length,
      aiCount: aiItems.length,
    }, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' }
    })
  } catch (error) {
    console.error('prices error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

async function estimateWithAI(items, storeListStr, includeCampaigns) {
  const today = new Date().toLocaleDateString('sv-SE')
  const weekNum = getISOWeek(new Date())

  const campaignSection = includeCampaigns
    ? `\nKontrollera även om det finns kända kampanjer eller erbjudanden på dessa varor vecka ${weekNum} (${today}).
Inkludera ett "campaign" fält med kampanjinfo om du känner till något, annars null.`
    : ''

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: 'Du är en hjälpsam assistent med kunskap om svenska matpriser och butikskedjornas kampanjmönster. Svara alltid på svenska. Ge alltid rimliga uppskattningar baserade på din träningsdata om svenska livsmedelspriser.',
    messages: [{
      role: 'user',
      content: `Uppskatta priser för dessa matvaror i svenska butiker (${storeListStr}):
${items.map((item, i) => `${i + 1}. ${item}`).join('\n')}
${campaignSection}
Returnera ENDAST JSON utan markdown:
{"items":[{"name":"","bestPrice":"ca X kr/kg","numericPrice":0,"unit":"","store":"","tip":"","campaign":null}],"weeklyTip":""}`,
    }],
  })

  const raw = message.content[0].text.trim()
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return { items: [] }

  try {
    const result = JSON.parse(jsonMatch[0])
    if (Array.isArray(result.items)) {
      result.items = result.items.map(i => ({ ...i, source: 'ai' }))
    }
    return result
  } catch {
    return { items: [] }
  }
}

