'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Spinner from '../../components/Spinner'
import { useHousehold } from '../../lib/hooks/useHousehold'
import { usePantry } from '../../lib/hooks/usePantry'

export default function PanicPage() {
  return (
    <Suspense fallback={<div className="loading-screen"><Spinner />Laddar...</div>}>
      <PanicContent />
    </Suspense>
  )
}

function PanicContent() {
  const { householdId, isLoading: authLoading } = useHousehold()
  const { items: pantryItems, isLoading: pantryLoading } = usePantry(householdId)
  const [selected, setSelected] = useState({})
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState(null)
  const [resultSource, setResultSource] = useState(null)
  const searchParams = useSearchParams()

  const loading = authLoading || pantryLoading

  useEffect(() => {
    if (pantryLoading || pantryItems.length === 0) return

    const preselected = searchParams.get('items')
    const initial = {}
    if (preselected) {
      const names = preselected.split(',').map(n => decodeURIComponent(n).toLowerCase())
      pantryItems.forEach(i => { initial[i.id] = names.includes(i.name.toLowerCase()) })
    } else {
      pantryItems.forEach(i => { initial[i.id] = true })
    }
    setSelected(initial)
  }, [pantryItems, pantryLoading, searchParams])

  function toggleItem(id) {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function selectAll() {
    const all = {}
    pantryItems.forEach(i => { all[i.id] = true })
    setSelected(all)
  }

  function selectNone() {
    setSelected({})
  }

  async function findRecipes() {
    const chosenItems = pantryItems.filter(i => selected[i.id])
    if (chosenItems.length === 0) return
    setSearching(true)
    setResults(null)
    const query = chosenItems.map(i => [i.name, i.quantity, i.unit].filter(Boolean).join(' ')).join(', ')
    const response = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `Recept med: ${query}`,
        householdId,
      }),
    })
    const data = await response.json()
    setResults(data.recipes || [])
    setResultSource(data.source || null)
    setSearching(false)
  }

  if (loading) return <div className="loading-screen"><Spinner />Laddar...</div>

  const selectedCount = Object.values(selected).filter(Boolean).length

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }}>
      <Link href="/pantry" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '14px' }}>← Skafferiet</Link>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '16px', marginBottom: '8px', color: 'var(--text)' }}>🆘 Vad kan jag laga?</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginBottom: '28px' }}>Välj vad du har hemma så hittar vi ett recept åt dig.</p>

      {pantryItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>🥦</p>
          <p style={{ marginBottom: '16px' }}>Skafferiet är tomt.</p>
          <Link href="/pantry" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}>Lägg till varor i skafferiet →</Link>
        </div>
      ) : (
        <>
          {/* Välj alla / inga */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button onClick={selectAll} style={{ padding: '7px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text)' }}>Välj alla</button>
            <button onClick={selectNone} style={{ padding: '7px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text)' }}>Välj inga</button>
          </div>

          {/* Varulista med checkboxar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px' }}>
            {pantryItems.map(item => {
              const daysLeft = item.expires_at
                ? Math.ceil((new Date(item.expires_at) - new Date()) / 86400000)
                : null
              const isExpiringSoon = daysLeft !== null && daysLeft <= 2
              const expiryLabel = daysLeft === null ? null
                : daysLeft < 0 ? 'Utgånget'
                : daysLeft === 0 ? 'Idag'
                : daysLeft === 1 ? 'Imorgon'
                : `${daysLeft}d`
              return (
                <div
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 16px', background: 'var(--bg-card)', border: `1px solid ${selected[item.id] ? 'var(--accent)' : isExpiringSoon ? 'var(--warning)' : 'var(--border)'}`, borderRadius: '10px', cursor: 'pointer' }}
                >
                  <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: `2px solid ${selected[item.id] ? 'var(--accent)' : 'var(--border)'}`, background: selected[item.id] ? 'var(--accent)' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-text)', fontSize: '12px' }}>
                    {selected[item.id] ? '✓' : ''}
                  </div>
                  <span style={{ fontSize: '15px', color: 'var(--text)', fontWeight: '500', flex: 1 }}>{item.name}</span>
                  {(item.quantity || item.unit) && (
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {[item.quantity, item.unit].filter(Boolean).join(' ')}
                    </span>
                  )}
                  {expiryLabel && (
                    <span style={{ fontSize: '11px', fontWeight: '600', color: isExpiringSoon ? 'var(--warning)' : 'var(--text-muted)', background: isExpiringSoon ? 'rgba(255,149,0,0.1)' : 'var(--bg)', border: `1px solid ${isExpiringSoon ? 'var(--warning)' : 'var(--border)'}`, borderRadius: '6px', padding: '2px 6px', flexShrink: 0 }}>
                      ⚠️ {expiryLabel}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          <button
            onClick={findRecipes}
            disabled={searching || selectedCount === 0}
            style={{ width: '100%', padding: '14px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: '10px', cursor: selectedCount === 0 ? 'default' : 'pointer', fontSize: '15px', fontWeight: '600', marginBottom: '24px', opacity: selectedCount === 0 ? 0.5 : 1 }}
          >
            {searching ? <><Spinner />&nbsp;Söker recept...</> : `🔍 Hitta recept med ${selectedCount} vara${selectedCount !== 1 ? 'r' : ''}`}
          </button>

          {/* Resultat */}
          {results !== null && (
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: '600', marginBottom: '14px', color: 'var(--text)' }}>
                {results.length === 0 ? 'Inga recept hittades' : `Recept${resultSource === 'ai' ? ' (AI-genererat)' : resultSource === 'shared' ? ' från receptbiblioteket' : ''}`}
              </h2>
              {results.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Prova att markera fler varor eller ta bort några begränsningar.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {results.map((r, i) => (
                    <div key={r.id || i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '6px', color: 'var(--text)' }}>{r.title}</h3>
                      {r.description && <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '12px' }}>{r.description}</p>}
                      {r.id && (
                        <Link href={`/recipes/${r.id}`} style={{ display: 'inline-block', padding: '8px 16px', background: 'var(--accent)', color: 'var(--accent-text)', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}>
                          Visa recept →
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
