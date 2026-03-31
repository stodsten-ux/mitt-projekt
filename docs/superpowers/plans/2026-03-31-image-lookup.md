# Image Lookup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ersätt statiska Unsplash-URL:ar med en prioritetskedja — Supabase Storage cache → Unsplash API → Gemini bildgenerering — via ny `/api/image-lookup`-route.

**Architecture:** En server-side route hanterar hela kedjan och cachar resultat i Supabase Storage bucket `recipe-images`. `lib/images.js` ersätter `lib/unsplash.js` som tunnt client-side wrapper med identisk publik API. Tre befintliga sidor migreras från gamla imports.

**Tech Stack:** Next.js 16 App Router, `@google/genai` (Gemini), Supabase Storage, Unsplash API, Node.js seed-script.

---

## Filstruktur

| Fil | Åtgärd | Ansvar |
|-----|--------|--------|
| `app/api/image-lookup/route.js` | Skapa | Prioritetskedja: cache → Unsplash → Gemini, sparar i Supabase Storage |
| `lib/images.js` | Skapa | Client-side wrapper + getFallbackImage (keyword-matching) |
| `lib/unsplash.js` | Radera | Ersätts av images.js |
| `app/cook/page.js` | Modifiera | Byt import unsplash → images |
| `app/recipes/page.js` | Modifiera | Byt import unsplash → images |
| `app/page.js` | Modifiera | Byt import unsplash → images |
| `scripts/seed-images.mjs` | Skapa | Engångsskript: generera startbibliotek via Gemini |

---

### Task 1: Installera @google/genai och konfigurera miljövariabel

**Files:**
- Modify: `package.json` (via npm)
- Modify: `.env.local` (manuellt)

- [ ] **Steg 1: Installera paketet**

```bash
npm install @google/genai
```

Förväntat: `added 1 package` utan errors.

- [ ] **Steg 2: Lägg till GEMINI_API_KEY i .env.local**

Öppna `.env.local` och lägg till raden:
```
GEMINI_API_KEY=din-nyckel-här
```

Hämta nyckeln från Google AI Studio: https://aistudio.google.com/apikey

- [ ] **Steg 3: Verifiera att paketet laddas**

```bash
node -e "import('@google/genai').then(m => console.log('OK:', Object.keys(m)))"
```

Förväntat output innehåller `OK:` följt av exporterade namn inkl. `GoogleGenAI`.

- [ ] **Steg 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: installera @google/genai"
```

---

### Task 2: Skapa Supabase Storage bucket recipe-images

**Files:**
- Ingen kodfil — manuell setup i Supabase Dashboard

- [ ] **Steg 1: Skapa bucket**

1. Gå till https://supabase.com/dashboard/project/vrclvpocdqglqrdlotop/storage/buckets
2. Klicka **New bucket**
3. Name: `recipe-images`
4. Aktivera **Public bucket**
5. Klicka **Save**

- [ ] **Steg 2: Lägg till INSERT-policy för server-side skrivning**

Gå till https://supabase.com/dashboard/project/vrclvpocdqglqrdlotop/sql och kör:

```sql
CREATE POLICY "Allow anon inserts to recipe-images"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'recipe-images');
```

- [ ] **Steg 3: Verifiera**

I Dashboard → Storage → `recipe-images` → Settings: bekräfta att "Public bucket" är aktiverat.

---

### Task 3: Skapa app/api/image-lookup/route.js

**Files:**
- Create: `app/api/image-lookup/route.js`

- [ ] **Steg 1: Skapa route-filen**

Skapa `app/api/image-lookup/route.js` med följande innehåll:

```javascript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { GoogleGenAI } from '@google/genai'

export const dynamic = 'force-dynamic'

function toSlug(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 60)
}

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )
}

async function checkCache(supabase, filename) {
  try {
    const { data: files, error } = await supabase.storage
      .from('recipe-images')
      .list('', { search: filename })
    if (error || !files?.some(f => f.name === filename)) return null
    const { data } = supabase.storage.from('recipe-images').getPublicUrl(filename)
    return data.publicUrl
  } catch {
    return null
  }
}

async function saveToCache(supabase, filename, buffer, mimeType) {
  try {
    await supabase.storage.from('recipe-images').upload(filename, buffer, {
      contentType: mimeType,
      upsert: true,
    })
    const { data } = supabase.storage.from('recipe-images').getPublicUrl(filename)
    return data.publicUrl
  } catch {
    return null
  }
}

