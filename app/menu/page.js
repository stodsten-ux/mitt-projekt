'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Spinner from '../../components/Spinner'

const supabase = createClient()

const DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag']

function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDate(date) {
  return date.toISOString().split('T')[0]
}

function formatWeekLabel(weekStart) {
  const end = new Date(weekStart)
  end.setDate(end.getDate() + 6)
  return `${weekStart.getDate()}/${weekStart.getMonth() + 1} – ${end.getDate()}/${end.getMonth() + 1}`
}

export default function MenuPage() {
  const [user, setUser] = useState(null)
  const [householdId, setHouseholdId] = useState(null)
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [menuItems, setMenuItems] = useState({})
  const [menuId, setMenuId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [shoppingLoading, setShoppingLoading] = useState(false)
  const [expandLoading, setExpandLoading] = useState(false)
  const [expandStatus, setExpandStatus] = useState('')
  const [editingDay, setEditingDay] = useState(null)
  const [editValue, setEditValue] = useState('')
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUser(user)
      const { data: members } = await supabase.from('household_members').select('household_id').eq('user_id', user.id).limit(1)
      if (!members || members.length === 0) { router.push('/household'); return }
      const hid = members[0].household_id
      setHouseholdId(hid)
      await loadMenu(hid, getWeekStart(new Date()))
      setLoading(false)
    }
    load()
  }, [router])

  async function loadMenu(hid, week) {
    const weekStr = formatDate(week)
    const { data: menu } = await supabase.from('menus').select('id').eq('household_id', hid).eq('week_start', weekStr).single()
    if (menu) {
      setMenuId(menu.id)
      const { data: items } = await supabase.from('menu_items').select('day_of_week, custom_title').eq('menu_id', menu.id)
      const map = {}
      if (items) items.forEach(item => { map[item.day_of_week] = item.custom_title })
      setMenuItems(map)
    } else {
      setMenuId(null)
      setMenuItems({})
    }
  }

  async function changeWeek(delta) {
    const newWeek = new Date(weekStart)
    newWeek.setDate(newWeek.getDate() + delta * 7)
    setWeekStart(newWeek)
    if (householdId) await loadMenu(householdId, newWeek)
  }

  async function saveMenu(items) {
    setSaving(true)
    const weekStr = formatDate(weekStart)
    let mid = menuId
    if (!mid) {
      const { data: newMenu } = await supabase.from('menus').insert({ household_id: householdId, week_start: weekStr, created_by: user.id }).select('id').single()
      mid = newMenu.id
      setMenuId(mid)
    }
    await supabase.from('menu_items').delete().eq('menu_id', mid)
    const rows = Object.entries(items).filter(([, title]) => title?.trim()).map(([day, title]) => ({ menu_id: mid, day_of_week: parseInt(day), meal_type: 'dinner', custom_title: title.trim() }))
    if (rows.length > 0) await supabase.from('menu_items').insert(rows)
    setSaving(false)
  }

  async function getAiSuggestion() {
    setAiLoading(true)
    setExpandStatus('')
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Föreslå middagar för varje dag denna vecka. Ta hänsyn till hushållets preferenser. Returnera som JSON med nycklarna "måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag", "söndag" och rättens namn som värde. Returnera BARA JSON-objektet.',
        householdId,
      }),
    })
    const data = await response.json()
    try {
      const jsonStr = data.content.replace(/```json\n?|\n?```/g, '').trim()
      const parsed = JSON.parse(jsonStr)
      const keyMap = { måndag: 1, tisdag: 2, onsdag: 3, torsdag: 4, fredag: 5, lördag: 6, söndag: 7 }
      const newItems = {}
      for (const [key, val] of Object.entries(parsed)) {
        const dayNum = keyMap[key.toLowerCase()]
        if (dayNum) newItems[dayNum] = val
      }
      setMenuItems(newItems)
      await saveMenu(newItems)
      // Expandera direkt efter sparning för att skapa recept med recipe_id
      setAiLoading(false)
      await expandMenu()
    } catch {
      alert('Kunde inte tolka AI-svaret. Försök igen.')
      setAiLoading(false)
    }
  }

  async function expandMenu() {
    if (!menuId) return
    setExpandLoading(true)
    setExpandStatus('Genererar recept med ingredienser...')
    const response = await fetch('/api/menu/expand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menuId, householdId }),
    })
    const data = await response.json()
    if (data.success) {
      setExpandStatus(data.created > 0
        ? `✅ ${data.created} recept skapade — inköpslistan kan nu genereras!`
        : '✅ Alla rätter har redan recept.')
    } else {
      setExpandStatus('Kunde inte generera recept. Försök igen.')
    }
    setExpandLoading(false)
  }

  async function generateShoppingList() {
    if (!menuId) { alert('Spara menyn först.'); return }
    setShoppingLoading(true)
    const filledDays = Object.entries(menuItems).filter(([, t]) => t?.trim())
    if (filledDays.length === 0) { alert('Lägg till rätter i menyn först.'); setShoppingLoading(false); return }
    const response = await fetch('/api/shopping/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menuId, householdId }),
    })
    const data = await response.json()
    if (data.success) {
      router.push('/shopping')
    } else {
      alert('Kunde inte skapa inköpslistan. Försök igen.')
    }
    setShoppingLoading(false)
  }

  function startEdit(dayNum) { setEditingDay(dayNum); setEditValue(menuItems[dayNum] || '') }

  async function finishEdit(dayNum) {
    const newItems = { ...menuItems, [dayNum]: editValue }
    if (!editValue.trim()) delete newItems[dayNum]
    setMenuItems(newItems)
    setEditingDay(null)
    setEditValue('')
    await saveMenu(newItems)
  }

  const hasItems = Object.keys(menuItems).length > 0

  if (loading) return <div className="loading-screen"><Spinner />Laddar...</div>

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '32px', color: 'var(--text)' }}>📅 Veckomenyn</h1>

      {/* Veckonavigering */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 20px' }}>
        <button onClick={() => changeWeek(-1)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '16px', color: 'var(--text)' }}>←</button>
        <span style={{ fontWeight: '600', color: 'var(--text)' }}>{formatWeekLabel(weekStart)}</span>
        <button onClick={() => changeWeek(1)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '16px', color: 'var(--text)' }}>→</button>
      </div>

      {/* Dagar */}
      <div style={{ marginBottom: '20px' }}>
        {DAYS.map((day, i) => {
          const dayNum = i + 1
          const title = menuItems[dayNum]
          const isEditing = editingDay === dayNum
          return (
            <div key={dayNum} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', marginBottom: '8px' }}>
              <span style={{ width: '76px', fontWeight: '500', fontSize: '14px', color: 'var(--text-muted)', flexShrink: 0 }}>{day}</span>
              {isEditing ? (
                <input
                  autoFocus
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => finishEdit(dayNum)}
                  onKeyDown={(e) => { if (e.key === 'Enter') finishEdit(dayNum); if (e.key === 'Escape') { setEditingDay(null); setEditValue('') } }}
                  placeholder="Ange rätt..."
                  style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--accent)', fontSize: '14px', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none' }}
                />
              ) : (
                <span onClick={() => startEdit(dayNum)} style={{ flex: 1, fontSize: '14px', color: title ? 'var(--text)' : 'var(--border)', cursor: 'pointer', padding: '6px 0' }}>
                  {title || 'Klicka för att lägga till...'}
                </span>
              )}
              {title && !isEditing && (
                <button onClick={() => { const n = { ...menuItems }; delete n[dayNum]; setMenuItems(n); saveMenu({ ...menuItems, [dayNum]: undefined }) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--border)', fontSize: '18px', padding: '0 4px', lineHeight: 1 }}>×</button>
              )}
            </div>
          )
        })}
      </div>

      {saving && <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px' }}>Sparar...</p>}

      {/* Expandera-status */}
      {expandStatus && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 16px', marginBottom: '12px', fontSize: '14px', color: 'var(--text)' }}>
          {expandStatus}
        </div>
      )}

      {/* Knappar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          onClick={getAiSuggestion}
          disabled={aiLoading || expandLoading}
          style={{ padding: '14px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '15px', fontWeight: '600' }}
        >
          {(aiLoading || expandLoading) ? <><Spinner />&nbsp;{expandLoading ? 'Genererar recept...' : 'Hämtar AI-förslag...'}</> : '✨ AI-förslag på hela veckan'}
        </button>
        {hasItems && (
          <button
            onClick={expandMenu}
            disabled={expandLoading || !menuId}
            style={{ padding: '14px', background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '10px', cursor: 'pointer', fontSize: '15px', fontWeight: '500' }}
          >
            {expandLoading ? <><Spinner />&nbsp;{expandStatus || 'Genererar ingredienser...'}</> : '⚡ Generera ingredienser för hela veckan'}
          </button>
        )}
        <button
          onClick={generateShoppingList}
          disabled={shoppingLoading || !hasItems}
          style={{ padding: '14px', background: 'var(--bg-card)', color: hasItems ? 'var(--text)' : 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '10px', cursor: hasItems ? 'pointer' : 'default', fontSize: '15px', fontWeight: '500' }}
        >
          {shoppingLoading ? <><Spinner />&nbsp;Genererar inköpslista...</> : '🛍️ Generera inköpslista från menyn'}
        </button>
      </div>
    </div>
  )
}
