# SWR Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace manual `useEffect`-based data fetching with SWR hooks across all pages, eliminating duplicated auth/household boilerplate and adding automatic caching.

**Architecture:** A shared `useHousehold()` hook handles auth + household resolution with SWR caching. Per-domain hooks (`useMenu`, `usePantry`, `useShoppingList`, `useRecipes`) wrap Supabase queries in SWR. A `SWRConfig` provider in `layout.js` sets global defaults. Pages become thin view layers that compose hooks.

**Tech Stack:** SWR, React 19, Next.js 16, Supabase (browser client via `@supabase/ssr`)

---

### File Structure

```
lib/hooks/useHousehold.js    — auth + household_id resolution, redirect logic
lib/hooks/useMenu.js         — menu + menu_items for a given week
lib/hooks/usePantry.js       — pantry items sorted by expiry
lib/hooks/useShoppingList.js — shopping lists + items for active list
lib/hooks/useRecipes.js      — household recipes
app/swr-provider.js          — 'use client' SWRConfig wrapper component
app/layout.js                — modified to include SWRProvider
app/pantry/page.js           — migrated to hooks
app/menu/page.js             — migrated to hooks
app/shopping/page.js         — migrated to hooks
app/recipes/page.js          — migrated to hooks
app/campaigns/page.js        — migrated to hooks
app/page.js                  — migrated to useHousehold
app/cook/page.js             — migrated to useHousehold
app/panic/page.js            — migrated to useHousehold + usePantry
app/household/page.js        — migrated to useHousehold (partial — no household_id needed)
```

---

### Task 1: Install SWR and create SWRConfig provider

**Files:**
- Modify: `package.json`
- Create: `app/swr-provider.js`
- Modify: `app/layout.js`

- [ ] **Step 1: Install SWR**

Run: `npm install swr`
Expected: swr added to package.json dependencies

- [ ] **Step 2: Create SWRProvider component**

Create `app/swr-provider.js`:

```javascript
'use client'

import { SWRConfig } from 'swr'

export default function SWRProvider({ children }) {
  return (
    <SWRConfig value={{
      revalidateOnFocus: true,
      dedupingInterval: 2000,
    }}>
      {children}
    </SWRConfig>
  )
}
```

- [ ] **Step 3: Wrap layout children with SWRProvider**

In `app/layout.js`, import SWRProvider and wrap `{children}`:

```javascript
import SWRProvider from './swr-provider'
```

Change the body content from:

```jsx
<Navbar />
<ModeSelector />
{children}
<CookieBanner />
```

to:

```jsx
<Navbar />
<ModeSelector />
<SWRProvider>{children}</SWRProvider>
<CookieBanner />
```

- [ ] **Step 4: Verify app still loads**

Run: `npm run dev` — open http://localhost:3000, confirm no errors in console.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json app/swr-provider.js app/layout.js
git commit -m "feat: install SWR and add SWRConfig provider to layout"
```

---

### Task 2: Create useHousehold hook

**Files:**
- Create: `lib/hooks/useHousehold.js`

This is the foundation hook. It handles auth check, household membership lookup, and redirect logic. All other hooks depend on the `householdId` it returns.

- [ ] **Step 1: Create useHousehold hook**

Create `lib/hooks/useHousehold.js`:

```javascript
'use client'

import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { createClient } from '../supabase'

const supabase = createClient()

async function fetchHousehold() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, householdId: null, householdData: null }

  const { data: members } = await supabase
    .from('household_members')
    .select('household_id, role, households(id, name, display_name, adults, children, weekly_budget)')
    .eq('user_id', user.id)

  if (!members || members.length === 0) {
    return { user, householdId: null, householdData: null }
  }

  const primary = members[0]
  return {
    user,
    householdId: primary.household_id,
    householdData: primary.households,
    allMemberships: members,
  }
}

