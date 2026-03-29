'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import HouseholdCard from '../components/HouseholdCard'
import Spinner from '../components/Spinner'

const supabase = createClient()

const NAV_CARDS = [
  { emoji: '📅', title: 'Veckomenyn', desc: 'Planera veckans middagar', href: '/menu' },
  { emoji: '📖', title: 'Recept', desc: 'Bläddra och spara recept', href: '/recipes' },
  { emoji: '🛍️', title: 'Inköpslista', desc: 'Handla smart och billigt', href: '/shopping' },
  { emoji: '🥦', title: 'Skafferiet', desc: 'Minska svinn och rester', href: '/pantry' },
]

export default function Home() {
  const [user, setUser] = useState(undefined) // undefined = loading, null = utloggad
  const [household, setHousehold] = useState(null)
  const [householdId, setHouseholdId] = useState(null)
  const [preferences, setPreferences] = useState(null)
  const [aiSuggestion, setAiSuggestion] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user ?? null)
      if (!user) return

      const { data: members } = await supabase
        .from('household_members')
        .select('household_id, households(*)')
        .eq('user_id', user.id)
        .limit(1)

      if (members?.length) {
        setHouseholdId(members[0].household_id)
        setHousehold(members[0].households)
        const { data: prefs } = await supabase
          .from('household_preferences')
          .select('*')
          .eq('household_id', members[0].household_id)
          .maybeSingle()
        setPreferences(prefs)
      }
    }
    load()
  }, [])

  async function getAiSuggestion() {
    setAiLoading(true)
    setAiSuggestion('')
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Föreslå en veckans meny med 5 middagar. Bara namnen på rätterna, en per rad.', householdId }),
    })
    const data = await res.json()
    setAiSuggestion(data.content || '')
    setAiLoading(false)
  }

  // Loading
  if (user === undefined) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      <Spinner size="lg" />
    </div>
  )

  // ── UTLOGGAD — Hero ────────────────────────────────────────────
  if (!user) {
    return (
      <div style={{ paddingTop: 0 }}>
        {/* Hero */}
        <div className="hero" style={{ minHeight: '100vh' }}>
          <div className="hero-bg">
            <Image
              src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80"
              alt="Matlagning"
              fill
              priority
              style={{ objectFit: 'cover', opacity: 0.30 }}
            />
          </div>
          <div className="hero-content animate-fade-in">
            <p style={{ fontSize: '13px', fontWeight: '600', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.60)', marginBottom: '16px' }}>
              Din smarta matassistent
            </p>
            <h1>Planera, handla och laga — enklare.</h1>
            <p>
              AI-drivet stöd för hela matcykeln. Veckomenyer anpassade efter din familj, smarta inköpslistor och steg-för-steg lagaläge.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/auth/register" className="btn-cta" style={{ minWidth: '180px' }}>
                Kom igång gratis
              </Link>
              <Link href="/auth/login" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '14px 28px', background: 'rgba(255,255,255,0.12)', color: '#FFFFFF', border: '1.5px solid rgba(255,255,255,0.35)', borderRadius: '12px', textDecoration: 'none', fontSize: '16px', fontWeight: '600', backdropFilter: 'blur(4px)', minWidth: '140px' }}>
                Logga in
              </Link>
            </div>
          </div>
        </div>

        {/* Features */}
        <div style={{ background: 'var(--bg)', padding: '80px 24px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <p className="section-label" style={{ textAlign: 'center', marginBottom: '8px' }}>Funktioner</p>
            <h2 style={{ textAlign: 'center', marginBottom: '48px', fontFamily: 'var(--font-heading)' }}>Allt du behöver för maten</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {[
                { icon: '📅', title: 'Veckomenyn', text: 'Generera hela veckans middagar med ett knapptryck, anpassade efter era allergier och preferenser.' },
                { icon: '🛍️', title: 'Smart inköpslista', text: 'Inköpslistan skapas automatiskt från menyn. Stäms av mot skafferiet så du inte köper dubbelt.' },
                { icon: '👨‍🍳', title: 'Lagaläge', text: 'Steg-för-steg vid spisen med inbyggd timer, röststyrning och AI-hjälp om du saknar en ingrediens.' },
                { icon: '🏷️', title: 'Kampanjer', text: 'Se veckans erbjudanden i dina butiker och köp rätt varor vid rätt tillfälle.' },
              ].map((f, i) => (
                <div key={i} className="card" style={{ padding: '28px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '14px' }}>{f.icon}</div>
                  <h3 style={{ marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>{f.title}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.65' }}>{f.text}</p>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: '48px' }}>
              <Link href="/auth/register" className="btn-cta">
                Skapa konto gratis →
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── INLOGGAD — Dashboard ───────────────────────────────────────
  const firstName = user.email?.split('@')[0] ?? ''

  return (
    <div className="page animate-fade-in">
      {/* Hälsning */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', marginBottom: '4px' }}>
          Hej{firstName ? ` ${firstName}` : ''}! 👋
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>Vad ska det bli för mat?</p>
      </div>

      {/* Hushållskort eller onboarding */}
      {household ? (
        <HouseholdCard household={household} preferences={preferences} householdId={householdId} />
      ) : (
        <div className="card" style={{ padding: '28px', marginBottom: '24px', borderLeft: '4px solid var(--color-terracotta)' }}>
          <h3 style={{ marginBottom: '6px', fontFamily: 'var(--font-heading)' }}>Välkommen till Mathandelsagenten!</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
            Skapa ditt hushåll för att komma igång med menyplanering, recept och inköpslistor.
          </p>
          <Link href="/household" className="btn-primary">
            Skapa hushåll →
          </Link>
        </div>
      )}

      {/* Navigationskort */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '28px' }}>
        {NAV_CARDS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="card"
            style={{ padding: '22px', textDecoration: 'none', display: 'block' }}
          >
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>{item.emoji}</div>
            <h3 style={{ marginBottom: '4px', fontSize: '15px', fontFamily: 'var(--font-heading)' }}>{item.title}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{item.desc}</p>
          </Link>
        ))}
      </div>

      {/* AI-snabbförslag */}
      <div className="card" style={{ padding: '28px' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.125rem', marginBottom: '16px' }}>
          ✨ Snabbförslag på veckans meny
        </h2>
        <button
          onClick={getAiSuggestion}
          disabled={aiLoading}
          className="btn-primary"
          style={{ marginBottom: aiSuggestion ? '18px' : 0 }}
        >
          {aiLoading ? <><Spinner />&nbsp;Hämtar förslag...</> : 'Ge mig förslag!'}
        </button>
        {aiSuggestion && (
          <div className="animate-fade-in" style={{ whiteSpace: 'pre-wrap', color: 'var(--text)', lineHeight: '1.75', fontSize: '15px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            {aiSuggestion}
          </div>
        )}
      </div>
    </div>
  )
}