async function tryUnsplash(title) {
  const key = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY
  if (!key) return null
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(title + ' food swedish')}&per_page=1&orientation=landscape&client_id=${key}`
    )
    const data = await res.json()
    const url = data.results?.[0]?.urls?.regular
    if (!url) return null
    const imgRes = await fetch(url)
    if (!imgRes.ok) return null
    return Buffer.from(await imgRes.arrayBuffer())
  } catch {
    return null
  }
}

async function tryGemini(title) {
  const key = process.env.GEMINI_API_KEY
  if (!key) return null
  try {
    const ai = new GoogleGenAI({ apiKey: key })
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: `A beautiful photo of ${title}, Swedish home cooking, natural light, appetizing`,
      config: { responseModalities: ['IMAGE', 'TEXT'] },
    })
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)
    if (!part?.inlineData?.data) return null
    return {
      buffer: Buffer.from(part.inlineData.data, 'base64'),
      mimeType: part.inlineData.mimeType || 'image/png',
    }
  } catch {
    return null
  }
}

export async function POST(request) {
  try {
    const { title } = await request.json()
    if (!title?.trim()) return Response.json({ url: null, source: null })

    const slug = toSlug(title)
    const supabase = await getSupabase()

    // 1. Cache
    const cached = await checkCache(supabase, `${slug}.jpg`) ||
                   await checkCache(supabase, `${slug}.png`)
    if (cached) return Response.json({ url: cached, source: 'cache' })

    // 2. Unsplash
    const unsplashBuffer = await tryUnsplash(title)
    if (unsplashBuffer) {
      const url = await saveToCache(supabase, `${slug}.jpg`, unsplashBuffer, 'image/jpeg')
      if (url) return Response.json({ url, source: 'unsplash' })
    }

    // 3. Gemini
    const gemini = await tryGemini(title)
    if (gemini) {
      const ext = gemini.mimeType === 'image/jpeg' ? 'jpg' : 'png'
      const url = await saveToCache(supabase, `${slug}.${ext}`, gemini.buffer, gemini.mimeType)
      if (url) return Response.json({ url, source: 'gemini' })
    }

    return Response.json({ url: null, source: null })
  } catch {
    return Response.json({ url: null, source: null })
  }
}
```

- [ ] **Steg 2: Starta dev-servern och verifiera att routen svarar**

```bash
npm run dev
```

I ett nytt terminalfönster:
```bash
curl -X POST http://localhost:3000/api/image-lookup \
  -H "Content-Type: application/json" \
  -d '{"title": ""}'
```

Förväntat: `{"url":null,"source":null}` med HTTP 200 (aldrig 500).

- [ ] **Steg 3: Testa med en riktig titel**

```bash
curl -X POST http://localhost:3000/api/image-lookup \
  -H "Content-Type: application/json" \
  -d '{"title": "spaghetti carbonara"}'
```

Förväntat: `{"url":"https://...","source":"unsplash"}` eller `{"source":"gemini"}` eller `{"url":null,"source":null}`.

- [ ] **Steg 4: Commit**

```bash
git add app/api/image-lookup/route.js
git commit -m "feat: skapa /api/image-lookup med cache→unsplash→gemini prioritetskedja"
```

---

### Task 4: Skapa lib/images.js

**Files:**
- Create: `lib/images.js`

- [ ] **Steg 1: Skapa lib/images.js**

Skapa `lib/images.js`:

