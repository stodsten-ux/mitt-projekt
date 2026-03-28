'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [aiSuggestion, setAiSuggestion] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push('/auth/login')
      setUser(user)
      setLoading(false)
    }
    getUser()
  }, [])

  async function getAiSuggestion() {
    setAiLoading(true)
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Föreslå en veckans meny med 5 middagar för en familj. Håll det kort och enkelt, bara maträtternas namn.' }),
    })
    const data = await response.json()
    setAiSuggestion(data.content)
    setAiLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>Laddar...</p>
    </div>
  )

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>🛒 Mathandelsagenten</h1>
        <button onClick={handleLogout} style={{ padding: '8px 16px', background: '#f1f1f1', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          Logga ut
        </button>
      </div>

      {/* Välkommen */}
      <div style={{ background: '#f9f9f9', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '8px' }}>Välkommen! 👋</h2>
        <p style={{ color: '#666' }}>Inloggad som {user?.email}</p>
      </div>

      {/* Navigationskort */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { emoji: '📅', title: 'Veckomenyn', desc: 'Planera veckans måltider', href: '/menu' },
          { emoji: '📖', title: 'Recept', desc: 'Bläddra och spara recept', href: '/recipes' },
          { emoji: '🛍️', title: 'Inköpslista', desc: 'Handla smart och billigt', href: '/shopping' },
          { emoji: '🥦', title: 'Skafferiet', desc: 'Minska svinn och rester', href: '/pantry' },
        ].map((item) => (
          <a key={item.href} href={item.href} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '20px', textDecoration: 'none', color: '#000', display: 'block' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>{item.emoji}</div>
            <h3 style={{ marginBottom: '4px' }}>{item.title}</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>{item.desc}</p>
          </a>
        ))}
      </div>

      {/* AI-förslag */}
      <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>✨ AI-förslag på veckans meny</h2>
        <button
          onClick={getAiSuggestion}
          disabled={aiLoading}
          style={{ padding: '10px 20px', background: '#000', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '16px' }}
        >
          {aiLoading ? 'Hämtar förslag...' : 'Ge mig förslag!'}
        </button>
        {aiSuggestion && (
          <div style={{ whiteSpace: 'pre-wrap', color: '#333', lineHeight: '1.6' }}>
            {aiSuggestion}
          </div>
        )}
      </div>
    </div>
  )
}
