import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Kategorier: nyckelord måste vara hela ord eller ordprefix (inte substrängar mitt i ord)
// Ordgränserna kontrolleras via regex \b eller genom att dela upp varunamnet i tokens
const CATEGORY_RULES = [
  // [kategori, [exakta ord / ordprefix som måste matcha ett helt token]]
  ['Kött & fisk', ['kyckling', 'kycklingfilé', 'nötkött', 'fläsk', 'lamm', 'lax', 'torsk', 'räkor', 'tonfisk', 'bacon', 'korv', 'köttfärs', 'kotlett', 'filé', 'fisk', 'kött', 'chark', 'skinka', 'fläskfilé', 'lammfilé', 'lammkött', 'fiskfilé', 'laxfilé', 'räka']],
  ['Mejeri', ['mjölk', 'grädde', 'smör', 'ost', 'yoghurt', 'filmjölk', 'kvarg', 'fraiche', 'ägg', 'mozzarella', 'parmesan', 'fetaost', 'ricotta', 'créme', 'crème', 'kesella', 'keso']],
  ['Frukt & grönt', ['lök', 'vitlök', 'tomat', 'gurka', 'paprika', 'morot', 'morötter', 'potatis', 'broccoli', 'sallad', 'spenat', 'kål', 'zucchini', 'aubergine', 'avokado', 'banan', 'äpple', 'päron', 'citron', 'lime', 'ingefära', 'basilika', 'persilja', 'dill', 'koriander', 'timjan', 'rosmarin', 'gräslök', 'rödlök', 'purjolök', 'schalottenlök', 'champinjon', 'svamp', 'selleri', 'rödbeta', 'majs', 'ärtor', 'böna', 'bönor', 'linser', 'kikärtor', 'ruccola', 'mangold']],
  ['Bröd & bakverk', ['bröd', 'knäckebröd', 'bagel', 'pita', 'tortilla', 'bulle', 'kaka', 'kex', 'ciabatta', 'baguette', 'levain']],
  ['Fryst', ['fryst', 'frysta']],
  ['Torrvaror', ['pasta', 'ris', 'mjöl', 'socker', 'salt', 'peppar', 'olja', 'olivolja', 'vinäger', 'soja', 'buljong', 'konserv', 'nudlar', 'havregryn', 'müsli', 'kryddor', 'krydda', 'senap', 'ketchup', 'majonnäs', 'sambal', 'harissa', 'tahini', 'honung', 'sylt', 'tomatkross', 'tomatpuré', 'kokosmjölk', 'fond', 'mjölk']],
  ['Dryck', ['juice', 'läsk', 'öl', 'vin', 'kaffe', 'dryck', 'lemonad', 'cider', 'kombucha']],
  // Vatten sist — matchar bara exakt "vatten" som eget ord, inte del av "kokvatten" etc.
]

function tokenize(name) {
  // Dela upp på mellanslag och bindestreck, ta bort siffror och enheter
  return name.toLowerCase().replace(/[0-9]+\s*(g|kg|ml|l|dl|cl|st|msk|tsk|krm)\b/gi, '').split(/[\s,\-/()]+/).filter(t => t.length > 1)
}

function categorize(name) {
  const tokens = tokenize(name)
  for (const [category, keywords] of CATEGORY_RULES) {
    for (const token of tokens) {
      if (keywords.some(kw => token === kw || token.startsWith(kw) || kw.startsWith(token) && token.length >= 4)) {
        return category
      }
    }
  }
  // Fallback: exakt "vatten" som eget ord
  if (tokens.includes('vatten')) return 'Dryck'
  return 'Övrigt'
}