export function useHousehold({ redirectTo = 'both' } = {}) {
  const router = useRouter()
  const { data, error, isLoading, mutate } = useSWR('household', fetchHousehold)

  useEffect(() => {
    if (isLoading || !data) return
    if (redirectTo === 'none') return

    if (!data.user) {
      router.push('/auth/login')
    } else if (!data.householdId && (redirectTo === 'both' || redirectTo === 'household')) {
      router.push('/household')
    }
  }, [data, isLoading, redirectTo, router])

  return {
    user: data?.user ?? null,
    householdId: data?.householdId ?? null,
    householdData: data?.householdData ?? null,
    allMemberships: data?.allMemberships ?? [],
    isLoading,
    error,
    mutate,
  }
}
```

The `redirectTo` option controls redirect behavior:
- `'both'` (default) — redirect to login if no user, to `/household` if no membership
- `'login'` — only redirect if no user (used by household page which doesn't need a household yet)
- `'none'` — no redirects

- [ ] **Step 2: Verify hook loads without errors**

Temporarily import in `app/pantry/page.js` at the top (don't use it yet):

```javascript
import { useHousehold } from '../../lib/hooks/useHousehold'
```

Run: `npm run dev` — open `/pantry`, confirm no import errors. Then remove the temporary import.

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/useHousehold.js
git commit -m "feat: create useHousehold hook with SWR caching and auth redirects"
```

---

### Task 3: Create usePantry hook and migrate pantry page

**Files:**
- Create: `lib/hooks/usePantry.js`
- Modify: `app/pantry/page.js`

Pantry is the simplest page — one data source, simple CRUD. Good first migration target.

- [ ] **Step 1: Create usePantry hook**

Create `lib/hooks/usePantry.js`:

```javascript
'use client'

import useSWR from 'swr'
import { createClient } from '../supabase'

const supabase = createClient()

async function fetchPantryItems(householdId) {
  const { data } = await supabase
    .from('pantry')
    .select('*')
    .eq('household_id', householdId)
    .order('expires_at', { ascending: true, nullsLast: true })
  return data || []
}

export function usePantry(householdId) {
  const { data, error, isLoading, mutate } = useSWR(
    householdId ? ['pantry', householdId] : null,
    () => fetchPantryItems(householdId)
  )

  return {
    items: data ?? [],
    isLoading,
    error,
    mutate,
  }
}
```

- [ ] **Step 2: Migrate pantry page to use hooks**

Replace the contents of `app/pantry/page.js` with:

```javascript
'use client'

import { useState } from 'react'
import { createClient } from '../../lib/supabase'
import Link from 'next/link'
import Spinner from '../../components/Spinner'
import { useHousehold } from '../../lib/hooks/useHousehold'
import { usePantry } from '../../lib/hooks/usePantry'

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
  const { householdId, isLoading: authLoading } = useHousehold()
  const { items, isLoading: pantryLoading, mutate } = usePantry(householdId)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', quantity: '', unit: '', expires_at: '' })

  const loading = authLoading || pantryLoading

  async function addItem() {
    if (!form.name.trim()) return
    setSaving(true)
    await supabase.from('pantry').insert({ household_id: householdId, name: form.name.trim(), quantity: form.quantity.trim() || null, unit: form.unit.trim() || null, expires_at: form.expires_at || null })
    setForm({ name: '', quantity: '', unit: '', expires_at: '' })
    setShowForm(false)
    await mutate()
    setSaving(false)
  }

  async function deleteItem(id) {
    // Optimistic update
    mutate(items.filter(i => i.id !== id), false)
    await supabase.from('pantry').delete().eq('id', id)
    mutate()
  }

  if (loading) return <div className="loading-screen"><Spinner />Laddar...</div>

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
```

Key changes from original:
- Removed `useEffect`, `useState` for `householdId`, `items`, `loading`, `router`
- Added `useHousehold()` and `usePantry(householdId)`
- `deleteItem` uses optimistic update via `mutate(newData, false)`
- `addItem` calls `mutate()` to revalidate after insert

