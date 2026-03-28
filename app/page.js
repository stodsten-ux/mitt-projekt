'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import HouseholdCard from '../components/HouseholdCard'
import Spinner from '../components/Spinner'

const supabase = createClient()

export default function Home() {
  const [user, setUser] = useState(null)
  const [household, setHousehold] = useState(null)
  const [householdId, setHouseholdId] = useState(null)
  const [preferences, setPreferences] = useState(null)
  const [loading, setLoading] = useState(true)
  const [aiSuggestion, setAiSuggestion] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUser(user)

      const { data: members } = await supabase
        .from('household_members')
        .select('household_id, households(*)')
        .eq('user_id', user.id)
        .limit(1)

      if (members && members.length > 0) {
        setHouseholdId(members[0].household_id)
        setHousehold(members[0].households)

        const { data: prefs } = await supabase
          .from('household_preferences')
          .select('*')
          .eq('household_id', members[0].household_id)
          .single()
        setPreferences(prefs)
      }

      setLoading(false)
    }
    load()
  }, [router])

  async function getAiSuggestion() {
    setAiLoading(true)
    setAiSuggestion('')
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Föreslå en veckans meny med 5 middagar. Bara namnen på rätterna, en per rad.',
        householdId,
      }),
    })
    const data = await response.json()
    setAiSuggestion(data.content || '')
    setAiLoading(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', gap: '12px', color: 'var(--text-muted)' }}>
      <Spinner size="lg" />
    </div>
  )

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '4px', color: 'var(--text)' }}>
        Hej{user?.email ? ` ${user.email.split('@')[0]}` : ''}! 👋
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '28px' }}>Vad ska det bli för mat?</p>

      {/* Hushållskort eller onboarding */}
      {household ? (
        <HouseholdCard household={household} preferences={preferences} householdId={householdId} />
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', marginBottom: '24px' }}>
          <p style={{ fontWeight: '600', marginBottom: '6px', color: 'var(--text)' }}>Välkommen till Mathandelsagenten!</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>Skapa ditt hushåll för att komma igång med menyplanering, recept och inköpslistor.</p>
          <Link href="/household" style={{ display: 'inline-block', padding: '11px 20px', background: 'var(--accent)', color: 'var(--accent-text)', borderRadius: '10px', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
            Skapa hushåll →
          </Link>
        </div>
      )}

      {/* Navigationskort */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { emoji: '📅', title: 'Veckomenyn', desc: 'Planera veckans måltider', href: '/menu' },
          { emoji: '📖', title: 'Recept', desc: 'Bläddra och spara recept', href: '/recipes' },
          { emoji: '🛍️', title: 'Inköpslista', desc: 'Handla smart och billigt', href: '/shopping' },
          { emoji: '🥦', title: 'Skafferiet', desc: 'Minska svinn och rester', href: '/pantry' },
        ].map((item) => (
          <Link key={item.href} href={item.href} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px', textDecoration: 'none', color: 'var(--text)', display: 'block' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>{item.emoji}</div>
            <h3 style={{ marginBottom: '4px', fontSize: '15px', fontWeight: '600' }}>{item.title}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{item.desc}</p>
          </Link>
        ))}
      </div>

      {/* AI-snabbförslag */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
        <h2 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>✨ Snabbförslag på veckans meny</h2>
        <button
          onClick={getAiSuggestion}
          disabled={aiLoading}
          style={{ padding: '11px 20px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: aiSuggestion ? '16px' : 0, fontSize: '14px', fontWeight: '500' }}
        >
          {aiLoading ? <><Spinner />&nbsp;Hämtar förslag...</> : 'Ge mig förslag!'}
        </button>
        {aiSuggestion && (
          <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text)', lineHeight: '1.7', fontSize: '14px' }}>
            {aiSuggestion}
          </div>
        )}
      </div>
    </div>
  )
}
