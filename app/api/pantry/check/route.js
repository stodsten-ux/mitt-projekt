import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function isMatch(pantryName, ingredientName) {
  const p = pantryName.toLowerCase()
  const i = ingredientName.toLowerCase()
  return p.includes(i) || i.includes(p)
}

export async function POST(request) {
  try {
    const { ingredients, householdId } = await request.json()
    if (!ingredients || !householdId) return Response.json({ error: 'ingredients och householdId krävs' }, { status: 400 })

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    )

    const { data: pantry } = await supabase
      .from('pantry')
      .select('*')
      .eq('household_id', householdId)

    const pantryItems = pantry || []

    const results = ingredients.map(ingredient => {
      const name = typeof ingredient === 'string' ? ingredient : ingredient.name
      const needAmount = typeof ingredient === 'object' ? parseFloat(ingredient.amount) : null
      const match = pantryItems.find(p => isMatch(p.name, name))

      if (!match) return { name, status: 'saknas' }

      if (needAmount && match.quantity) {
        const have = parseFloat(match.quantity)
        if (!isNaN(have) && !isNaN(needAmount)) {
          if (have >= needAmount) {
            return { name, status: 'har_hemma', pantryAmount: `${match.quantity}${match.unit ? ' ' + match.unit : ''}` }
          } else {
            const need = needAmount - have
            return { name, status: 'delvis_hemma', pantryAmount: `${match.quantity}${match.unit ? ' ' + match.unit : ''}`, need: `${Math.round(need * 10) / 10}${match.unit ? ' ' + match.unit + ' till' : ' till'}` }
          }
        }
      }

      return { name, status: 'har_hemma', pantryAmount: [match.quantity, match.unit].filter(Boolean).join(' ') || 'finns' }
    })

    return Response.json({ success: true, results })
  } catch (error) {
    console.error('pantry/check error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