async function getIngredientsFromAI(dishes, householdContext) {
  const dishList = dishes.join(', ')
  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2000,
    system: `Du är en matplaneringsassistent. Svara alltid på svenska. ${householdContext}`,
    messages: [{
      role: 'user',
      content: `Ge mig en samlad ingredienslista för att laga dessa rätter: ${dishList}.
Returnera BARA JSON i detta format:
[{"name": "Kycklingfilé", "quantity": "600", "unit": "g"}, {"name": "Lök", "quantity": "2", "unit": "st"}]
Inkludera alla ingredienser som behövs. Returnera BARA JSON-arrayen.`,
    }],
  })
  const raw = message.content[0].text
  const start = raw.indexOf('[')
  if (start === -1) throw new Error('AI returnerade ingen ingredienslista')
  let depth = 0, end = -1
  for (let i = start; i < raw.length; i++) {
    if (raw[i] === '[') depth++
    else if (raw[i] === ']') { depth--; if (depth === 0) { end = i; break } }
  }
  if (end === -1) throw new Error('AI returnerade ofullständig JSON')
  return JSON.parse(raw.slice(start, end + 1))
}

// Varor som alltid antas finnas hemma — ska aldrig läggas till automatiskt
const SKIP_ITEMS = ['vatten', 'salt', 'peppar', 'olja', 'olivolja', 'rapsolja', 'smörolja']

// Adjektiv som strippas vid aggregering (men originalnamnet behålls i visningen)
const STRIP_ADJECTIVES = ['gul', 'röd', 'grön', 'vit', 'färsk', 'fryst', 'ekologisk', 'eko', 'liten', 'stor', 'hackad', 'riven', 'krossad', 'torkad', 'kokt']

function normalizeForMerge(name) {
  const lower = name.toLowerCase().trim()
  const tokens = lower.split(/\s+/)
  const stripped = tokens.filter(t => !STRIP_ADJECTIVES.includes(t))
  return (stripped.length > 0 ? stripped : tokens).join(' ')
}

