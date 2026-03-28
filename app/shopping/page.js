'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const supabase = createClient()

export default function ShoppingPage() {
  const [user, setUser] = useState(null)
  const [householdId, setHouseholdId] = useState(null)
  const [lists, setLists] = useState([])
  const [activeList, setActiveList] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [addName, setAddName] = useState('')
  const [addCategory, setAddCategory] = useState('Övrigt')
  const [showAdd, setShowAdd] = useState(false)
  const [weeklyBudget, setWeeklyBudget] = useState(null)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUser(user)

      const { data: members } = await supabase
        .from('household_members')
        .select('household_id, households(weekly_budget)')
        .eq('user_id', user.id)
        .limit(1)

      if (!members || members.length === 0) { router.push('/household'); return }
      const hid = members[0].household_id
      setHouseholdId(hid)
      setWeeklyBudget(members[0].households?.weekly_budget || null)

      const { data: shoppingLists } = await supabase
        .from('shopping_lists')
        .select('id, title, created_at')
        .eq('household_id', hid)
        .order('created_at', { ascending: false })

      setLists(shoppingLists || [])

      if (shoppingLists && shoppingLists.length > 0) {
        await loadItems(shoppingLists[0].id)
        setActiveList(shoppingLists[0])
      }

      setLoading(false)
    }
    load()
  }, [router])

  async function loadItems(listId) {
    const { data } = await supabase
      .from('shopping_items')
      .select('*')
      .eq('shopping_list_id', listId)
      .order('store')
    setItems(data || [])
  }

  async function switchList(list) {
    setActiveList(list)
    await loadItems(list.id)
  }

  async function toggleItem(item) {
    const checked = !item.checked
    await supabase.from('shopping_items').update({ checked }).eq('id', item.id)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked } : i))

    if (checked) {
      await supabase.from('pantry').insert({
        household_id: householdId,
        name: item.name,
        quantity: item.quantity || null,
        unit: item.unit || null,
      })
    }
  }

  async function addItem() {
    if (!addName.trim() || !activeList) return
    const { data } = await supabase
      .from('shopping_items')
      .insert({
        shopping_list_id: activeList.id,
        name: addName.trim(),
        store: addCategory,
        checked: false,
      })
      .select()
      .single()

    if (data) setItems(prev => [...prev, data])
    setAddName('')
    setShowAdd(false)
  }

  async function deleteItem(id) {
    await supabase.from('shopping_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function optimizeWithAi() {
    if (!activeList || items.length === 0) return
    setAiLoading(true)

    const itemList = items.map(i => i.name).join(', ')
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Jag ska handla följande varor: ${itemList}. Budget: ${weeklyBudget ? weeklyBudget + ' kr' : 'okänd'}. Ge mig 3–5 konkreta tips på hur jag kan handla smartare och billigare — t.ex. billigare alternativ, vad som är bäst att köpa fryst, storpack som lönar sig, eller säsongsanpassningar. Håll det kort och praktiskt.`,
        householdId,
      }),
    })
    const data = await response.json()
    alert(data.content || 'Inga förslag just nu.')
    setAiLoading(false)
  }

  async function createEmptyList() {
    const title = `Inköpslista ${new Date().toLocaleDateString('sv-SE')}`
    const { data } = await supabase
      .from('shopping_lists')
      .insert({ household_id: householdId, title, created_by: user.id })
      .select()
      .single()

    if (data) {
      setLists(prev => [data, ...prev])
      setActiveList(data)
      setItems([])
    }
  }

  if (loading) return <div style={{ padding: '40px' }}>Laddar...</div>

  // Gruppera per kategori
  const grouped = items.reduce((acc, item) => {
    const cat = item.store || 'Övrigt'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  const totalEstimated = items.reduce((sum, i) => sum + (parseFloat(i.price) || 0), 0)
  const checkedCount = items.filter(i => i.checked).length

  const CATEGORIES = ['Frukt & grönt', 'Mejeri', 'Kött & fisk', 'Torrvaror', 'Bröd & bakverk', 'Fryst', 'Dryck', 'Övrigt']

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '40px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>🛍️ Inköpslista</h1>
        <Link href="/" style={{ color: '#666', textDecoration: 'none' }}>← Tillbaka</Link>
      </div>

      {/* Listväljare */}
      {lists.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '20px', paddingBottom: '4px' }}>
          {lists.map(list => (
            <button
              key={list.id}
              onClick={() => switchList(list)}
              style={{ padding: '7px 14px', background: activeList?.id === list.id ? '#000' : '#f1f1f1', color: activeList?.id === list.id ? '#fff' : '#333', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {list.title}
            </button>
          ))}
        </div>
      )}

      {/* Ingen lista */}
      {lists.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>🛒</p>
          <p style={{ marginBottom: '20px' }}>Ingen inköpslista än. Generera en från veckomenyn eller skapa en tom lista.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px', margin: '0 auto' }}>
            <Link href="/menu" style={{ padding: '13px', background: '#000', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}>
              📅 Gå till Veckomenyn
            </Link>
            <button
              onClick={createEmptyList}
              style={{ padding: '13px', background: '#fff', color: '#000', border: '1px solid #e5e5e5', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
            >
              + Skapa tom lista
            </button>
          </div>
        </div>
      )}

      {activeList && (
        <>
          {/* Status & budget */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{ background: '#f9f9f9', borderRadius: '10px', padding: '12px 16px', flex: 1, minWidth: '120px' }}>
              <p style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Bockat</p>
              <p style={{ fontWeight: '600', fontSize: '18px' }}>{checkedCount}/{items.length}</p>
            </div>
            {weeklyBudget && (
              <div style={{ background: totalEstimated > weeklyBudget ? '#fff0f0' : '#f0fdf4', borderRadius: '10px', padding: '12px 16px', flex: 1, minWidth: '120px' }}>
                <p style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Estimerat / Budget</p>
                <p style={{ fontWeight: '600', fontSize: '18px', color: totalEstimated > weeklyBudget ? '#cc0000' : '#166534' }}>
                  {totalEstimated > 0 ? `${Math.round(totalEstimated)} kr / ` : ''}{weeklyBudget} kr
                </p>
              </div>
            )}
          </div>

          {/* Åtgärdsknappar */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
            <button
              onClick={() => setShowAdd(v => !v)}
              style={{ flex: 1, padding: '11px', background: '#000', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
            >
              {showAdd ? 'Avbryt' : '+ Lägg till vara'}
            </button>
            <button
              onClick={optimizeWithAi}
              disabled={aiLoading || items.length === 0}
              style={{ flex: 1, padding: '11px', background: '#fff', color: items.length === 0 ? '#aaa' : '#000', border: '1px solid #e5e5e5', borderRadius: '10px', cursor: items.length === 0 ? 'default' : 'pointer', fontSize: '14px', fontWeight: '500' }}
            >
              {aiLoading ? 'Optimerar...' : '✨ AI-optimera inköpen'}
            </button>
          </div>

          {/* Lägg till vara */}
          {showAdd && (
            <div style={{ background: '#f9f9f9', borderRadius: '12px', padding: '16px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                type="text"
                value={addName}
                onChange={e => setAddName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addItem() }}
                placeholder="Varunamn"
                autoFocus
                style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
              />
              <select
                value={addCategory}
                onChange={e => setAddCategory(e.target.value)}
                style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', background: '#fff' }}
              >
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <button
                onClick={addItem}
                disabled={!addName.trim()}
                style={{ padding: '10px', background: '#000', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
              >
                Lägg till
              </button>
            </div>
          )}

          {/* Varor grupperade per kategori */}
          {Object.keys(grouped).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
              <p>Listan är tom. Lägg till varor manuellt eller generera från veckomenyn.</p>
            </div>
          ) : (
            Object.entries(grouped).map(([category, catItems]) => (
              <div key={category} style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{category}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {catItems.map(item => (
                    <div
                      key={item.id}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: '#fff', border: '1px solid #e5e5e5', borderRadius: '10px', opacity: item.checked ? 0.5 : 1 }}
                    >
                      <button
                        onClick={() => toggleItem(item)}
                        style={{ width: '22px', height: '22px', borderRadius: '50%', border: `2px solid ${item.checked ? '#000' : '#ccc'}`, background: item.checked ? '#000' : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px' }}
                      >
                        {item.checked ? '✓' : ''}
                      </button>
                      <span style={{ flex: 1, fontSize: '15px', textDecoration: item.checked ? 'line-through' : 'none' }}>
                        {item.name}
                        {item.quantity && <span style={{ color: '#999', fontSize: '13px', marginLeft: '6px' }}>{item.quantity}{item.unit ? ` ${item.unit}` : ''}</span>}
                      </span>
                      {item.price && <span style={{ fontSize: '13px', color: '#666' }}>{item.price} kr</span>}
                      <button
                        onClick={() => deleteItem(item.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ddd', fontSize: '18px', padding: '0 2px', lineHeight: 1 }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}

          {/* Ny lista-knapp */}
          <div style={{ marginTop: '32px', borderTop: '1px solid #e5e5e5', paddingTop: '20px' }}>
            <button
              onClick={createEmptyList}
              style={{ width: '100%', padding: '12px', background: '#fff', color: '#666', border: '1px solid #e5e5e5', borderRadius: '10px', cursor: 'pointer', fontSize: '14px' }}
            >
              + Skapa ny tom lista
            </button>
          </div>
        </>
      )}
    </div>
  )
}