- [ ] **Step 3: Test pantry page**

Run: `npm run dev` — navigate to `/pantry`:
1. Page loads with pantry items (or empty state)
2. Add an item — it appears after save
3. Delete an item — it disappears immediately (optimistic)
4. Navigate away and back — data loads from SWR cache (instant)

- [ ] **Step 4: Commit**

```bash
git add lib/hooks/usePantry.js app/pantry/page.js
git commit -m "feat: migrate pantry page to SWR hooks"
```

---

### Task 4: Create useMenu hook and migrate menu page

**Files:**
- Create: `lib/hooks/useMenu.js`
- Modify: `app/menu/page.js`

The menu page has a dynamic SWR key based on the selected week.

- [ ] **Step 1: Create useMenu hook**

Create `lib/hooks/useMenu.js`:

```javascript
'use client'

import useSWR from 'swr'
import { createClient } from '../supabase'

const supabase = createClient()

function formatDate(date) {
  return date.toISOString().split('T')[0]
}

async function fetchMenu(householdId, weekStartStr) {
  const { data: menu } = await supabase
    .from('menus')
    .select('id')
    .eq('household_id', householdId)
    .eq('week_start', weekStartStr)
    .single()

  if (!menu) return { menuId: null, menuItems: {}, menuRecipeIds: {} }

  const { data: items } = await supabase
    .from('menu_items')
    .select('day_of_week, custom_title, recipe_id')
    .eq('menu_id', menu.id)

  const menuItems = {}
  const menuRecipeIds = {}
  if (items) {
    items.forEach(item => {
      menuItems[item.day_of_week] = item.custom_title
      if (item.recipe_id) menuRecipeIds[item.day_of_week] = item.recipe_id
    })
  }

  return { menuId: menu.id, menuItems, menuRecipeIds }
}

export function useMenu(householdId, weekStart) {
  const weekStartStr = weekStart ? formatDate(weekStart) : null
  const { data, error, isLoading, mutate } = useSWR(
    householdId && weekStartStr ? ['menu', householdId, weekStartStr] : null,
    () => fetchMenu(householdId, weekStartStr)
  )

  return {
    menuId: data?.menuId ?? null,
    menuItems: data?.menuItems ?? {},
    menuRecipeIds: data?.menuRecipeIds ?? {},
    isLoading,
    error,
    mutate,
  }
}
```

- [ ] **Step 2: Migrate menu page**

Replace the contents of `app/menu/page.js` with:

```javascript
'use client'

import { useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Spinner from '../../components/Spinner'
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

function formatWeekLabel(weekStart) {
  const end = new Date(weekStart)
  end.setDate(end.getDate() + 6)
  return `${weekStart.getDate()}/${weekStart.getMonth() + 1} – ${end.getDate()}/${end.getMonth() + 1}`
}

export default function MenuPage() {
  const { user, householdId, isLoading: authLoading } = useHousehold()
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const { menuId, menuItems: swrMenuItems, menuRecipeIds: swrMenuRecipeIds, isLoading: menuLoading, mutate: mutateMenu } = useMenu(householdId, weekStart)
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

  // Use local state if user has made edits, otherwise use SWR data
  const menuItems = localMenuItems ?? swrMenuItems
  const menuRecipeIds = localRecipeIds ?? swrMenuRecipeIds

  const loading = authLoading || menuLoading

  function changeWeek(delta) {
    const newWeek = new Date(weekStart)
    newWeek.setDate(newWeek.getDate() + delta * 7)
    setWeekStart(newWeek)
    setLocalMenuItems(null)
    setLocalRecipeIds(null)
  }

  async function saveMenu(items) {
    setSaving(true)
    const weekStr = weekStart.toISOString().split('T')[0]
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
      await mutateMenu()
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
    setLocalMenuItems(newItems)
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
          const recipeId = menuRecipeIds[dayNum]
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
              ) : recipeId ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Link
                    href={`/recipes/${recipeId}`}
                    style={{ fontSize: '14px', color: 'var(--text)', textDecoration: 'none', fontWeight: '500', flex: 1, padding: '6px 0' }}
                  >
                    {title}
                  </Link>
                  <button
                    onClick={() => startEdit(dayNum)}
                    title="Redigera"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '13px', padding: '0 2px', lineHeight: 1, flexShrink: 0 }}
                  >
                    ✏️
                  </button>
                </div>
              ) : (
                <span onClick={() => startEdit(dayNum)} style={{ flex: 1, fontSize: '14px', color: title ? 'var(--text)' : 'var(--border)', cursor: 'pointer', padding: '6px 0' }}>
                  {title || 'Klicka för att lägga till...'}
                </span>
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
```

