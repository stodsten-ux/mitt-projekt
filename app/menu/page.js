'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
  const [menuItems, setMenuItems] = useState({}) // { 1: 'Pasta', 2: 'Tacos', ... }
  const [menuId, setMenuId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [shoppingLoading, setShoppingLoading] = useState(false)
  const [editingDay, setEditingDay] = useState(null)
  const [editValue, setEditValue] = useState('')
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

      if (!members || members.length === 0) {
        router.push('/household')
        return
      }

      const hid = members[0].household_id
      setHouseholdId(hid)
      await loadMenu(hid, getWeekStart(new Date()))
      setLoading(false)
    }
    load()
  }, [router])

  async function loadMenu(hid, week) {
    const weekStr = formatDate(week)

    const { data: menu } = await supabase
      .from('menus')
      .select('id')
      .eq('household_id', hid)
      .eq('week_start', weekStr)
      .single()

    if (menu) {
      setMenuId(menu.id)
      const { data: items } = await supabase
        .from('menu_items')
        .select('day_of_week, custom_title')
        .eq('menu_id', menu.id)

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
      const { data: newMenu } = await supabase
        .from('menus')
        .insert({ household_id: householdId, week_start: weekStr, created_by: user.id })
        .select('id')
        .single()
      mid = newMenu.id
      setMenuId(mid)
    }

    await supabase.from('menu_items').delete().eq('menu_id', mid)

    const rows = Object.entries(items)
      .filter(([, title]) => title?.trim())
      .map(([day, title]) => ({
        menu_id: mid,
        day_of_week: parseInt(day),
        meal_type: 'dinner',
        custom_title: title.trim(),
      }))

    if (rows.length > 0) await supabase.from('menu_items').insert(rows)
    setSaving(false)
  }

  async function getAiSuggestion() {
    setAiLoading(true)
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Föreslå middagar för varje dag denna vecka. Ta hänsyn till hushållets preferenser och vad som finns i skafferiet. Returnera som JSON med dagarna måndag-söndag, alltså ett objekt med nycklarna "måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag", "söndag" och namnet på rätten som värde. Returnera BARA JSON-objektet, ingen annan text.',
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
    } catch {
      alert('Kunde inte tolka AI-svaret. Försök igen.')
    }
    setAiLoading(false)
  }

  async function generateShoppingList() {
    if (!menuId) {
      alert('Spara menyn först.')
      return
    }
    setShoppingLoading(true)

    const filledDays = Object.entries(menuItems).filter(([, t]) => t?.trim())
    if (filledDays.length === 0) {
      alert('Lägg till rätter i menyn först.')
      setShoppingLoading(false)
      return
    }

    const menuText = filledDays
      .map(([day, title]) => `${DAYS[parseInt(day) - 1]}: ${title}`)
      .join(', ')

    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Skapa en inköpslista för denna veckomeny: ${menuText}. Returnera som JSON med ett objekt där nycklarna är butikskategorier (t.ex. "Frukt & grönt", "Mejeri", "Kött & fisk", "Torrvaror", "Övrigt") och värdena är arrayer med objekt som har fälten "name" (varunamn), "quantity" (mängd som sträng, t.ex. "500 g") . Returnera BARA JSON-objektet, ingen annan text.`,
        householdId,
      }),
    })
    const data = await response.json()

    try {
      const jsonStr = data.content.replace(/```json\n?|\n?```/g, '').trim()
      const parsed = JSON.parse(jsonStr)

      const { data: list } = await supabase
        .from('shopping_lists')
        .insert({
          household_id: householdId,
          menu_id: menuId,
          title: `Vecka ${formatWeekLabel(weekStart)}`,
          created_by: user.id,
        })
        .select('id')
        .single()

      const items = []
      for (const [category, products] of Object.entries(parsed)) {
        for (const product of products) {
          items.push({
            shopping_list_id: list.id,
            name: product.name,
            quantity: product.quantity || '',
            store: category,
            checked: false,
          })
        }
      }

      if (items.length > 0) await supabase.from('shopping_items').insert(items)
      router.push('/shopping')
    } catch {
      alert('Kunde inte skapa inköpslistan. Försök igen.')
    }
    setShoppingLoading(false)
  }

  function startEdit(dayNum) {
    setEditingDay(dayNum)
    setEditValue(menuItems[dayNum] || '')
  }

  async function finishEdit(dayNum) {
    const newItems = { ...menuItems, [dayNum]: editValue }
    if (!editValue.trim()) delete newItems[dayNum]
    setMenuItems(newItems)
    setEditingDay(null)
    setEditValue('')
    await saveMenu(newItems)
  }

  if (loading) return <div style={{ padding: '40px' }}>Laddar...</div>

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '40px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>📅 Veckomenyn</h1>
        <Link href="/" style={{ color: '#666', textDecoration: 'none' }}>← Tillbaka</Link>
      </div>

      {/* Veckonavigering */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', background: '#f9f9f9', borderRadius: '12px', padding: '16px 20px' }}>
        <button
          onClick={() => changeWeek(-1)}
          style={{ background: 'none', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '16px' }}
        >
          ←
        </button>
        <span style={{ fontWeight: '600' }}>{formatWeekLabel(weekStart)}</span>
        <button
          onClick={() => changeWeek(1)}
          style={{ background: 'none', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '16px' }}
        >
          →
        </button>
      </div>

      {/* Dagar */}
      <div style={{ marginBottom: '24px' }}>
        {DAYS.map((day, i) => {
          const dayNum = i + 1
          const title = menuItems[dayNum]
          const isEditing = editingDay === dayNum

          return (
            <div
              key={dayNum}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: '#fff', border: '1px solid #e5e5e5', borderRadius: '10px', marginBottom: '8px' }}
            >
              <span style={{ width: '80px', fontWeight: '500', fontSize: '14px', color: '#555', flexShrink: 0 }}>{day}</span>
              {isEditing ? (
                <input
                  autoFocus
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => finishEdit(dayNum)}
                  onKeyDown={(e) => { if (e.key === 'Enter') finishEdit(dayNum); if (e.key === 'Escape') { setEditingDay(null); setEditValue('') } }}
                  placeholder="Ange rätt..."
                  style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #000', fontSize: '14px', outline: 'none' }}
                />
              ) : (
                <span
                  onClick={() => startEdit(dayNum)}
                  style={{ flex: 1, fontSize: '14px', color: title ? '#000' : '#bbb', cursor: 'pointer', padding: '6px 0' }}
                >
                  {title || 'Klicka för att lägga till...'}
                </span>
              )}
              {title && !isEditing && (
                <button
                  onClick={() => { const n = { ...menuItems }; delete n[dayNum]; setMenuItems(n); saveMenu({ ...menuItems, [dayNum]: undefined }) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: '16px', padding: '0 4px' }}
                >
                  ×
                </button>
              )}
            </div>
          )
        })}
      </div>

      {saving && <p style={{ textAlign: 'center', color: '#999', fontSize: '13px', marginBottom: '16px' }}>Sparar...</p>}

      {/* Knappar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button
          onClick={getAiSuggestion}
          disabled={aiLoading}
          style={{ padding: '14px', background: '#000', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '15px', fontWeight: '500' }}
        >
          {aiLoading ? 'Hämtar AI-förslag...' : '✨ AI-förslag på hela veckan'}
        </button>
        <button
          onClick={generateShoppingList}
          disabled={shoppingLoading || Object.keys(menuItems).length === 0}
          style={{ padding: '14px', background: Object.keys(menuItems).length === 0 ? '#f1f1f1' : '#fff', color: Object.keys(menuItems).length === 0 ? '#aaa' : '#000', border: '1px solid #e5e5e5', borderRadius: '10px', cursor: Object.keys(menuItems).length === 0 ? 'default' : 'pointer', fontSize: '15px', fontWeight: '500' }}
        >
          {shoppingLoading ? 'Genererar inköpslista...' : '🛍️ Generera inköpslista från menyn'}
        </button>
      </div>
    </div>
  )
}
