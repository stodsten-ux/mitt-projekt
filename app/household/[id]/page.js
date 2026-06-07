'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { ClipboardList, Home, Settings, User, UsersRound } from 'lucide-react'
import ConfirmPanel from '../../../components/ConfirmPanel'
import Notice from '../../../components/Notice'
import Spinner from '../../../components/Spinner'
import SubpageHeader from '../../../components/SubpageHeader'
import HouseholdDetailSkeleton from '../../../components/skeletons/HouseholdDetailSkeleton'

const supabase = createClient()

const STORES = ['ICA', 'Willys', 'Coop', 'Lidl', 'Hemköp', 'Mathem', 'Citygross', 'Netto']

const HOUSEHOLD_TYPES = [
  { value: 'barnfamilj', label: 'Barnfamilj', icon: UsersRound },
  { value: 'par', label: 'Par', icon: UsersRound },
  { value: 'singel', label: 'Singel', icon: User },
  { value: 'storformat', label: 'Storformat', icon: Home },
  { value: 'senior', label: 'Senior', icon: User },
]

function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(18)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

const inputStyle = {
  width: '100%',
  padding: 'var(--space-10) var(--space-lg)',
  borderRadius: 'var(--radius-sm)',
  border: 'var(--border-width-sm) solid var(--border)',
  fontSize: 'var(--text-sm)',
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
  const [notice, setNotice] = useState(null)
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false)
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
    setNotice(null)
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
    setNotice({ type: 'success', text: 'Sparat.' })
  }

  async function sendInvite() {
    if (!inviteEmail) return
    setSendingInvite(true)
    setNotice(null)
    const token = generateToken()
    const expires = new Date()
    expires.setDate(expires.getDate() + 7)

    const { error } = await supabase.rpc('create_household_invite', {
      p_household_id: id,
      p_email: inviteEmail,
      p_token: token,
      p_expires_at: expires.toISOString(),
    })

    if (error) {
      console.error('create invite failed:', error.message)
      setNotice({ type: 'error', text: 'Kunde inte skapa inbjudan. Kontrollera mejladressen och att du är admin.' })
      setSendingInvite(false)
      return
    }

    setInviteLink(`${window.location.origin}/invite/${token}`)
    setInviteEmail('')
    const { data: invites } = await supabase.from('household_invites').select('*').eq('household_id', id).eq('accepted', false).order('id', { ascending: false })
    setPendingInvites(invites || [])
    setSendingInvite(false)
  }

  async function deleteAccount() {
    setDeletingAccount(true)
    setNotice(null)
    const res = await fetch('/api/account/delete', { method: 'DELETE' })
    const data = await res.json()
    if (data.success) {
      await supabase.auth.signOut()
      router.push('/auth/login')
    } else {
      setNotice({ type: 'error', text: `Kunde inte radera kontot: ${data.error}` })
      setDeletingAccount(false)
      setConfirmDeleteAccount(false)
    }
  }

  async function cancelInvite(inviteId) {
    const { error } = await supabase.rpc('cancel_household_invite', {
      p_invite_id: inviteId,
    })
    if (error) {
      console.error('cancel invite failed:', error.message)
      setNotice({ type: 'error', text: 'Kunde inte ta bort inbjudan.' })
      return
    }
    setPendingInvites(prev => prev.filter(i => i.id !== inviteId))
  }

  async function copyInviteLink() {
    await navigator.clipboard.writeText(inviteLink)
    setNotice({ type: 'success', text: 'Inbjudningslänken kopierades.' })
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
  if (!household) return <div style={{ padding: 'var(--space-40)', color: 'var(--text-muted)' }}>Hushållet hittades inte.</div>

  const tabs = [
    { key: 'overview', label: 'Översikt', icon: ClipboardList },
    { key: 'preferences', label: 'Preferenser', icon: Settings },
    { key: 'members', label: 'Medlemmar', icon: UsersRound },
  ]

  return (
    <div className="page animate-fade-in">
      <SubpageHeader
        eyebrow="Hushåll"
        title={household.display_name || household.name}
        icon={Home}
        backHref="/household"
        backLabel="Mina hushåll"
        stats={[
          { value: household.adults, label: 'Vuxna' },
          { value: household.children, label: 'Barn' },
          { value: `${household.weekly_budget} kr`, label: 'Veckbudget' },
        ]}
      />

      {notice && (
        <Notice type={notice.type}>
          {notice.text}
        </Notice>
      )}

      {/* Flikar */}
      <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-2xl)', borderBottom: 'var(--border-width-sm) solid var(--border)' }}>
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ padding: 'var(--space-10) var(--space-xl)', background: 'none', border: 'none', borderBottom: activeTab === tab.key ? 'var(--border-width-md) solid var(--accent)' : 'var(--border-width-md) solid transparent', cursor: 'pointer', fontWeight: activeTab === tab.key ? '600' : '400', fontSize: 'var(--text-sm)', color: activeTab === tab.key ? 'var(--text)' : 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <Icon size={15} aria-hidden="true" />
            {tab.label}
          </button>
          )
        })}
      </div>

      {/* Översikt */}
      {activeTab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xl)', marginBottom: 'var(--space-2xl)' }}>
            {[
              { label: 'Vuxna', value: household.adults },
              { label: 'Barn', value: household.children },
              { label: 'Veckbudget', value: `${household.weekly_budget} kr` },
              { label: 'Medlemmar', value: members.length },
            ].map(item => (
              <div key={item.label} style={{ background: 'var(--bg-card)', border: 'var(--border-width-sm) solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-20)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-xs)' }}>{item.label}</p>
                <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--text)' }}>{item.value}</p>
              </div>
            ))}
          </div>
          {preferences && (
            <div style={{ background: 'var(--bg-card)', border: 'var(--border-width-sm) solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-20)' }}>
              <h3 style={{ marginBottom: 'var(--space-lg)', color: 'var(--text)', fontSize: 'var(--text-base)', fontWeight: '600' }}>Hushållets preferenser</h3>
              {preferences.allergies?.length > 0 && <p style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-md)', color: 'var(--text)' }}><strong>Allergier:</strong> {preferences.allergies.join(', ')}</p>}
              {preferences.diet_preferences?.length > 0 && <p style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-md)', color: 'var(--text)' }}><strong>Kostpreferenser:</strong> {preferences.diet_preferences.join(', ')}</p>}
              {preferences.favorite_foods?.length > 0 && <p style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-md)', color: 'var(--text)' }}><strong>Favoriträtter:</strong> {preferences.favorite_foods.join(', ')}</p>}
              {preferences.disliked_foods?.length > 0 && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text)' }}><strong>Undviker:</strong> {preferences.disliked_foods.join(', ')}</p>}
              {preferences.preferred_stores?.length > 0 && <p style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-md)', color: 'var(--text)' }}><strong>Butiker:</strong> {preferences.preferred_stores.join(', ')}</p>}
              {!preferences.allergies?.length && !preferences.diet_preferences?.length && !preferences.favorite_foods?.length && !preferences.disliked_foods?.length && (
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Inga preferenser inställda. <button onClick={() => setActiveTab('preferences')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', textDecoration: 'underline', fontSize: 'var(--text-sm)', padding: 0 }}>Lägg till</button></p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Preferenser */}
      {activeTab === 'preferences' && (
        <div>
          {/* Hushållstyp */}
          <div style={{ marginBottom: 'var(--space-20)' }}>
            <label style={{ display: 'block', marginBottom: 'var(--space-md)', fontWeight: '500', fontSize: 'var(--text-sm)', color: 'var(--text)' }}>Hushållstyp</label>
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              {HOUSEHOLD_TYPES.map(type => {
                const Icon = type.icon
                return (
                <button
                  key={type.value}
                  onClick={() => setHousehold(prev => ({ ...prev, household_type: type.value }))}
                  style={{ minHeight: 'var(--space-40)', padding: 'var(--space-md) var(--space-14)', background: household.household_type === type.value ? 'var(--accent)' : 'var(--bg-card)', color: household.household_type === type.value ? 'var(--accent-text)' : 'var(--text)', border: 'var(--border-width-sm) solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 'var(--text-sm)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)' }}
                >
                  <Icon size={15} aria-hidden="true" />
                  {type.label}
                </button>
                )
              })}
            </div>
          </div>

          {/* Hushållsstorlek & budget */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)', marginBottom: 'var(--space-20)' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-sm)', fontWeight: '500', fontSize: 'var(--text-sm)', color: 'var(--text)' }}>Vuxna</label>
              <input type="number" value={household.adults} min={1} onChange={e => setHousehold(prev => ({ ...prev, adults: parseInt(e.target.value) }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-sm)', fontWeight: '500', fontSize: 'var(--text-sm)', color: 'var(--text)' }}>Barn</label>
              <input type="number" value={household.children} min={0} onChange={e => setHousehold(prev => ({ ...prev, children: parseInt(e.target.value) }))} style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: 'var(--space-20)' }}>
            <label style={{ display: 'block', marginBottom: 'var(--space-sm)', fontWeight: '500', fontSize: 'var(--text-sm)', color: 'var(--text)' }}>Veckbudget (kr)</label>
            <input type="number" value={household.weekly_budget} min={0} step={100} onChange={e => setHousehold(prev => ({ ...prev, weekly_budget: parseInt(e.target.value) }))} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 'var(--space-20)' }}>
            <label style={{ display: 'block', marginBottom: 'var(--space-sm)', fontWeight: '500', fontSize: 'var(--text-sm)', color: 'var(--text)' }}>Stad / område</label>
            <input type="text" value={household.location_city || ''} onChange={e => setHousehold(prev => ({ ...prev, location_city: e.target.value }))} placeholder="T.ex. Stockholm, Göteborg..." style={inputStyle} />
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>Används för att hitta närmaste butiker</p>
          </div>

          {/* Kostpreferenser */}
          {[
            { key: 'allergies', label: 'Allergier & intoleranser', placeholder: 't.ex. jordnötter, laktos, gluten' },
            { key: 'diet_preferences', label: 'Kostpreferenser', placeholder: 't.ex. vegetarisk, halal, glutenfritt' },
            { key: 'favorite_foods', label: 'Favoriträtter', placeholder: 't.ex. tacos, pasta, sushi' },
            { key: 'disliked_foods', label: 'Undviker', placeholder: 't.ex. fisk, lever, brysselkål' },
          ].map(field => (
            <div key={field.key} style={{ marginBottom: 'var(--space-xl)' }}>
              <label style={{ display: 'block', marginBottom: 'var(--space-sm)', fontWeight: '500', fontSize: 'var(--text-sm)', color: 'var(--text)' }}>{field.label}</label>
              <input
                type="text"
                defaultValue={preferences?.[field.key]?.join(', ')}
                onBlur={e => updateArrayPref(field.key, e.target.value)}
                placeholder={field.placeholder}
                style={inputStyle}
              />
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>Separera med komma</p>
            </div>
          ))}

          {/* Portionsjustering */}
          <div style={{ marginBottom: 'var(--space-20)' }}>
            <label style={{ display: 'block', marginBottom: 'var(--space-sm)', fontWeight: '500', fontSize: 'var(--text-sm)', color: 'var(--text)' }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>
              <span>50% (liten)</span><span>100% (standard)</span><span>200% (stor)</span>
            </div>
          </div>

          {/* Menydiversifiering */}
          <div style={{ marginBottom: 'var(--space-20)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', border: 'var(--border-width-sm) solid var(--border)', borderRadius: 'var(--space-10)', padding: 'var(--space-14) var(--space-xl)' }}>
            <div>
              <p style={{ fontWeight: '500', fontSize: 'var(--text-sm)', color: 'var(--text)', marginBottom: 'var(--space-xxs)' }}>Variera menyn</p>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>AI undviker samma proteinkälla två dagar i rad</p>
            </div>
            <button
              onClick={() => setPreferences(prev => ({ ...prev, diverse_menu: !prev.diverse_menu }))}
              style={{ width: 'var(--space-44)', height: 'var(--space-26)', borderRadius: 'var(--space-13)', background: preferences.diverse_menu ? 'var(--success)' : 'var(--border)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
            >
              <span style={{ position: 'absolute', top: 'var(--space-3xs)', width: 'var(--space-20)', height: 'var(--space-20)', background: 'var(--bg-card)', borderRadius: '50%', transition: 'left 0.2s', left: preferences.diverse_menu ? 'var(--space-21)' : 'var(--space-3xs)' }} />
            </button>
          </div>

          {/* Favoritbutiker */}
          <div style={{ marginBottom: 'var(--space-2xl)' }}>
            <label style={{ display: 'block', marginBottom: 'var(--space-md)', fontWeight: '500', fontSize: 'var(--text-sm)', color: 'var(--text)' }}>Favoritbutiker</label>
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              {STORES.map(store => {
                const selected = (preferences.preferred_stores || []).includes(store)
                return (
                  <button
                    key={store}
                    onClick={() => toggleStore(store)}
                    style={{ padding: 'var(--space-7) var(--space-14)', background: selected ? 'var(--accent)' : 'var(--bg-card)', color: selected ? 'var(--accent-text)' : 'var(--text)', border: 'var(--border-width-sm) solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 'var(--text-sm)' }}
                  >
                    {store}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Fördelning per butik */}
          {(preferences.preferred_stores || []).length >= 2 && (
            <div style={{ marginBottom: 'var(--space-2xl)' }}>
              <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: '500', fontSize: 'var(--text-sm)', color: 'var(--text)' }}>Handelsfördelning (%)</label>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }}>Hur stor andel av inköpen gör du i varje butik?</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-10)' }}>
                {(preferences.preferred_stores || []).map(store => (
                  <div key={store} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
                    <span style={{ width: 'var(--space-80)', fontSize: 'var(--text-sm)', color: 'var(--text)', flexShrink: 0 }}>{store}</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={(preferences.store_split || {})[store] || 0}
                      onChange={e => updateStoreSplit(store, e.target.value)}
                      style={{ flex: 1, accentColor: 'var(--accent)' }}
                    />
                    <span style={{ width: 'var(--space-40)', textAlign: 'right', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', flexShrink: 0 }}>
                      {(preferences.store_split || {})[store] || 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={savePreferences} disabled={saving} style={{ width: '100%', padding: 'var(--space-14)', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: 'var(--space-10)', cursor: 'pointer', fontSize: 'var(--text-base)', fontWeight: '600' }}>
            {saving ? <><Spinner />&nbsp;Sparar...</> : 'Spara preferenser'}
          </button>
        </div>
      )}

      {/* Medlemmar */}
      {activeTab === 'members' && (
        <div>
          <div style={{ marginBottom: 'var(--space-2xl)' }}>
            {members.map(member => (
              <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-14) var(--space-xl)', background: 'var(--bg-card)', border: 'var(--border-width-sm) solid var(--border)', borderRadius: 'var(--space-10)', marginBottom: 'var(--space-md)' }}>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text)' }}>
                  {memberEmails[member.user_id]
                    ? <>{memberEmails[member.user_id]} {member.user_id === currentUser?.id && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>(du)</span>}</>
                    : <span style={{ color: 'var(--text-muted)' }}>Anonym Medlem</span>
                  }
                </p>
                <span style={{ background: member.role === 'admin' ? 'var(--accent)' : 'var(--bg)', color: member.role === 'admin' ? 'var(--accent-text)' : 'var(--text-muted)', border: 'var(--border-width-sm) solid var(--border)', padding: 'var(--space-xs) var(--space-10)', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)' }}>
                  {member.role === 'admin' ? 'Admin' : 'Medlem'}
                </span>
              </div>
            ))}
          </div>

          {role === 'admin' && (
            <div style={{ background: 'var(--bg-card)', border: 'var(--border-width-sm) solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-20)', marginBottom: 'var(--space-20)' }}>
              <h3 style={{ marginBottom: 'var(--space-xl)', fontSize: 'var(--text-base)', fontWeight: '600', color: 'var(--text)' }}>Bjud in medlem</h3>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') sendInvite() }}
                placeholder="mejladress@exempel.se"
                style={{ ...inputStyle, marginBottom: 'var(--space-lg)' }}
              />
              <button onClick={sendInvite} disabled={sendingInvite || !inviteEmail} style={{ width: '100%', padding: 'var(--space-lg)', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: '500' }}>
                {sendingInvite ? 'Skapar inbjudan...' : 'Skapa inbjudningslänk'}
              </button>
              {inviteLink && (
                <div style={{ marginTop: 'var(--space-xl)', background: 'var(--bg)', border: 'var(--border-width-sm) solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-lg)' }}>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>Kopiera och skicka denna länk:</p>
                  <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                    <input readOnly value={inviteLink} style={{ flex: 1, padding: 'var(--space-md)', borderRadius: 'var(--radius-xs)', border: 'var(--border-width-sm) solid var(--border)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', background: 'var(--bg-card)' }} />
                    <button onClick={copyInviteLink} style={{ padding: 'var(--space-md) var(--space-14)', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: 'var(--radius-xs)', cursor: 'pointer', fontSize: 'var(--text-sm)', whiteSpace: 'nowrap' }}>
                      Kopiera
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {role === 'admin' && pendingInvites.length > 0 && (
            <div>
              <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: '600', color: 'var(--text-muted)', marginBottom: 'var(--space-10)' }}>Väntande inbjudningar</h3>
              {pendingInvites.map(inv => (
                <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-lg) var(--space-14)', background: 'var(--warning-bg-subtle)', border: 'var(--border-width-sm) solid var(--warning)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-md)' }}>
                  <div>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text)' }}>{inv.email}</p>
                    {inv.expires_at && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Går ut {new Date(inv.expires_at).toLocaleDateString('sv-SE')}</p>}
                  </div>
                  <button onClick={() => cancelInvite(inv.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 'var(--text-lg)', lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 'var(--space-40)', paddingTop: 'var(--space-2xl)', borderTop: 'var(--border-width-sm) solid var(--border)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: '600', color: 'var(--danger)', marginBottom: 'var(--space-md)' }}>Farlig zon</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-xl)' }}>
              Att radera ditt konto tar bort all din data permanent och kan inte ångras.
            </p>
            <button
              onClick={() => setConfirmDeleteAccount(true)}
              disabled={deletingAccount}
              style={{ padding: 'var(--space-11) var(--space-20)', background: 'var(--danger-bg-subtle)', color: 'var(--danger)', border: 'var(--border-width-sm) solid var(--danger)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: '500' }}
            >
              {deletingAccount ? 'Raderar...' : 'Radera mitt konto'}
            </button>
            {confirmDeleteAccount && (
              <ConfirmPanel
                confirmLabel="Ja, radera"
                loadingLabel="Raderar..."
                loading={deletingAccount}
                onConfirm={deleteAccount}
                onCancel={() => setConfirmDeleteAccount(false)}
                style={{ marginTop: 'var(--space-14)' }}
              >
                Är du helt säker? Detta raderar ditt konto och all din data permanent.
              </ConfirmPanel>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
