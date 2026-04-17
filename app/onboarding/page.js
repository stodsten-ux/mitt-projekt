'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import { ChevronRight, ChevronLeft } from 'lucide-react'

const supabase = createClient()

const HERO_IMAGE = 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=800&q=80'

const BUDGET_OPTIONS = [
  { emoji: '💚', label: 'Budgetvecka', sub: '~500 kr/vecka', value: 500 },
  { emoji: '🧡', label: 'Balanserad', sub: '~800 kr/vecka', value: 800 },
  { emoji: '💜', label: 'Lyxvecka', sub: '~1 200 kr/vecka', value: 1200 },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [adults, setAdults] = useState(2)
  const [hasChildren, setHasChildren] = useState(null)
  const [budget, setBudget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function finish() {
    setSaving(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      // Skapa hushåll
      const { data: household, error: hErr } = await supabase
        .from('households')
        .insert({
          name: `Hushåll`,
          display_name: `Mitt hushåll`,
          adults,
          children: hasChildren ? 1 : 0,
          weekly_budget: budget || 800,
          created_by: user.id,
          household_type: hasChildren ? 'barnfamilj' : adults === 1 ? 'singel' : 'par',
          subscription_tier: 'free',
        })
        .select('id')
        .single()

      if (hErr || !household) throw new Error(hErr?.message || 'Kunde inte skapa hushåll')

      // Skapa household_member
      await supabase.from('household_members').insert({
        household_id: household.id,
        user_id: user.id,
        role: 'admin',
      })

      // Skapa household_preferences med budget
      await supabase.from('household_preferences').insert({
        household_id: household.id,
        portion_modifier: 1.0,
        diverse_menu: true,
      })

      router.push('/menu')
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const dotStyle = (active) => ({
    width: active ? '20px' : '6px',
    height: '6px',
    borderRadius: '3px',
    background: active ? 'var(--color-forest)' : 'var(--color-warm-gray)',
    transition: 'all 0.2s ease',
  })

  const Progress = () => (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center', marginBottom: '32px' }}>
      {[1, 2, 3, 4].map(s => <div key={s} style={dotStyle(s === step)} />)}
    </div>
  )

  const Skip = () => (
    <button
      onClick={() => step < 4 ? setStep(s => s + 1) : finish()}
      style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', fontSize: '14px' }}
    >
      Hoppa över →
    </button>
  )

  // Steg 1: Välkommen
  if (step === 1) return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <Skip />
      <div style={{
        background: `linear-gradient(rgba(0,0,0,0.40), rgba(0,0,0,0.65)), url(${HERO_IMAGE}) center/cover`,
        minHeight: '55vh',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        padding: '40px 28px',
        color: '#fff',
      }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '36px', lineHeight: 1.2, marginBottom: '12px' }}>
          Mat för hela veckan.<br />Enkelt.
        </h1>
        <p style={{ fontSize: '16px', opacity: 0.88, lineHeight: 1.6 }}>
          Vi hjälper dig planera, handla och laga — utan stress.
        </p>
      </div>
      <div style={{ padding: '32px 24px' }}>
        <Progress />
        <button
          onClick={() => setStep(2)}
          style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'var(--color-forest)', color: '#fff', border: 'none', fontSize: '16px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          Kom igång <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )

  // Steg 2: Hushållet
  if (step === 2) return (
    <div style={{ minHeight: '100vh', padding: '60px 24px 40px', position: 'relative' }}>
      <Skip />
      <Progress />
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', marginBottom: '8px' }}>Hur många är ni?</h2>
      <p style={{ color: 'var(--color-muted)', marginBottom: '32px', fontSize: '15px' }}>Vi anpassar portioner och budget efter hushållet.</p>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '40px' }}>
        {[1, 2, 3, 4, 5, 6].map(n => (
          <button
            key={n}
            onClick={() => setAdults(n)}
            style={{
              width: '64px', height: '64px', borderRadius: '16px', border: '2px solid',
              borderColor: adults === n ? 'var(--color-forest)' : 'var(--color-border)',
              background: adults === n ? 'var(--color-forest)' : '#fff',
              color: adults === n ? '#fff' : 'var(--color-text)',
              fontSize: '22px', fontWeight: '700', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {n}{n === 6 ? '+' : ''}
          </button>
        ))}
      </div>

      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', marginBottom: '16px' }}>Har ni barn?</h2>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '40px' }}>
        {[{ label: 'Ja', val: true }, { label: 'Nej', val: false }].map(({ label, val }) => (
          <button
            key={label}
            onClick={() => setHasChildren(val)}
            style={{
              flex: 1, padding: '16px', borderRadius: '12px', border: '2px solid',
              borderColor: hasChildren === val ? 'var(--color-forest)' : 'var(--color-border)',
              background: hasChildren === val ? 'var(--color-forest)' : '#fff',
              color: hasChildren === val ? '#fff' : 'var(--color-text)',
              fontSize: '16px', fontWeight: '600', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button onClick={() => setStep(1)} style={{ padding: '14px 20px', borderRadius: '12px', border: '1.5px solid var(--color-border)', background: 'transparent', cursor: 'pointer', color: 'var(--color-muted)' }}>
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => setStep(3)}
          disabled={hasChildren === null}
          style={{ flex: 1, padding: '16px', borderRadius: '12px', background: hasChildren === null ? 'var(--color-warm-gray)' : 'var(--color-forest)', color: hasChildren === null ? 'var(--color-muted)' : '#fff', border: 'none', fontSize: '16px', fontWeight: '700', cursor: hasChildren === null ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}
        >
          Nästa
        </button>
      </div>
    </div>
  )

  // Steg 3: Budget
  if (step === 3) return (
    <div style={{ minHeight: '100vh', padding: '60px 24px 40px', position: 'relative' }}>
      <Skip />
      <Progress />
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', marginBottom: '8px' }}>Vad är er veckbudget?</h2>
      <p style={{ color: 'var(--color-muted)', marginBottom: '32px', fontSize: '15px' }}>AI:n väljer recept som passar er budget.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '40px' }}>
        {BUDGET_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setBudget(opt.value)}
            style={{
              padding: '20px', borderRadius: '16px', border: '2px solid',
              borderColor: budget === opt.value ? 'var(--color-forest)' : 'var(--color-border)',
              background: budget === opt.value ? 'rgba(45,74,62,0.06)' : '#fff',
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: '16px',
            }}
          >
            <span style={{ fontSize: '28px' }}>{opt.emoji}</span>
            <div>
              <p style={{ fontWeight: '700', fontSize: '16px', color: 'var(--color-text)', marginBottom: '2px' }}>{opt.label}</p>
              <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>{opt.sub}</p>
            </div>
            {budget === opt.value && (
              <div style={{ marginLeft: 'auto', width: '22px', height: '22px', borderRadius: '50%', background: 'var(--color-forest)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontSize: '13px', fontWeight: '700' }}>✓</span>
              </div>
            )}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button onClick={() => setStep(2)} style={{ padding: '14px 20px', borderRadius: '12px', border: '1.5px solid var(--color-border)', background: 'transparent', cursor: 'pointer', color: 'var(--color-muted)' }}>
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => setStep(4)}
          disabled={!budget}
          style={{ flex: 1, padding: '16px', borderRadius: '12px', background: !budget ? 'var(--color-warm-gray)' : 'var(--color-forest)', color: !budget ? 'var(--color-muted)' : '#fff', border: 'none', fontSize: '16px', fontWeight: '700', cursor: !budget ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}
        >
          Nästa
        </button>
      </div>
    </div>
  )

  // Steg 4: Klart — spara och fortsätt
  return (
    <div style={{ minHeight: '100vh', padding: '60px 24px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <Progress />
      <div style={{ fontSize: '56px', marginBottom: '20px' }}>🎉</div>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '30px', marginBottom: '12px' }}>Allt klart!</h2>
      <p style={{ color: 'var(--color-muted)', fontSize: '16px', lineHeight: 1.6, marginBottom: '40px', maxWidth: '280px' }}>
        Vi skapar ditt hushåll och skickar dig till veckoplaneraren.
      </p>

      {error && (
        <p style={{ color: 'var(--danger)', fontSize: '14px', marginBottom: '20px', padding: '12px 16px', background: 'rgba(217,79,59,0.08)', borderRadius: '10px', border: '1px solid rgba(217,79,59,0.2)' }}>
          {error}
        </p>
      )}

      <button
        onClick={finish}
        disabled={saving}
        style={{ width: '100%', maxWidth: '300px', padding: '18px', borderRadius: '12px', background: 'var(--color-terracotta)', color: '#fff', border: 'none', fontSize: '17px', fontWeight: '700', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
      >
        {saving ? 'Sparar...' : 'Visa min vecka →'}
      </button>

      <button onClick={() => setStep(3)} style={{ marginTop: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', fontSize: '14px' }}>
        ← Tillbaka
      </button>
    </div>
  )
}