Key changes:
- Removed `useEffect`, manual `loadMenu`, `user`/`householdId`/`menuItems`/`menuRecipeIds`/`menuId`/`loading` state
- `useHousehold()` + `useMenu(householdId, weekStart)` replace all data fetching
- `localMenuItems`/`localRecipeIds` track unsaved edits (falls back to SWR data when null)
- `changeWeek` resets local state — SWR fetches the new week automatically via key change
- `saveMenu` and `expandMenu` call `mutateMenu()` after writes

- [ ] **Step 3: Test menu page**

Run: `npm run dev` — navigate to `/menu`:
1. Page loads with current week's menu
2. Navigate weeks — data loads (from cache on revisit)
3. Edit a day — saves and persists
4. AI-suggestion flow works
5. Navigate away and back — menu data loads from cache

- [ ] **Step 4: Commit**

```bash
git add lib/hooks/useMenu.js app/menu/page.js
git commit -m "feat: migrate menu page to SWR hooks"
```

---

### Task 5: Create useShoppingList hook and migrate shopping page

**Files:**
- Create: `lib/hooks/useShoppingList.js`
- Modify: `app/shopping/page.js`

Shopping is the most complex page — multiple lists, items per list, price/campaign results. The hook handles lists + items; price/campaign results stay as local state since they're on-demand.

- [ ] **Step 1: Create useShoppingList hook**

Create `lib/hooks/useShoppingList.js`:

```javascript
'use client'

import useSWR from 'swr'
import { createClient } from '../supabase'

const supabase = createClient()

async function fetchShoppingLists(householdId) {
  const { data } = await supabase
    .from('shopping_lists')
    .select('id, title, created_at')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false })
  return data || []
}

async function fetchShoppingItems(listId) {
  const { data } = await supabase
    .from('shopping_items')
    .select('*')
    .eq('shopping_list_id', listId)
    .order('store')
  return data || []
}

export function useShoppingLists(householdId) {
  const { data, error, isLoading, mutate } = useSWR(
    householdId ? ['shopping-lists', householdId] : null,
    () => fetchShoppingLists(householdId)
  )

  return {
    lists: data ?? [],
    isLoading,
    error,
    mutate,
  }
}

export function useShoppingItems(listId) {
  const { data, error, isLoading, mutate } = useSWR(
    listId ? ['shopping-items', listId] : null,
    () => fetchShoppingItems(listId)
  )

  return {
    items: data ?? [],
    isLoading,
    error,
    mutate,
  }
}
```

- [ ] **Step 2: Migrate shopping page**

Replace the contents of `app/shopping/page.js`. The full file is large, so here are the key changes to apply:

**Remove these imports/state:**
```javascript
// REMOVE:
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
// State to remove: user, householdId, lists, activeList, items, loading
```

**Add these imports/hooks:**
```javascript
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useHousehold } from '../../lib/hooks/useHousehold'
import { useShoppingLists, useShoppingItems } from '../../lib/hooks/useShoppingList'
```

