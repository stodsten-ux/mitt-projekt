'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const supabase = createClient()

export default function HouseholdPage() {
  const [user, setUser] = useState(null)
  const [households, setHouseholds] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list') // list | create | join
  const [householdName, setHouseholdName] = useState('')
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(0)
  const [budget, setBudget] = useState(2000)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUser(user)

      const { data: members } = await supabase
        .from('household_members')
        .select('household_id, role, households(id, name, display_name, adults, children, weekly_budget)')
        .eq('user_id', user.id)

      if (members) setHouseholds(members)
      setLoading(false)
    }
    load()
  }, [router])

  async function createHousehold() {
    setSaving(true)
    setError(null)

    const { data: household, error: hError } = await supabase
      .from('households')
      .insert({
        name: householdName,
        display_name: householdName,
        adults,
        children,
        weekly_budget: budget,
        created_by: user.id,
      })
      .select()
      .single()

    if (hError) { setError(hError.message); setSaving(false); return }

    await supabase.from('household_members').insert({
      household_id: household.id,
      user_id: user.id,
      role: 'admin',
    })

    await supabase.from('household_preferences').insert({
      household_id: household.id,
      allergies: [],
      diet_preferences: [],
      favorite_foods: [],
      disliked_foods: [],
    })

    router.push(`/household/${household.id}`)
  }

  if (loading) return <div style={{ padding: '40px' }}>Laddar...</div>

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>🏠 Mina hushåll</h1>
        <Link href="/" style={{ color: '#666', textDecoration: 'none' }}>← Tillbaka</Link>
      </div>

      {/* Lista befintliga hushåll */}
      {households.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          {households.map((m) => (
            <Link
              key={m.household_id}
              href={`/household/${m.household_id}`}
              style={{ display: 'block', background: '#f9f9f9', borderRadius: '12px', padding: '20px', marginBottom: '12px', textDecoration: 'none', color: '#000' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ marginBottom: '4px' }}>{m.households?.display_name || m.households?.name}</h2>
                  <p style={{ color: '#666', fontSize: '14px' }}>
                    {m.households?.adults} vuxna · {m.households?.children} barn · {m.households?.weekly_budget} kr/vecka
                  </p>
                </div>
                <span style={{ background: m.role === 'admin' ? '#000' : '#e5e5e5', color: m.role === 'admin' ? '#fff' : '#333', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', alignSelf: 'center' }}>
                  {m.role === 'admin' ? 'Admin' : 'Medlem'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Knappar */}
      {view === 'list' && (
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setView('create')}
            style={{ flex: 1, padding: '14px', background: '#000', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '15px' }}
          >
            + Skapa hushåll
          </button>
        </div>
      )}

      {/* Skapa hushåll */}
      {view === 'create' && (
        <div style={{ background: '#f9f9f9', borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ marginBottom: '20px' }}>Skapa nytt hushåll</h2>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Hushållets namn</label>
            <input
              type="text"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              placeholder="t.ex. Familjen Hallgren"
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '15px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Antal vuxna</label>
              <input
                type="number"
                value={adults}
                min={1}
                onChange={(e) => setAdults(parseInt(e.target.value))}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '15px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Antal barn</label>
              <input
                type="number"
                value={children}
                min={0}
                onChange={(e) => setChildren(parseInt(e.target.value))}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '15px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Veckbudget (kr)</label>
            <input
              type="number"
              value={budget}
              min={0}
              step={100}
              onChange={(e) => setBudget(parseInt(e.target.value))}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '15px', boxSizing: 'border-box' }}
            />
          </div>

          {error && <p style={{ color: 'red', marginBottom: '16px' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setView('list')}
              style={{ flex: 1, padding: '12px', background: '#f1f1f1', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              Avbryt
            </button>
            <button
              onClick={createHousehold}
              disabled={saving || !householdName}
              style={{ flex: 2, padding: '12px', background: '#000', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              {saving ? 'Skapar...' : 'Skapa hushåll'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}