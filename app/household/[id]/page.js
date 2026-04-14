'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Spinner from '../../../components/Spinner'
import HouseholdDetailSkeleton from '../../../components/skeletons/HouseholdDetailSkeleton'

const supabase = createClient()

const STORES = ['ICA', 'Willys', 'Coop', 'Lidl', 'Hemköp', 'Mathem', 'Citygross', 'Netto']

const HOUSEHOLD_TYPES = [
  { value: 'barnfamilj', label: '👨‍👩‍👧‍👦 Barnfamilj' },
  { value: 'par', label: '👫 Par' },
  { value: 'singel', label: '🧑 Singel' },
  { value: 'storformat', label: '🏠 Storformat' },
  { value: 'senior', label: '👴 Senior' },
]

function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(18)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  fontSize: '14px',
  boxSizing: 'border-box',
  background: 'var(--input-bg)',
  color: 'var(--text)',
  outline: 'none',
}

export default function HouseholdDetailPage() {
  const [household, setHousehold] = useState(null)
  const [preferences, setPreferences] = useState(null)
  const [members, setMembers] = useState([])
  const [pendingInvites, setPendingInvites] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [memberEmails, setMemberEmails] = useState({})
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [sendingInvite, setSendingInvite] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const router = useRouter()
  const { id } = useParams()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setCurrentUser(user)

      const { data: h } = await supabase.from('households').select('*').eq('id', id).single()
      setHousehold(h)

      const { data: prefs } = await supabase.from('household_preferences').select('*').eq('household_id', id).single()
      setPreferences(prefs || {
        allergies: [], diet_preferences: [], favorite_foods: [], disliked_foods: [],
        portion_modifier: 1.0, diverse_menu: true, theme: 'system', preferred_stores: [], store_split: {},
      })

      const { data: m } = await supabase.from('household_members').select('*').eq('household_id', id)
      setMembers(m || [])
      const myMember = m?.find(mem => mem.user_id === user.id)
      setRole(myMember?.role)

      const { data: invites } = await supabase.from('household_invites').select('*').eq('household_id', id).eq('accepted', false).order('id', { ascending: false })
      setPendingInvites(invites || [])

      // Bygg upp user_id → email från accepterade inbjudningar (om möjligt via invited email-match)
      // Fallback: visa e-post för inloggad användare, "Anonym Medlem" för övriga
      setMemberEmails({ [user.id]: user.email })
      setLoading(false)
    }
    load()
  }, [id, router])

  async function savePreferences() {
    setSaving(true)
    await supabase.from('household_preferences').upsert({
      household_id: id,
      ...preferences,
      updated_at: new Date().toISOString(),
    })
    await supabase.from('households').update({
      adults: household.adults,
      children: household.children,
      weekly_budget: household.weekly_budget,
      household_type: household.household_type,
      location_city: household.location_city || null,
    }).eq('id', id)
    setSaving(false)
    alert('Sparat!')
  }

  async function sendInvite() {
    if (!inviteEmail) return
    setSendingInvite(true)
    const token = generateToken()
    const expires = new Date()
    expires.setDate(expires.getDate() + 7)
    await supabase.from('household_invites').insert({ household_id: id, email: inviteEmail, token, accepted: false, expires_at: expires.toISOString() })
    setInviteLink(`${window.location.origin}/invite/${token}`)
    setInviteEmail('')
    const { data: invites } = await supabase.from('household_invites').select('*').eq('household_id', id).eq('accepted', false).order('id', { ascending: false })
    setPendingInvites(invites || [])
    setSendingInvite(false)
  }

  async function deleteAccount() {
    if (!confirm('Är du helt säker? Detta raderar ditt konto och ALL din data permanent. Åtgärden kan inte ångras.')) return
    setDeletingAccount(true)
    const res = await fetch('/api/account/delete', { method: 'DELETE' })
    const data = await res.json()
    if (data.success) {
      await supabase.auth.signOut()
      router.push('/auth/login')
    } else {
      alert(`Kunde inte radera kontot: ${data.error}`)
      setDeletingAccount(false)
    }
  }

  async function cancelInvite(inviteId) {
    await supabase.from('household_invites').delete().eq('id', inviteId)
    setPendingInvites(prev => prev.filter(i => i.id !== inviteId))
  }

  function updateArrayPref(key, value) {
    const arr = value.split(',').map(s => s.trim()).filter(Boolean)
    setPreferences(prev => ({ ...prev, [key]: arr }))
  }

  function toggleStore(store) {
    const current = preferences.preferred_stores || []
    const updated = current.includes(store)
      ? current.filter(s => s !== store)
      : [...current, store]
    // Ta bort store_split för avmarkerade butiker
    const newSplit = { ...(preferences.store_split || {}) }
    if (current.includes(store)) delete newSplit[store]
    setPreferences(prev => ({ ...prev, preferred_stores: updated, store_split: newSplit }))
  }

  function updateStoreSplit(store, value) {
    const pct = Math.max(0, Math.min(100, parseInt(value) || 0))
    setPreferences(prev => ({ ...prev, store_split: { ...(prev.store_split || {}), [store]: pct } }))
  }

  if (loading) return <HouseholdDetailSkeleton />
  if (!household) return <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Hushållet hittades inte.</div>

  const tabs = ['overview', 'preferences', 'members']
  const tabLabels = { overview: '📋 Översikt', preferences: '⚙️ Preferenser', members: '👥 Medlemmar' }

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '40px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)' }}>{household.display_name || household.name}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            {household.adults} vuxna · {household.children} barn · {household.weekly_budget} kr/vecka
          </p>
        </div>
        <Link href="/household" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '14px' }}>← Tillbaka</Link>
      </div>

      {/* Flikar */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid var(--border)' }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '10px 16px', background: 'none', border: 'none', borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent', cursor: 'pointer', fontWeight: activeTab === tab ? '600' : '400', fontSize: '14px', color: activeTab === tab ? 'var(--text)' : 'var(--text-muted)' }}>
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {/* Översikt */}
      {activeTab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Vuxna', value: household.adults },
              { label: 'Barn', value: household.children },
              { label: 'Veckbudget', value: `${household.weekly_budget} kr` },
              { label: 'Medlemmar', value: members.length },
            ].map(item => (
              <div key={item.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '4px' }}>{item.label}</p>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)' }}>{item.value}</p>
              </div>
            ))}
          </div>
          {preferences && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ marginBottom: '12px', color: 'var(--text)', fontSize: '15px', fontWeight: '600' }}>Hushållets preferenser</h3>
              {preferences.allergies?.length > 0 && <p style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--text)' }}><strong>Allergier:</strong> {preferences.allergies.join(', ')}</p>}
              {preferences.diet_preferences?.length > 0 && <p style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--text)' }}><strong>Kostpreferenser:</strong> {preferences.diet_preferences.join(', ')}</p>}
              {preferences.favorite_foods?.length > 0 && <p style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--text)' }}><strong>Favoriträtter:</strong> {preferences.favorite_foods.join(', ')}</p>}
              {preferences.disliked_foods?.length > 0 && <p style={{ fontSize: '14px', color: 'var(--text)' }}><strong>Undviker:</strong> {preferences.disliked_foods.join(', ')}</p>}
              {preferences.preferred_stores?.length > 0 && <p style={{ fontSize: '14px', marginTop: '8px', color: 'var(--text)' }}><strong>Butiker:</strong> {preferences.preferred_stores.join(', ')}</p>}
              {!preferences.allergies?.length && !preferences.diet_preferences?.length && !preferences.favorite_foods?.length && !preferences.disliked_foods?.length && (
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Inga preferenser inställda. <button onClick={() => setActiveTab('preferences')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', textDecoration: 'underline', fontSize: '14px', padding: 0 }}>Lägg till</button></p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Preferenser */}
      {activeTab === 'preferences' && (
        <div>
          {/* Hushållstyp */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px', color: 'var(--text)' }}>Hushållstyp</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {HOUSEHOLD_TYPES.map(type => (
                <button
                  key={type.value}
                  onClick={() => setHousehold(prev => ({ ...prev, household_type: type.value }))}
                  style={{ padding: '8px 14px', background: household.household_type === type.value ? 'var(--accent)' : 'var(--bg-card)', color: household.household_type === type.value ? 'var(--accent-text)' : 'var(--text)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hushållsstorlek & budget */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px', color: 'var(--text)' }}>Vuxna</label>
              <input type="number" value={household.adults} min={1} onChange={e => setHousehold(prev => ({ ...prev, adults: parseInt(e.target.value) }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px', color: 'var(--text)' }}>Barn</label>
              <input type="number" value={household.children} min={0} onChange={e => setHousehold(prev => ({ ...prev, children: parseInt(e.target.value) }))} style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px', color: 'var(--text)' }}>Veckbudget (kr)</label>
            <input type="number" value={household.weekly_budget} min={0} step={100} onChange={e => setHousehold(prev => ({ ...prev, weekly_budget: parseInt(e.target.value) }))} style={inputStyle} />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px', color: 'var(--text)' }}>Stad / område</label>
            <input type="text" value={household.location_city || ''} onChange={e => setHousehold(prev => ({ ...prev, location_city: e.target.value }))} placeholder="T.ex. Stockholm, Göteborg..." style={inputStyle} />
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Används för att hitta närmaste butiker</p>
          </div>

          {/* Kostpreferenser */}
          {[
            { key: 'allergies', label: 'Allergier & intoleranser', placeholder: 't.ex. jordnötter, laktos, gluten' },
            { key: 'diet_preferences', label: 'Kostpreferenser', placeholder: 't.ex. vegetarisk, halal, glutenfritt' },
            { key: 'favorite_foods', label: 'Favoriträtter', placeholder: 't.ex. tacos, pasta, sushi' },
            { key: 'disliked_foods', label: 'Undviker', placeholder: 't.ex. fisk, lever, brysselkål' },
          ].map(field => (
            <div key={field.key} style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px', color: 'var(--text)' }}>{field.label}</label>
              <input
                type="text"
                defaultValue={preferences?.[field.key]?.join(', ')}
                onBlur={e => updateArrayPref(field.key, e.target.value)}
                placeholder={field.placeholder}
                style={inputStyle}
              />
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Separera med komma</p>
            </div>
          ))}

          {/* Portionsjustering */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px', color: 'var(--text)' }}>
              Portionsstorlek — {Math.round((preferences.portion_modifier || 1.0) * 100)}%
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.25"
              value={preferences.portion_modifier || 1.0}
              onChange={e => setPreferences(prev => ({ ...prev, portion_modifier: parseFloat(e.target.value) }))}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>50% (liten)</span><span>100% (standard)</span><span>200% (stor)</span>
            </div>
          </div>

          {/* Menydiversifiering */}
          <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
            <div>
              <p style={{ fontWeight: '500', fontSize: '14px', color: 'var(--text)', marginBottom: '2px' }}>Variera menyn</p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>AI undviker samma proteinkälla två dagar i rad</p>
            </div>
            <button
              onClick={() => setPreferences(prev => ({ ...prev, diverse_menu: !prev.diverse_menu }))}
              style={{ width: '44px', height: '26px', borderRadius: '13px', background: preferences.diverse_menu ? 'var(--success)' : 'var(--border)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
            >
              <span style={{ position: 'absolute', top: '3px', width: '20px', height: '20px', background: 'white', borderRadius: '50%', transition: 'left 0.2s', left: preferences.diverse_menu ? '21px' : '3px' }} />
            </button>
          </div>

          {/* Favoritbutiker */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px', color: 'var(--text)' }}>Favoritbutiker</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {STORES.map(store => {
                const selected = (preferences.preferred_stores || []).includes(store)
                return (
                  <button
                    key={store}
                    onClick={() => toggleStore(store)}
                    style={{ padding: '7px 14px', background: selected ? 'var(--accent)' : 'var(--bg-card)', color: selected ? 'var(--accent-text)' : 'var(--text)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
                  >
                    {store}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Fördelning per butik */}
          {(preferences.preferred_stores || []).length >= 2 && (
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '14px', color: 'var(--text)' }}>Handelsfördelning (%)</label>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>Hur stor andel av inköpen gör du i varje butik?</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(preferences.preferred_stores || []).map(store => (
                  <div key={store} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ width: '80px', fontSize: '14px', color: 'var(--text)', flexShrink: 0 }}>{store}</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={(preferences.store_split || {})[store] || 0}
                      onChange={e => updateStoreSplit(store, e.target.value)}
                      style={{ flex: 1, accentColor: 'var(--accent)' }}
                    />
                    <span style={{ width: '40px', textAlign: 'right', fontSize: '14px', color: 'var(--text-muted)', flexShrink: 0 }}>
                      {(preferences.store_split || {})[store] || 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={savePreferences} disabled={saving} style={{ width: '100%', padding: '14px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '15px', fontWeight: '600' }}>
            {saving ? <><Spinner />&nbsp;Sparar...</> : 'Spara preferenser'}
          </button>
        </div>
      )}

      {/* Medlemmar */}
      {activeTab === 'members' && (
        <div>
          <div style={{ marginBottom: '24px' }}>
            {members.map(member => (
              <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', marginBottom: '8px' }}>
                <p style={{ fontSize: '14px', color: 'var(--text)' }}>
                  {memberEmails[member.user_id]
                    ? <>{memberEmails[member.user_id]} {member.user_id === currentUser?.id && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>(du)</span>}</>
                    : <span style={{ color: 'var(--text-muted)' }}>Anonym Medlem</span>
                  }
                </p>
                <span style={{ background: member.role === 'admin' ? 'var(--accent)' : 'var(--bg)', color: member.role === 'admin' ? 'var(--accent-text)' : 'var(--text-muted)', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: '20px', fontSize: '12px' }}>
                  {member.role === 'admin' ? 'Admin' : 'Medlem'}
                </span>
              </div>
            ))}
          </div>

          {role === 'admin' && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '16px', fontSize: '15px', fontWeight: '600', color: 'var(--text)' }}>Bjud in medlem</h3>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') sendInvite() }}
                placeholder="mejladress@exempel.se"
                style={{ ...inputStyle, marginBottom: '12px' }}
              />
              <button onClick={sendInvite} disabled={sendingInvite || !inviteEmail} style={{ width: '100%', padding: '12px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                {sendingInvite ? 'Skapar inbjudan...' : 'Skapa inbjudningslänk'}
              </button>
              {inviteLink && (
                <div style={{ marginTop: '16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Kopiera och skicka denna länk:</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input readOnly value={inviteLink} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-card)' }} />
                    <button onClick={() => { navigator.clipboard.writeText(inviteLink); alert('Länk kopierad!') }} style={{ padding: '8px 14px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>
                      Kopiera
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {role === 'admin' && pendingInvites.length > 0 && (
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '10px' }}>Väntande inbjudningar</h3>
              {pendingInvites.map(inv => (
                <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'rgba(255,149,0,0.06)', border: '1px solid var(--warning)', borderRadius: '8px', marginBottom: '8px' }}>
                  <div>
                    <p style={{ fontSize: '14px', color: 'var(--text)' }}>{inv.email}</p>
                    {inv.expires_at && <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Går ut {new Date(inv.expires_at).toLocaleDateString('sv-SE')}</p>}
                  </div>
                  <button onClick={() => cancelInvite(inv.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '18px', lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--danger)', marginBottom: '8px' }}>Farlig zon</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Att radera ditt konto tar bort all din data permanent och kan inte ångras.
            </p>
            <button
              onClick={deleteAccount}
              disabled={deletingAccount}
              style={{ padding: '11px 20px', background: 'rgba(217,79,59,0.06)', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
            >
              {deletingAccount ? 'Raderar...' : 'Radera mitt konto'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
