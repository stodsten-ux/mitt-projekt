import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { query, householdId } = await request.json()
    if (!query) return Response.json({ error: 'query saknas' }, { status: 400 })

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    )

    // 1. Sök i hushållets egna recept
    if (householdId) {
      const { data: ownRecipes } = await supabase
        .from('recipes')
        .select('id, title, description, servings, ingredients, instructions')
        .eq('household_id', householdId)
        .ilike('title', `%${query}%`)
        .limit(5)

      if (ownRecipes && ownRecipes.length > 0) {
        return Response.json({ source: 'own', recipes: ownRecipes })
      }
    }

    // 2. Sök i delade recept
    const { data: sharedRecipes } = await supabase
      .from('shared_recipes')
      .select('id, title, description, servings, ingredients, instructions')
      .ilike('title', `%${query}%`)
      .limit(5)

    if (sharedRecipes && sharedRecipes.length > 0) {
      return Response.json({ source: 'shared', recipes: sharedRecipes })
    }

    // 3. Hämta hushållskontext för AI
    let householdContext = ''
    if (householdId) {
      const { data: household } = await supabase.from('households').select('*').eq('id', householdId).single()
      const { data: prefs } = await supabase.from('household_preferences').select('*').eq('household_id', householdId).single()
      if (household) {
        householdContext = `
Hushåll: ${household.display_name || household.name}, ${household.adults} vuxna, ${household.children} barn.
${prefs?.allergies?.length ? `Allergier: ${prefs.allergies.join(', ')}.` : ''}
${prefs?.diet_preferences?.length ? `Kostpreferenser: ${prefs.diet_preferences.join(', ')}.` : ''}
${prefs?.disliked_foods?.length ? `Undviker: ${prefs.disliked_foods.join(', ')}.` : ''}`.trim()
      }
    }

    // 4. Fråga AI
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1500,
      system: `Du är en matplaneringsassistent. Svara alltid på svenska. ${householdContext}`,
      messages: [{
        role: 'user',
        content: `Skapa ett recept för: ${query}. Returnera som JSON med fälten: title, description, servings (number), ingredients (array av {name, quantity}), instructions (string). Returnera BARA JSON.`
      }]
    })

    const rawText = message.content[0].text
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI returnerade inget giltigt JSON-recept')
    const recipe = JSON.parse(jsonMatch[0])

    // 5. Spara automatiskt om householdId finns
    let savedId = null
    if (householdId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: saved } = await supabase
          .from('recipes')
          .insert({ ...recipe, household_id: householdId, created_by: user.id, ai_generated: true })
          .select('id')
          .single()
        if (saved) savedId = saved.id
      }
    }

    return Response.json({ source: 'ai', recipes: [{ ...recipe, id: savedId }] })
  } catch (error) {
    console.error('recipes error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
