'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const supabase = createClient()

function daysUntilExpiry(expiresAt) {
  if (!expiresAt) return null
  const diff = new Date(expiresAt) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function expiryLabel(days) {
  if (days === null) return null
  if (days < 0) return { text: 'Utgånget', color: '#cc0000', bg: '#fff0f0' }
  if (days === 0) return { text: 'Går ut idag', color: '#cc0000', bg: '#fff0f0' }
  if (days <= 3) return { text: `${days} dag${days === 1 ? '' : 'ar'} kvar`, color: '#b45309', bg: '#fffbeb' }
  return null
}

export default function PantryPage() {
  const [householdId, setHouseholdId] = useState(null)
  const [user, setUser] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', quantity: '', unit: '', expires_at: '' })
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUser(user)

      const { data: members } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .limit(1)

      if (!members || members.length === 0) { router.push('/household'); return }
      const hid = members[0].household_id
      setHouseholdId(hid)
      await loadItems(hid)
      setLoading(false)
    }
    load()
  }, [router])

  async function loadItems(hid) {
    const { data } = await supabase
      .from('pantry')
      .select('*')
      .eq('household_id', hid)
      .order('expires_at', { ascending: true, nullsLast: true })
    setItems(data || [])
  }

  async function addItem() {
    if (!form.name.trim()) return
    setSaving(true)
    await supabase.from('pantry').insert({
      household_id: householdId,
      name: form.name.trim(),
      quantity: form.quantity.trim() || null,
      unit: form.unit.trim() || null,
      expires_at: form.expires_at || null,
    })
    setForm({ name: '', quantity: '', unit: '', expires_at: '' })
    setShowForm(false)
    await loadItems(householdId)
    setSaving(false)
  }

  async function deleteItem(id) {
    await supabase.from('pantry').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function getAiSuggestion() {
    if (items.length === 0) return
    setAiLoading(true)
    setAiSuggestion('')

    const pantryList = items
      .map(i => [i.name, i.quantity, i.unit].filter(Boolean).join(' '))
      .join(', ')

    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Jag har följande i mitt skafferi: ${pantryList}. Föreslå 3–5 middagsrätter som jag kan laga med det jag har hemma. Håll det kort — bara rätternas namn och en mening om vad som eventuellt behöver köpas till.`,
        householdId,
      }),
    })
    const data = await response.json()
    setAiSuggestion(data.content || '')
    setAiLoading(false)
  }

  if (loading) return <div style={{ padding: '40px' }}>Laddar...</div>

  const expiringSoon = items.filter(i => {
    const days = daysUntilExpiry(i.expires_at)
    return days !== null && days <= 3
  })

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '40px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>🥦 Skafferiet</h1>
        <Link href="/" style={{ color: '#666', textDecoration: 'none' }}>← Tillbaka</Link>
      </div>

      {/* Varning snart utgångna */}
      {expiringSoon.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px' }}>
          <p style={{ fontWeight: '600', marginBottom: '6px', color: '#92400e' }}>⚠️ Snart utgångna varor</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {expiringSoon.map(i => {
              const days = daysUntilExpiry(i.expires_at)
              const label = expiryLabel(days)
              return (
                <span key={i.id} style={{ background: label.bg, color: label.color, border: `1px solid ${label.color}33`, borderRadius: '6px', padding: '4px 10px', fontSize: '13px' }}>
                  {i.name} — {label.text}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Knappar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{ flex: 1, padding: '12px', background: '#000', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
        >
          {showForm ? 'Avbryt' : '+ Lägg till vara'}
        </button>
        <button
          onClick={getAiSuggestion}
          disabled={aiLoading || items.length === 0}
          style={{ flex: 1, padding: '12px', background: '#fff', color: items.length === 0 ? '#aaa' : '#000', border: '1px solid #e5e5e5', borderRadius: '10px', cursor: items.length === 0 ? 'default' : 'pointer', fontSize: '14px', fontWeight: '500' }}
        >
          {aiLoading ? 'Hämtar förslag...' : '✨ Vad kan jag laga?'}
        </button>
      </div>

      {/* Formulär */}
      {showForm && (
        <div style={{ background: '#f9f9f9', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>Ny vara</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>Namn *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') addItem() }}
                placeholder="T.ex. mjölk"
                autoFocus
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>Mängd</label>
              <input
                type="text"
                value={form.quantity}
                onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                placeholder="T.ex. 500"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>Enhet</label>
              <input
                type="text"
                value={form.unit}
                onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                placeholder="T.ex. g, dl, st"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>Bäst före</label>
              <input
                type="date"
                value={form.expires_at}
                onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <button
            onClick={addItem}
            disabled={saving || !form.name.trim()}
            style={{ width: '100%', padding: '11px', background: '#000', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
          >
            {saving ? 'Sparar...' : 'Lägg till'}
          </button>
        </div>
      )}

      {/* AI-förslag */}
      {aiSuggestion && (
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#0369a1' }}>✨ AI-förslag</h3>
            <button onClick={() => setAiSuggestion('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '18px', lineHeight: 1 }}>×</button>
          </div>
          <div style={{ fontSize: '14px', lineHeight: '1.7', whiteSpace: 'pre-wrap', color: '#333' }}>{aiSuggestion}</div>
        </div>
      )}

      {/* Varulista */}
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>🥦</p>
          <p>Skafferiet är tomt. Lägg till det du har hemma!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {items.map(item => {
            const days = daysUntilExpiry(item.expires_at)
            const label = expiryLabel(days)
            return (
              <div
                key={item.id}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#fff', border: `1px solid ${label ? '#fde68a' : '#e5e5e5'}`, borderRadius: '10px' }}
              >
                <div>
                  <span style={{ fontWeight: '500', fontSize: '15px' }}>{item.name}</span>
                  {(item.quantity || item.unit) && (
                    <span style={{ color: '#666', fontSize: '13px', marginLeft: '8px' }}>
                      {[item.quantity, item.unit].filter(Boolean).join(' ')}
                    </span>
                  )}
                  {label && (
                    <span style={{ display: 'inline-block', marginLeft: '10px', background: label.bg, color: label.color, fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: '500' }}>
                      {label.text}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => deleteItem(item.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: '18px', padding: '0 4px', lineHeight: 1 }}
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
