'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Spinner from '../../components/Spinner'
import { getFallbackImage } from '../../lib/images'
import { ChefHat, ChevronRight, Sparkles, BookOpen } from 'lucide-react'
import Image from 'next/image'

const supabase = createClient()

export default function CookIndexPage() {
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
          .select('recipe_id, custom_title, day_of_week, recipes(id, title, description)')
          .eq('menu_id', menu[0].id)
          .order('day_of_week')
        setMenuRecipes((items || []).filter(i => i.recipe_id && i.recipes))
      }

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
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ChefHat size={26} /> Laga
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>Välj vad du ska laga och starta steg-för-steg-läget.</p>
      </div>

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
                  style={{ textDecoration: 'none', display: 'flex', overflow: 'hidden' }}
                >
                  {/* Miniatyrbild */}
                  <div style={{ width: '80px', flexShrink: 0, position: 'relative' }}>
                    <Image src={getFallbackImage(recipe.title)} alt={recipe.title} fill sizes="80px" style={{ objectFit: 'cover' }} />
                  </div>
                  <div style={{ padding: '14px 16px', flex: 1 }}>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      {DAYS[item.day_of_week] || ''}
                    </p>
                    <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>{recipe.title}</p>
                    {recipe.description && <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{recipe.description}</p>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', paddingRight: '16px' }}>
                    <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Alla recept — Spotify-inspirerade kort med bild */}
      {recipes.length > 0 && (
        <div style={{ marginBottom: '36px' }}>
          <p className="section-label">Dina recept</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
            {recipes.map(recipe => (
              <Link
                key={recipe.id}
                href={`/cook/${recipe.id}`}
                className="card"
                style={{ textDecoration: 'none', display: 'block', overflow: 'hidden' }}
              >
                {/* Bild 16:9 */}
                <div style={{ width: '100%', aspectRatio: '16/9', position: 'relative' }}>
                  <Image src={getFallbackImage(recipe.title)} alt={recipe.title} fill sizes="(max-width: 600px) 100vw, 350px" style={{ objectFit: 'cover' }} />
                </div>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '14px', fontFamily: 'var(--font-heading)', color: 'var(--text)', flex: 1, marginRight: '8px', lineHeight: '1.3' }}>{recipe.title}</h3>
                    {recipe.ai_generated && (
                      <span className="tag" style={{ fontSize: '11px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Sparkles size={10} /> AI
                      </span>
                    )}
                  </div>
                  {recipe.description && <p style={{ color: 'var(--text-muted)', fontSize: '12px', lineHeight: '1.4' }}>{recipe.description}</p>}
                  <p style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: '700', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ChefHat size={12} /> Börja laga
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {recipes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <BookOpen size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
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
