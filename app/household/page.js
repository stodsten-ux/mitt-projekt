'use client'

import { useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Spinner from '../../components/Spinner'
import { useHousehold } from '../../lib/hooks/useHousehold'

const supabase = createClient()

const inputStyle = { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '15px', boxSizing: 'border-box', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none' }

export default function HouseholdPage() {
  const { user, allMemberships, isLoading: loading, mutate } = useHousehold({ redirectTo: 'login' })
  const [view, setView] = useState('list')
  const [householdName, setHouseholdName] = useState('')
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(0)
  const [budget, setBudget] = useState(2000)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()

  async function createHousehold() {
    setSaving(true)
    setError(null)
    const { data: household, error: hError } = await supabase
      .from('households')
      .insert({ name: householdName, display_name: householdName, adults, children, weekly_budget: budget, created_by: user.id })
      .select()
      .single()
    if (hError) { setError(hError.message); setSaving(false); return }
    await supabase.from('household_members').insert({ household_id: household.id, user_id: user.id, role: 'admin' })
    await supabase.from('household_preferences').insert({ household_id: household.id, allergies: [], diet_preferences: [], favorite_foods: [], disliked_foods: [] })
    await mutate()
    router.push(`/household/${household.id}`)
  }

  if (loading) return <div className="loading-screen"><Spinner />Laddar...</div>

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 20px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '32px', color: 'var(--text)' }}>🏠 Mina hushåll</h1>

      {/* Lista befintliga hushåll */}
      {allMemberships.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          {allMemberships.map((m) => (
            <Link
              key={m.household_id}
              href={`/household/${m.household_id}`}
              style={{ display: 'block', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '10px', textDecoration: 'none', color: 'var(--text)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ marginBottom: '4px', fontSize: '16px', fontWeight: '600' }}>{m.households?.display_name || m.households?.name}</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                    {m.households?.adults} vuxna · {m.households?.children} barn · {m.households?.weekly_budget} kr/vecka
                  </p>
                </div>
                <span style={{ background: m.role === 'admin' ? 'var(--accent)' : 'var(--bg-card)', color: m.role === 'admin' ? 'var(--accent-text)' : 'var(--text-muted)', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: '20px', fontSize: '12px' }}>
                  {m.role === 'admin' ? 'Admin' : 'Medlem'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Knapp: skapa */}
      {view === 'list' && (
        <button
          onClick={() => setView('create')}
          style={{ width: '100%', padding: '14px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '15px', fontWeight: '600' }}
        >
          + Skapa hushåll
        </button>
      )}

      {/* Formulär: skapa hushåll */}
      {view === 'create' && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '28px' }}>
          <h2 style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--text)' }}>Skapa nytt hushåll</h2>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px', color: 'var(--text)' }}>Hushållets namn</label>
            <input type="text" value={householdName} onChange={(e) => setHouseholdName(e.target.value)} placeholder="t.ex. Familjen Hallgren" style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px', color: 'var(--text)' }}>Antal vuxna</label>
              <input type="number" value={adults} min={1} onChange={(e) => setAdults(parseInt(e.target.value))} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px', color: 'var(--text)' }}>Antal barn</label>
              <input type="number" value={children} min={0} onChange={(e) => setChildren(parseInt(e.target.value))} style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px', color: 'var(--text)' }}>Veckbudget (kr)</label>
            <input type="number" value={budget} min={0} step={100} onChange={(e) => setBudget(parseInt(e.target.value))} style={inputStyle} />
          </div>

          {error && <p style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '16px', padding: '10px 12px', background: 'rgba(255,59,48,0.08)', borderRadius: '8px' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => setView('list')} style={{ flex: 1, padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text)', fontSize: '14px' }}>
              Avbryt
            </button>
            <button onClick={createHousehold} disabled={saving || !householdName} style={{ flex: 2, padding: '12px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
              {saving ? <><Spinner />&nbsp;Skapar...</> : 'Skapa hushåll'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
