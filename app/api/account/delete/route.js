import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function DELETE() {
  const cookieStore = await cookies()

  // Browser-klient för att verifiera session
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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Ej inloggad' }, { status: 401 })

  // Anonymisera betyg (behåller aggregerad statistik)
  await supabase.from('meal_ratings').update({ user_id: null }).eq('user_id', user.id)

  // Ta bort hushållsmedlemskap (hushåll raderas via CASCADE om sista admin)
  await supabase.from('household_members').delete().eq('user_id', user.id)

  // Radera auth-användaren (kräver SERVICE_ROLE_KEY)
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY saknas i miljövariablerna' }, { status: 500 })
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await adminClient.auth.admin.deleteUser(user.id)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ success: true })
}