export async function POST(request) {
  try {
    const { menuId, householdId, weekStart } = await request.json()
    if (!menuId || !householdId) return Response.json({ error: 'menuId och householdId krävs' }, { status: 400 })

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Ej inloggad' }, { status: 401 })

    // 1. Hämta alla menu_items — om weekStart skickas, verifiera att menyn tillhör rätt vecka
    let resolvedMenuId = menuId
    if (weekStart) {
      const { data: menu } = await supabase
        .from('menus')
        .select('id')
        .eq('household_id', householdId)
        .eq('week_start', weekStart)
        .single()
      if (menu) resolvedMenuId = menu.id
    }

    const { data: menuItems } = await supabase
      .from('menu_items')
      .select('recipe_id, custom_title')
      .eq('menu_id', resolvedMenuId)

    if (!menuItems || menuItems.length === 0) {
      return Response.json({ error: 'Menyn har inga rätter' }, { status: 400 })
    }

    // 2. Hämta hushållskontext för AI
    let householdContext = ''
    const { data: household } = await supabase.from('households').select('*').eq('id', householdId).single()
    const { data: prefs } = await supabase.from('household_preferences').select('*').eq('household_id', householdId).single()
    if (household) {
      householdContext = [
        `Hushåll: ${household.display_name || household.name}, ${household.adults} vuxna, ${household.children} barn.`,
        prefs?.allergies?.length ? `Allergier: ${prefs.allergies.join(', ')}.` : '',
        prefs?.diet_preferences?.length ? `Kostpreferenser: ${prefs.diet_preferences.join(', ')}.` : '',
        prefs?.disliked_foods?.length ? `Undviker: ${prefs.disliked_foods.join(', ')}.` : '',
      ].filter(Boolean).join(' ')
    }

    // 3. Samla alla ingredienser
    // Dela upp i: rätter med recipe_id (hämta från DB) och rätter med bara custom_title (fråga AI)
    const allIngredients = []
    const customTitleDishes = []

    for (const item of menuItems) {
      if (item.recipe_id) {
        // Hämta ingredienser från DB-recept
        const { data: recipe } = await supabase
          .from('recipes')
          .select('ingredients')
          .eq('id', item.recipe_id)
          .single()
        if (recipe?.ingredients && Array.isArray(recipe.ingredients)) {
          allIngredients.push(...recipe.ingredients)
        }
      } else if (item.custom_title?.trim()) {
        // Samla ihop titel-baserade rätter för AI-anrop
        customTitleDishes.push(item.custom_title.trim())
      }
    }

    // 4. För rätter utan recipe_id: hämta ingredienser via AI
    if (customTitleDishes.length > 0) {
      try {
        const aiIngredients = await getIngredientsFromAI(customTitleDishes, householdContext)
        if (Array.isArray(aiIngredients)) allIngredients.push(...aiIngredients)
      } catch (e) {
        console.error('AI ingredient fetch failed:', e)
        // Fortsätt med eventuella DB-ingredienser
      }
    }

    if (allIngredients.length === 0) {
      return Response.json({ error: 'Kunde inte hämta ingredienser för menyn' }, { status: 400 })
    }

    // 5. Filtrera bort basvaror som alltid antas finnas hemma
    const filteredIngredients = allIngredients.filter(ing => {
      const name = (typeof ing === 'string' ? ing : ing.name || '').toLowerCase()
      return !SKIP_ITEMS.some(skip => name.includes(skip))
    })

    // 6. Slå ihop dubletter med normaliserat namn som nyckel
    // Originalnamnet (första förekomsten) behålls i visningen
    const merged = {}
    for (const ing of filteredIngredients) {
      const name = typeof ing === 'string' ? ing : ing.name
      if (!name) continue
      const quantity = typeof ing === 'object' ? (ing.quantity || ing.amount) : null
      const unit = typeof ing === 'object' ? ing.unit : null
      // Normalisera för att slå ihop "Gul lök" + "Röd lök" + "Lök" → nyckel "lök"
      const key = normalizeForMerge(name) + '|' + (unit || '').toLowerCase()
      if (!merged[key]) {
        merged[key] = { name, quantity: quantity ? String(quantity) : '', unit: unit || '' }
      } else if (quantity) {
        const existing = parseFloat(merged[key].quantity)
        const incoming = parseFloat(String(quantity))
        if (!isNaN(existing) && !isNaN(incoming)) {
          merged[key].quantity = String(Math.round((existing + incoming) * 10) / 10)
        }
      }
    }

    // 7. Hämta skafferiet och subtrahera
    const { data: pantryItems } = await supabase
      .from('pantry')
      .select('name')
      .eq('household_id', householdId)

    const pantryNames = (pantryItems || []).map(i => i.name.toLowerCase())
    const pantryDeducted = []

    const shoppingIngredients = Object.values(merged).filter(ing => {
      const inPantry = pantryNames.some(p => p.includes(ing.name.toLowerCase()) || ing.name.toLowerCase().includes(p))
      if (inPantry) pantryDeducted.push(ing.name)
      return !inPantry
    })

    // 8. Skapa shopping_list
    const dateStr = new Date().toLocaleDateString('sv-SE')
    const { data: list, error: listError } = await supabase
      .from('shopping_lists')
      .insert({ household_id: householdId, menu_id: resolvedMenuId, title: `Inköpslista ${dateStr}`, created_by: user.id })
      .select('id')
      .single()

    if (listError || !list) return Response.json({ error: 'Kunde inte skapa inköpslista' }, { status: 500 })

    // 9. Skapa shopping_items kategoriserade
    const rows = shoppingIngredients.map(ing => ({
      shopping_list_id: list.id,
      name: ing.name,
      quantity: ing.quantity || null,
      unit: ing.unit || null,
      store: categorize(ing.name),
      checked: false,
    }))

    if (rows.length > 0) await supabase.from('shopping_items').insert(rows)

    return Response.json({
      success: true,
      shoppingListId: list.id,
      itemCount: rows.length,
      pantryDeducted,
      aiUsed: customTitleDishes.length > 0,
    })
  } catch (error) {
    console.error('shopping/generate error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
