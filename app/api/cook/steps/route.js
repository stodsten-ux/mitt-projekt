import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { recipeId, householdId } = await request.json()
    if (!recipeId || !householdId) return Response.json({ error: 'recipeId och householdId krävs' }, { status: 400 })

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    )

    const { data: recipe } = await supabase
      .from('recipes')
      .select('id, title, instructions, steps')
      .eq('id', recipeId)
      .eq('household_id', householdId)
      .single()

    if (!recipe) return Response.json({ error: 'Recept hittades inte' }, { status: 404 })

    // Returnera befintliga steg om de redan finns
    if (Array.isArray(recipe.steps) && recipe.steps.length > 0) {
      return Response.json({ success: true, steps: recipe.steps, cached: true })
    }

    if (!recipe.instructions) {
      return Response.json({ success: true, steps: [{ text: 'Inga instruktioner finns för detta recept.', timer_seconds: null }], cached: false })
    }

    // Parsea instruktioner till strukturerade steg via Claude
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: 'Du är en matlagningsassistent. Svara på svenska. Dela upp instruktioner i korta, konkreta steg med timer där det behövs.',
      messages: [{
        role: 'user',
        content: `Dela upp dessa instruktioner för "${recipe.title}" i separata steg.
Varje steg ska vara en konkret handling (max 2 meningar).
Om ett steg kräver en timer (t.ex. "koka i 10 minuter"), inkludera timer_seconds.

Returnera ENDAST en JSON-array utan markdown:
[
  {"text": "Hacka löken fint.", "timer_seconds": null},
  {"text": "Fräs löken i smör på medelvärme tills den är mjuk och genomskinlig.", "timer_seconds": 300},
  {"text": "Tillsätt kycklingen och bryn runt om.", "timer_seconds": 180}
]

Instruktioner:
${recipe.instructions}`,
      }],
    })

    const raw = message.content[0].text.trim()
    const start = raw.indexOf('[')
    if (start === -1) return Response.json({ error: 'AI returnerade inget JSON' }, { status: 500 })
    let depth = 0, end = -1
    for (let i = start; i < raw.length; i++) {
      if (raw[i] === '[') depth++
      else if (raw[i] === ']') { depth--; if (depth === 0) { end = i; break } }
    }
    if (end === -1) return Response.json({ error: 'Ofullständigt JSON' }, { status: 500 })

    let steps
    try { steps = JSON.parse(raw.slice(start, end + 1)) }
    catch { return Response.json({ error: 'Kunde inte tolka AI-svar' }, { status: 500 }) }

    // Spara strukturerade steg i recipes.steps
    await supabase.from('recipes').update({ steps }).eq('id', recipeId)

    return Response.json({ success: true, steps, cached: false })
  } catch (error) {
    console.error('cook/steps error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
