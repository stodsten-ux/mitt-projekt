import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const STORES = ['ICA', 'Willys', 'Coop', 'Lidl']

// Vanliga svenska matvaror att priskolla
const BASE_ITEMS = [
  'kycklingfilé', 'nötfärs', 'laxfilé', 'falukorv', 'bacon',
  'mjölk', 'smör', 'ägg', 'ost (Präst)', 'gräddfil',
  'pasta', 'ris', 'potatis', 'lök', 'morötter', 'tomater', 'gurka', 'sallad', 'broccoli', 'paprika',
  'bröd', 'kaffe', 'olivolja', 'krossade tomater', 'kokosmjölk',
  'bananer', 'äpplen', 'citron',
  'kyckling hel', 'fläskfilé', 'räkor',
]

export async function GET(request) {
  // Verifiera att anropet kommer från Vercel Cron eller manuellt med rätt nyckel
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY saknas' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey
  )

  try {
    // 1. Hämta extra ingredienser från hushållens senaste recept
    const extraItems = await getPopularIngredients(supabase)
    const allItems = [...new Set([...BASE_ITEMS, ...extraItems])]

    // 2. Dela upp i batchar (max 15 per Claude-anrop)
    const batches = chunk(allItems, 15)
    const results = []

    for (let i = 0; i < batches.length; i++) {
      console.time(`cron-prices-batch-${i}`)
      const prices = await estimatePrices(batches[i])
      console.timeEnd(`cron-prices-batch-${i}`)
      results.push(...prices)
    }

    // 3. Rensa gamla priser och spara nya
    await supabase
      .from('price_cache')
      .delete()
      .lt('valid_until', new Date().toISOString().split('T')[0])

    if (results.length > 0) {
      const { error } = await supabase
        .from('price_cache')
        .upsert(results, { onConflict: 'item_name,store', ignoreDuplicates: false })

      if (error) {
        // Om upsert misslyckas (t.ex. ingen unique constraint), gör insert
        const today = new Date().toISOString().split('T')[0]
        await supabase
          .from('price_cache')
          .delete()
          .gte('valid_from', today)

        await supabase
          .from('price_cache')
          .insert(results)
      }
    }

    return Response.json({
      success: true,
      itemsUpdated: results.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('cron/update-prices error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

async function getPopularIngredients(supabase) {
  const { data: recipes } = await supabase
    .from('recipes')
    .select('ingredients')
    .not('ingredients', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50)

  if (!recipes?.length) return []

  const counts = {}
  for (const recipe of recipes) {
    const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : []
    for (const ing of ingredients) {
      const name = (typeof ing === 'string' ? ing : ing?.name || '').toLowerCase().trim()
      if (name && name.length > 2) {
        counts[name] = (counts[name] || 0) + 1
      }
    }
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name]) => name)
}

async function estimatePrices(items) {
  const today = new Date().toISOString().split('T')[0]
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    system: `Du är en databas över svenska matpriser. Ge realistiska prisuppskattningar baserade på typiska svenska livsmedelspriser 2025-2026. Svara BARA med JSON, ingen annan text.`,
    messages: [{
      role: 'user',
      content: `Uppskatta priser för dessa varor i butikerna ${STORES.join(', ')}:
${items.map((item, i) => `${i + 1}. ${item}`).join('\n')}

Returnera BARA en JSON-array (ingen markdown, inga förklaringar):
[
  {
    "item_name": "kycklingfilé",
    "store": "ICA",
    "price": 89.90,
    "unit": "kg",
    "is_campaign": false,
    "campaign_label": null
  }
]

Ge en rad per vara per butik. Markera is_campaign: true om varan typiskt är på kampanj just nu, med campaign_label som beskriver erbjudandet.`,
    }],
  })

  const raw = message.content[0].text.trim()
  const jsonMatch = raw.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  try {
    const parsed = JSON.parse(jsonMatch[0])
    return parsed
      .filter(p => p.item_name && p.store && p.price)
      .map(p => ({
        item_name: p.item_name.toLowerCase().trim(),
        store: p.store,
        price: parseFloat(p.price),
        unit: p.unit || 'st',
        is_campaign: Boolean(p.is_campaign),
        campaign_label: p.campaign_label || null,
        valid_from: today,
        valid_until: nextWeek,
        source: 'claude-estimate',
      }))
  } catch {
    return []
  }
}

function chunk(arr, size) {
  const result = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}
