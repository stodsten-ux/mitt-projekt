'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Spinner from '../../components/Spinner'

const supabase = createClient()

const STORES = ['ICA', 'Willys', 'Coop', 'Lidl', 'Hemköp', 'Citygross', 'Netto']
const CONFIDENCE_COLOR = { hög: 'var(--success)', medel: 'var(--warning)', låg: 'var(--text-muted)' }
const URGENCY_BG = { hög: 'rgba(52,199,89,0.08)', medel: 'rgba(255,149,0,0.08)', låg: 'var(--bg-card)' }
const URGENCY_BORDER = { hög: 'var(--success)', medel: 'var(--warning)', låg: 'var(--border)' }

export default function CampaignsPage() {
  const [householdId, setHouseholdId] = useState(null)
  const [selectedStores, setSelectedStores] = useState([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: members } = await supabase.from('household_members').select('household_id').eq('user_id', user.id).limit(1)
      if (!members?.length) { router.push('/household'); return }
      const hid = members[0].household_id
      setHouseholdId(hid)
      const { data: prefs } = await supabase.from('household_preferences').select('preferred_stores').eq('household_id', hid).maybeSingle()
      const stores = prefs?.preferred_stores?.length ? prefs.preferred_stores : ['ICA', 'Willys']
      setSelectedStores(stores)
      setLoading(false)
    }
    load()
  }, [router])

  function toggleStore(store) {
    setSelectedStores(prev =>
      prev.includes(store) ? prev.filter(s => s !== store) : [...prev, store]
    )
  }

  async function fetchCampaigns() {
    if (selectedStores.length === 0) return
    setSearching(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stores: selectedStores, householdId, weekOffset }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) { setError(data.error || 'Något gick fel'); return }
      setResult(data)
    } catch {
      setError('Kunde inte hämta kampanjer.')
    } finally {
      setSearching(false)
    }
  }

  const byStore = (result?.campaigns || []).reduce((acc, c) => {
    if (!acc[c.store]) acc[c.store] = []
    acc[c.store].push(c)
    return acc
  }, {})

  if (loading) return <div style={{ padding: '40px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}><Spinner />Laddar...</div>

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }}>
      <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '14px' }}>← Startsidan</Link>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '16px', marginBottom: '6px', color: 'var(--text)' }}>🏷️ Kampanjer & erbjudanden</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '28px' }}>Se vilka kampanjer som troligen gäller och när det är bäst att handla.</p>

      {/* Veckoväljare */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[-1, 0, 1, 2].map(offset => (
          <button
            key={offset}
            onClick={() => setWeekOffset(offset)}
            style={{
              padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--border)',
              background: weekOffset === offset ? 'var(--accent)' : 'var(--bg-card)',
              color: weekOffset === offset ? 'var(--accent-text)' : 'var(--text)',
              cursor: 'pointer', fontSize: '13px', fontWeight: weekOffset === offset ? '600' : '400'
            }}
          >
            {offset === -1 ? 'Förra veckan' : offset === 0 ? 'Denna vecka' : offset === 1 ? 'Nästa vecka' : 'Om 2 veckor'}
          </button>
        ))}
      </div>

      {/* Butiksväljare */}
      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Butiker</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {STORES.map(store => (
            <button
              key={store}
              onClick={() => toggleStore(store)}
              style={{
                padding: '7px 14px', borderRadius: '20px',
                border: `1px solid ${selectedStores.includes(store) ? 'var(--accent)' : 'var(--border)'}`,
                background: selectedStores.includes(store) ? 'var(--accent)' : 'var(--bg-card)',
                color: selectedStores.includes(store) ? 'var(--accent-text)' : 'var(--text)',
                cursor: 'pointer', fontSize: '13px'
              }}
            >
              {store}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={fetchCampaigns}
        disabled={searching || selectedStores.length === 0}
        style={{
          width: '100%', padding: '14px', background: 'var(--accent)', color: 'var(--accent-text)',
          border: 'none', borderRadius: '10px', cursor: selectedStores.length === 0 ? 'default' : 'pointer',
          fontSize: '15px', fontWeight: '600', marginBottom: '28px',
          opacity: selectedStores.length === 0 ? 0.5 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
        }}
      >
        {searching ? <><Spinner />Hämtar kampanjer...</> : `🔍 Visa kampanjer — ${weekOffset === -1 ? 'förra veckan' : weekOffset === 0 ? 'denna vecka' : weekOffset === 1 ? 'nästa vecka' : 'om 2 veckor'}`}
      </button>

      {error && (
        <div style={{ background: 'rgba(255,59,48,0.08)', border: '1px solid var(--danger)', borderRadius: '10px', padding: '14px', marginBottom: '20px', color: 'var(--danger)', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {result && (
        <>
          {result.seasonalTips && (
            <div style={{ background: 'rgba(0,122,255,0.06)', border: '1px solid rgba(0,122,255,0.2)', borderRadius: '10px', padding: '14px 16px', marginBottom: '24px', fontSize: '14px', color: 'var(--text)' }}>
              🌿 {result.seasonalTips}
            </div>
          )}

          {result.recommendations?.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <h2 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Inköpsrekommendationer</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {result.recommendations.map((rec, i) => (
                  <div key={i} style={{
                    background: URGENCY_BG[rec.urgency] || 'var(--bg-card)',
                    border: `1px solid ${URGENCY_BORDER[rec.urgency] || 'var(--border)'}`,
                    borderRadius: '10px', padding: '14px 16px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text)', marginBottom: '4px' }}>
                          {rec.item}
                          {rec.bestStore && <span style={{ fontWeight: '400', color: 'var(--text-muted)', marginLeft: '8px', fontSize: '13px' }}>→ {rec.bestStore}</span>}
                        </p>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{rec.reason}</p>
                      </div>
                      <span style={{
                        padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', flexShrink: 0,
                        background: rec.urgency === 'hög' ? 'var(--success)' : rec.urgency === 'medel' ? 'var(--warning)' : 'var(--border)',
                        color: 'white'
                      }}>{rec.action}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Object.entries(byStore).length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <h2 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>Kampanjer per butik</h2>
              {Object.entries(byStore).map(([store, campaigns]) => (
                <div key={store} style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>{store}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {campaigns.map((c, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text)' }}>{c.item}</p>
                          {c.regularPrice && <p style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>{c.regularPrice}</p>}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--success)' }}>{c.campaignPrice}</p>
                          {c.savings && <p style={{ fontSize: '12px', color: 'var(--success)' }}>Spara {c.savings}</p>}
                        </div>
                        <div
                          style={{ width: '8px', height: '8px', borderRadius: '50%', background: CONFIDENCE_COLOR[c.confidence] || 'var(--text-muted)', flexShrink: 0 }}
                          title={`Tillförlitlighet: ${c.confidence}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {result.campaigns?.length === 0 && (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0', fontSize: '14px' }}>
              Inga kampanjer hittades för valda butiker.
            </p>
          )}

          {result.disclaimer && (
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              ⚠️ {result.disclaimer}
            </p>
          )}
        </>
      )}
    </div>
  )
}
