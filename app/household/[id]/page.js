'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

const supabase = createClient()

function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(18)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export default function HouseholdDetailPage() {
  const [household, setHousehold] = useState(null)
  const [preferences, setPreferences] = useState(null)
  const [members, setMembers] = useState([])
  const [pendingInvites, setPendingInvites] = useState([])
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [sendingInvite, setSendingInvite] = useState(false)
  const router = useRouter()
  const { id } = useParams()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: h } = await supabase
        .from('households')
        .select('*')
        .eq('id', id)
        .single()
      setHousehold(h)

      const { data: prefs } = await supabase
        .from('household_preferences')
        .select('*')
        .eq('household_id', id)
        .single()
      setPreferences(prefs || { allergies: [], diet_preferences: [], favorite_foods: [], disliked_foods: [] })

      const { data: m } = await supabase
        .from('household_members')
        .select('*')
        .eq('household_id', id)
      setMembers(m || [])

      const myMember = m?.find(mem => mem.user_id === user.id)
      setRole(myMember?.role)

      const { data: invites } = await supabase
        .from('household_invites')
        .select('*')
        .eq('household_id', id)
        .eq('accepted', false)
        .order('id', { ascending: false })
      setPendingInvites(invites || [])

      setLoading(false)
    }
    load()
  }, [id, router])

  async function savePreferences() {
    setSaving(true)
    await supabase
      .from('household_preferences')
      .upsert({ household_id: id, ...preferences, updated_at: new Date().toISOString() })
    await supabase
      .from('households')
      .update({ adults: household.adults, children: household.children, weekly_budget: household.weekly_budget })
      .eq('id', id)
    setSaving(false)
    alert('Sparat!')
  }

  async function sendInvite() {
    if (!inviteEmail) return
    setSendingInvite(true)
    const token = generateToken()
    const expires = new Date()
    expires.setDate(expires.getDate() + 7)

    await supabase.from('household_invites').insert({
      household_id: id,
      email: inviteEmail,
      token,
      accepted: false,
      expires_at: expires.toISOString(),
    })

    const link = `${window.location.origin}/invite/${token}`
    setInviteLink(link)
    setInviteEmail('')

    const { data: invites } = await supabase
      .from('household_invites')
      .select('*')
      .eq('household_id', id)
      .eq('accepted', false)
      .order('id', { ascending: false })
    setPendingInvites(invites || [])
    setSendingInvite(false)
  }

  async function cancelInvite(inviteId) {
    await supabase.from('household_invites').delete().eq('id', inviteId)
    setPendingInvites(prev => prev.filter(i => i.id !== inviteId))
  }

  function updateArrayPref(key, value) {
    const arr = value.split(',').map(s => s.trim()).filter(Boolean)
    setPreferences(prev => ({ ...prev, [key]: arr }))
  }

  if (loading) return <div style={{ padding: '40px' }}>Laddar...</div>
  if (!household) return <div style={{ padding: '40px' }}>Hushållet hittades inte.</div>

  const tabs = ['overview', 'preferences', 'members']
  const tabLabels = { overview: '📋 Översikt', preferences: '⚙️ Preferenser', members: '👥 Medlemmar' }

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '40px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>{household.display_name || household.name}</h1>
          <p style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
            {household.adults} vuxna · {household.children} barn · {household.weekly_budget} kr/vecka
          </p>
        </div>
        <Link href="/household" style={{ color: '#666', textDecoration: 'none' }}>← Tillbaka</Link>
      </div>

      {/* Flikar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #e5e5e5' }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ padding: '10px 16px', background: 'none', border: 'none', borderBottom: activeTab === tab ? '2px solid #000' : '2px solid transparent', cursor: 'pointer', fontWeight: activeTab === tab ? '600' : '400', fontSize: '14px' }}
          >
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
              <div key={item.label} style={{ background: '#f9f9f9', borderRadius: '12px', padding: '20px' }}>
                <p style={{ color: '#666', fontSize: '13px', marginBottom: '4px' }}>{item.label}</p>
                <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{item.value}</p>
              </div>
            ))}
          </div>

          {preferences && (
            <div style={{ background: '#f9f9f9', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ marginBottom: '12px' }}>Hushållets preferenser</h3>
              {preferences.allergies?.length > 0 && <p style={{ fontSize: '14px', marginBottom: '8px' }}><strong>Allergier:</strong> {preferences.allergies.join(', ')}</p>}
              {preferences.diet_preferences?.length > 0 && <p style={{ fontSize: '14px', marginBottom: '8px' }}><strong>Kostpreferenser:</strong> {preferences.diet_preferences.join(', ')}</p>}
              {preferences.favorite_foods?.length > 0 && <p style={{ fontSize: '14px', marginBottom: '8px' }}><strong>Favoriträtter:</strong> {preferences.favorite_foods.join(', ')}</p>}
              {preferences.disliked_foods?.length > 0 && <p style={{ fontSize: '14px' }}><strong>Undviker:</strong> {preferences.disliked_foods.join(', ')}</p>}
              {!preferences.allergies?.length && !preferences.diet_preferences?.length && !preferences.favorite_foods?.length && !preferences.disliked_foods?.length && (
                <p style={{ color: '#999', fontSize: '14px' }}>Inga preferenser inställda. <button onClick={() => setActiveTab('preferences')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#000', textDecoration: 'underline', fontSize: '14px', padding: 0 }}>Lägg till</button></p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Preferenser */}
      {activeTab === 'preferences' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Antal vuxna</label>
            <input type="number" value={household.adults} min={1} onChange={(e) => setHousehold(prev => ({ ...prev, adults: parseInt(e.target.value) }))} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Antal barn</label>
            <input type="number" value={household.children} min={0} onChange={(e) => setHousehold(prev => ({ ...prev, children: parseInt(e.target.value) }))} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Veckbudget (kr)</label>
            <input type="number" value={household.weekly_budget} min={0} step={100} onChange={(e) => setHousehold(prev => ({ ...prev, weekly_budget: parseInt(e.target.value) }))} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' }} />
          </div>

          {[
            { key: 'allergies', label: 'Allergier & intoleranser', placeholder: 't.ex. jordnötter, laktos, gluten' },
            { key: 'diet_preferences', label: 'Kostpreferenser', placeholder: 't.ex. vegetarisk, halal, glutenfritt' },
            { key: 'favorite_foods', label: 'Favoriträtter', placeholder: 't.ex. tacos, pasta, sushi' },
            { key: 'disliked_foods', label: 'Undviker', placeholder: 't.ex. fisk, lever, brysselkål' },
          ].map(field => (
            <div key={field.key} style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>{field.label}</label>
              <input
                type="text"
                defaultValue={preferences?.[field.key]?.join(', ')}
                onBlur={(e) => updateArrayPref(field.key, e.target.value)}
                placeholder={field.placeholder}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' }}
              />
              <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>Separera med komma</p>
            </div>
          ))}

          <button onClick={savePreferences} disabled={saving} style={{ width: '100%', padding: '14px', background: '#000', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '15px' }}>
            {saving ? 'Sparar...' : 'Spara preferenser'}
          </button>
        </div>
      )}

      {/* Medlemmar */}
      {activeTab === 'members' && (
        <div>
          {/* Medlemslista */}
          <div style={{ marginBottom: '24px' }}>
            {members.map(member => (
              <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#f9f9f9', borderRadius: '10px', marginBottom: '8px' }}>
                <p style={{ fontSize: '14px', color: '#444' }}>{member.user_id}</p>
                <span style={{ background: member.role === 'admin' ? '#000' : '#e5e5e5', color: member.role === 'admin' ? '#fff' : '#333', padding: '4px 10px', borderRadius: '20px', fontSize: '12px' }}>
                  {member.role === 'admin' ? 'Admin' : 'Medlem'}
                </span>
              </div>
            ))}
          </div>

          {/* Bjud in */}
          {role === 'admin' && (
            <div style={{ background: '#f9f9f9', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '16px' }}>Bjud in medlem</h3>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') sendInvite() }}
                placeholder="mejladress@exempel.se"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box', marginBottom: '12px' }}
              />
              <button onClick={sendInvite} disabled={sendingInvite || !inviteEmail} style={{ width: '100%', padding: '12px', background: '#000', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
                {sendingInvite ? 'Skapar inbjudan...' : 'Skapa inbjudningslänk'}
              </button>

              {/* Kopierbara länken */}
              {inviteLink && (
                <div style={{ marginTop: '16px', background: '#fff', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '12px' }}>
                  <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>Kopiera och skicka denna länk:</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      readOnly
                      value={inviteLink}
                      style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '12px', color: '#444', background: '#f9f9f9' }}
                    />
                    <button
                      onClick={() => { navigator.clipboard.writeText(inviteLink); alert('Länk kopierad!') }}
                      style={{ padding: '8px 14px', background: '#000', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}
                    >
                      Kopiera
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Väntande inbjudningar */}
          {role === 'admin' && pendingInvites.length > 0 && (
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#666', marginBottom: '10px' }}>Väntande inbjudningar</h3>
              {pendingInvites.map(inv => (
                <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', marginBottom: '8px' }}>
                  <div>
                    <p style={{ fontSize: '14px' }}>{inv.email}</p>
                    {inv.expires_at && <p style={{ fontSize: '12px', color: '#999' }}>Går ut {new Date(inv.expires_at).toLocaleDateString('sv-SE')}</p>}
                  </div>
                  <button onClick={() => cancelInvite(inv.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '18px', lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
