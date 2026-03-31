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
  await new Promise(r => setTimeout(r, 2000))
}
console.log('\nKlart!')