```javascript
// Ersätter lib/unsplash.js — identisk publik API

const KEYWORDS = [
  [['kyckling', 'kycklingfilé', 'kycklinglår', 'kycklingwing', 'hel kyckling'], 'kyckling'],
  [['kalkon'], 'kalkon'],
  [['oxfilé', 'biff', 'entrecôte', 'nötfärs', 'nötkött', 'oxkött', 'köttfärssås', 'bolognese'], 'biff'],
  [['hamburger', 'burgare'], 'hamburger'],
  [['köttbull', 'pannbiff', 'köttfärs', 'färsbiff', 'moussaka'], 'köttbullar'],
  [['fläsk', 'schnitzel', 'kotlett', 'bacon', 'skinka', 'kassler', 'karré', 'sidfläsk'], 'fläsk'],
  [['lamm', 'lammkotlett', 'lammgryta'], 'lamm'],
  [['revben', 'ribs', 'pulled'], 'revben'],
  [['korv', 'falukorv', 'prinskorv', 'bratwurst', 'grillkorv'], 'korv'],
  [['lax', 'gravlax', 'laxfilé'], 'lax'],
  [['torsk', 'fisk', 'sej', 'pangasius', 'abborre', 'gös', 'piggvar', 'rödspätta', 'sill', 'strömming', 'makrill', 'tonfisk'], 'fisk'],
  [['räk', 'skaldjur', 'hummer', 'kräfta', 'musslor', 'blåmussla'], 'räkor'],
  [['sushi', 'maki', 'nigiri'], 'sushi'],
  [['pasta', 'carbonara', 'spagetti', 'lasagne', 'tagliatelle', 'penne', 'fettuccine', 'gnocchi', 'ravioli', 'makaroner'], 'pasta'],
  [['risotto'], 'risotto'],
  [['ris', 'stekt ris', 'pilaf'], 'ris'],
  [['nudlar', 'ramen', 'udon', 'soba', 'pad thai', 'pho'], 'nudlar'],
  [['soppa', 'buljong', 'bisque', 'gazpacho', 'minestrone', 'borscht'], 'soppa'],
  [['gryta', 'kassoulet', 'boeuf', 'irish stew', 'gulash', 'stroganoff'], 'gryta'],
  [['chili', 'texmex'], 'chili'],
  [['curry', 'tikka', 'masala', 'dal', 'indisk', 'thai', 'korma', 'vindaloo'], 'curry'],
  [['pizza', 'focaccia', 'calzone'], 'pizza'],
  [['taco', 'nachos', 'quesadilla', 'enchilada', 'burrito', 'fajita'], 'tacos'],
  [['wrap', 'tortilla', 'kebab'], 'wrap'],
  [['paj', 'quiche', 'tarte', 'flambé'], 'paj'],
  [['sallad', 'caesar', 'coleslaw', 'tabouleh', 'nicoise'], 'sallad'],
  [['vegetarisk', 'vegansk', 'vegan', 'linser', 'tofu', 'böna', 'kikärt', 'hummus', 'falafel', 'halloumi'], 'vegetarisk'],
  [['aubergine', 'ratatouille', 'parmigiana', 'caponata'], 'aubergine'],
  [['svamp', 'champinjon', 'kantarell', 'karl johan', 'portobello'], 'svamp'],
  [['wok', 'stir fry', 'stir-fry'], 'wok'],
  [['asiatisk', 'kinesisk', 'vietnamesisk', 'koreansk', 'japansk', 'indonesisk', 'teriyaki', 'miso', 'gyoza', 'dumpling'], 'asiatisk'],
  [['ägg', 'omelett', 'scrambled', 'äggröra', 'frittata', 'shakshuka', 'Benedict'], 'ägg'],
  [['frukost', 'gröt', 'müsli', 'granola', 'yoghurt', 'smoothie bowl'], 'frukost'],
  [['toast', 'french toast', 'avokadotoast'], 'toast'],
  [['smörgås', 'macka', 'bruschetta', 'crostini', 'sandwich'], 'smörgås'],
  [['pannkaka', 'ugnspannkaka', 'crêpe', 'blini', 'våffla'], 'pannkaka'],
  [['grill', 'bbq', 'barbecue', 'rökt', 'spett'], 'grill'],
  [['bröd', 'fralla', 'baguette', 'surdeg', 'ciabatta', 'pitabröd', 'naan', 'bagel'], 'bröd'],
  [['kaka', 'muffin', 'brownie', 'cookie', 'kladdkaka', 'cheesecake', 'tårta', 'biskvi', 'hallongrotta'], 'kaka'],
  [['dessert', 'pudding', 'mousse', 'panna cotta', 'crème brûlée', 'tiramisu'], 'dessert'],
  [['glass', 'sorbet', 'gelato'], 'glass'],
]

const FALLBACK_IMAGES = {
  kyckling:   'https://images.unsplash.com/photo-1598103442097-8b74394b95c4?w=800',
  kalkon:     'https://images.unsplash.com/photo-1574672280600-4accfa5b6f98?w=800',
  biff:       'https://images.unsplash.com/photo-1544025162-d76694265947?w=800',
  hamburger:  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
  köttbullar: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800',
  fläsk:      'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=800',
  lamm:       'https://images.unsplash.com/photo-1514516345957-556ca7d90a29?w=800',
  revben:     'https://images.unsplash.com/photo-1544025162-d76694265947?w=800',
  korv:       'https://images.unsplash.com/photo-1602030638412-bb8dcc0bc8b0?w=800',
  lax:        'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800',
  fisk:       'https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=800',
  räkor:      'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800',
  sushi:      'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800',
  pasta:      'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800',
  risotto:    'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800',
  ris:        'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=800',
  nudlar:     'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
  soppa:      'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800',
  gryta:      'https://images.unsplash.com/photo-1547592180-85f173990554?w=800',
  chili:      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
  curry:      'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800',
  pizza:      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
  tacos:      'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800',
  wrap:       'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800',
  paj:        'https://images.unsplash.com/photo-1608835291093-394b0c943a75?w=800',
  sallad:     'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800',
  vegetarisk: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
  aubergine:  'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=800',
  svamp:      'https://images.unsplash.com/photo-1635265018783-0c8826e3af4e?w=800',
  wok:        'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800',
  asiatisk:   'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
  ägg:        'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=800',
  frukost:    'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800',
  toast:      'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=800',
  smörgås:    'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=800',
  pannkaka:   'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800',
  grill:      'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800',
  bröd:       'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=800',
  kaka:       'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800',
  dessert:    'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800',
  glass:      'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800',
  default:    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
}

export function getFallbackImage(title = '') {
  const t = title.toLowerCase()
  for (const [keywords, category] of KEYWORDS) {
    if (keywords.some(kw => t.includes(kw))) {
      return FALLBACK_IMAGES[category] ?? FALLBACK_IMAGES.default
    }
  }
  return FALLBACK_IMAGES.default
}

export async function getRecipeImage(title) {
  if (!title) return getFallbackImage('')
  try {
    const res = await fetch('/api/image-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    if (!res.ok) return getFallbackImage(title)
    const { url } = await res.json()
    return url || getFallbackImage(title)
  } catch {
    return getFallbackImage(title)
  }
}
```

