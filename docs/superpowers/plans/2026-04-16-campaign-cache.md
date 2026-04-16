# campaign_cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cachelagra AI-genererade kampanjsvar per butik och ISO-vecka i Supabase för att eliminera onödiga Claude-anrop.

**Architecture:** En `campaign_cache`-tabell med en rad per (store, week_number, year) och hela payload i JSONB. Campaigns-routen kontrollerar cachen per butik parallellt, anropar Claude bara för butiker som saknas i cachen, splittar svaret per butik och sparar. Svaret filtreras server-side på items[] innan det returneras.

**Tech Stack:** Next.js 16 API route, Supabase (SSR server client), Anthropic Sonnet 4.6, SQL migration.

---

### Task 1: SQL-migration för campaign_cache

**Files:**
- Create: `supabase/migrations/20260416_create_campaign_cache.sql`

- [ ] **Steg 1: Skapa migrationsfil**

```sql
-- campaign_cache: cachade kampanjsvar per butik och ISO-vecka
CREATE TABLE campaign_cache (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store       TEXT NOT NULL,
  week_number INTEGER NOT NULL,
  year        INTEGER NOT NULL,
  payload     JSONB NOT NULL,
  valid_until DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (store, week_number, year)
);

CREATE INDEX idx_campaign_cache_lookup ON campaign_cache(store, week_number, year);

ALTER TABLE campaign_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaign_cache_read" ON campaign_cache
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "campaign_cache_service_write" ON campaign_cache
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
```

- [ ] **Steg 2: Kör migrationen i Supabase-dashboarden**

Öppna https://supabase.com → ditt projekt → SQL Editor → klistra in ovanstående → Run.

Verifiera: Table Editor ska nu visa `campaign_cache` med kolumnerna id, store, week_number, year, payload, valid_until, created_at.

- [ ] **Steg 3: Commit**

```bash
git add supabase/migrations/20260416_create_campaign_cache.sql
git commit -m "feat: SQL migration för campaign_cache"
```

---

### Task 2: Lägg till getWeekSunday i dates.js

**Files:**
- Modify: `app/lib/dates.js`

- [ ] **Steg 1: Lägg till funktion i slutet av dates.js**

```javascript
// Returnerar söndagen (sista dagen i ISO-veckan) för ett givet datum, som YYYY-MM-DD
export function getWeekSunday(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() // 0=sön, 1=mån, ..., 6=lör
  const daysUntilSunday = day === 0 ? 0 : 7 - day
  d.setUTCDate(d.getUTCDate() + daysUntilSunday)
  return d.toISOString().split('T')[0]
}
```

- [ ] **Steg 2: Verifiera manuellt**

Öppna Node REPL i projektmappen:

```bash
node -e "
const { getWeekSunday } = await import('./app/lib/dates.js')
// En måndag ska ge söndag samma vecka (+6 dagar)
const mon = new Date('2026-04-13') // måndag
console.log(getWeekSunday(mon)) // förväntat: 2026-04-19
// En söndag ska ge sig själv
const sun = new Date('2026-04-19')
console.log(getWeekSunday(sun)) // förväntat: 2026-04-19
" --input-type=module
```

Förväntat output:
```
2026-04-19
2026-04-19
```

- [ ] **Steg 3: Commit**

```bash
git add app/lib/dates.js
git commit -m "feat: lägg till getWeekSunday i dates.js"
```

---

### Task 3: Skriv om campaigns-routen med cache-logik

**Files:**
- Modify: `app/api/campaigns/route.js`

- [ ] **Steg 1: Ersätt hela route.js med nedanstående**

