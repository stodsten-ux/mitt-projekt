export const categoryImages = {
  kyckling:    'https://images.unsplash.com/photo-1598103442097-8b74394b95c4?w=800',
  pasta:       'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800',
  fisk:        'https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=800',
  vegetarisk:  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
  soppa:       'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800',
  tacos:       'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800',
  pizza:       'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
  sallad:      'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800',
  köttbullar:  'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800',
  gryta:       'https://images.unsplash.com/photo-1547592180-85f173990554?w=800',
  pannkaka:    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800',
  default:     'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
}

export function getFallbackImage(title = '') {
  const t = title.toLowerCase()
  if (t.includes('kyckling')) return categoryImages.kyckling
  if (t.includes('pasta') || t.includes('carbonara') || t.includes('spagetti') || t.includes('lasagne')) return categoryImages.pasta
  if (t.includes('lax') || t.includes('fisk') || t.includes('torsk') || t.includes('räk')) return categoryImages.fisk
  if (t.includes('tacos') || t.includes('taco')) return categoryImages.tacos
  if (t.includes('pizza')) return categoryImages.pizza
  if (t.includes('soppa')) return categoryImages.soppa
  if (t.includes('sallad')) return categoryImages.sallad
  if (t.includes('köttbull')) return categoryImages.köttbullar
  if (t.includes('gryta')) return categoryImages.gryta
  if (t.includes('pannkaka') || t.includes('ugnspannkaka')) return categoryImages.pannkaka
  if (t.includes('vegetarisk') || t.includes('linser') || t.includes('tofu') || t.includes('böna')) return categoryImages.vegetarisk
  return categoryImages.default
}

export async function getRecipeImage(query) {
  const key = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY
  if (!key) return null
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query + ' food')}&per_page=1&orientation=landscape&client_id=${key}`
    )
    const data = await res.json()
    return data.results?.[0]?.urls?.regular || null
  } catch {
    return null
  }
}