**Replace the useEffect block and state with:**
```javascript
const { user, householdId, householdData, isLoading: authLoading } = useHousehold()
const { lists, isLoading: listsLoading, mutate: mutateLists } = useShoppingLists(householdId)
const [activeListId, setActiveListId] = useState(null)

// Auto-select first list when lists load
const effectiveActiveListId = activeListId ?? lists[0]?.id ?? null
const activeList = lists.find(l => l.id === effectiveActiveListId) ?? null

const { items, isLoading: itemsLoading, mutate: mutateItems } = useShoppingItems(effectiveActiveListId)

const weeklyBudget = householdData?.weekly_budget ?? null
const [preferredStores, setPreferredStores] = useState([])
// ... keep all other useState declarations (aiLoading, priceLoading, etc.)

const loading = authLoading || listsLoading
```

**Note:** `preferredStores` still needs to be loaded. Add a small `useEffect` for it:
```javascript
import { useState, useEffect } from 'react'

useEffect(() => {
  if (!householdId) return
  const supabase = createClient()
  supabase.from('household_preferences').select('preferred_stores').eq('household_id', householdId).single()
    .then(({ data }) => {
      if (data?.preferred_stores?.length) setPreferredStores(data.preferred_stores)
    })
}, [householdId])
```

**Update mutation functions:**
- `switchList`: Change to `setActiveListId(list.id)` — SWR handles item fetching via key change
- `toggleItem`: After supabase update, call `mutateItems()`
- `addItem`: After insert, call `mutateItems()`
- `deleteItem`: Use optimistic update: `mutateItems(items.filter(i => i.id !== id), false)` then `mutateItems()`
- `toggleOnline`: After update, call `mutateItems()`
- `createEmptyList`: After insert, call `mutateLists()` then `setActiveListId(newList.id)`
- `findBestPrices`: After updating prices in DB, call `mutateItems()`

**Remove:** The old `loadItems` function — SWR handles this.

- [ ] **Step 3: Test shopping page**

Run: `npm run dev` — navigate to `/shopping`:
1. Lists load, first list auto-selected
2. Switch between lists — items update
3. Toggle/add/delete items — changes persist
4. Price lookup works
5. Navigate away and back — data from cache

- [ ] **Step 4: Commit**

```bash
git add lib/hooks/useShoppingList.js app/shopping/page.js
git commit -m "feat: migrate shopping page to SWR hooks"
```

---

### Task 6: Create useRecipes hook and migrate recipes page

**Files:**
- Create: `lib/hooks/useRecipes.js`
- Modify: `app/recipes/page.js`

- [ ] **Step 1: Create useRecipes hook**

Create `lib/hooks/useRecipes.js`:

```javascript
'use client'

import useSWR from 'swr'
import { createClient } from '../supabase'

const supabase = createClient()

async function fetchRecipes(householdId) {
  const { data } = await supabase
    .from('recipes')
    .select('id, title, description, servings, ai_generated')
    .eq('household_id', householdId)
    .order('id', { ascending: false })
  return data || []
}

async function fetchSharedRecipes() {
  const { data } = await supabase
    .from('shared_recipes')
    .select('id, title, description, servings, published_at, recipe_stats(avg_rating, total_ratings)')
    .order('published_at', { ascending: false })
    .limit(50)
  return data || []
}

async function fetchMyRatings(householdId) {
  const { data } = await supabase
    .from('recipe_ratings')
    .select('shared_recipe_id, rating')
    .eq('household_id', householdId)
  const map = {}
  if (data) data.forEach(r => { map[r.shared_recipe_id] = r.rating })
  return map
}

export function useRecipes(householdId) {
  const { data, error, isLoading, mutate } = useSWR(
    householdId ? ['recipes', householdId] : null,
    () => fetchRecipes(householdId)
  )

  return {
    recipes: data ?? [],
    isLoading,
    error,
    mutate,
  }
}

export function useSharedRecipes() {
  const { data, error, isLoading, mutate } = useSWR(
    'shared-recipes',
    fetchSharedRecipes
  )

  return {
    sharedRecipes: data ?? [],
    isLoading,
    error,
    mutate,
  }
}

export function useMyRatings(householdId) {
  const { data, error, isLoading, mutate } = useSWR(
    householdId ? ['my-ratings', householdId] : null,
    () => fetchMyRatings(householdId)
  )

  return {
    ratings: data ?? {},
    isLoading,
    error,
    mutate,
  }
}
```

