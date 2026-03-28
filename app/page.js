'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const supabase = createClient()

export default function Home() {
  const [user, setUser] = useState(null)
  const [households, setHouseholds] = useState([])
  const [loading, setLoading] = useState(true)
  const [aiSuggestion, setAiSuggestion] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUser(user)

      const { data: members } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)

      setHouseholds(members || [])
      setLoading(false)
    }
    getUser()
  }, [router])

  async function getAiSuggestion() {
    setAiLoading(true)
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Föreslå en veckans meny med 5 middagar. Bara namnen på rätterna.',
        householdId: households[0]?.household_id,
      }),
    })
    const data = await response.json()
    setAiSuggestion(data.content)
    setAiLoading(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>Laddar...</p>
    </div>
  )

  const hasHousehold = households.length > 0

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 'bold', marginBottom: '4px' }}>🛒 Mathandelsagenten</h1>
        <p style={{ color: '#666', fontSize: '14px' }}>Inloggad som {user?.email}</p>
      </div>

      {/* Inget hushåll — uppmaning */}
      {!hasHousehold && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <p style={{ fontWeight: '600', marginBottom: '6px' }}>👋 Välkommen!</p>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '14px' }}>Du behöver skapa eller gå med i ett hushåll för att komma igång.</p>
          <Link href="/household" style={{ display: 'inline-block', padding: '10px 20px', background: '#000', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}>
            Skapa hushåll
          </Link>
        </div>
      )}

      {/* Navigationskort */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { emoji: '📅', title: 'Veckomenyn', desc: 'Planera veckans måltider', href: '/menu' },
          { emoji: '📖', title: 'Recept', desc: 'Bläddra och spara recept', href: '/recipes' },
          { emoji: '🛍️', title: 'Inköpslista', desc: 'Handla smart och billigt', href: '/shopping' },
          { emoji: '🥦', title: 'Skafferiet', desc: 'Minska svinn och rester', href: '/pantry' },
          { emoji: '🏠', title: 'Hushåll', desc: 'Hantera familj och preferenser', href: '/household' },
        ].map((item) => (
          <Link key={item.href} href={item.href} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '18px', textDecoration: 'none', color: '#000', display: 'block' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>{item.emoji}</div>
            <h3 style={{ marginBottom: '4px', fontSize: '15px' }}>{item.title}</h3>
            <p style={{ color: '#666', fontSize: '13px' }}>{item.desc}</p>
          </Link>
        ))}
      </div>

      {/* AI-förslag */}
      <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '24px' }}>
        <h2 style={{ marginBottom: '16px', fontSize: '17px' }}>✨ Snabbförslag på veckans meny</h2>
        <button
          onClick={getAiSuggestion}
          disabled={aiLoading}
          style={{ padding: '10px 20px', background: '#000', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '16px', fontSize: '14px', fontWeight: '500' }}
        >
          {aiLoading ? 'Hämtar förslag...' : 'Ge mig förslag!'}
        </button>
        {aiSuggestion && (
          <div style={{ whiteSpace: 'pre-wrap', color: '#333', lineHeight: '1.7', fontSize: '14px' }}>
            {aiSuggestion}
          </div>
        )}
      </div>
    </div>
  )
}
