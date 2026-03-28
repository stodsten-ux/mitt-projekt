import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request) {
  try {
    const { prompt, householdId } = await request.json()

    let householdContext = ''

    if (householdId) {
      const cookieStore = await cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            getAll() { return cookieStore.getAll() },
            setAll() {},
          },
        }
      )

      const { data: household } = await supabase
        .from('households')
        .select('*')
        .eq('id', householdId)
        .single()

      const { data: prefs } = await supabase
        .from('household_preferences')
        .select('*')
        .eq('household_id', householdId)
        .single()

      console.log('household:', household)
      console.log('prefs:', prefs)

      if (household) {
        householdContext = `
Du hjälper hushållet "${household.display_name || household.name}" med matplanering.
Hushållet består av ${household.adults} vuxna och ${household.children} barn.
Veckbudget för mat: ${household.weekly_budget} kr.
${prefs?.allergies?.length > 0 ? `Allergier och intoleranser: ${prefs.allergies.join(', ')}.` : ''}
${prefs?.diet_preferences?.length > 0 ? `Kostpreferenser: ${prefs.diet_preferences.join(', ')}.` : ''}
${prefs?.favorite_foods?.length > 0 ? `Favoriträtter: ${prefs.favorite_foods.join(', ')}.` : ''}
${prefs?.disliked_foods?.length > 0 ? `Undviker: ${prefs.disliked_foods.join(', ')}.` : ''}
        `.trim()
      }
    }

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      system: `Du är en hjälpsam matplaneringsassistent.
Du hjälper familjer att planera veckomeny, hitta recept och skapa inköpslistor.
Svara alltid på svenska.
När du föreslår recept, inkludera alltid ingredienser med mängder och enkla instruktioner.
När du föreslår inköpslistor, gruppera varor per butikskategori.
${householdContext}`,
      messages: [{ role: 'user', content: prompt }],
    })

    return Response.json({
      success: true,
      content: message.content[0].text,
    })
  } catch (error) {
    console.error('AI error:', error)
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