- [ ] **Step 2: Migrate recipes page**

In `app/recipes/page.js`, apply these changes:

**Remove:** `useEffect` block, `user`/`householdId`/`recipes`/`sharedRecipes`/`loading`/`mySharedRatings` state, `loadRecipes`/`loadSharedRecipes`/`loadMySharedRatings` functions.

**Add:**
```javascript
import { useHousehold } from '../../lib/hooks/useHousehold'
import { useRecipes, useSharedRecipes, useMyRatings } from '../../lib/hooks/useRecipes'
```

**Replace state/loading with:**
```javascript
const { user, householdId, isLoading: authLoading } = useHousehold()
const { recipes, isLoading: recipesLoading, mutate: mutateRecipes } = useRecipes(householdId)
const { sharedRecipes } = useSharedRecipes()
const { ratings: mySharedRatings, mutate: mutateRatings } = useMyRatings(householdId)

const loading = authLoading || recipesLoading
```

**Update mutation functions:**
- `rateSharedRecipe`: Optimistic update on `mutateRatings`:
  ```javascript
  async function rateSharedRecipe(sharedRecipeId, rating) {
    mutateRatings({ ...mySharedRatings, [sharedRecipeId]: rating }, false)
    await supabase.from('recipe_ratings').upsert(
      { shared_recipe_id: sharedRecipeId, household_id: householdId, rating },
      { onConflict: 'shared_recipe_id,household_id' }
    )
    mutateRatings()
  }
  ```
- `saveRecipe`: Keep as-is (navigates away on success)
- Keep all other functions unchanged

- [ ] **Step 3: Test recipes page**

Run: `npm run dev` — navigate to `/recipes`:
1. Own recipes load
2. "Upptäck" tab shows shared recipes with ratings
3. Rate a shared recipe — star updates instantly
4. Search works
5. AI generation works

- [ ] **Step 4: Commit**

```bash
git add lib/hooks/useRecipes.js app/recipes/page.js
git commit -m "feat: migrate recipes page to SWR hooks"
```

---

### Task 7: Migrate campaigns page

**Files:**
- Modify: `app/campaigns/page.js`

Campaigns page is simple — no persistent data hook needed, just `useHousehold`.

- [ ] **Step 1: Migrate campaigns page**

In `app/campaigns/page.js`, apply these changes:

**Remove:** `useEffect` block, `householdId`/`selectedStores`/`loading` state (keep `selectedStores` but initialize differently), `router`.

**Add:**
```javascript
import { useHousehold } from '../../lib/hooks/useHousehold'
```

**Replace state/loading:**
```javascript
const { householdId, isLoading: authLoading } = useHousehold()
const [selectedStores, setSelectedStores] = useState(['ICA', 'Willys'])
const [loading, setLoading] = useState(true)
```

**Add useEffect to load preferred stores:**
```javascript
useEffect(() => {
  if (!householdId) return
  supabase.from('household_preferences').select('preferred_stores').eq('household_id', householdId).maybeSingle()
    .then(({ data }) => {
      if (data?.preferred_stores?.length) setSelectedStores(data.preferred_stores)
      setLoading(false)
    })
}, [householdId])
```

**Change loading check:**
```javascript
if (authLoading || loading) return <div className="loading-screen"><Spinner />Laddar...</div>
```

**Remove:** `router` import and usage (useHousehold handles redirects).

- [ ] **Step 2: Test campaigns page**

