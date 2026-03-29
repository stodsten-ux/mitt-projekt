'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Spinner from '../../components/Spinner'

const supabase = createClient()

export default function CookIndexPage() {
  const [householdId, setHouseholdId] = useState(null)
  const [recipes, setRecipes] = useState([])
  const [menuRecipes, setMenuRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: members } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .limit(1)
      if (!members?.length) { router.push('/household'); return }
      const hid = members[0].household_id
      setHouseholdId(hid)

      // Hämta veckomenyn — recept för denna vecka
      const weekStart = getWeekStart()
      const { data: menu } = await supabase
        .from('menus')
        .select('id')
        .eq('household_id', hid)
        .gte('week_start', weekStart)
        .limit(1)

      if (menu?.length) {
        const { data: items } = await supabase
          .from('menu_items')
          .select('recipe_id, custom_title, day_of_week, meal_type, recipes(id, title, description)')
          .eq('menu_id', menu[0].id)
          .not('recipe_id', 'is', null)
          .order('day_of_week')
        setMenuRecipes(items || [])
      }

      // Hämta senaste recept
      const { data: recent } = await supabase
        .from('recipes')
        .select('id, title, description, ai_generated')
        .eq('household_id', hid)
        .order('id', { ascending: false })
        .limit(8)
      setRecipes(recent || [])
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return (
    <div className="loading-screen-center">
      <Spinner />Laddar...
    </div>
  )

  const DAYS = ['', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag']

  return (
    <div className="page animate-fade-in">
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', marginBottom: '6px' }}>👨‍🍳 Laga</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginBottom: '32px' }}>Välj vad du ska laga och starta steg-för-steg-läget.</p>

      {/* Veckomenyn */}
      {menuRecipes.length > 0 && (
        <div style={{ marginBottom: '36px' }}>
          <p className="section-label">Veckans meny</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {menuRecipes.map((item, i) => {
              const recipe = item.recipes
              if (!recipe) return null
              return (
                <Link
                  key={i}
                  href={`/cook/${recipe.id}`}
                  className="card"
                  style={{ padding: '16px 20px', textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>{DAYS[item.day_of_week] || ''}</p>
                    <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>{recipe.title}</p>
                    {recipe.description && <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{recipe.description}</p>}
                  </div>
                  <span style={{ fontSize: '20px', marginLeft: '12px', flexShrink: 0 }}>→</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Alla recept */}
      {recipes.length > 0 && (
        <div style={{ marginBottom: '36px' }}>
          <p className="section-label">Dina recept</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {recipes.map(recipe => (
              <Link
                key={recipe.id}
                href={`/cook/${recipe.id}`}
                className="card"
                style={{ padding: '20px', textDecoration: 'none', display: 'block' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <h3 style={{ fontSize: '15px', fontFamily: 'var(--font-heading)', color: 'var(--text)', flex: 1, marginRight: '8px' }}>{recipe.title}</h3>
                  {recipe.ai_generated && <span className="tag" style={{ fontSize: '11px', flexShrink: 0 }}>✨ AI</span>}
                </div>
                {recipe.description && <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.5' }}>{recipe.description}</p>}
                <p style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: '600', marginTop: '12px' }}>👨‍🍳 Börja laga →</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {recipes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '40px', marginBottom: '12px' }}>📖</p>
          <p style={{ marginBottom: '20px' }}>Inga recept än. Gå till receptbiblioteket och spara eller generera dina första recept.</p>
          <Link href="/recipes" className="btn-primary">Gå till recept →</Link>
        </div>
      )}
    </div>
  )
}

function getWeekStart() {
  const d = new Date()
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split('T')[0]
}
