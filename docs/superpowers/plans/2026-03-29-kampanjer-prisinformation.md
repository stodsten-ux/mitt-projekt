# Kampanjer & Prisinformation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ge hushållet möjlighet att söka efter butikskampanjer per vecka, se när det är rätt tid att köpa specifika varor, och få inköpsrekommendationer direkt på inköpslistan.

**Architecture:** Ny `/api/campaigns` route hanterar kampanjsökning via Claude (baserat på träningsdata om svenska butiksmönster). En kampanjsida `/campaigns` låter användaren bläddra bland erbjudanden per butik. Inköpslistan (`/shopping`) utökas med en "Kampanjtips"-knapp som visar relevanta rekommendationer för varorna på listan.

**Tech Stack:** Next.js App Router, Anthropic claude-opus-4-6, Supabase (för hushållspreferenser), CSS-variabler för theming.

---

## Filstruktur

| Fil | Status | Ansvar |
|-----|--------|--------|
| `app/api/campaigns/route.js` | Skapa | Kampanjsökning — tar emot butiker + varor + datumintervall, returnerar kampanjlista + rekommendationer |
| `app/campaigns/page.js` | Skapa | Kampanjsida — välj butiker och vecka, visa erbjudanden per butik |
| `app/shopping/page.js` | Modifiera | Lägg till "Kampanjtips"-knapp + inline kampanjrekommendationer för varor på listan |

---

## Task 1: `/api/campaigns/route.js`

**Files:**
- Create: `app/api/campaigns/route.js`

- [ ] **Steg 1: Skapa route-filen**

```javascript
// app/api/campaigns/route.js
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

export async function POST(request) {
  try {
    const { stores, items, householdId, weekOffset = 0 } = await request.json()
    // weekOffset: 0 = denna vecka, 1 = nästa vecka, -1 = förra veckan

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    )

    // Hämta hushållets föredragna butiker om inte skickade
    let storeList = stores
    if (!storeList?.length && householdId) {
      const { data: prefs } = await supabase
        .from('household_preferences')
        .select('preferred_stores')
        .eq('household_id', householdId)
        .maybeSingle()
      storeList = prefs?.preferred_stores?.length ? prefs.preferred_stores : ['ICA', 'Willys', 'Coop', 'Lidl']
    }
    if (!storeList?.length) storeList = ['ICA', 'Willys', 'Coop', 'Lidl']

    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + weekOffset * 7)
    const weekNum = getISOWeek(targetDate)
    const year = targetDate.getFullYear()
    const weekLabel = `vecka ${weekNum} ${year}`

    const itemSection = items?.length
      ? `\nFokusera särskilt på kampanjer för dessa varor: ${items.slice(0, 15).join(', ')}.`
      : ''

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4000,
      system: `Du är en expert på svenska butikskedjors kampanjmönster och erbjudanden.
Du känner till typiska kampanjcykler för ICA, Willys, Coop, Lidl, Hemköp, Citygross och Netto.
Svara alltid på svenska. Ge konkreta och rimliga uppskattningar baserade på historiska mönster.`,
      messages: [{
        role: 'user',
        content: `Vilka kampanjer och erbjudanden kan man förvänta sig hos dessa butiker under ${weekLabel}: ${storeList.join(', ')}?${itemSection}

Inkludera även:
1. Vilka varor brukar vara på rea denna vecka på året (säsong, högtider etc.)
2. Om någon av de specifika varorna ovan brukar vara billigare en annan vecka — rekommendera när man bör köpa
3. Generella inköpstips för veckan