Run: `npm run dev` — navigate to `/campaigns`:
1. Store selection loads with preferred stores
2. Fetching campaigns works
3. Results display correctly

- [ ] **Step 3: Commit**

```bash
git add app/campaigns/page.js
git commit -m "feat: migrate campaigns page to useHousehold hook"
```

---

### Task 8: Migrate remaining pages (dashboard, cook, panic, household)

**Files:**
- Modify: `app/page.js` (dashboard)
- Modify: `app/cook/page.js`
- Modify: `app/panic/page.js`
- Modify: `app/household/page.js`

These pages all have the same auth/household boilerplate. Replace with `useHousehold()`. Data-specific fetching stays as `useEffect` since these pages have unique data needs not worth extracting into shared hooks.

- [ ] **Step 1: Migrate dashboard (app/page.js)**

Replace the auth/household `useEffect` block (lines 23-90) with:

```javascript
import { useHousehold } from '../lib/hooks/useHousehold'

// Inside component:
const { user, householdId, isLoading: authLoading } = useHousehold()
const [todayItem, setTodayItem] = useState(null)
const [weekItems, setWeekItems] = useState([])
const [shoppingList, setShoppingList] = useState(null)
const [expiringItems, setExpiringItems] = useState([])
const [dataLoading, setDataLoading] = useState(true)

useEffect(() => {
  if (!householdId) return
  async function loadData() {
    const weekStart = getWeekStart()
    const { data: menu } = await supabase
      .from('menus').select('id').eq('household_id', householdId)
      .gte('week_start', weekStart).limit(1)

    if (menu?.length) {
      const { data: items } = await supabase
        .from('menu_items')
        .select('recipe_id, custom_title, day_of_week, recipes(id, title, description)')
        .eq('menu_id', menu[0].id).order('day_of_week')
      const allItems = items || []
      setWeekItems(allItems)
      setTodayItem(allItems.find(i => i.day_of_week === getTodayDayOfWeek()) || null)
    }

    const { data: lists } = await supabase
      .from('shopping_lists').select('id, title').eq('household_id', householdId)
      .order('id', { ascending: false }).limit(1)
    if (lists?.length) {
      const { data: sitems } = await supabase
        .from('shopping_items').select('id, checked, price').eq('shopping_list_id', lists[0].id)
      const total = sitems?.reduce((s, i) => s + (i.price || 0), 0) || 0
      setShoppingList({ ...lists[0], count: sitems?.length || 0, estimatedCost: Math.round(total) })
    }

    const soon = new Date()
    soon.setDate(soon.getDate() + 2)
    const { data: pantry } = await supabase
      .from('pantry').select('name, expires_at').eq('household_id', householdId)
      .not('expires_at', 'is', null).lte('expires_at', soon.toISOString().split('T')[0])
      .order('expires_at').limit(3)
    setExpiringItems(pantry || [])

    setDataLoading(false)
  }
  loadData()
}, [householdId])

const loading = authLoading || dataLoading
```

Remove: `user`/`householdId`/`loading` state, `router` (from useState/useEffect only — keep if used elsewhere).

- [ ] **Step 2: Migrate cook index page (app/cook/page.js)**

Same pattern — replace auth boilerplate with `useHousehold()`:

```javascript
import { useHousehold } from '../../lib/hooks/useHousehold'

// Inside component:
const { householdId, isLoading: authLoading } = useHousehold()
const [recipes, setRecipes] = useState([])
const [menuRecipes, setMenuRecipes] = useState([])
const [dataLoading, setDataLoading] = useState(true)

useEffect(() => {
  if (!householdId) return
  async function loadData() {
    const weekStart = getWeekStart()
    const { data: menu } = await supabase
      .from('menus').select('id').eq('household_id', householdId)
      .gte('week_start', weekStart).limit(1)

    if (menu?.length) {
      const { data: items } = await supabase
        .from('menu_items')
        .select('recipe_id, custom_title, day_of_week, recipes(id, title, description)')
        .eq('menu_id', menu[0].id).order('day_of_week')
      setMenuRecipes((items || []).filter(i => i.recipe_id && i.recipes))
    }

    const { data: recent } = await supabase
      .from('recipes').select('id, title, description, ai_generated')
      .eq('household_id', householdId).order('id', { ascending: false }).limit(8)
    setRecipes(recent || [])
    setDataLoading(false)
  }
  loadData()
}, [householdId])

const loading = authLoading || dataLoading
```

