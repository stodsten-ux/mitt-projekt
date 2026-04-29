'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Spinner from '../../../components/Spinner'
import ShoppingActiveSkeleton from '../../../components/skeletons/ShoppingActiveSkeleton'

const supabase = createClient()

const CATEGORY_EMOJI = {
  'Frukt & grönt': '🥦',
  'Mejeri': '🥛',
  'Kött & fisk': '🥩',
  'Torrvaror': '🧴',
  'Bröd & bakverk': '🍞',
  'Fryst': '🧊',
  'Dryck': '🥤',
  'Övrigt': '🛒',
}

export default function ShoppingActivePage() {
  const [householdId, setHouseholdId] = useState(null)
  const [list, setList] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showDoneModal, setShowDoneModal] = useState(false)
  const [movingToPantry, setMovingToPantry] = useState(false)
  const [collapsedCategories, setCollapsedCategories] = useState({})
  const wakeLockRef = useRef(null)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: members } = await supabase.from('household_members').select('household_id').eq('user_id', user.id).limit(1)
      if (!members?.length) { router.push('/household'); return }
      const hid = members[0].household_id
      setHouseholdId(hid)
      // Hämta senaste inköpslista
      const { data: lists } = await supabase.from('shopping_lists').select('id, title').eq('household_id', hid).order('created_at', { ascending: false }).limit(1)
      if (!lists?.length) { router.push('/shopping'); return }
      setList(lists[0])
      const { data: shoppingItems } = await supabase.from('shopping_items').select('*').eq('shopping_list_id', lists[0].id).order('store')
      setItems(shoppingItems || [])
      setLoading(false)
    }
    load()
  }, [router])

  // Wake Lock — förhindra att skärmen slocknar
  useEffect(() => {
    async function requestWakeLock() {
      if (!('wakeLock' in navigator)) return
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen')
      } catch (e) {
        // Wake lock ej tillgänglig (t.ex. låg batterinivå)
      }
    }
    requestWakeLock()
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) {
        try { wakeLockRef.current = await navigator.wakeLock.request('screen') } catch {}
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      wakeLockRef.current?.release()
    }
  }, [])

  const toggleItem = useCallback(async (item) => {
    const checked = !item.checked
    await supabase.from('shopping_items').update({ checked }).eq('id', item.id)
    setItems(prev => {
      const updated = prev.map(i => i.id === item.id ? { ...i, checked } : i)
      const allDone = updated.every(i => i.checked)
      if (allDone) setShowDoneModal(true)
      return updated
    })
  }, [])

  async function moveToPantry() {
    setMovingToPantry(true)
    const checkedItems = items.filter(i => i.checked)
    if (checkedItems.length === 0) { setMovingToPantry(false); setShowDoneModal(false); router.push('/pantry'); return }

    // Normalisera alla varor parallellt
    const normalizeResults = await Promise.allSettled(
      checkedItems.map(i =>
        fetch('/api/pantry/normalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: i.name, quantity: i.quantity, unit: i.unit }),
        }).then(r => r.ok ? r.json() : null)
      )
    )

    // Hämta befintliga pantry-poster
    const { data: pantryItems } = await supabase.from('pantry').select('id, normalized_name, quantity, unit, expires_at')
      .eq('household_id', householdId)
    const existingMap = (pantryItems || []).reduce((acc, p) => {
      if (p.normalized_name) acc[p.normalized_name] = p
      return acc
    }, {})

    for (let idx = 0; idx < checkedItems.length; idx++) {
      const item = checkedItems[idx]
      const normResult = normalizeResults[idx]
      const normalized_name = normResult.status === 'fulfilled' && normResult.value?.normalized_name
        ? normResult.value.normalized_name
        : item.name.toLowerCase().trim()
      const category = normResult.status === 'fulfilled' && normResult.value?.category
        ? normResult.value.category
        : 'Övrigt'

      const existing = existingMap[normalized_name]
      if (existing) {
        const updates = {}
        if (existing.unit === item.unit && item.quantity && existing.quantity) {
          const merged = parseFloat(existing.quantity) + parseFloat(item.quantity)
          if (!isNaN(merged)) updates.quantity = String(merged)
        }
        if (Object.keys(updates).length > 0) {
          await supabase.from('pantry').update(updates).eq('id', existing.id)
        }
      } else {
        await supabase.from('pantry').insert({
          household_id: householdId,
          name: item.name,
          quantity: item.quantity || null,
          unit: item.unit || null,
          normalized_name,
          category,
          source: 'shopping_checkout',
          added_at: new Date().toISOString(),
        })
        existingMap[normalized_name] = { normalized_name, quantity: item.quantity, unit: item.unit }
      }
    }

    setMovingToPantry(false)
    setShowDoneModal(false)
    router.push('/pantry')
  }

  function toggleCategory(cat) {
    setCollapsedCategories(prev => ({ ...prev, [cat]: !prev[cat] }))
  }

  function openMaps() {
    window.open('https://www.google.com/maps/search/mataffär+nära+mig', '_blank')
  }

  if (loading) return <ShoppingActiveSkeleton />

  const checkedCount = items.filter(i => i.checked).length
  const total = items.length
  const progress = total > 0 ? (checkedCount / total) * 100 : 0

  // Gruppera per kategori (använder store-fältet som innehåller kategorin)
  const grouped = items.reduce((acc, item) => {
    const cat = item.store || 'Övrigt'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 16px 80px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>Handlar från</p>
          <h1 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text)' }}>{list?.title}</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={openMaps} title="Navigera till butik" style={{ padding: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>
            🗺️
          </button>
          <Link href="/shopping" style={{ padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', textDecoration: 'none', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
            ← Lista
          </Link>
        </div>
      </div>

      {/* Progressbar */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>{checkedCount} av {total} varor klara</span>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{Math.round(progress)}%</span>
        </div>
        <div style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? 'var(--success)' : 'var(--accent)', borderRadius: '4px', transition: 'width 0.3s ease' }} />
        </div>
      </div>

      {/* Varulista */}
      {Object.entries(grouped).map(([category, catItems]) => (
        <div key={category} style={{ marginBottom: '20px' }}>
          <button
            onClick={() => toggleCategory(category)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0', marginBottom: '8px', textAlign: 'left' }}
          >
            <span style={{ fontSize: '16px' }}>{CATEGORY_EMOJI[category] || '🛒'}</span>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1 }}>{category}</span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {catItems.filter(i => i.checked).length}/{catItems.length} {collapsedCategories[category] ? '▸' : '▾'}
            </span>
          </button>

          {!collapsedCategories[category] && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {catItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '16px',
                    width: '100%', minHeight: '64px', padding: '14px 16px',
                    background: item.checked ? 'var(--bg)' : 'var(--bg-card)',
                    border: `1px solid ${item.checked ? 'var(--border)' : 'var(--border)'}`,
                    borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
                    opacity: item.checked ? 0.5 : 1, transition: 'opacity 0.2s',
                  }}
                >
                  <div style={{
                    width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${item.checked ? 'var(--success)' : 'var(--border)'}`,
                    background: item.checked ? 'var(--success)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: '14px',
                  }}>
                    {item.checked ? '✓' : ''}
                  </div>
                  <span style={{ flex: 1, fontSize: '16px', fontWeight: '500', color: 'var(--text)', textDecoration: item.checked ? 'line-through' : 'none' }}>
                    {item.name}
                  </span>
                  {(item.quantity || item.unit) && (
                    <span style={{ fontSize: '14px', color: 'var(--text-muted)', flexShrink: 0 }}>
                      {[item.quantity, item.unit].filter(Boolean).join(' ')}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      {items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>✅</p>
          <p>Listan är tom.</p>
          <Link href="/shopping" style={{ color: 'var(--accent)', fontSize: '14px', textDecoration: 'none', fontWeight: '500' }}>← Gå till inköpsplanering</Link>
        </div>
      )}

      {/* Modal: Flytta till skafferi */}
      {showDoneModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '20px', padding: '28px 24px', width: '100%', maxWidth: '480px', textAlign: 'center' }}>
            <p style={{ fontSize: '40px', marginBottom: '12px' }}>🎉</p>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: 'var(--text)' }}>Allt klart!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginBottom: '24px' }}>Vill du flytta de inhandlade varorna till skafferiet?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={moveToPantry}
                disabled={movingToPantry}
                style={{ padding: '16px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '16px', fontWeight: '600' }}
              >
                {movingToPantry ? <><Spinner />&nbsp;Flyttar...</> : '📦 Flytta till skafferiet'}
              </button>
              <button
                onClick={() => { setShowDoneModal(false); router.push('/') }}
                style={{ padding: '16px', background: 'none', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '12px', cursor: 'pointer', fontSize: '15px' }}
              >
                Hoppa över
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