Returnera ENDAST detta JSON utan markdown:
{
  "weekLabel": "${weekLabel}",
  "campaigns": [
    {
      "store": "ICA",
      "item": "Kycklingfilé",
      "campaignPrice": "ca 45 kr/kg",
      "regularPrice": "ca 85 kr/kg",
      "savings": "ca 40 kr/kg",
      "period": "${weekLabel}",
      "confidence": "hög"
    }
  ],
  "recommendations": [
    {
      "item": "Kaffe",
      "action": "Köp nu",
      "reason": "Brukar vara på extrapris hos ICA varannan vecka, nästa tillfälle troligen om 2 veckor",
      "bestStore": "ICA",
      "urgency": "hög"
    }
  ],
  "seasonalTips": "Påskvecka — bra priser på ägg, lax och choklad hos de flesta butiker.",
  "disclaimer": "Kampanjerna är uppskattningar baserade på historiska mönster och kan avvika från faktiska priser."
}`,
      }],
    })

    const raw = message.content[0].text.trim()
    // Balanced-bracket JSON extraction
    const start = raw.indexOf('{')
    if (start === -1) return Response.json({ error: 'Inget JSON i AI-svar' }, { status: 500 })
    let depth = 0, end = -1
    for (let i = start; i < raw.length; i++) {
      if (raw[i] === '{') depth++
      else if (raw[i] === '}') { depth--; if (depth === 0) { end = i; break } }
    }
    if (end === -1) return Response.json({ error: 'Ofullständigt JSON från AI' }, { status: 500 })

    let result
    try { result = JSON.parse(raw.slice(start, end + 1)) }
    catch (e) { return Response.json({ error: 'Kunde inte tolka AI-svar' }, { status: 500 }) }

    if (!Array.isArray(result.campaigns)) return Response.json({ error: 'Oväntat format från AI' }, { status: 500 })

    return Response.json({ success: true, ...result })
  } catch (error) {
    console.error('campaigns error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
```

- [ ] **Steg 2: Verifiera att filen skapades**

```bash
ls app/api/campaigns/
# Förväntat: route.js
```

- [ ] **Steg 3: Commit**

```bash
git add app/api/campaigns/route.js
git commit -m "feat: lägg till /api/campaigns för kampanjsökning via AI"
```

---

## Task 2: `/campaigns/page.js` — Kampanjsida

**Files:**
- Create: `app/campaigns/page.js`

- [ ] **Steg 1: Skapa kampanjsidan**

```javascript
// app/campaigns/page.js
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
  const [preferredStores, setPreferredStores] = useState([])
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
      setPreferredStores(stores)
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
    } catch (e) {
      setError('Kunde inte hämta kampanjer.')
    } finally {
      setSearching(false)
    }
  }

  const weekLabel = weekOffset === 0 ? 'Denna vecka' : weekOffset === 1 ? 'Nästa vecka' : weekOffset === -1 ? 'Förra veckan' : `Om ${weekOffset} veckor`

  // Gruppera kampanjer per butik
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
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
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
                padding: '7px 14px', borderRadius: '20px', border: `1px solid ${selectedStores.includes(store) ? 'var(--accent)' : 'var(--border)'}`,
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
          opacity: selectedStores.length === 0 ? 0.5 : 1
        }}
      >
        {searching ? <><Spinner />&nbsp;Hämtar kampanjer...</> : `🔍 Visa kampanjer — ${weekLabel.toLowerCase()}`}
      </button>

      {error && (
        <div style={{ background: 'rgba(255,59,48,0.08)', border: '1px solid var(--danger)', borderRadius: '10px', padding: '14px', marginBottom: '20px', color: 'var(--danger)', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {result && (
        <>
          {/* Säsongstips */}
          {result.seasonalTips && (
            <div style={{ background: 'rgba(0,122,255,0.06)', border: '1px solid rgba(0,122,255,0.2)', borderRadius: '10px', padding: '14px 16px', marginBottom: '24px', fontSize: '14px', color: 'var(--text)' }}>
              🌿 {result.seasonalTips}
            </div>
          )}

          {/* Rekommendationer */}
          {result.recommendations?.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Inköpsrekommendationer</h2>
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
                        background: URGENCY_BORDER[rec.urgency] || 'var(--border)', color: 'white'
                      }}>{rec.action}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Kampanjer per butik */}
          {Object.entries(byStore).length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>Kampanjer per butik</h2>
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
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: CONFIDENCE_COLOR[c.confidence] || 'var(--text-muted)', flexShrink: 0 }} title={`Tillförlitlighet: ${c.confidence}`} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {result.campaigns?.length === 0 && (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0', fontSize: '14px' }}>Inga kampanjer hittades för valda butiker denna vecka.</p>
          )}

          {/* Disclaimer */}
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
```