- [ ] **Step 3: Migrate panic page (app/panic/page.js)**

Replace auth/pantry loading with `useHousehold()` + `usePantry()`:

```javascript
import { useHousehold } from '../../lib/hooks/useHousehold'
import { usePantry } from '../../lib/hooks/usePantry'

// Inside PanicContent:
const { householdId, isLoading: authLoading } = useHousehold()
const { items: pantryItems, isLoading: pantryLoading } = usePantry(householdId)
const [selected, setSelected] = useState({})
const [searching, setSearching] = useState(false)
const [results, setResults] = useState(null)
const [resultSource, setResultSource] = useState(null)
const searchParams = useSearchParams()

// Initialize selected when pantryItems load
useEffect(() => {
  if (!pantryItems.length) return
  const preselected = searchParams.get('items')
  const initial = {}
  if (preselected) {
    const names = preselected.split(',').map(n => decodeURIComponent(n).toLowerCase())
    pantryItems.forEach(i => { initial[i.id] = names.includes(i.name.toLowerCase()) })
  } else {
    pantryItems.forEach(i => { initial[i.id] = true })
  }
  setSelected(initial)
}, [pantryItems, searchParams])

const loading = authLoading || pantryLoading
```

Remove: old `useEffect`, `householdId`/`loading`/`pantryItems` state, `router`.

- [ ] **Step 4: Migrate household page (app/household/page.js)**

Use `useHousehold` with `redirectTo: 'login'` (this page doesn't need an existing household):

```javascript
import { useHousehold } from '../../lib/hooks/useHousehold'

// Inside component:
const { user, allMemberships, isLoading: loading, mutate } = useHousehold({ redirectTo: 'login' })
```

Remove: `useEffect`, `user`/`households`/`loading` state, `router`.

Replace `households` references with `allMemberships`. The data shape is the same (`household_id`, `role`, `households(...)`) since `useHousehold` fetches the same joined query.

After `createHousehold`, call `mutate()` before navigating:
```javascript
await mutate()
router.push(`/household/${household.id}`)
```

- [ ] **Step 5: Test all migrated pages**

Run: `npm run dev` and test:
1. Dashboard (`/`) — loads, shows today's menu, shopping list, expiring items
2. Cook (`/cook`) — loads, shows menu recipes and all recipes
3. Panic (`/panic`) — loads, pantry items pre-selected, recipe search works
4. Household (`/household`) — loads, lists households, create flow works

- [ ] **Step 6: Commit**

```bash
git add app/page.js app/cook/page.js app/panic/page.js app/household/page.js
git commit -m "feat: migrate dashboard, cook, panic, and household pages to useHousehold"
```

---

### Task 9: Update TODO.md

**Files:**
- Modify: `TODO.md`

- [ ] **Step 1: Mark P3 tasks 9-10 as done**

In `TODO.md`, under `#### P3 — Frontend-upplevelse`:

Change:
```
9. [ ] Skeleton screens istället för spinners på meny- och receptsidor
10. [ ] SWR eller React Query för stale-while-revalidate på hushållsdata, menyer, skafferi
```

To:
```
9. [ ] Skeleton screens istället för spinners på meny- och receptsidor
10. [x] SWR för stale-while-revalidate på hushållsdata, menyer, skafferi
```

- [ ] **Step 2: Commit**

```bash
git add TODO.md
git commit -m "docs: mark SWR integration as complete in TODO"
```
