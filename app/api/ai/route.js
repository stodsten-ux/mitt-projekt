import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const HOUSEHOLD_TYPE_CONTEXT = {
  barnfamilj: 'Hushållet är en barnfamilj — prioritera enkla rätter, milda smaker, snabb tillagning och barnvänliga alternativ.',
  par: 'Hushållet är ett par — välkomna mer variation, matlagning som hobby och gärna romantiska middagar.',
  singel: 'Hushållet är en singelperson — fokusera på små portioner, enkel matlagning, budgetvänliga och snabba alternativ.',
  storformat: 'Hushållet lagar mat i storformat — fokusera på många portioner, ekonomisk matlagning och batch cooking.',
  senior: 'Hushållet är seniorer — prioritera lättlagad, näringsrik mat med inte för starka smaker.',
}

export async function POST(request) {
  try {
    const { prompt, householdId, stream: useStream } = await request.json()

    let householdContext = ''

    if (householdId) {
      const cookieStore = await cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
      )

      const [{ data: household }, { data: prefs }, { data: ratings }] = await Promise.all([
        supabase.from('households').select('*').eq('id', householdId).single(),
        supabase.from('household_preferences').select('*').eq('household_id', householdId).single(),
        supabase.from('meal_ratings').select('rating, recipes(title)').eq('household_id', householdId),
      ])

      if (household) {
        const portionPct = prefs?.portion_modifier ? Math.round(prefs.portion_modifier * 100) : 100
        const typeContext = HOUSEHOLD_TYPE_CONTEXT[household.household_type] || ''

        // Betygshistorik — recept under 3 undviks, över 4 föredras
        let ratingContext = ''
        if (ratings && ratings.length > 0) {
          const favs = ratings.filter(r => r.rating >= 4 && r.recipes?.title).map(r => r.recipes.title)
          const avoid = ratings.filter(r => r.rating <= 2 && r.recipes?.title).map(r => r.recipes.title)
          if (favs.length > 0) ratingContext += `\nOmtyckta recept (betyg 4–5): ${[...new Set(favs)].join(', ')}.`
          if (avoid.length > 0) ratingContext += `\nUndvik dessa recept (betyg 1–2): ${[...new Set(avoid)].join(', ')}.`
        }

        householdContext = [
          `Du hjälper hushållet "${household.display_name || household.name}" med matplanering.`,
          `Hushållet består av ${household.adults} vuxna och ${household.children} barn.`,
          `Veckbudget för mat: ${household.weekly_budget} kr.`,
          household.location_city ? `Hushållet bor i ${household.location_city}.` : '',
          typeContext,
          prefs?.allergies?.length ? `Allergier och intoleranser: ${prefs.allergies.join(', ')}.` : '',
          prefs?.diet_preferences?.length ? `Kostpreferenser: ${prefs.diet_preferences.join(', ')}.` : '',
          prefs?.favorite_foods?.length ? `Favoriträtter: ${prefs.favorite_foods.join(', ')}.` : '',
          prefs?.disliked_foods?.length ? `Undviker: ${prefs.disliked_foods.join(', ')}.` : '',
          portionPct !== 100 ? `Portionsstorlek: ${portionPct}% av standard.` : '',
          prefs?.diverse_menu === true ? 'Variera menyn — undvik samma proteinkälla två dagar i rad.' : '',
          prefs?.diverse_menu === false ? 'Hushållet föredrar konsekvent matlagningsstil.' : '',
          ratingContext,
        ].filter(Boolean).join('\n').trim()
      }
    }

    const systemPrompt = `Du är en hjälpsam matplaneringsassistent.
Du hjälper familjer att planera veckomeny, hitta recept och skapa inköpslistor.
Svara alltid på svenska.
När du föreslår recept, inkludera alltid ingredienser med mängder och enkla instruktioner.
När du föreslår inköpslistor, gruppera varor per butikskategori.
${householdContext}`

    if (useStream) {
      console.time('ai-stream-ttft')
      const stream = await client.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      })

      let firstToken = true
      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const event of stream) {
              if (event.type === 'content_block_delta' && event.delta?.text) {
                if (firstToken) { console.timeEnd('ai-stream-ttft'); firstToken = false }
                controller.enqueue(encoder.encode(event.delta.text))
              }
            }
            console.timeEnd('ai-stream-total')
            controller.close()
          } catch (err) {
            controller.error(err)
          }
        },
      })
      console.time('ai-stream-total')

      return new Response(readable, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
      })
    }

    console.time('ai-nostream')
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    })
    console.timeEnd('ai-nostream')

    return Response.json({ success: true, content: message.content[0].text })
  } catch (error) {
    console.error('AI error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
