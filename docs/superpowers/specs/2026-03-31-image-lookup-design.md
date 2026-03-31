# Image Lookup — Design Spec
**Datum:** 2026-03-31  
**Mål:** Ersätt statiska Unsplash-URL:ar med en prioritetskedja: Supabase Storage cache → Unsplash API → Gemini bildgenerering.

---

## Arkitektur

```
Komponenter
    ↓
lib/images.js — getRecipeImage(title)
    ↓  (HTTP POST)
/api/image-lookup
    ↓          ↓           ↓
Supabase   Unsplash    Gemini
Storage    API         @google/genai
(cache)    (stockfoto) (generering)
    ↑           ↑
    └─── spara i cache ───┘
```

## Filstruktur

| Fil | Åtgärd | Ansvar |
|-----|--------|--------|
| `app/api/image-lookup/route.js` | Skapa | Prioritetskedja: cache → Unsplash → Gemini, sparar i Supabase Storage |
| `lib/images.js` | Skapa | Tunnt wrapper — anropar routen, fallback på keyword-match vid fel |
| `lib/unsplash.js` | Radera | Ersätts av images.js |
| `scripts/seed-images.js` | Skapa | Engångsskript för offline-generering av startbibliotek via MCP |

**Ny miljövariabel:** `GEMINI_API_KEY`  
**Ny Supabase Storage-bucket:** `recipe-images` (publik)

---

## Route: POST /api/image-lookup

**Input:** `{ title: string }`  
**Output:** `{ url: string | null, source: 'cache' | 'unsplash' | 'gemini' | null }`

### Prioritetskedja

```
1. Normalisera titeln → slug
2. Kolla Supabase Storage (recipe-images/{slug}.jpg)
   → Finns? Returnera public URL (source: 'cache')
3. Prova Unsplash API (query: "{title} food swedish")
   → Träff? Spara i cache → returnera URL (source: 'unsplash')
4. Anropa Gemini
   → Generera → spara i cache → returnera URL (source: 'gemini')
5. Alla felar → returnera { url: null, source: null }
```

Returnerar alltid HTTP 200 — aldrig 500. Komponenten hanterar `url: null` med `getFallbackImage()`.

### Slug-normalisering

```javascript
function toSlug(title) {
  return title
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // å→a, ö→o, ä→a
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 60)
}
// "Köttbullar med potatismos" → "kottbullar-med-potatismos"
```

### Gemini-anrop

```javascript
import { GoogleGenAI } from '@google/genai'
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
const response = await ai.models.generateContent({
  model: 'gemini-3.1-flash-image-preview',
  contents: `A beautiful photo of ${title}, Swedish home cooking, natural light, appetizing`,
  config: { responseModalities: ['IMAGE', 'TEXT'] }
})
```

### Supabase Storage

- Bucket: `recipe-images` (publik läsning, server-side skrivning)
- Filsökväg: `{slug}.jpg`
- Klient: `createServerClient` från `@supabase/ssr`

---

## lib/images.js

Drop-in replacement för `lib/unsplash.js` — samma publika API:

```javascript
// Client-side: anropar /api/image-lookup via fetch
export async function getRecipeImage(title) {
  try {
    const res = await fetch('/api/image-lookup', {
      method: 'POST',
      body: JSON.stringify({ title }),
      headers: { 'Content-Type': 'application/json' }
    })
    const { url } = await res.json()
    return url || getFallbackImage(title)
  } catch {
    return getFallbackImage(title)
  }
}

// Behålls oförändrad — keyword-matching som sista utväg
export function getFallbackImage(title) { /* samma som idag */ }
```

`categoryImages`-exporten tas bort — används inte längre direkt utanför `getFallbackImage`.

**Migrering av imports:**
```
import { getRecipeImage } from '../lib/unsplash'
→ import { getRecipeImage } from '../lib/images'
```

**I API-routes (server-side):** Importera `toSlug` och Supabase Storage-logiken direkt — ingen HTTP-hop.

---

## Felhantering

| Steg | Fel | Beteende |
|------|-----|----------|
| Supabase Storage | Bucket saknas / timeout | Logga, fortsätt till Unsplash |
| Unsplash | Rate limit / nyckel saknas | Logga, fortsätt till Gemini |
| Gemini | API-fel / timeout | Logga, returnera `{ url: null }` |
| Alla tre felar | — | `{ url: null }` — komponenten visar `getFallbackImage()` |

---

## Offline MCP-spår (scripts/seed-images.js)

Engångsskript som körs lokalt i Claude Code med Nano Banana MCP-servern för att förvärma cachen med ~30 vanliga svenska rätter innan driftsättning.

```javascript
// node scripts/seed-images.js
const RATTER = [
  'köttbullar med potatismos',
  'pannkakor med sylt',
  'Janssons frestelse',
  'laxpudding',
  'pytt i panna',
  'ärtsoppa',
  // ... fler
]
// För varje rätt: generera bild via MCP → ladda upp till recipe-images bucket
```

Inte en del av appens runtime — körs manuellt en gång.

---

## Ej i scope

- Bildoptimering / resize (Unsplash returnerar redan lämplig storlek via `?w=800`)
- Rensning av gamla cache-poster
- Stöd för andra bildtyper än recept
