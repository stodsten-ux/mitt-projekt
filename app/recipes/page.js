'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const supabase = createClient()

export default function RecipesPage() {
  const [user, setUser] = useState(null)
  const [householdId, setHouseholdId] = useState(null)
  const [activeTab, setActiveTab] = useState('mine') // mine | discover
  const [recipes, setRecipes] = useState([])
  const [sharedRecipes, setSharedRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list') // list | create | ai
  const [aiLoading, setAiLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', servings: 4, ingredients: '', instructions: '' })
  const [aiPrompt, setAiPrompt] = useState('')
  const router = useRouter()

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

      await loadRecipes(hid)
      await loadSharedRecipes()
      setLoading(false)
    }
    load()
  }, [router])

  async function loadRecipes(hid) {
    const { data } = await supabase
      .from('recipes')
      .select('id, title, description, servings, created_by')
      .eq('household_id', hid)
      .order('id', { ascending: false })
    setRecipes(data || [])
  }

  async function loadSharedRecipes() {
    const { data } = await supabase
      .from('shared_recipes')
      .select('id, title, description, servings, published_at, recipe_stats(avg_rating, total_ratings)')
      .order('published_at', { ascending: false })
      .limit(50)
    setSharedRecipes(data || [])
  }

  async function saveRecipe(recipeData) {
    setSaving(true)
    const { data, error } = await supabase
      .from('recipes')
      .insert({ ...recipeData, household_id: householdId, created_by: user.id })
      .select('id')
      .single()

    if (!error && data) {
      router.push(`/recipes/${data.id}`)
    } else {
      alert('Kunde inte spara receptet.')
      setSaving(false)
    }
  }

  async function handleManualSave() {
    if (!form.title.trim()) return
    const ingredientsArr = form.ingredients
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => ({ name: s }))

    await saveRecipe({
      title: form.title.trim(),
      description: form.description.trim(),
      servings: parseInt(form.servings) || 4,
      ingredients: ingredientsArr,
      instructions: form.instructions.trim(),
    })
  }

  async function handleAiGenerate() {
    if (!aiPrompt.trim()) return
    setAiLoading(true)

    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Skapa ett komplett recept för: ${aiPrompt}. Returnera som JSON med fälten: "title" (string), "description" (kort beskrivning, string), "servings" (antal portioner, number), "ingredients" (array av objekt med fälten "name" och "quantity"), "instructions" (steg-för-steg instruktioner som en sträng). Returnera BARA JSON-objektet, ingen annan text.`,
        householdId,
      }),
    })
    const data = await response.json()

    try {
      const jsonStr = data.content.replace(/```json\n?|\n?```/g, '').trim()
      const parsed = JSON.parse(jsonStr)
      await saveRecipe({
        title: parsed.title,
        description: parsed.description || '',
        servings: parsed.servings || 4,
        ingredients: parsed.ingredients || [],
        instructions: parsed.instructions || '',
      })
    } catch {
      alert('Kunde inte tolka AI-svaret. Försök igen.')
      setAiLoading(false)
    }
  }

  async function saveSharedRecipe(recipe) {
    const { error } = await supabase.from('recipes').insert({
      household_id: householdId,
      created_by: user.id,
      title: recipe.title,
      description: recipe.description,
      servings: recipe.servings,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
    })
    if (!error) alert(`"${recipe.title}" sparad i dina recept!`)
    else alert('Kunde inte spara receptet.')
  }

  if (loading) return <div style={{ padding: '40px' }}>Laddar...</div>

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '40px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>📖 Recept</h1>
        <Link href="/" style={{ color: '#666', textDecoration: 'none' }}>← Tillbaka</Link>
      </div>

      {/* Flikar */}
      {view === 'list' && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #e5e5e5' }}>
          {[{ key: 'mine', label: '🍽️ Mina recept' }, { key: 'discover', label: '🌍 Upptäck' }].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{ padding: '10px 16px', background: 'none', border: 'none', borderBottom: activeTab === t.key ? '2px solid #000' : '2px solid transparent', cursor: 'pointer', fontWeight: activeTab === t.key ? '600' : '400', fontSize: '14px' }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Mina recept */}
      {view === 'list' && activeTab === 'mine' && (
        <>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
            <button
              onClick={() => setView('create')}
              style={{ flex: 1, padding: '12px', background: '#000', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
            >
              + Skapa recept
            </button>
            <button
              onClick={() => setView('ai')}
              style={{ flex: 1, padding: '12px', background: '#fff', color: '#000', border: '1px solid #e5e5e5', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
            >
              ✨ Generera med AI
            </button>
          </div>

          {recipes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
              <p style={{ fontSize: '32px', marginBottom: '12px' }}>🍳</p>
              <p>Inga recept ännu. Skapa ditt första!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recipes.map(r => (
                <Link
                  key={r.id}
                  href={`/recipes/${r.id}`}
                  style={{ display: 'block', background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '18px 20px', textDecoration: 'none', color: '#000' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ marginBottom: '4px', fontSize: '16px' }}>{r.title}</h3>
                      {r.description && <p style={{ color: '#666', fontSize: '13px' }}>{r.description}</p>}
                    </div>
                    <span style={{ color: '#999', fontSize: '13px', flexShrink: 0, marginLeft: '12px' }}>{r.servings} port.</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* Upptäck */}
      {view === 'list' && activeTab === 'discover' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sharedRecipes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
              <p style={{ fontSize: '32px', marginBottom: '12px' }}>🌍</p>
              <p>Inga delade recept ännu.</p>
            </div>
          ) : sharedRecipes.map(r => {
            const stats = Array.isArray(r.recipe_stats) ? r.recipe_stats[0] : r.recipe_stats
            return (
              <div
                key={r.id}
                style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '18px 20px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ marginBottom: '4px', fontSize: '16px' }}>{r.title}</h3>
                    {r.description && <p style={{ color: '#666', fontSize: '13px', marginBottom: '8px' }}>{r.description}</p>}
                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#999' }}>
                      <span>{r.servings} port.</span>
                      {stats?.avg_rating > 0 && <span>⭐ {Number(stats.avg_rating).toFixed(1)} ({stats.total_ratings} betyg)</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => saveSharedRecipe(r)}
                    style={{ marginLeft: '12px', padding: '8px 14px', background: '#f9f9f9', border: '1px solid #e5e5e5', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', flexShrink: 0 }}
                  >
                    Spara
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Skapa manuellt */}
      {view === 'create' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Nytt recept</h2>
            <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: '14px' }}>Avbryt</button>
          </div>

          {[
            { label: 'Namn *', key: 'title', type: 'text', placeholder: 'T.ex. Pasta carbonara' },
            { label: 'Kort beskrivning', key: 'description', type: 'text', placeholder: 'En mening om rätten' },
            { label: 'Portioner', key: 'servings', type: 'number', placeholder: '4' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>{f.label}</label>
              <input
                type={f.type}
                value={form[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                min={f.type === 'number' ? 1 : undefined}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
          ))}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>Ingredienser (en per rad)</label>
            <textarea
              value={form.ingredients}
              onChange={e => setForm(p => ({ ...p, ingredients: e.target.value }))}
              placeholder={'500 g pasta\n200 g bacon\n4 ägg'}
              rows={6}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>Instruktioner</label>
            <textarea
              value={form.instructions}
              onChange={e => setForm(p => ({ ...p, instructions: e.target.value }))}
              placeholder="Koka pastan... Stek baconet..."
              rows={6}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>

          <button
            onClick={handleManualSave}
            disabled={saving || !form.title.trim()}
            style={{ width: '100%', padding: '14px', background: '#000', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '15px', fontWeight: '500' }}
          >
            {saving ? 'Sparar...' : 'Spara recept'}
          </button>
        </div>
      )}

      {/* Generera med AI */}
      {view === 'ai' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600' }}>✨ Generera recept med AI</h2>
            <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: '14px' }}>Avbryt</button>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>Vad vill du laga?</label>
            <input
              type="text"
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAiGenerate() }}
              placeholder="T.ex. vegetarisk lasagne, snabb kycklinggryta..."
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '15px', boxSizing: 'border-box' }}
            />
            <p style={{ fontSize: '12px', color: '#999', marginTop: '6px' }}>AI tar hänsyn till hushållets preferenser och allergier.</p>
          </div>

          <button
            onClick={handleAiGenerate}
            disabled={aiLoading || !aiPrompt.trim()}
            style={{ width: '100%', padding: '14px', background: '#000', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '15px', fontWeight: '500' }}
          >
            {aiLoading ? 'Genererar recept...' : 'Generera recept'}
          </button>
        </div>
      )}
    </div>
  )
}