- [ ] **Steg 2: Commit**

```bash
git add lib/images.js
git commit -m "feat: skapa lib/images.js som ersätter lib/unsplash.js"
```

---

### Task 5: Migrera imports i app/cook/page.js, app/recipes/page.js, app/page.js

**Files:**
- Modify: `app/cook/page.js`
- Modify: `app/recipes/page.js`
- Modify: `app/page.js`

- [ ] **Steg 1: Ersätt import i app/cook/page.js**

Hitta raden som börjar med `import {` och innehåller `lib/unsplash`:
```bash
grep -n "unsplash" app/cook/page.js
```

Ersätt raden (byt `unsplash` mot `images`, behåll allt annat identiskt):
```javascript
// Före:
import { getRecipeImage } from '../lib/unsplash'
// Efter:
import { getRecipeImage } from '../lib/images'
```

- [ ] **Steg 2: Ersätt import i app/recipes/page.js**

```bash
grep -n "unsplash" app/recipes/page.js
```

Ersätt på samma sätt — bara `unsplash` → `images`.

- [ ] **Steg 3: Ersätt import i app/page.js**

```bash
grep -n "unsplash" app/page.js
```

Ersätt på samma sätt.

- [ ] **Steg 4: Verifiera att inga gamla imports finns kvar**

```bash
grep -r "lib/unsplash" app/ lib/ --include="*.js"
```

Förväntat: tomt (inga träffar).

- [ ] **Steg 5: Commit**

```bash
git add app/cook/page.js app/recipes/page.js app/page.js
git commit -m "refactor: migrera imports från lib/unsplash till lib/images"
```

---

### Task 6: Radera lib/unsplash.js

**Files:**
- Delete: `lib/unsplash.js`

- [ ] **Steg 1: Radera filen**

```bash
git rm lib/unsplash.js
```

- [ ] **Steg 2: Verifiera att bygget lyckas**

```bash
npm run build 2>&1 | tail -30
```

Förväntat: bygget slutförs utan `Module not found`-fel. Om det finns andra sidor som importerar `lib/unsplash` syns de som fel här — migreras på samma sätt som Task 5.

- [ ] **Steg 3: Commit**

```bash
git commit -m "refactor: radera lib/unsplash.js (ersatt av lib/images.js)"
```

---

### Task 7: Skapa scripts/seed-images.mjs

**Files:**
- Create: `scripts/seed-images.mjs`

- [ ] **Steg 1: Skapa scripts/-katalogen och seed-filen**

```bash
mkdir -p scripts
```

Skapa `scripts/seed-images.mjs`:

