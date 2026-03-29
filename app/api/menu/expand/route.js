import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { menuId, householdId } = await request.json()
    if (!menuId || !householdId) return Response.json({ error: 'menuId och householdId krävs' }, { status: 400 })

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Ej inloggad' }, { status: 401 })

    // Hämta hushållskontext
    const { data: household } = await supabase.from('households').select('*').eq('id', householdId).single()
    const { data: prefs } = await supabase.from('household_preferences').select('*').eq('household_id', householdId).single()

    const contextLines = [
      `Hushåll: ${household?.display_name || household?.name || 'okänt'}, ${household?.adults || 2} vuxna, ${household?.children || 0} barn.`,
      prefs?.allergies?.length ? `Allergier: ${prefs.allergies.join(', ')}.` : '',
      prefs?.diet_preferences?.length ? `Kostpreferenser: ${prefs.diet_preferences.join(', ')}.` : '',
      prefs?.disliked_foods?.length ? `Undviker: ${prefs.disliked_foods.join(', ')}.` : '',
    ].filter(Boolean).join(' ')

    // Hämta menu_items utan recipe_id
    const { data: menuItems } = await supabase
      .from('menu_items')
      .select('id, custom_title, recipe_id')
      .eq('menu_id', menuId)
      .is('recipe_id', null)

    if (!menuItems || menuItems.length === 0) {
      return Response.json({ success: true, created: 0, message: 'Alla rätter har redan recept' })
    }

    let created = 0
    const results = []

    for (const item of menuItems) {
      if (!item.custom_title?.trim()) continue

      try {
        const message = await client.messages.create({
          model: 'claude-opus-4-6',
          max_tokens: 1500,
          system: `Du är en matplaneringsassistent. Svara alltid på svenska. ${contextLines}`,
          messages: [{
            role: 'user',
            content: `Generera ett komplett recept för "${item.custom_title}".
Returnera ENDAST giltig JSON utan markdown:
{
  "title": "Receptnamn",
  "description": "Kort beskrivning",
  "servings": 4,
  "ingredients": [
    {"name": "Kycklingfilé", "amount": 400, "unit": "g"},
    {"name": "Lök", "amount": 1, "unit": "st"}
  ],
  "instructions": "Steg-för-steg instruktioner"
}`,
          }],
        })

        const raw = message.content[0].text.trim()
        // Extrahera första välbalanserade JSON-objekt
        const start = raw.indexOf('{')
        if (start === -1) continue
        let depth = 0, end = -1
        for (let i = start; i < raw.length; i++) {
          if (raw[i] === '{') depth++
          else if (raw[i] === '}') { depth--; if (depth === 0) { end = i; break } }
        }
        if (end === -1) continue
        let recipe
        try { recipe = JSON.parse(raw.slice(start, end + 1)) }
        catch { continue }

        // Normera ingredienser till {name, quantity} format
        const ingredients = (recipe.ingredients || []).map(ing => ({
          name: ing.name,
          quantity: ing.amount ? String(ing.amount) : '',
          unit: ing.unit || '',
        }))

        // Spara receptet
        const { data: saved } = await supabase
          .from('recipes')
          .insert({
            household_id: householdId,
            created_by: user.id,
            title: recipe.title || item.custom_title,
            description: recipe.description || '',
            servings: recipe.servings || 4,
            ingredients,
            instructions: recipe.instructions || '',
            ai_generated: true,
          })
          .select('id')
          .single()

        if (saved?.id) {
          // Koppla recipe_id till menu_item
          await supabase
            .from('menu_items')
            .update({ recipe_id: saved.id })
            .eq('id', item.id)

          created++
          results.push({ title: item.custom_title, recipeId: saved.id })
        }
      } catch (err) {
        console.error(`Failed to expand "${item.custom_title}":`, err.message)
        // Fortsätt med nästa rätt
      }
    }

    return Response.json({ success: true, created, results })
  } catch (error) {
    console.error('menu/expand error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