- [ ] **Steg 2: Commit**

```bash
git add app/campaigns/page.js
git commit -m "feat: lägg till kampanjsida /campaigns"
```

---

## Task 3: Kampanjtips i `/shopping` + länk i Navbar

**Files:**
- Modify: `app/shopping/page.js` — lägg till "Kampanjtips"-knapp och visa rekommendationer
- Modify: `components/Navbar.js` — lägg till länk till /campaigns

**Modifiera `app/shopping/page.js`:**

- [ ] **Steg 1: Lägg till state och funktion**

Hitta sektionen med `const [priceResults, setPriceResults] = useState(null)` och lägg till under:

```javascript
const [campaignResults, setCampaignResults] = useState(null)
const [campaignLoading, setCampaignLoading] = useState(false)
```

Lägg till funktionen efter `findBestPrices()`:

```javascript
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
```

- [ ] **Steg 2: Lägg till knapp i åtgärdsfältet**

Hitta `<button onClick={findBestPrices}` och lägg till en ny knapp direkt efter den:

```javascript
<button onClick={fetchCampaignTips} disabled={campaignLoading || items.filter(i => !i.checked).length === 0} style={{ flex: 1, minWidth: '140px', padding: '11px', background: 'var(--bg-card)', color: items.length === 0 ? 'var(--text-muted)' : 'var(--text)', border: '1px solid var(--border)', borderRadius: '10px', cursor: items.length === 0 ? 'default' : 'pointer', fontSize: '14px', fontWeight: '500' }}>
  {campaignLoading ? <><Spinner />&nbsp;Söker tips...</> : '🏷️ Kampanjtips'}
</button>
```

- [ ] **Steg 3: Lägg till kampanjresultatsektion**

Lägg till direkt efter stängningstaggen för `{priceResults && (...)}`:

```javascript
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
                <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text)' }}>{rec.item}{rec.bestStore && <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}> → {rec.bestStore}</span>}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{rec.reason}</p>
              </div>
              <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: rec.urgency === 'hög' ? 'var(--success)' : rec.urgency === 'medel' ? 'var(--warning)' : 'var(--border)', color: 'white', flexShrink: 0 }}>{rec.action}</span>
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
```

- [ ] **Steg 4: Lägg till länk i Navbar**

Läs `components/Navbar.js` och hitta länklistan. Lägg till en länk till `/campaigns` bredvid de andra navigeringslänkarna. Exakt position beror på Navbar-strukturen — lägg den i mitternavigering bredvid hushållsnamnet eller som en ikon i högersektionen.

- [ ] **Steg 5: Commit**

```bash
git add app/shopping/page.js components/Navbar.js
git commit -m "feat: kampanjtips i inköpslistan + länk i navbar"
```

---

## Self-Review

**Spec coverage:**
- ✅ Visa nästa veckas erbjudanden och kampanjer per butik → Task 2 (`/campaigns/page.js`) med veckoväljare
- ✅ Sök specifika varor med kampanjpris inom datumintervall → `weekOffset` i `/api/campaigns` täcker datumintervall per vecka
- ✅ Rekommendera optimalt inköpsdatum → `recommendations[].reason` + `urgency`
- ✅ Föreslå att köpa in i förväg → `recommendations[].action = "Köp nu/vänta"`
- ✅ Markera tydligt att priser är AI-uppskattningar → `disclaimer` fält i UI

**Placeholder-scan:** Inga TBDs eller ofullständiga steg hittade.

**Type consistency:** `weekOffset` (number) används konsekvent i `/api/campaigns` och i anropen från `/shopping` och `/campaigns`.
