import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { GoogleGenAI } from '@google/genai'

let _ai = null

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
  const key = process.env.UNSPLASH_ACCESS_KEY || process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY
  if (!key) return null
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(title + ' food swedish')}&per_page=1&orientation=landscape&client_id=${key}`,
      { signal: controller.signal }
    )
    clearTimeout(timeout)
    const data = await res.json()
    const url = data.results?.[0]?.urls?.regular
    if (!url) return null
    const imgController = new AbortController()
    const imgTimeout = setTimeout(() => imgController.abort(), 8000)
    const imgRes = await fetch(url, { signal: imgController.signal })
    clearTimeout(imgTimeout)
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
    if (!_ai) _ai = new GoogleGenAI({ apiKey: key })
    const response = await _ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: `A beautiful photo of ${title.slice(0, 100).replace(/[\n\r]/g, ' ')}, Swedish home cooking, natural light, appetizing`,
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
  } catch (e) {
    console.error('[image-lookup] unexpected error:', e)
    return Response.json({ url: null, source: null })
  }
}