```javascript
#!/usr/bin/env node
// Engångsskript: generera startbibliotek av matbilder via Gemini
// och ladda upp till Supabase Storage bucket recipe-images.
//
// Kör med: npx dotenv -e .env.local node scripts/seed-images.mjs
// Kräver i .env.local:
//   GEMINI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !GEMINI_API_KEY) {
  console.error('Saknade env-variabler. Kör: npx dotenv -e .env.local node scripts/seed-images.mjs')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

const RATTER = [
  'köttbullar med potatismos',
  'pannkakor med sylt och grädde',
  'Janssons frestelse',
  'laxpudding med rödbetssallad',
  'pytt i panna',
  'ärtsoppa med senap',
  'falukorv med potatismos',
  'ugnspannkaka med bacon',
  'pasta carbonara',
  'tacos med köttfärs',
  'laxfilé med citron och dill',
  'kycklinggryta med ris',
  'vegetarisk lasagne',
  'hamburgare med pommes',
  'pizza Margherita',
  'kyckling tikka masala',
  'spaghetti bolognese',
  'lax med hasselbackspotatis',
  'köttfärssås med pasta',
  'grönsakssoppa',
]

function toSlug(title) {
  return title
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 60)
}

async function generateAndUpload(title) {
  const slug = toSlug(title)
  const { data: files } = await supabase.storage
    .from('recipe-images').list('', { search: slug })
  if (files?.some(f => f.name.startsWith(slug))) {
    console.log(`⏭  ${title} — redan i cache`)
    return
  }
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: `A beautiful photo of ${title}, Swedish home cooking, natural light, appetizing`,
      config: { responseModalities: ['IMAGE', 'TEXT'] },
    })
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)
    if (!part?.inlineData?.data) { console.log(`✗  ${title} — ingen bild`); return }
    const buffer = Buffer.from(part.inlineData.data, 'base64')
    const mimeType = part.inlineData.mimeType || 'image/png'
    const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png'
    const { error } = await supabase.storage.from('recipe-images')
      .upload(`${slug}.${ext}`, buffer, { contentType: mimeType, upsert: true })
    if (error) console.log(`✗  ${title} — upload: ${error.message}`)
    else console.log(`✓  ${title} → ${slug}.${ext}`)
  } catch (e) {
    console.log(`✗  ${title} — ${e.message}`)
  }
}

console.log(`Genererar bilder för ${RATTER.length} rätter...\n`)
for (const ratt of RATTER) {
  await generateAndUpload(ratt)
  await new Promise(r => setTimeout(r, 2000)) // 2s paus mot rate limiting
}
console.log('\nKlart!')
```

- [ ] **Steg 2: Lägg till SUPABASE_SERVICE_ROLE_KEY i .env.local**

Hämta service role-nyckeln från:
https://supabase.com/dashboard/project/vrclvpocdqglqrdlotop/settings/api

Lägg till i `.env.local`:
```
SUPABASE_SERVICE_ROLE_KEY=din-service-role-nyckel
```

OBS: Committa ALDRIG `.env.local`.

- [ ] **Steg 3: Kör scriptet för att förvärma cachen**

```bash
npx dotenv -e .env.local node scripts/seed-images.mjs
```

Förväntat output:
```
Genererar bilder för 20 rätter...

✓  köttbullar med potatismos → kottbullar-med-potatismos.png
✓  pannkakor med sylt och grädde → pannkakor-med-sylt-och-grade.png
...
Klart!
```

- [ ] **Steg 4: Commit**

```bash
git add scripts/seed-images.mjs
git commit -m "feat: seed-script för offline cache-förvärming via Gemini"
```

---

### Task 8: End-to-end verifiering

**Files:**
- Inga filändringar

- [ ] **Steg 1: Testa cache-hit**

```bash
curl -X POST http://localhost:3000/api/image-lookup \
  -H "Content-Type: application/json" \
  -d '{"title": "köttbullar med potatismos"}'
```

Förväntat (om seed-scriptet körts): `{"url":"https://...supabase.co/storage/.../kottbullar-med-potatismos.png","source":"cache"}`

- [ ] **Steg 2: Testa Unsplash-flödet**

```bash
curl -X POST http://localhost:3000/api/image-lookup \
  -H "Content-Type: application/json" \
  -d '{"title": "smörgåstårta med räkor"}'
```

Förväntat: `{"url":"https://...","source":"unsplash"}` — och bilden sparas nu i Supabase Storage för framtida anrop.

- [ ] **Steg 3: Testa tom titel**

```bash
curl -X POST http://localhost:3000/api/image-lookup \
  -H "Content-Type: application/json" \
  -d '{"title": ""}'
```

Förväntat: `{"url":null,"source":null}` med HTTP 200.

- [ ] **Steg 4: Verifiera appen i webbläsaren**

Öppna http://localhost:3000/recipes — receptkort ska visa bilder som vanligt.  
Öppna http://localhost:3000/cook — receptbilder ska visas korrekt.