```javascript
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getISOWeek, getWeekSunday } from '../../lib/dates'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { stores, items, householdId, weekOffset = 0 } = await request.json()

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    )

    // Hämta butikslista
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

    // Veckometadata
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + weekOffset * 7)
    const weekNum = getISOWeek(targetDate)
    const year = targetDate.getFullYear()
    const weekLabel = `vecka ${weekNum} ${year}`
    const validUntil = getWeekSunday(targetDate)

    // 1. Kontrollera cache per butik (parallellt)
    const cacheResults = await Promise.all(
      storeList.map(store =>
        supabase
          .from('campaign_cache')
          .select('store, payload')
          .eq('store', store)
          .eq('week_number', weekNum)
          .eq('year', year)
          .maybeSingle()
      )
    )

    const cachedPayloads = {}
    const uncachedStores = []
    for (let i = 0; i < storeList.length; i++) {
      const store = storeList[i]
      const { data } = cacheResults[i]
      if (data?.payload) {
        cachedPayloads[store] = { ...data.payload, source: 'cache' }
      } else {
        uncachedStores.push(store)
      }
    }

    // 2. Hämta AI för butiker som saknas i cache
    const warnings = []
    const aiPayloads = {}

    if (uncachedStores.length > 0) {
      const itemSection = items?.length
        ? `\nFokusera särskilt på kampanjer för dessa varor: ${items.slice(0, 15).join(', ')}.`
        : ''

      let aiResult = null
      try {
        console.time('campaigns-ai')
        const message = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 2000,
          system: `Du är en expert på svenska butikskedjors kampanjmönster och erbjudanden.
Du känner till typiska kampanjcykler för ICA, Willys, Coop, Lidl, Hemköp, Citygross och Netto.
Svara alltid på svenska. Ge konkreta och rimliga uppskattningar baserade på historiska mönster.`,
          messages: [{
            role: 'user',
            content: `Kampanjer/erbjudanden hos ${uncachedStores.join(', ')} under ${weekLabel}.${itemSection}
Inkludera: säsongsvaror på rea, rekommendationer om när specifika varor är billigast, generella inköpstips.
Returnera ENDAST JSON utan markdown:
{"weekLabel":"${weekLabel}","campaigns":[{"store":"","item":"","campaignPrice":"","regularPrice":"","savings":"","confidence":"hög|medel|låg"}],"recommendations":[{"item":"","action":"Köp nu|Vänta","reason":"","bestStore":"","urgency":"hög|medel|låg"}],"seasonalTips":"","disclaimer":"Uppskattningar baserade på historiska mönster."}`,
          }],
        })
        console.timeEnd('campaigns-ai')

        const raw = message.content[0].text.trim()
        const start = raw.indexOf('{')
        if (start !== -1) {
          let depth = 0, end = -1
          for (let i = start; i < raw.length; i++) {
            if (raw[i] === '{') depth++
            else if (raw[i] === '}') { depth--; if (depth === 0) { end = i; break } }
          }
          if (end !== -1) aiResult = JSON.parse(raw.slice(start, end + 1))
        }
      } catch (err) {
        console.error('campaigns AI error:', err)
        uncachedStores.forEach(s => warnings.push(s))
      }

      if (aiResult && Array.isArray(aiResult.campaigns)) {
        for (const store of uncachedStores) {
          const storePayload = {
            weekLabel: aiResult.weekLabel,
            campaigns: aiResult.campaigns.filter(c => c.store === store),
            recommendations: (aiResult.recommendations || []).filter(r => r.bestStore === store),
            seasonalTips: aiResult.seasonalTips || '',
            disclaimer: aiResult.disclaimer || '',
          }
          aiPayloads[store] = { ...storePayload, source: 'ai' }

          // Spara i cache (blockerar inte svaret vid fel)
          supabase
            .from('campaign_cache')
            .upsert(
              { store, week_number: weekNum, year, payload: storePayload, valid_until: validUntil },
              { onConflict: 'store,week_number,year' }
            )
            .then(({ error }) => {
              if (error) console.error(`campaign_cache upsert misslyckades för ${store}:`, error)
            })
        }
      } else {
        uncachedStores.forEach(s => { if (!warnings.includes(s)) warnings.push(s) })
      }
    }

    // 3. Merga alla payloads
    const allPayloads = { ...cachedPayloads, ...aiPayloads }

    if (Object.keys(allPayloads).length === 0) {
      return Response.json({
        success: true,
        weekLabel,
        campaigns: [],
        recommendations: [],
        seasonalTips: 'Kampanjinformation är inte tillgänglig just nu.',
        disclaimer: '',
        warnings,
        source: 'none',
      })
    }

    let allCampaigns = []
    let allRecommendations = []
    let seasonalTips = ''
    let disclaimer = ''
    for (const payload of Object.values(allPayloads)) {
      allCampaigns = allCampaigns.concat(payload.campaigns || [])
      allRecommendations = allRecommendations.concat(payload.recommendations || [])
      if (!seasonalTips && payload.seasonalTips) seasonalTips = payload.seasonalTips
      if (!disclaimer && payload.disclaimer) disclaimer = payload.disclaimer
    }

    // 4. Filtrera på items[] om skickade
    if (items?.length) {
      const itemsLower = items.map(i => i.toLowerCase())
      allCampaigns = allCampaigns.filter(c =>
        itemsLower.some(item => c.item?.toLowerCase().includes(item))
      )
      allRecommendations = allRecommendations.filter(r =>
        itemsLower.some(item => r.item?.toLowerCase().includes(item))
      )
    }

    const hasAi = Object.values(allPayloads).some(p => p.source === 'ai')
    const hasCache = Object.values(allPayloads).some(p => p.source === 'cache')

    return Response.json({
      success: true,
      weekLabel,
      campaigns: allCampaigns,
      recommendations: allRecommendations,
      seasonalTips,
      disclaimer,
      ...(warnings.length ? { warnings } : {}),
      source: hasAi && hasCache ? 'mixed' : hasAi ? 'ai' : 'cache',
    }, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' },
    })
  } catch (error) {
    console.error('campaigns error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
```

