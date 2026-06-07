'use client'

import { useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Baby, House, Plus, UsersRound, WalletCards } from 'lucide-react'
import EmptyState from '../../components/EmptyState'
import Notice from '../../components/Notice'
import Spinner from '../../components/Spinner'
import SubpageHeader from '../../components/SubpageHeader'
import HouseholdSkeleton from '../../components/skeletons/HouseholdSkeleton'
import { useHousehold } from '../../lib/hooks/useHousehold'

const supabase = createClient()

const inputStyle = { width: '100%', padding: 'var(--space-lg)', borderRadius: 'var(--radius-sm)', border: 'var(--border-width-sm) solid var(--border)', fontSize: 'var(--text-base)', boxSizing: 'border-box', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none' }

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

  if (loading) return <HouseholdSkeleton />

  return (
    <div className="page animate-fade-in">
      <SubpageHeader
        eyebrow="Inställningar"
        title="Mina hushåll"
        icon={House}
        backHref="/"
        backLabel="Hem"
      />

      {/* Lista befintliga hushåll */}
      {allMemberships.length > 0 && (
        <div style={{ marginBottom: 'var(--radius-xl)' }}>
          {allMemberships.map((m) => (
            <Link
              key={m.household_id}
              href={`/household/${m.household_id}`}
              className="household-list-item"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ marginBottom: 'var(--space-xs)', fontSize: 'var(--text-base)', fontWeight: '600', color: 'var(--text)' }}>{m.households?.display_name || m.households?.name}</h2>
                  <p style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-10)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-xs)' }}><UsersRound size={13} aria-hidden="true" /> {m.households?.adults} vuxna</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-xs)' }}><Baby size={13} aria-hidden="true" /> {m.households?.children} barn</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-xs)' }}><WalletCards size={13} aria-hidden="true" /> {m.households?.weekly_budget} kr/vecka</span>
                  </p>
                </div>
                <span className={`role-badge ${m.role === 'admin' ? 'role-badge--admin' : 'role-badge--member'}`}>
                  {m.role === 'admin' ? 'Admin' : 'Medlem'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Tom lista */}
      {allMemberships.length === 0 && view === 'list' && (
        <EmptyState
          icon={House}
          title="Inga hushåll än"
          primaryAction={(
            <button
              onClick={() => setView('create')}
              className="btn-primary"
            >
              <Plus size={17} aria-hidden="true" />
              Skapa hushåll
            </button>
          )}
        >
          Skapa ditt första hushåll för att komma igång med matsedel, inköp och skafferi.
        </EmptyState>
      )}

      {/* Knapp: skapa (när det redan finns hushåll) */}
      {view === 'list' && allMemberships.length > 0 && (
        <button
          onClick={() => setView('create')}
          className="btn-primary"
          style={{ width: '100%' }}
        >
          <Plus size={17} aria-hidden="true" />
          Skapa hushåll
        </button>
      )}

      {/* Formulär: skapa hushåll */}
      {view === 'create' && (
        <div style={{ background: 'var(--bg-card)', border: 'var(--border-width-sm) solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-28)' }}>
          <h2 style={{ marginBottom: 'var(--space-2xl)', fontSize: 'var(--text-lg)', fontWeight: '600', color: 'var(--text)' }}>Skapa nytt hushåll</h2>

          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <label style={{ display: 'block', marginBottom: 'var(--space-sm)', fontWeight: '500', fontSize: 'var(--text-sm)', color: 'var(--text)' }}>Hushållets namn</label>
            <input type="text" value={householdName} onChange={(e) => setHouseholdName(e.target.value)} placeholder="t.ex. Familjen Hallgren" style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-sm)', fontWeight: '500', fontSize: 'var(--text-sm)', color: 'var(--text)' }}>Antal vuxna</label>
              <input type="number" value={adults} min={1} onChange={(e) => setAdults(parseInt(e.target.value))} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-sm)', fontWeight: '500', fontSize: 'var(--text-sm)', color: 'var(--text)' }}>Antal barn</label>
              <input type="number" value={children} min={0} onChange={(e) => setChildren(parseInt(e.target.value))} style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 'var(--space-2xl)' }}>
            <label style={{ display: 'block', marginBottom: 'var(--space-sm)', fontWeight: '500', fontSize: 'var(--text-sm)', color: 'var(--text)' }}>Veckbudget (kr)</label>
            <input type="number" value={budget} min={0} step={100} onChange={(e) => setBudget(parseInt(e.target.value))} style={inputStyle} />
          </div>

          {error && (
            <Notice type="error" style={{ marginBottom: 'var(--space-xl)' }}>
              {error}
            </Notice>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-lg)' }}>
            <button onClick={() => setView('list')} className="btn-ghost" style={{ flex: 1 }}>
              Avbryt
            </button>
            <button onClick={createHousehold} disabled={saving || !householdName} className="btn-primary" style={{ flex: 2 }}>
              {saving ? <><Spinner />&nbsp;Skapar...</> : 'Skapa hushåll'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
