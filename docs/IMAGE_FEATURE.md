# Bildhantering — Nano Banana / Gemini image fallback

## Mål
Implementera ett trelagers-bildflöde för maträtter i Mathandelsagenten:
1. **Supabase Storage** (cachade bilder) — kolla alltid först
2. **Unsplash API** — om ingen cache-träff
3. **Nano Banana (Gemini image API)** — om varken cache eller Unsplash levererar

Alla genererade/hämtade bilder sparas i Supabase Storage-bucketen `recipe-images` för framtida träffar.

---

## Steg 1 — Miljövariabler

Lägg till i `.env.local`:
```env
UNSPLASH_ACCESS_KEY=din_unsplash_nyckel
GEMINI_API_KEY=din_gemini_nyckel
NEXT_PUBLIC_SUPABASE_URL=redan_satt
SUPABASE_SERVICE_ROLE_KEY=redan_satt
```

---

## Steg 2 — Supabase Storage bucket

Kör detta i Supabase SQL editor eller via migration:
```sql
insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', true);

create policy "Public read"
  on storage.objects for select
  using (bucket_id = 'recipe-images');

create policy "Service role write"
  on storage.objects for insert
  with check (bucket_id = 'recipe-images');
```

---

## Steg 3 — API-route `/api/image-lookup`

Skapa filen `app/api/image-lookup/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET = 'recipe-images'

// Normalisera maträttsnamn till filnamn: "Köttbullar med mos" -> "kottbullar-med-mos"
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function getFromCache(slug: string): Promise<string | null> {
  const path = `${slug}.jpg`
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  // Verifiera att filen faktiskt finns
  const res = await fetch(data.publicUrl, { method: 'HEAD' })
  return res.ok ? data.publicUrl : null
}

async function saveToCache(slug: string, imageBuffer: ArrayBuffer): Promise<string> {
  const path = `${slug}.jpg`
  await supabase.storage.from(BUCKET).upload(path, imageBuffer, {
    contentType: 'image/jpeg',
    upsert: true,
  })
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

async function fetchFromUnsplash(query: string): Promise<ArrayBuffer | null> {
  const res = await fetch(
    `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape`,
    { headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` } }
  )
  if (!res.ok) return null
  const data = await res.json()
  const imgRes = await fetch(data.urls.regular)
  return imgRes.ok ? imgRes.arrayBuffer() : null
}

async function generateWithNanoBanana(dishName: string): Promise<ArrayBuffer | null> {
  const prompt = `Professional food photography of ${dishName}, Swedish home cooking style, 
    natural light, appetizing, on a simple plate, white background, high quality`

  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': process.env.GEMINI_API_KEY!,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
    }),
  })

  if (!res.ok) return null
  const json = await res.json()
  const part = json.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)
  if (!part) return null

  const binary = atob(part.inlineData.data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

export async function GET(req: NextRequest) {
  const dish = req.nextUrl.searchParams.get('dish')
  if (!dish) return NextResponse.json({ error: 'Missing dish param' }, { status: 400 })

  const slug = toSlug(dish)

  // Lager 1: Supabase cache
  const cached = await getFromCache(slug)
  if (cached) return NextResponse.json({ url: cached, source: 'cache' })

  // Lager 2: Unsplash
  const unsplashBuffer = await fetchFromUnsplash(`${dish} food`)
  if (unsplashBuffer) {
    const url = await saveToCache(slug, unsplashBuffer)
    return NextResponse.json({ url, source: 'unsplash' })
  }

  // Lager 3: Nano Banana
  const generatedBuffer = await generateWithNanoBanana(dish)
  if (generatedBuffer) {
    const url = await saveToCache(slug, generatedBuffer)
    return NextResponse.json({ url, source: 'generated' })
  }

  return NextResponse.json({ error: 'Could not retrieve image' }, { status: 500 })
}
```

---

## Steg 4 — React-hook för bildlookup

Skapa `hooks/useRecipeImage.ts`:
```typescript
import { useState, useEffect } from 'react'

const FALLBACK = '/images/placeholder-food.jpg'

export function useRecipeImage(dishName: string | null) {
  const [url, setUrl] = useState<string>(FALLBACK)
  const [loading, setLoading] = useState(false)
  const [source, setSource] = useState<'cache' | 'unsplash' | 'generated' | null>(null)

  useEffect(() => {
    if (!dishName) return
    setLoading(true)
    fetch(`/api/image-lookup?dish=${encodeURIComponent(dishName)}`)
      .then(r => r.json())
      .then(data => {
        if (data.url) { setUrl(data.url); setSource(data.source) }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [dishName])

  return { url, loading, source }
}
```

---

## Steg 5 — Offline-generering via Claude Code + MCP (valfritt)

För att bygga upp ett startbibliotek innan lansering, installera Nano Banana MCP-servern i Claude Code:
```bash
claude mcp add nano-banana \
  --env GEMINI_API_KEY=$GEMINI_API_KEY \
  -- npx nano-banana-mcp
```

Generera sedan bilder för de vanligaste svenska rätterna direkt i Claude Code och ladda upp till Supabase Storage-bucketen `recipe-images` med slug-namngivning (t.ex. `kottbullar-med-mos.jpg`).

---

## Viktigt att tänka på

- **Gemini image API-modellsträng** kan ändras under preview — dubbelkolla aktuell sträng i Google AI Studio innan deploy
- **Rate limiting**: lägg till `export const maxDuration = 30` i route-filen om Vercel hobby-plan används (Nano Banana kan ta 10–20 sek)
- **Kostnad**: Nano Banana kostar ~$0.04–0.05/bild — cachen är kritisk för att hålla nere kostnaderna
- **Prompt på engelska** ger bättre bildkvalitet från Gemini även för svenska maträtter