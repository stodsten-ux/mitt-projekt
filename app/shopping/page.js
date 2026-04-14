'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Spinner from '../../components/Spinner'
import ShoppingSkeleton from '../../components/skeletons/ShoppingSkeleton'
import { useHousehold } from '../../lib/hooks/useHousehold'
import { useShoppingLists, useShoppingItems } from '../../lib/hooks/useShoppingList'

const supabase = createClient()

const CATEGORIES = ['Frukt & grönt', 'Mejeri', 'Kött & fisk', 'Torrvaror', 'Bröd & bakverk', 'Fryst', 'Dryck', 'Övrigt']

export default function ShoppingPage() {
  const { user, householdId, householdData, isLoading: authLoading } = useHousehold()
  const { lists, isLoading: listsLoading, mutate: mutateLists } = useShoppingLists(householdId)
  const [activeListId, setActiveListId] = useState(null)

  // Auto-select first list
  const effectiveActiveListId = activeListId ?? lists[0]?.id ?? null
  const activeList = lists.find(l => l.id === effectiveActiveListId) ?? null

  const { items, isLoading: itemsLoading, mutate: mutateItems } = useShoppingItems(effectiveActiveListId)

  const weeklyBudget = householdData?.weekly_budget ?? null
  const [preferredStores, setPreferredStores] = useState([])

  const [aiLoading, setAiLoading] = useState(false)
  const [priceLoading, setPriceLoading] = useState(false)
  const [priceResults, setPriceResults] = useState(null)
  const [campaignLoading, setCampaignLoading] = useState(false)
  const [campaignResults, setCampaignResults] = useState(null)
  const [nextWeekLoading, setNextWeekLoading] = useState(false)
  const [nextWeekResults, setNextWeekResults] = useState(null)
  const [addName, setAddName] = useState('')
  const [addCategory, setAddCategory] = useState('Övrigt')
  const [showAdd, setShowAdd] = useState(false)
  const [useMathem, setUseMathem] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!householdId) return
    supabase.from('household_preferences').select('preferred_stores').eq('household_id', householdId).single()
      .then(({ data }) => {
        if (data?.preferred_stores?.length) setPreferredStores(data.preferred_stores)
      })
  }, [householdId])

  const loading = authLoading || listsLoading

  function switchList(list) { setActiveListId(list.id) }

  async function toggleItem(item) {
    const checked = !item.checked
    await supabase.from('shopping_items').update({ checked }).eq('id', item.id)
    mutateItems()
    if (checked) {
      await supabase.from('pantry').insert({ household_id: householdId, name: item.name, quantity: item.quantity || null, unit: item.unit || null })
    }
  }

  async function addItem() {
    if (!addName.trim() || !activeList) return
    await supabase.from('shopping_items').insert({ shopping_list_id: activeList.id, name: addName.trim(), store: addCategory, checked: false, category: useMathem ? 'online' : null })
    mutateItems()
    setAddName('')
    setShowAdd(false)
  }

  async function toggleOnline(item) {
    const isOnline = item.category === 'online'
    await supabase.from('shopping_items').update({ category: isOnline ? null : 'online' }).eq('id', item.id)
    mutateItems()
  }

  async function deleteItem(id) {
    mutateItems(items.filter(i => i.id !== id), false)
    await supabase.from('shopping_items').delete().eq('id', id)
    mutateItems()
  }

  async function optimizeWithAi() {
    if (!activeList || items.length === 0) return
    setAiLoading(true)
    const itemList = items.map(i => i.name).join(', ')
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Jag ska handla följande varor: ${itemList}. Budget: ${weeklyBudget ? weeklyBudget + ' kr' : 'okänd'}. Ge mig 3–5 konkreta tips på hur jag kan handla smartare och billigare. Håll det kort och praktiskt.`,
        householdId,
      }),
    })
    const data = await response.json()
    alert(data.content || 'Inga förslag just nu.')
    setAiLoading(false)
  }

  async function findBestPrices() {
    if (!activeList || items.length === 0) return
    setPriceLoading(true)
    setPriceResults(null)
    const uncheckedItems = items.filter(i => !i.checked)
    const response = await fetch('/api/prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: uncheckedItems.map(i => i.name), stores: preferredStores, includeCampaigns: true }),
    })
    const data = await response.json()
    if (data.items) {
      setPriceResults(data)
      // Skriv tillbaka numeriska priser till shopping_items
      const updates = []
      for (const priceItem of data.items) {
        if (!priceItem.numericPrice) continue
        const match = uncheckedItems.find(i => i.name.toLowerCase() === priceItem.name.toLowerCase())
        if (!match) continue
        let itemPrice = priceItem.numericPrice
        // Räkna om pris baserat på kvantitet och enhet
        if (match.quantity && priceItem.unit === 'kg') {
          const qty = parseFloat(match.quantity)
          if (!isNaN(qty)) {
            const qtyKg = match.unit?.toLowerCase() === 'g' ? qty / 1000 : qty
            itemPrice = Math.round(priceItem.numericPrice * qtyKg * 100) / 100
          }
        } else if (match.quantity) {
          const qty = parseFloat(match.quantity)
          if (!isNaN(qty)) itemPrice = Math.round(priceItem.numericPrice * qty * 100) / 100
        }
        updates.push({ id: match.id, price: itemPrice })
      }
      // Uppdatera DB och state
      for (const u of updates) {
        await supabase.from('shopping_items').update({ price: u.price }).eq('id', u.id)
      }
      if (updates.length > 0) {
        mutateItems()
      }
    } else {
      alert('Kunde inte hämta prisinformation.')
    }
    setPriceLoading(false)
  }

  async function fetchCampaignTips() {
    if (!activeList || items.length === 0) return
    setCampaignLoading(true)
    setCampaignResults(null)
    const uncheckedItems = items.filter(i => !i.checked).map(i => i.name)
    const response = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: uncheckedItems, stores: preferredStores, householdId, weekOffset: 0 }),
    })
    const data = await response.json()
    if (data.success) setCampaignResults(data)
    else alert('Kunde inte hämta kampanjtips.')
    setCampaignLoading(false)
  }

  async function fetchNextWeekCampaigns() {
    if (!activeList) return
    setNextWeekLoading(true)
    setNextWeekResults(null)
    const uncheckedItems = items.filter(i => !i.checked).map(i => i.name)
    const response = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: uncheckedItems, stores: preferredStores, householdId, weekOffset: 1 }),
    })
    const data = await response.json()
    if (data.success) setNextWeekResults(data)
    else alert('Kunde inte hämta nästa veckas erbjudanden.')
    setNextWeekLoading(false)
  }

  async function createEmptyList() {
    const title = `Inköpslista ${new Date().toLocaleDateString('sv-SE')}`
    const { data } = await supabase.from('shopping_lists').insert({ household_id: householdId, title, created_by: user.id }).select().single()
    if (data) {
      await mutateLists()
      setActiveListId(data.id)
    }
  }

  if (loading) return <ShoppingSkeleton />

  const grouped = items.reduce((acc, item) => {
    const cat = item.store || 'Övrigt'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  const totalEstimated = items.reduce((sum, i) => sum + (parseFloat(i.price) || 0), 0)
  const checkedCount = items.filter(i => i.checked).length

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '28px', color: 'var(--text)' }}>🛍️ Inköpslista</h1>

      {/* Listväljare */}
      {lists.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '20px', paddingBottom: '4px' }}>
          {lists.map(list => (
            <button key={list.id} onClick={() => switchList(list)} style={{ padding: '7px 14px', background: activeList?.id === list.id ? 'var(--accent)' : 'var(--bg-card)', color: activeList?.id === list.id ? 'var(--accent-text)' : 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {list.title}
            </button>
          ))}
        </div>
      )}

      {/* Ingen lista */}
      {lists.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>🛒</p>
          <p style={{ marginBottom: '20px' }}>Ingen inköpslista än. Generera en från veckomenyn eller skapa en tom lista.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px', margin: '0 auto' }}>
            <Link href="/menu" style={{ padding: '13px', background: 'var(--accent)', color: 'var(--accent-text)', borderRadius: '10px', textDecoration: 'none', fontSize: '14px', fontWeight: '600', display: 'block' }}>
              📅 Gå till Veckomenyn
            </Link>
            <button onClick={createEmptyList} style={{ padding: '13px', background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
              + Skapa tom lista
            </button>
          </div>
        </div>
      )}

      {activeList && (
        <>
          {/* Status & budget */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 16px', flex: 1, minWidth: '120px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Bockat</p>
              <p style={{ fontWeight: '600', fontSize: '18px', color: 'var(--text)' }}>{checkedCount}/{items.length}</p>
            </div>
            <div style={{ background: 'var(--bg-card)', border: `1px solid ${weeklyBudget && totalEstimated > weeklyBudget ? 'var(--danger)' : 'var(--border)'}`, borderRadius: '10px', padding: '12px 16px', flex: 1, minWidth: '120px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{weeklyBudget ? 'Estimerat / Budget' : 'Estimerat pris'}</p>
              <p style={{ fontWeight: '600', fontSize: '18px', color: weeklyBudget && totalEstimated > weeklyBudget ? 'var(--danger)' : totalEstimated > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                {totalEstimated > 0 ? `${totalEstimated.toFixed(2)} kr` : 'Ej beräknat'}{weeklyBudget ? ` / ${weeklyBudget} kr` : ''}
              </p>
            </div>
          </div>

          {/* Åtgärdsknappar */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <button onClick={() => setShowAdd(v => !v)} style={{ flex: 1, minWidth: '140px', padding: '11px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
              {showAdd ? 'Avbryt' : '+ Lägg till vara'}
            </button>
            <button onClick={optimizeWithAi} disabled={aiLoading || items.length === 0} style={{ flex: 1, minWidth: '140px', padding: '11px', background: 'var(--bg-card)', color: items.length === 0 ? 'var(--text-muted)' : 'var(--text)', border: '1px solid var(--border)', borderRadius: '10px', cursor: items.length === 0 ? 'default' : 'pointer', fontSize: '14px', fontWeight: '500' }}>
              {aiLoading ? <><Spinner />&nbsp;Optimerar...</> : '✨ AI-tips'}
            </button>
            <button onClick={findBestPrices} disabled={priceLoading || items.filter(i => !i.checked).length === 0} style={{ flex: 1, minWidth: '140px', padding: '11px', background: 'var(--bg-card)', color: items.length === 0 ? 'var(--text-muted)' : 'var(--text)', border: '1px solid var(--border)', borderRadius: '10px', cursor: items.length === 0 ? 'default' : 'pointer', fontSize: '14px', fontWeight: '500' }}>
              {priceLoading ? <><Spinner />&nbsp;Söker priser...</> : '💰 Hitta bästa pris'}
            </button>
            <button onClick={fetchCampaignTips} disabled={campaignLoading || items.filter(i => !i.checked).length === 0} style={{ flex: 1, minWidth: '140px', padding: '11px', background: 'var(--bg-card)', color: items.length === 0 ? 'var(--text-muted)' : 'var(--text)', border: '1px solid var(--border)', borderRadius: '10px', cursor: items.length === 0 ? 'default' : 'pointer', fontSize: '14px', fontWeight: '500' }}>
              {campaignLoading ? <><Spinner />&nbsp;Söker tips...</> : '🏷️ Kampanjtips'}
            </button>
            <button onClick={fetchNextWeekCampaigns} disabled={nextWeekLoading} style={{ flex: 1, minWidth: '140px', padding: '11px', background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
              {nextWeekLoading ? <><Spinner />&nbsp;Söker...</> : '📅 Nästa vecka'}
            </button>
          </div>

          {/* Prisresultat */}
          {priceResults && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)' }}>💰 Prisjämförelse</h3>
                <button onClick={() => setPriceResults(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '18px', lineHeight: 1 }}>×</button>
              </div>
              {priceResults.weeklyTip && (
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px', fontSize: '13px', color: 'var(--text)' }}>
                  💡 {priceResults.weeklyTip}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                {priceResults.items?.map((item, i) => (
                  <div key={i} style={{ padding: '10px 0', borderBottom: i < priceResults.items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '14px', color: 'var(--text)', fontWeight: '500' }}>{item.name}</span>
                        {item.tip && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.tip}</p>}
                        {item.campaign && <p style={{ fontSize: '12px', color: 'var(--warning)', marginTop: '2px' }}>🏷️ {item.campaign}</p>}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                        <span style={{ fontSize: '14px', color: 'var(--success)', fontWeight: '600' }}>{item.bestPrice}</span>
                        {item.store && <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.store}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {priceResults.disclaimer && (
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>{priceResults.disclaimer}</p>
              )}
            </div>
          )}

          {campaignResults && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)' }}>🏷️ Kampanjtips</h3>
                <button onClick={() => setCampaignResults(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '18px', lineHeight: 1 }}>×</button>
              </div>
              {campaignResults.seasonalTips && (
                <div style={{ background: 'rgba(0,122,255,0.06)', border: '1px solid rgba(0,122,255,0.2)', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px', fontSize: '13px', color: 'var(--text)' }}>
                  🌿 {campaignResults.seasonalTips}
                </div>
              )}
              {campaignResults.recommendations?.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                  {campaignResults.recommendations.map((rec, i) => (
                    <div key={i} style={{ padding: '10px 0', borderBottom: i < campaignResults.recommendations.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text)' }}>
                            {rec.item}
                            {rec.bestStore && <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}> → {rec.bestStore}</span>}
                          </p>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{rec.reason}</p>
                        </div>
                        <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: rec.urgency === 'hög' ? 'var(--success)' : rec.urgency === 'medel' ? 'var(--warning)' : 'var(--border)', color: 'white', flexShrink: 0 }}>
                          {rec.action}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <a href="/campaigns" style={{ fontSize: '13px', color: 'var(--accent)', textDecoration: 'none', fontWeight: '500' }}>
                Visa alla kampanjer →
              </a>
              {campaignResults.disclaimer && (
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '10px' }}>{campaignResults.disclaimer}</p>
              )}
            </div>
          )}

          {nextWeekResults && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)' }}>📅 Nästa veckas erbjudanden</h3>
                <button onClick={() => setNextWeekResults(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '18px', lineHeight: 1 }}>×</button>
              </div>
              {nextWeekResults.seasonalTips && (
                <div style={{ background: 'rgba(0,122,255,0.06)', border: '1px solid rgba(0,122,255,0.2)', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px', fontSize: '13px', color: 'var(--text)' }}>
                  🌿 {nextWeekResults.seasonalTips}
                </div>
              )}
              {nextWeekResults.campaigns?.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                  {nextWeekResults.campaigns.map((c, i) => (
                    <div key={i} style={{ padding: '10px 0', borderBottom: i < nextWeekResults.campaigns.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text)' }}>{c.item} <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>— {c.store}</span></p>
                          {c.campaignPrice && <p style={{ fontSize: '12px', color: 'var(--success)', marginTop: '2px' }}>{c.campaignPrice} {c.savings && `(spara ${c.savings})`}</p>}
                        </div>
                        {c.confidence && <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0, marginLeft: '8px' }}>{c.confidence} sannolikhet</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {nextWeekResults.recommendations?.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {nextWeekResults.recommendations.map((rec, i) => (
                    <p key={i} style={{ fontSize: '13px', color: 'var(--text-muted)' }}>💡 {rec.item}: {rec.reason}</p>
                  ))}
                </div>
              )}
              {nextWeekResults.disclaimer && (
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '10px' }}>{nextWeekResults.disclaimer}</p>
              )}
            </div>
          )}

          {/* Lägg till vara */}
          {showAdd && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="text" value={addName} onChange={e => setAddName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addItem() }} placeholder="Varunamn" autoFocus style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '14px', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none' }} />
              <select value={addCategory} onChange={e => setAddCategory(e.target.value)} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '14px', background: 'var(--input-bg)', color: 'var(--text)' }}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <input type="checkbox" checked={useMathem} onChange={e => setUseMathem(e.target.checked)} style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }} />
                Beställ via Mathem.se
              </label>
              <button onClick={addItem} disabled={!addName.trim()} style={{ padding: '10px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>Lägg till</button>
            </div>
          )}

          {/* Varor per kategori */}
          {Object.keys(grouped).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <p>Listan är tom. Lägg till varor manuellt eller generera från veckomenyn.</p>
            </div>
          ) : (
            Object.entries(grouped).map(([category, catItems]) => (
              <div key={category} style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>{category}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {catItems.map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', opacity: item.checked ? 0.5 : 1 }}>
                      <button onClick={() => toggleItem(item)} style={{ width: '22px', height: '22px', borderRadius: '50%', border: `2px solid ${item.checked ? 'var(--accent)' : 'var(--border)'}`, background: item.checked ? 'var(--accent)' : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-text)', fontSize: '12px' }}>
                        {item.checked ? '✓' : ''}
                      </button>
                      <span style={{ flex: 1, fontSize: '15px', color: 'var(--text)', textDecoration: item.checked ? 'line-through' : 'none' }}>
                        {item.name}
                        {item.quantity && <span style={{ color: 'var(--text-muted)', fontSize: '13px', marginLeft: '6px' }}>{item.quantity}{item.unit ? ` ${item.unit}` : ''}</span>}
                        {item.category === 'online' && <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--accent)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px', padding: '1px 6px' }}>📦 Mathem</span>}
                      </span>
                      {item.price && <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{parseFloat(item.price).toFixed(2)} kr</span>}
                      <button onClick={() => toggleOnline(item)} title={item.category === 'online' ? 'Ta bort Mathem' : 'Beställ via Mathem'} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '0 2px', opacity: item.category === 'online' ? 1 : 0.3 }}>📦</button>
                      <button onClick={() => deleteItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--border)', fontSize: '18px', padding: '0 2px', lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}

          <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <button onClick={createEmptyList} style={{ width: '100%', padding: '12px', background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '10px', cursor: 'pointer', fontSize: '14px' }}>
              + Skapa ny tom lista
            </button>
          </div>
        </>
      )}
    </div>
  )
}
