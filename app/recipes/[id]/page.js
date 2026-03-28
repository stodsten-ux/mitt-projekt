'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

const supabase = createClient()

export default function RecipeDetailPage() {
  const [user, setUser] = useState(null)
  const [householdId, setHouseholdId] = useState(null)
  const [recipe, setRecipe] = useState(null)
  const [myRating, setMyRating] = useState(0)
  const [avgRating, setAvgRating] = useState(null)
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const { id } = useParams()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUser(user)

      const { data: members } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .limit(1)

      if (!members || members.length === 0) { router.push('/household'); return }
      const hid = members[0].household_id
      setHouseholdId(hid)

      const { data: r } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .eq('household_id', hid)
        .single()

      if (!r) { router.push('/recipes'); return }
      setRecipe(r)

      const { data: ratings } = await supabase
        .from('meal_ratings')
        .select('rating, user_id')
        .eq('recipe_id', id)
        .eq('household_id', hid)

      if (ratings && ratings.length > 0) {
        const sum = ratings.reduce((acc, r) => acc + r.rating, 0)
        setAvgRating((sum / ratings.length).toFixed(1))
        const mine = ratings.find(r => r.user_id === user.id)
        if (mine) setMyRating(mine.rating)
      }

      setLoading(false)
    }
    load()
  }, [id, router])

  async function rateRecipe(rating) {
    setMyRating(rating)
    await supabase.from('meal_ratings').upsert({
      recipe_id: parseInt(id),
      household_id: householdId,
      user_id: user.id,
      rating,
    }, { onConflict: 'recipe_id,household_id,user_id' })

    const { data: ratings } = await supabase
      .from('meal_ratings')
      .select('rating')
      .eq('recipe_id', id)
      .eq('household_id', householdId)

    if (ratings && ratings.length > 0) {
      const sum = ratings.reduce((acc, r) => acc + r.rating, 0)
      setAvgRating((sum / ratings.length).toFixed(1))
    }
  }

  async function publishRecipe() {
    setPublishing(true)
    const { error } = await supabase.from('shared_recipes').insert({
      title: recipe.title,
      description: recipe.description,
      servings: recipe.servings,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      published_at: new Date().toISOString(),
    })
    if (!error) alert(`"${recipe.title}" publicerades i det delade receptbiblioteket!`)
    else alert('Kunde inte publicera receptet.')
    setPublishing(false)
  }

  async function deleteRecipe() {
    if (!confirm(`Ta bort "${recipe.title}"?`)) return
    setDeleting(true)
    await supabase.from('recipes').delete().eq('id', id)
    router.push('/recipes')
  }

  if (loading) return <div style={{ padding: '40px' }}>Laddar...</div>
  if (!recipe) return null

  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : []

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '40px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div style={{ flex: 1 }}>
          <Link href="/recipes" style={{ color: '#666', textDecoration: 'none', fontSize: '14px' }}>← Tillbaka</Link>
          <h1 style={{ fontSize: '26px', fontWeight: 'bold', marginTop: '12px', marginBottom: '6px' }}>{recipe.title}</h1>
          {recipe.description && <p style={{ color: '#666', fontSize: '15px' }}>{recipe.description}</p>}
        </div>
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <span style={{ background: '#f9f9f9', borderRadius: '8px', padding: '8px 14px', fontSize: '14px' }}>
          🍽️ {recipe.servings} portioner
        </span>
        {avgRating && (
          <span style={{ background: '#f9f9f9', borderRadius: '8px', padding: '8px 14px', fontSize: '14px' }}>
            ⭐ {avgRating} snittbetyg
          </span>
        )}
      </div>

      {/* Betyg */}
      <div style={{ marginBottom: '32px' }}>
        <p style={{ fontWeight: '500', marginBottom: '10px', fontSize: '14px' }}>Ditt betyg</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => rateRecipe(star)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '28px', opacity: star <= myRating ? 1 : 0.3, transition: 'opacity 0.1s' }}
            >
              ⭐
            </button>
          ))}
        </div>
      </div>

      {/* Ingredienser */}
      {ingredients.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Ingredienser</h2>
          <div style={{ background: '#f9f9f9', borderRadius: '12px', padding: '20px' }}>
            {ingredients.map((ing, i) => {
              const name = typeof ing === 'string' ? ing : ing.name
              const quantity = typeof ing === 'object' ? ing.quantity : null
              return (
                <div
                  key={i}
                  style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', marginBottom: '10px', borderBottom: i < ingredients.length - 1 ? '1px solid #e5e5e5' : 'none', fontSize: '14px' }}
                >
                  <span>{name}</span>
                  {quantity && <span style={{ color: '#666' }}>{quantity}</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Instruktioner */}
      {recipe.instructions && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Instruktioner</h2>
          <div style={{ background: '#f9f9f9', borderRadius: '12px', padding: '20px', lineHeight: '1.7', fontSize: '15px', whiteSpace: 'pre-wrap' }}>
            {recipe.instructions}
          </div>
        </div>
      )}

      {/* Åtgärder */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid #e5e5e5', paddingTop: '24px' }}>
        <button
          onClick={publishRecipe}
          disabled={publishing}
          style={{ padding: '13px', background: '#fff', color: '#000', border: '1px solid #e5e5e5', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
        >
          {publishing ? 'Publicerar...' : '🌍 Publicera till delade recept'}
        </button>
        <button
          onClick={deleteRecipe}
          disabled={deleting}
          style={{ padding: '13px', background: '#fff', color: '#cc0000', border: '1px solid #ffd0d0', borderRadius: '10px', cursor: 'pointer', fontSize: '14px' }}
        >
          {deleting ? 'Tar bort...' : 'Ta bort recept'}
        </button>
      </div>
    </div>
  )
}
