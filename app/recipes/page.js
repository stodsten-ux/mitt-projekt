'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const supabase = createClient()

const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '14px', boxSizing: 'border-box', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none' }

export default function RecipesPage() {
  const [user, setUser] = useState(null)
  const [householdId, setHouseholdId] = useState(null)
  const [activeTab, setActiveTab] = useState('mine')
  const [recipes, setRecipes] = useState([])
  const [sharedRecipes, setSharedRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list')
  const [aiLoading, setAiLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', servings: 4, ingredients: '', instructions: '' })
  const [aiPrompt, setAiPrompt] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResults, setSearchResults] = useState(null)
  const [searchSource, setSearchSource] = useState(null)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUser(user)
      const { data: members } = await supabase.from('household_members').select('household_id').eq('user_id', user.id).limit(1)
      if (!members || members.length === 0) { router.push('/household'); return }
      const hid = members[0].household_id
      setHouseholdId(hid)
      await Promise.all([loadRecipes(hid), loadSharedRecipes()])
      setLoading(false)
    }
    load()
  }, [router])

  async function loadRecipes(hid) {
    const { data } = await supabase.from('recipes').select('id, title, description, servings, ai_generated').eq('household_id', hid).order('id', { ascending: false })
    setRecipes(data || [])
  }

  async function loadSharedRecipes() {
    const { data } = await supabase.from('shared_recipes').select('id, title, description, servings, published_at, recipe_stats(avg_rating, total_ratings)').order('published_at', { ascending: false }).limit(50)
    setSharedRecipes(data || [])
  }

  async function saveRecipe(recipeData) {
    setSaving(true)
    const { data, error } = await supabase.from('recipes').insert({ ...recipeData, household_id: householdId, created_by: user.id }).select('id').single()
    if (!error && data) { router.push(`/recipes/${data.id}`) } else { alert('Kunde inte spara receptet.'); setSaving(false) }
  }

  async function handleManualSave() {
    if (!form.title.trim()) return
    const ingredientsArr = form.ingredients.split('\n').map(s => s.trim()).filter(Boolean).map(s => ({ name: s }))
    await saveRecipe({ title: form.title.trim(), description: form.description.trim(), servings: parseInt(form.servings) || 4, ingredients: ingredientsArr, instructions: form.instructions.trim() })
  }

  async function handleAiGenerate() {
    if (!aiPrompt.trim()) return
    setAiLoading(true)
    const response = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: aiPrompt.trim(), householdId }),
    })
    const data = await response.json()
    if (data.source === 'ai' && data.recipes?.[0]?.id) {
      router.push(`/recipes/${data.recipes[0].id}`)
    } else if (data.recipes?.[0]) {
      const r = data.recipes[0]
      await saveRecipe({ title: r.title, description: r.description || '', servings: r.servings || 4, ingredients: r.ingredients || [], instructions: r.instructions || '', ai_generated: true })
    } else {
      alert('Kunde inte generera receptet. Försök igen.')
      setAiLoading(false)
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    setSearchResults(null)
    const response = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: searchQuery.trim(), householdId }),
    })
    const data = await response.json()
    setSearchResults(data.recipes || [])
    setSearchSource(data.source || null)
    setSearchLoading(false)
  }

  async function saveSharedRecipe(recipe) {
    const { error } = await supabase.from('recipes').insert({ household_id: householdId, created_by: user.id, title: recipe.title, description: recipe.description, servings: recipe.servings, ingredients: recipe.ingredients, instructions: recipe.instructions })
    if (!error) alert(`"${recipe.title}" sparad i dina recept!`)
    else alert('Kunde inte spara receptet.')
  }

  if (loading) return <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Laddar...</div>

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '28px', color: 'var(--text)' }}>📖 Recept</h1>

      {/* Flikar */}
      {view === 'list' && (
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid var(--border)' }}>
          {[{ key: 'mine', label: '🍽️ Mina recept' }, { key: 'discover', label: '🌍 Upptäck' }].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ padding: '10px 16px', background: 'none', border: 'none', borderBottom: activeTab === t.key ? '2px solid var(--accent)' : '2px solid transparent', cursor: 'pointer', fontWeight: activeTab === t.key ? '600' : '400', fontSize: '14px', color: activeTab === t.key ? 'var(--text)' : 'var(--text-muted)' }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Mina recept */}
      {view === 'list' && activeTab === 'mine' && (
        <>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button onClick={() => setView('create')} style={{ flex: 1, padding: '12px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>+ Skapa recept</button>
            <button onClick={() => setView('ai')} style={{ flex: 1, padding: '12px', background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>✨ Generera med AI</button>
          </div>
          {/* Sök */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
              placeholder="Sök recept..."
              style={inputStyle}
            />
            <button onClick={handleSearch} disabled={searchLoading || !searchQuery.trim()} style={{ padding: '10px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', color: 'var(--text)', whiteSpace: 'nowrap' }}>
              {searchLoading ? '...' : '🔍'}
            </button>
          </div>
          {/* Sökresultat */}
          {searchResults !== null && (
            <div style={{ marginBottom: '20px' }}>
              {searchResults.length === 0 ? (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '12px' }}>Inga recept hittades för "{searchQuery}"</p>
                  <button onClick={() => { setAiPrompt(searchQuery); setView('ai') }} style={{ padding: '10px 18px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>✨ Generera med AI</button>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    {searchSource === 'own' ? 'Dina recept' : searchSource === 'shared' ? 'Delade recept' : 'AI-genererat'} — {searchResults.length} träff{searchResults.length !== 1 ? 'ar' : ''}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {searchResults.map(r => (
                      <Link key={r.id || r.title} href={r.id ? `/recipes/${r.id}` : '#'} style={{ display: 'block', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', textDecoration: 'none', color: 'var(--text)' }}>
                        <h3 style={{ marginBottom: '3px', fontSize: '15px', fontWeight: '600' }}>{r.title}</h3>
                        {r.description && <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{r.description}</p>}
                      </Link>
                    ))}
                  </div>
                  <button onClick={() => { setSearchResults(null); setSearchQuery('') }} style={{ marginTop: '8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-muted)' }}>Rensa sökning</button>
                </div>
              )}
            </div>
          )}
          {recipes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '32px', marginBottom: '12px' }}>🍳</p>
              <p>Inga recept ännu. Skapa ditt första!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recipes.map(r => (
                <Link key={r.id} href={`/recipes/${r.id}`} style={{ display: 'block', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', textDecoration: 'none', color: 'var(--text)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ marginBottom: '3px', fontSize: '15px', fontWeight: '600' }}>{r.title}</h3>
                      {r.description && <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{r.description}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0, marginLeft: '12px' }}>
                      {r.ai_generated && <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 6px' }}>AI</span>}
                      <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{r.servings} port.</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* Upptäck */}
      {view === 'list' && activeTab === 'discover' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sharedRecipes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '32px', marginBottom: '12px' }}>🌍</p>
              <p>Inga delade recept ännu.</p>
            </div>
          ) : sharedRecipes.map(r => {
            const stats = Array.isArray(r.recipe_stats) ? r.recipe_stats[0] : r.recipe_stats
            return (
              <div key={r.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ marginBottom: '3px', fontSize: '15px', fontWeight: '600', color: 'var(--text)' }}>{r.title}</h3>
                    {r.description && <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '6px' }}>{r.description}</p>}
                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <span>{r.servings} port.</span>
                      {stats?.avg_rating > 0 && <span>⭐ {Number(stats.avg_rating).toFixed(1)} ({stats.total_ratings} betyg)</span>}
                    </div>
                  </div>
                  <button onClick={() => saveSharedRecipe(r)} style={{ marginLeft: '12px', padding: '8px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', flexShrink: 0, color: 'var(--text)' }}>Spara</button>
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
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)' }}>Nytt recept</h2>
            <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px' }}>Avbryt</button>
          </div>
          {[{ label: 'Namn *', key: 'title', type: 'text', placeholder: 'T.ex. Pasta carbonara' }, { label: 'Kort beskrivning', key: 'description', type: 'text', placeholder: 'En mening om rätten' }, { label: 'Portioner', key: 'servings', type: 'number', placeholder: '4' }].map(f => (
            <div key={f.key} style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px', color: 'var(--text)' }}>{f.label}</label>
              <input type={f.type} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} min={f.type === 'number' ? 1 : undefined} style={inputStyle} />
            </div>
          ))}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px', color: 'var(--text)' }}>Ingredienser (en per rad)</label>
            <textarea value={form.ingredients} onChange={e => setForm(p => ({ ...p, ingredients: e.target.value }))} placeholder={'500 g pasta\n200 g bacon\n4 ägg'} rows={6} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px', color: 'var(--text)' }}>Instruktioner</label>
            <textarea value={form.instructions} onChange={e => setForm(p => ({ ...p, instructions: e.target.value }))} placeholder="Koka pastan... Stek baconet..." rows={6} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <button onClick={handleManualSave} disabled={saving || !form.title.trim()} style={{ width: '100%', padding: '14px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '15px', fontWeight: '600' }}>
            {saving ? 'Sparar...' : 'Spara recept'}
          </button>
        </div>
      )}

      {/* Generera med AI */}
      {view === 'ai' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)' }}>✨ Generera recept med AI</h2>
            <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px' }}>Avbryt</button>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px', color: 'var(--text)' }}>Vad vill du laga?</label>
            <input type="text" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAiGenerate() }} placeholder="T.ex. vegetarisk lasagne, snabb kycklinggryta..." style={inputStyle} />
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>AI tar hänsyn till hushållets preferenser och allergier.</p>
          </div>
          <button onClick={handleAiGenerate} disabled={aiLoading || !aiPrompt.trim()} style={{ width: '100%', padding: '14px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '15px', fontWeight: '600' }}>
            {aiLoading ? 'Genererar recept...' : 'Generera recept'}
          </button>
        </div>
      )}
    </div>
  )
}
