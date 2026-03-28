'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Spinner from '../../components/Spinner'

const supabase = createClient()

function daysUntilExpiry(expiresAt) {
  if (!expiresAt) return null
  return Math.ceil((new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
}

function expiryLabel(days) {
  if (days === null) return null
  if (days < 0) return { text: 'Utgånget', color: 'var(--danger)', bg: 'rgba(255,59,48,0.08)' }
  if (days === 0) return { text: 'Går ut idag', color: 'var(--danger)', bg: 'rgba(255,59,48,0.08)' }
  if (days <= 3) return { text: `${days} dag${days === 1 ? '' : 'ar'} kvar`, color: 'var(--warning)', bg: 'rgba(255,149,0,0.08)' }
  return null
}

const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '14px', boxSizing: 'border-box', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none' }

export default function PantryPage() {
  const [householdId, setHouseholdId] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', quantity: '', unit: '', expires_at: '' })
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: members } = await supabase.from('household_members').select('household_id').eq('user_id', user.id).limit(1)
      if (!members || members.length === 0) { router.push('/household'); return }
      const hid = members[0].household_id
      setHouseholdId(hid)
      await loadItems(hid)
      setLoading(false)
    }
    load()
  }, [router])

  async function loadItems(hid) {
    const { data } = await supabase.from('pantry').select('*').eq('household_id', hid).order('expires_at', { ascending: true, nullsLast: true })
    setItems(data || [])
  }

  async function addItem() {
    if (!form.name.trim()) return
    setSaving(true)
    await supabase.from('pantry').insert({ household_id: householdId, name: form.name.trim(), quantity: form.quantity.trim() || null, unit: form.unit.trim() || null, expires_at: form.expires_at || null })
    setForm({ name: '', quantity: '', unit: '', expires_at: '' })
    setShowForm(false)
    await loadItems(householdId)
    setSaving(false)
  }

  async function deleteItem(id) {
    await supabase.from('pantry').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  if (loading) return <div style={{ padding: '40px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}><Spinner />Laddar...</div>

  const expiringSoon = items.filter(i => { const d = daysUntilExpiry(i.expires_at); return d !== null && d <= 3 })

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '28px', color: 'var(--text)' }}>🥦 Skafferiet</h1>

      {/* Varning snart utgångna */}
      {expiringSoon.length > 0 && (
        <div style={{ background: 'rgba(255,149,0,0.08)', border: '1px solid var(--warning)', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px' }}>
          <p style={{ fontWeight: '600', marginBottom: '8px', color: 'var(--warning)' }}>⚠️ Snart utgångna varor</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {expiringSoon.map(i => {
              const label = expiryLabel(daysUntilExpiry(i.expires_at))
              return <span key={i.id} style={{ background: label.bg, color: label.color, border: `1px solid ${label.color}`, borderRadius: '6px', padding: '4px 10px', fontSize: '13px' }}>{i.name} — {label.text}</span>
            })}
          </div>
        </div>
      )}

      {/* Knappar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => setShowForm(v => !v)} style={{ flex: 1, padding: '12px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
          {showForm ? 'Avbryt' : '+ Lägg till vara'}
        </button>
        <Link href="/panic" style={{ flex: 1, padding: '12px', background: 'var(--bg-card)', color: items.length === 0 ? 'var(--text-muted)' : 'var(--text)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '14px', fontWeight: '500', textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: items.length === 0 ? 'none' : 'auto' }}>
          🆘 Vad kan jag laga?
        </Link>
      </div>

      {/* Formulär */}
      {showForm && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '15px', fontWeight: '600', color: 'var(--text)' }}>Ny vara</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500', color: 'var(--text)' }}>Namn *</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') addItem() }} placeholder="T.ex. mjölk" autoFocus style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500', color: 'var(--text)' }}>Mängd</label>
              <input type="text" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} placeholder="T.ex. 500" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500', color: 'var(--text)' }}>Enhet</label>
              <input type="text" value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} placeholder="g, dl, st" style={inputStyle} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500', color: 'var(--text)' }}>Bäst före</label>
              <input type="date" value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} style={inputStyle} />
            </div>
          </div>
          <button onClick={addItem} disabled={saving || !form.name.trim()} style={{ width: '100%', padding: '11px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
            {saving ? <><Spinner />&nbsp;Sparar...</> : 'Lägg till'}
          </button>
        </div>
      )}

      {/* Varulista */}
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>🥦</p>
          <p>Skafferiet är tomt. Lägg till det du har hemma!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {items.map(item => {
            const days = daysUntilExpiry(item.expires_at)
            const label = expiryLabel(days)
            return (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', background: 'var(--bg-card)', border: `1px solid ${label ? label.color : 'var(--border)'}`, borderRadius: '10px' }}>
                <div>
                  <span style={{ fontWeight: '500', fontSize: '15px', color: 'var(--text)' }}>{item.name}</span>
                  {(item.quantity || item.unit) && <span style={{ color: 'var(--text-muted)', fontSize: '13px', marginLeft: '8px' }}>{[item.quantity, item.unit].filter(Boolean).join(' ')}</span>}
                  {label && <span style={{ display: 'inline-block', marginLeft: '10px', background: label.bg, color: label.color, fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: '500' }}>{label.text}</span>}
                </div>
                <button onClick={() => deleteItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--border)', fontSize: '18px', padding: '0 4px', lineHeight: 1 }}>×</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
