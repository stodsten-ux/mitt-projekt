'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Spinner from '../../../components/Spinner'

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
  const [servings, setServings] = useState(null)
  const [savingStandard, setSavingStandard] = useState(false)
  const router = useRouter()
  const { id } = useParams()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUser(user)
      const { data: members } = await supabase.from('household_members').select('household_id').eq('user_id', user.id).limit(1)
      if (!members || members.length === 0) { router.push('/household'); return }
      const hid = members[0].household_id
      setHouseholdId(hid)
      const { data: r } = await supabase.from('recipes').select('*').eq('id', id).eq('household_id', hid).single()
      if (!r) { router.push('/recipes'); return }
      setRecipe(r)
      setServings(r.servings || 4)
      const { data: ratings } = await supabase.from('meal_ratings').select('rating, user_id').eq('recipe_id', id).eq('household_id', hid)
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
    await supabase.from('meal_ratings').upsert({ recipe_id: parseInt(id), household_id: householdId, user_id: user.id, rating }, { onConflict: 'recipe_id,household_id,user_id' })
    const { data: ratings } = await supabase.from('meal_ratings').select('rating').eq('recipe_id', id).eq('household_id', householdId)
    if (ratings && ratings.length > 0) setAvgRating((ratings.reduce((a, r) => a + r.rating, 0) / ratings.length).toFixed(1))
  }

  async function publishRecipe() {
    setPublishing(true)
    const { error } = await supabase.from('shared_recipes').insert({ title: recipe.title, description: recipe.description, servings: recipe.servings, ingredients: recipe.ingredients, instructions: recipe.instructions, published_at: new Date().toISOString() })
    if (!error) alert(`"${recipe.title}" publicerades i det delade receptbiblioteket!`)
    else alert('Kunde inte publicera receptet.')
    setPublishing(false)
  }

  async function saveAsStandard() {
    setSavingStandard(true)
    const newModifier = servings / (recipe.servings || 4)
    await supabase.from('household_preferences').upsert({
      household_id: householdId,
      portion_modifier: Math.round(newModifier * 100) / 100,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'household_id' })
    setSavingStandard(false)
    alert(`${servings} portioner sparad som din standard (${Math.round(newModifier * 100)}%).`)
  }

  async function deleteRecipe() {
    if (!confirm(`Ta bort "${recipe.title}"?`)) return
    setDeleting(true)
    await supabase.from('recipes').delete().eq('id', id)
    router.push('/recipes')
  }

  if (loading) return <div style={{ padding: '40px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}><Spinner />Laddar...</div>
  if (!recipe) return null

  const baseServings = recipe.servings || 4
  const ratio = servings / baseServings
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : []

  function scaleQuantity(quantity) {
    if (!quantity || ratio === 1) return quantity
    const match = quantity.match(/^([\d.,]+)(.*)/)
    if (!match) return quantity
    const scaled = (parseFloat(match[1].replace(',', '.')) * ratio)
    const rounded = Math.round(scaled * 10) / 10
    return `${rounded}${match[2]}`
  }

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }}>
      {/* Header */}
      <Link href="/recipes" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '14px' }}>← Tillbaka</Link>
      <h1 style={{ fontSize: '26px', fontWeight: 'bold', marginTop: '16px', marginBottom: '6px', color: 'var(--text)' }}>{recipe.title}</h1>
      {recipe.description && <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginBottom: '24px' }}>{recipe.description}</p>}

      {/* Meta */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px 8px' }}>
          <button onClick={() => setServings(s => Math.max(1, s - 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--text)', padding: '2px 6px', lineHeight: 1 }}>−</button>
          <span style={{ fontSize: '14px', color: 'var(--text)', minWidth: '80px', textAlign: 'center' }}>🍽️ {servings} portioner</span>
          <button onClick={() => setServings(s => s + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--text)', padding: '2px 6px', lineHeight: 1 }}>+</button>
        </div>
        {avgRating && <span style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 14px', fontSize: '14px', color: 'var(--text)' }}>⭐ {avgRating} snittbetyg</span>}
        {recipe.ai_generated && <span style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 14px', fontSize: '14px', color: 'var(--text-muted)' }}>✨ AI-genererat</span>}
      </div>
      {servings !== recipe.servings && (
        <div style={{ marginBottom: '20px' }}>
          <button onClick={saveAsStandard} disabled={savingStandard} style={{ padding: '7px 14px', background: 'none', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-muted)' }}>
            {savingStandard ? 'Sparar...' : `Spara ${servings} portioner som min standard`}
          </button>
        </div>
      )}
      {recipe.source_url && (
        <div style={{ marginBottom: '20px' }}>
          <a href={recipe.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'underline' }}>
            🔗 Visa originalkällan
          </a>
        </div>
      )}

      {/* Betyg */}
      <div style={{ marginBottom: '28px' }}>
        <p style={{ fontWeight: '500', marginBottom: '10px', fontSize: '14px', color: 'var(--text)' }}>Ditt betyg</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[1, 2, 3, 4, 5].map(star => (
            <button key={star} onClick={() => rateRecipe(star)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '28px', opacity: star <= myRating ? 1 : 0.25, transition: 'opacity 0.15s' }}>⭐</button>
          ))}
        </div>
      </div>

      {/* Ingredienser */}
      {ingredients.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: '600', marginBottom: '14px', color: 'var(--text)' }}>Ingredienser</h2>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            {ingredients.map((ing, i) => {
              const name = typeof ing === 'string' ? ing : ing.name
              const quantity = typeof ing === 'object' ? ing.quantity : null
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', marginBottom: '10px', borderBottom: i < ingredients.length - 1 ? '1px solid var(--border)' : 'none', fontSize: '14px', color: 'var(--text)' }}>
                  <span>{name}</span>
                  {quantity && <span style={{ color: 'var(--text-muted)' }}>{scaleQuantity(quantity)}</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Instruktioner */}
      {recipe.instructions && (
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: '600', marginBottom: '14px', color: 'var(--text)' }}>Instruktioner</h2>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', lineHeight: '1.8', fontSize: '15px', whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
            {recipe.instructions}
          </div>
        </div>
      )}

      {/* Åtgärder */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
        <button onClick={publishRecipe} disabled={publishing} style={{ padding: '13px', background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
          {publishing ? <><Spinner />&nbsp;Publicerar...</> : '🌍 Publicera till delade recept'}
        </button>
        <button onClick={deleteRecipe} disabled={deleting} style={{ padding: '13px', background: 'rgba(255,59,48,0.06)', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: '10px', cursor: 'pointer', fontSize: '14px' }}>
          {deleting ? <><Spinner />&nbsp;Tar bort...</> : 'Ta bort recept'}
        </button>
      </div>
    </div>
  )
}