- [ ] **Steg 2: Starta dev-servern**

```bash
npm run dev
```

- [ ] **Steg 3: Testa första anropet (förväntat: source 'ai', Claude anropas)**

```bash
curl -s -X POST http://localhost:3000/api/campaigns \
  -H "Content-Type: application/json" \
  -H "Cookie: $(cat .dev-cookie 2>/dev/null || echo '')" \
  -d '{"stores":["ICA"],"weekOffset":0}' | jq '{source, weekLabel, campaigns_count: (.campaigns | length)}'
```

Förväntat: `"source": "ai"`, `weekLabel` satt, `campaigns_count` > 0.

- [ ] **Steg 4: Verifiera att cache-raden skapades i Supabase**

Supabase → Table Editor → campaign_cache → kontrollera att en rad finns med korrekt store, week_number, year och valid_until (söndagens datum).

- [ ] **Steg 5: Testa andra anropet (förväntat: source 'cache', Claude anropas INTE)**

```bash
curl -s -X POST http://localhost:3000/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{"stores":["ICA"],"weekOffset":0}' | jq '{source}'
```

Förväntat: `"source": "cache"`. Kontrollera att servern INTE loggar `campaigns-ai: Xms` i terminalen.

- [ ] **Steg 6: Testa items-filtrering**

```bash
curl -s -X POST http://localhost:3000/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{"stores":["ICA"],"items":["kyckling"],"weekOffset":0}' | jq '.campaigns[].item'
```

Förväntat: bara kampanjer vars item-fält innehåller "kyckling" (kan vara tom array om inga träffar).

- [ ] **Steg 7: Testa fallback vid alla butiker misslyckade**

Tillfälligt sätt `ANTHROPIC_API_KEY=invalid` i `.env.local` och rensa cachen för att tvinga AI-fel:

```bash
curl -s -X POST http://localhost:3000/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{"stores":["Okänd Butik XYZ"],"weekOffset":0}' | jq '{success, campaigns_count: (.campaigns | length), seasonalTips}'
```

Förväntat: `"success": true`, `campaigns_count: 0`, `seasonalTips` innehåller "inte tillgänglig".

- [ ] **Steg 8: Commit**

```bash
git add app/api/campaigns/route.js
git commit -m "feat: campaign_cache — cache AI-svar per butik och ISO-vecka"
```

---

### Task 4: Uppdatera TODO.md

**Files:**
- Modify: `TODO.md`

- [ ] **Steg 1: Markera P4-item som klart i TODO.md**

Hitta raden:
```
11. [ ] Cache kampanjsvar i Supabase (campaign_cache, TTL 24h) — kampanjer ändras inte per minut
```

Ändra till:
```
11. [x] Cache kampanjsvar i Supabase (campaign_cache, valid_until=veckoslutet) — kampanjer ändras inte per vecka
```

- [ ] **Steg 2: Commit**

```bash
git add TODO.md
git commit -m "docs: markera campaign_cache som klart i TODO"
```
