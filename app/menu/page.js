'use client'

import { useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Pencil, Sparkles, ShoppingCart, Zap } from 'lucide-react'
import Spinner from '../../components/Spinner'
import MenuSkeleton from '../../components/skeletons/MenuSkeleton'
import NextStepBanner from '../../components/NextStepBanner'
import { useHousehold } from '../../lib/hooks/useHousehold'
import { useMenu } from '../../lib/hooks/useMenu'

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
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [localMenuItems, setLocalMenuItems] = useState(null)
  const [localRecipeIds, setLocalRecipeIds] = useState(null)
  const [saving, setSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [shoppingLoading, setShoppingLoading] = useState(false)
  const [expandLoading, setExpandLoading] = useState(false)
  const [expandStatus, setExpandStatus] = useState('')
  const [editingDay, setEditingDay] = useState(null)
  const [editValue, setEditValue] = useState('')
  const router = useRouter()

  const { user, householdId, isLoading: householdLoading } = useHousehold()
  const {
    menuId,
    menuItems: swrMenuItems,
    menuRecipeIds: swrRecipeIds,
    mutate: mutateMenu,
  } = useMenu(householdId, weekStart)

  // Use local (unsaved edits) state when set, fall back to SWR data
  const menuItems = localMenuItems ?? swrMenuItems
  const menuRecipeIds = localRecipeIds ?? swrRecipeIds

  function changeWeek(delta) {
    const newWeek = new Date(weekStart)
    newWeek.setDate(newWeek.getDate() + delta * 7)
    setWeekStart(newWeek)
    // Reset local edits — SWR will fetch new week via key change
    setLocalMenuItems(null)
    setLocalRecipeIds(null)
  }

  async function saveMenu(items) {
    setSaving(true)
    const weekStr = formatDate(weekStart)
    let mid = menuId
    if (!mid) {
      const { data: newMenu } = await supabase.from('menus').insert({ household_id: householdId, week_start: weekStr, created_by: user.id }).select('id').single()
      mid = newMenu.id
    }
    await supabase.from('menu_items').delete().eq('menu_id', mid)
    const rows = Object.entries(items).filter(([, title]) => title?.trim()).map(([day, title]) => ({ menu_id: mid, day_of_week: parseInt(day), meal_type: 'dinner', custom_title: title.trim() }))
    if (rows.length > 0) await supabase.from('menu_items').insert(rows)
    setSaving(false)
    await mutateMenu()
    return mid
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
      setLocalMenuItems(newItems)
      // saveMenu returnerar det faktiska menu-ID:t — undviker stale state-closure
      const savedMenuId = await saveMenu(newItems)
      setAiLoading(false)
      await expandMenu(savedMenuId)
    } catch {
      alert('Kunde inte tolka AI-svaret. Försök igen.')
      setAiLoading(false)
    }
  }

  async function expandMenu(mid) {
    const activeMenuId = mid || menuId
    if (!activeMenuId) return
    setExpandLoading(true)
    setExpandStatus('Genererar recept med ingredienser...')
    const response = await fetch('/api/menu/expand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menuId: activeMenuId, householdId }),
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
    await mutateMenu()
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
    setLocalMenuItems(newItems)
    setEditingDay(null)
    setEditValue('')
    await saveMenu(newItems)
  }

  const todayDow = new Date().getDay() === 0 ? 7 : new Date().getDay()
  const hasItems = Object.keys(menuItems).length > 0

  if (householdLoading) return <MenuSkeleton />

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '32px', color: 'var(--color-forest)', fontFamily: 'var(--font-heading)' }}>Veckomenyn</h1>

      {/* Veckonavigering */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '12px 16px' }}>
        <button onClick={() => changeWeek(-1)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '16px', color: 'var(--text)' }}>←</button>
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', fontWeight: '700', color: 'var(--color-forest)', letterSpacing: '-0.01em' }}>{formatWeekLabel(weekStart)}</span>
        <button onClick={() => changeWeek(1)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '16px', color: 'var(--text)' }}>→</button>
      </div>

      {/* Dagar */}
      <div style={{ marginBottom: '20px' }}>
        {DAYS.map((day, i) => {
          const dayNum = i + 1
          const title = menuItems[dayNum]
          const recipeId = menuRecipeIds[dayNum]
          const isEditing = editingDay === dayNum
          return (
            <div
              key={dayNum}
              className={`drow${title ? ' filled' : ''}${todayDow === dayNum ? ' today' : ''}`}
              style={{ marginBottom: '5px' }}
            >
              <span className="drow-day">{day}</span>
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
              ) : recipeId ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Link href={`/recipes/${recipeId}`} className="drow-title" style={{ textDecoration: 'none' }}>
                    {title}
                  </Link>
                  <button onClick={() => startEdit(dayNum)} title="Redigera" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 2px', lineHeight: 1, flexShrink: 0 }}>
                    <Pencil size={13} />
                  </button>
                </div>
              ) : (
                <span onClick={() => startEdit(dayNum)} className={title ? 'drow-title' : 'drow-empty'}>
                  {title || 'Klicka för att lägga till...'}
                </span>
              )}
              {todayDow === dayNum && title && !isEditing && (
                <span className="pill pill-today">Idag</span>
              )}
              {title && !isEditing && (
                <button onClick={() => { const n = { ...menuItems }; delete n[dayNum]; const r = { ...menuRecipeIds }; delete r[dayNum]; setLocalMenuItems(n); setLocalRecipeIds(r); saveMenu({ ...menuItems, [dayNum]: undefined }) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--border)', fontSize: '18px', padding: '0 4px', lineHeight: 1 }}>×</button>
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

      {/* AI suggestion card */}
      <div className="ai-card" onClick={getAiSuggestion} style={{ marginBottom: '20px', opacity: (aiLoading || expandLoading) ? 0.6 : 1, pointerEvents: (aiLoading || expandLoading) ? 'none' : 'auto' }}>
        <div className="ai-card-icon">
          <Sparkles size={18} />
        </div>
        <div className="ai-card-text">
          <p className="ai-card-title">
            {(aiLoading || expandLoading)
              ? (expandLoading ? 'Genererar recept...' : 'Hämtar AI-förslag...')
              : 'Föreslå hela veckan med AI'}
          </p>
          <p className="ai-card-sub">Anpassas efter skafferi, budget och preferenser</p>
        </div>
        <span className="ai-card-arrow">→</span>
      </div>

      {/* Åtgärdsrader */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <button
          className="btn-action"
          onClick={generateShoppingList}
          disabled={shoppingLoading || !hasItems}
        >
          <span className="btn-action-label">
            <ShoppingCart size={16} className="btn-action-icon" />
            {shoppingLoading ? 'Genererar inköpslista...' : 'Generera inköpslista'}
          </span>
          <span className="btn-action-arrow">›</span>
        </button>
        {hasItems && (
          <button
            className="btn-action"
            onClick={expandMenu}
            disabled={expandLoading || !menuId}
          >
            <span className="btn-action-label">
              <Zap size={16} className="btn-action-icon" />
              {expandLoading ? 'Genererar ingredienser...' : 'Generera ingredienser'}
            </span>
            <span className="btn-action-arrow">›</span>
          </button>
        )}
      </div>

      {/* Visa "nästa steg"-banner när menyn har minst en rätt */}
      {hasItems && (
        <NextStepBanner
          text="Menyn är klar"
          cta="Skapa inköpslistan"
          href="/shopping"
        />
      )}
    </div>
  )
}
