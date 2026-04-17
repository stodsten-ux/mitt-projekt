# Mathandelsagenten Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementera "The Journey"-designen — landningssida, 4-stegs onboarding, bottom nav-polish och kontextuella "nästa steg"-banners som binder ihop Planera → Handla → Laga.

**Architecture:** 4 oberoende tasks som kan deployades i ordning. Inga routes tas bort. Befintlig AI-logik, databasschema och auth-flöde behålls. `page.js` hanterar auth-split (Landing / Onboarding / Dashboard) utan att röra `useHousehold`-hooken.

**Tech Stack:** Next.js 16, React hooks, Supabase browser-klient, Lucide React, CSS custom properties (inga Tailwind-klasser för ny UI).

---

## Filkarta

| Fil | Åtgärd | Ansvar |
|---|---|---|
| `app/globals.css` | Modify | Lägg till `--radius-card`, slide-in animation, bottom nav dot |
| `components/ModeSelector.js` | Modify | Ersätt emoji med Lucide `Home`, lägg till grön prick för aktiv flik |
| `components/Navbar.js` | Modify | Visa landing-nav (Logo + Logga in + Kom igång) när ingen user på `/` |
| `components/Landing.js` | Create | Hela landningssidans innehåll |
| `app/page.js` | Modify | Auth-split: no user → Landing, user + no household → /onboarding, user + household → Dashboard |
| `app/onboarding/page.js` | Create | 4-stegs onboarding med Supabase-skrivning |
| `components/NextStepBanner.js` | Create | Återanvändbar banner-komponent |
| `app/menu/page.js` | Modify | Lägg till NextStepBanner när menyn har rätter |
| `app/shopping/page.js` | Modify | Lägg till NextStepBanner när alla varor är bockade |
| `app/cook/[recipeId]/page.js` | Modify | Lägg till NextStepBanner (betygsätt) när alla steg är klara |

---

## Task 1: Visuella tokens + bottom nav-polish

**Files:**
- Modify: `app/globals.css`
- Modify: `components/ModeSelector.js`

- [ ] **Steg 1: Lägg till `--radius-card` och slide-in animation i globals.css**

Hitta `:root`-blocket och lägg till direkt efter `--radius-xl: 24px;`:

```css
  --radius-card: 20px;
```

Lägg till detta animationsblock någonstans efter `:root` (t.ex. efter `.animate-fade-in`):

```css
@keyframes slideInUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-slide-in {
  animation: slideInUp 0.25s ease forwards;
}
```

- [ ] **Steg 2: Uppdatera `.bottom-nav-item.active` i globals.css**

Hitta befintlig `.bottom-nav-item.active`-regel (eller skapa den om den saknas) och lägg till grön prick via `::after`:

```css
.bottom-nav-item.active::after {
  content: '';
  display: block;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--color-forest);
  margin: 2px auto 0;
}
```

- [ ] **Steg 3: Ersätt emoji med Lucide `Home` i ModeSelector.js**

Importera `Home` från lucide-react:

```javascript
import { CalendarDays, ShoppingBag, ChefHat, Home } from 'lucide-react'
```

Hitta det sista `<Link>`-elementet i `<nav className="bottom-nav">` (Hem-knappen) och byt ut:

```javascript
// Befintlig kod (ta bort):
<Link
  href="/"
  className={`bottom-nav-item${pathname === '/' ? ' active' : ''}`}
>
  <span className="icon">🏠</span>
  Hem
</Link>

// Ny kod:
<Link
  href="/"
  className={`bottom-nav-item${pathname === '/' ? ' active' : ''}`}
>
  <Home size={22} className="icon" />
  Hem
</Link>
```

- [ ] **Steg 4: Starta dev-servern och verifiera**

```bash
npm run dev
```

Öppna `http://localhost:3000` i mobil-storlek (375px bredd i DevTools).
Kontrollera att:
- Hem-ikonen i bottom nav är Lucide Home (inte emoji)
- Aktiv flik har en liten grön prick under etiketten
- Ny animation går att anropa med `className="animate-slide-in"`

- [ ] **Steg 5: Commit**

```bash
git add app/globals.css components/ModeSelector.js
git commit -m "style: uppdatera bottom nav med Lucide Home och grön aktiv-prick"
```

---

## Task 2: Landing page + auth-split i page.js

**Files:**
- Modify: `components/Navbar.js`
- Create: `components/Landing.js`
- Modify: `app/page.js`

- [ ] **Steg 1: Lägg till auth-medvetenhet i Navbar.js**

Importera `useEffect` (finns redan) och `useState` (finns redan). Lägg till ett `user`-state och hämta det:

```javascript
const [currentUser, setCurrentUser] = useState(undefined) // undefined = laddar, null = ej inloggad
```

I det första `useEffect` (efter `if (hide) return`), hämta user först:

```javascript
const { data: { user } } = await supabase.auth.getUser()
setCurrentUser(user)
if (!user) return  // befintlig rad — behålls
```

Hitta `if (hide) return null` och ersätt med:

```javascript
if (hide) return null

// Visa landing-navbar när ingen user är inloggad
if (currentUser === null) {
  return (
    <nav style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      height: '56px',
      background: 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      zIndex: 100,
    }}>
      <Link href="/" style={{ textDecoration: 'none', color: 'var(--color-forest)', fontWeight: '700', fontSize: '16px', fontFamily: 'var(--font-heading)' }}>
        Mathandel
      </Link>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <Link href="/auth/login" style={{ fontSize: '14px', color: 'var(--text-muted)', textDecoration: 'none', fontWeight: '500' }}>
          Logga in
        </Link>
        <Link href="/auth/register" style={{ fontSize: '14px', fontWeight: '600', color: '#fff', background: 'var(--color-terracotta)', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none' }}>
          Kom igång
        </Link>
      </div>
    </nav>
  )
}

// currentUser === undefined: laddar fortfarande — visa ingenting (undviker flash)
if (currentUser === undefined) return null
```

- [ ] **Steg 2: Skapa `components/Landing.js`**

Skapa filen med följande innehåll:

```javascript
'use client'

import Link from 'next/link'
import { CalendarDays, ShoppingBag, ChefHat, ChevronRight } from 'lucide-react'

const HERO_IMAGE = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80'

const BENEFITS = [
  { icon: CalendarDays, text: 'AI planerar veckan åt dig' },
  { icon: ShoppingBag, text: 'Inköpslistan skapas automatiskt' },
  { icon: ChefHat, text: 'Steg-för-steg när du lagar' },
]

const FLOW_STEPS = [
  { label: 'Planera', icon: CalendarDays, desc: 'Välj veckans rätter' },
  { label: 'Handla', icon: ShoppingBag, desc: 'Listan är klar' },
  { label: 'Laga', icon: ChefHat, desc: 'Steg för steg' },
]

const PRICING = {
  free: ['1 hushåll', '2 medlemmar', '20 recept', 'Inköpslista', 'Steg-för-steg lagning', 'Skafferi'],
  premium: ['Obegränsat', 'AI-menyförslag', '3 budgetalternativ', 'Prisjämförelse & kampanjer', 'Dietist-chat', 'Näringsinformation'],
}

export default function Landing() {
  return (
    <div style={{ paddingTop: '56px', background: 'var(--color-cream)', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>

      {/* ── Hero ── */}
      <section style={{
        background: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.60)), url(${HERO_IMAGE}) center/cover`,
        minHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: '60px 24px',
        color: '#fff',
      }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(36px, 8vw, 56px)', lineHeight: 1.15, marginBottom: '16px', maxWidth: '480px' }}>
          Veckans mat.<br />Klar på en minut.
        </h1>
        <p style={{ fontSize: '17px', opacity: 0.88, marginBottom: '36px', maxWidth: '340px', lineHeight: 1.6 }}>
          Planera, handla och laga — allt på ett ställe. Gratis.
        </p>
        <Link href="/auth/register" style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'var(--color-terracotta)', color: '#fff',
          padding: '16px 32px', borderRadius: '12px',
          textDecoration: 'none', fontSize: '16px', fontWeight: '700',
          boxShadow: '0 4px 20px rgba(196,98,45,0.45)',
        }}>
          Prova gratis <ChevronRight size={18} />
        </Link>
      </section>

      {/* ── Tre fördelar ── */}
      <section style={{ padding: '48px 20px' }}>
        <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '8px', scrollSnapType: 'x mandatory' }}>
          {BENEFITS.map(({ icon: Icon, text }) => (
            <div key={text} style={{
              flex: '0 0 240px', scrollSnapAlign: 'start',
              background: '#fff', borderRadius: 'var(--radius-card)',
              padding: '24px 20px', boxShadow: 'var(--shadow-sm)',
              display: 'flex', flexDirection: 'column', gap: '12px',
            }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--color-cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={22} color="var(--color-forest)" />
              </div>
              <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-text)', lineHeight: 1.4 }}>{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Flödesillustration ── */}
      <section style={{ padding: '0 20px 48px', textAlign: 'center' }}>
        <p style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '1.5px', color: 'var(--color-muted)', textTransform: 'uppercase', marginBottom: '24px' }}>
          Så fungerar det
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {FLOW_STEPS.map(({ label, icon: Icon, desc }, i) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ background: '#fff', borderRadius: 'var(--radius-card)', padding: '20px 16px', boxShadow: 'var(--shadow-sm)', textAlign: 'center', minWidth: '90px' }}>
                <Icon size={24} color="var(--color-forest)" style={{ marginBottom: '8px' }} />
                <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text)' }}>{label}</p>
                <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px' }}>{desc}</p>
              </div>
              {i < FLOW_STEPS.length - 1 && (
                <ChevronRight size={20} color="var(--color-sage)" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Socialt bevis ── */}
      <section style={{ padding: '0 20px 48px' }}>
        <div style={{ background: 'var(--color-forest)', borderRadius: 'var(--radius-card)', padding: '28px 24px', color: '#fff' }}>
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', lineHeight: 1.5, marginBottom: '20px', fontStyle: 'italic' }}>
            "Vi sparar 300 kr i veckan och stressar mycket mindre med maten."
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
              👨‍👩‍👧
            </div>
            <div>
              <p style={{ fontWeight: '600', fontSize: '14px' }}>Emma &amp; Jonas</p>
              <p style={{ fontSize: '13px', opacity: 0.75 }}>Barnfamilj, Göteborg</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Prissättning ── */}
      <section style={{ padding: '0 20px 48px' }}>
        <p style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '1.5px', color: 'var(--color-muted)', textTransform: 'uppercase', marginBottom: '24px', textAlign: 'center' }}>
          Välj din plan
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius-card)', padding: '24px 18px', boxShadow: 'var(--shadow-sm)' }}>
            <p style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>Gratis</p>
            <p style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-forest)', marginBottom: '20px' }}>0 kr</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {PRICING.free.map(item => (
                <li key={item} style={{ fontSize: '13px', color: 'var(--color-text)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--color-forest)', fontWeight: '700', flexShrink: 0 }}>✓</span> {item}
                </li>
              ))}
            </ul>
            <Link href="/auth/register" style={{ display: 'block', marginTop: '24px', padding: '12px', borderRadius: '10px', border: '1.5px solid var(--color-forest)', color: 'var(--color-forest)', textAlign: 'center', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
              Kom igång
            </Link>
          </div>
          <div style={{ background: 'var(--color-forest)', borderRadius: 'var(--radius-card)', padding: '24px 18px', boxShadow: 'var(--shadow-md)' }}>
            <p style={{ fontWeight: '700', fontSize: '16px', color: '#fff', marginBottom: '4px' }}>Premium</p>
            <p style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-sage)', marginBottom: '20px' }}>99 kr<span style={{ fontSize: '13px', fontWeight: '500', opacity: 0.8 }}>/mån</span></p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {PRICING.premium.map(item => (
                <li key={item} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.9)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--color-sage)', fontWeight: '700', flexShrink: 0 }}>✓</span> {item}
                </li>
              ))}
            </ul>
            <Link href="/auth/register" style={{ display: 'block', marginTop: '24px', padding: '12px', borderRadius: '10px', background: 'var(--color-terracotta)', color: '#fff', textAlign: 'center', textDecoration: 'none', fontWeight: '700', fontSize: '14px' }}>
              Prova 30 dagar gratis
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section style={{ padding: '48px 20px 80px', textAlign: 'center', background: '#fff' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(24px, 6vw, 36px)', color: 'var(--color-text)', marginBottom: '20px', lineHeight: 1.3 }}>
          Börja den bästa<br />matkassen du haft.
        </h2>
        <Link href="/auth/register" style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'var(--color-terracotta)', color: '#fff',
          padding: '16px 28px', borderRadius: '12px',
          textDecoration: 'none', fontSize: '15px', fontWeight: '700',
        }}>
          Skapa konto — det tar 2 minuter <ChevronRight size={16} />
        </Link>
      </section>

    </div>
  )
}
```

- [ ] **Steg 3: Modifiera `app/page.js` — auth-split**

Ersätt importen av `useHousehold` med den utökade varianten och lägg till logik för auth-split.

Lägg till import av Landing:
```javascript
import Landing from '../components/Landing'
```

Hitta anropet `const { user, householdId, isLoading: authLoading } = useHousehold()` och ersätt med:
```javascript
const { user, householdId, isLoading: authLoading } = useHousehold({ redirectTo: 'none' })
```

Lägg till `useRouter`-import om den inte finns:
```javascript
import { useRouter } from 'next/navigation'
```

Lägg till router och redirect-logik direkt efter `useHousehold`-anropet:
```javascript
const router = useRouter()

useEffect(() => {
  if (authLoading) return
  if (user && !householdId) router.push('/onboarding')
}, [user, householdId, authLoading, router])
```

Hitta `if (loading) return <DashboardSkeleton />` och lägg till dessa rader FÖRE den:
```javascript
// Visa landningssida för ej inloggade
if (!authLoading && !user) return <Landing />

// Väntar på redirect till /onboarding
if (!authLoading && user && !householdId) return null
```

- [ ] **Steg 4: Verifiera i browser**

```bash
npm run dev
```

- Öppna `http://localhost:3000` i inkognitoläge (ej inloggad) → ska visa landningssidan med transparent navbar
- Logga in → ska gå vidare till dashboard (om household finns)
- Om inloggad utan household → ska redirecta till `/onboarding` (returnerar 404 tills Task 3 är klar — OK)

- [ ] **Steg 5: Commit**

```bash
git add components/Landing.js components/Navbar.js app/page.js
git commit -m "feat: landningssida + auth-split i page.js"
```

---

## Task 3: Onboarding (4-stegs flöde)

**Files:**
- Create: `app/onboarding/page.js`

- [ ] **Steg 1: Skapa `app/onboarding/page.js`**

```javascript
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
```

- [ ] **Steg 2: Verifiera onboarding-flödet**

```bash
npm run dev
```

1. Logga in med ett konto som INTE har något hushåll, eller skapa ett nytt test-konto
2. Gå till `http://localhost:3000` → ska redirecta till `/onboarding`
3. Navigera igenom alla 4 steg
4. Kontrollera att "Hoppa över →" fungerar i varje steg
5. På steg 4: klicka "Visa min vecka →" och verifiera att:
   - Hushåll skapas i Supabase (kolla Dashboard → `households`)
   - `household_members` får en rad
   - `household_preferences` får en rad
   - Du redirectas till `/menu`

- [ ] **Steg 3: Commit**

```bash
git add app/onboarding/page.js
git commit -m "feat: 4-stegs onboarding med hushållsskapande"
```

---

## Task 4: "Nästa steg"-banners

**Files:**
- Create: `components/NextStepBanner.js`
- Modify: `app/menu/page.js`
- Modify: `app/shopping/page.js`
- Modify: `app/cook/[recipeId]/page.js`

- [ ] **Steg 1: Skapa `components/NextStepBanner.js`**

```javascript
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

/**
 * Kontextuell "nästa steg"-banner.
 * Visas längst ned i en vy när ett flödessteg är slutfört.
 *
 * Props:
 *   text  — string, ex. "Menyn är klar"
 *   cta   — string, ex. "Skapa inköpslistan"
 *   href  — string, sida att navigera till
 */
export default function NextStepBanner({ text, cta, href }) {
  return (
    <div style={{
      position: 'sticky',
      bottom: '72px', // över bottom nav (56px) + lite luft
      left: 0, right: 0,
      margin: '0 -16px', // bryt ut ur page-padding
      background: 'var(--color-forest)',
      padding: '14px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      zIndex: 50,
      borderTop: '1px solid rgba(255,255,255,0.1)',
    }}>
      <p style={{ color: 'rgba(255,255,255,0.80)', fontSize: '13px', margin: 0 }}>{text}</p>
      <Link
        href={href}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'var(--color-terracotta)', color: '#fff',
          padding: '9px 16px', borderRadius: '8px',
          textDecoration: 'none', fontSize: '13px', fontWeight: '700',
          whiteSpace: 'nowrap', flexShrink: 0,
        }}
      >
        {cta} <ChevronRight size={14} />
      </Link>
    </div>
  )
}
```

- [ ] **Steg 2: Lägg till banner i `app/menu/page.js`**

Importera komponenten överst i filen:
```javascript
import NextStepBanner from '../../components/NextStepBanner'
```

Hitta slutet av returvärdet (sista `</div>` i `return (...)`) och lägg till bannern precis innan den stänger:

```javascript
{/* Visa "nästa steg"-banner när menyn har minst en rätt */}
{hasItems && (
  <NextStepBanner
    text="Menyn är klar"
    cta="Skapa inköpslistan"
    href="/shopping"
  />
)}
```

Obs: `hasItems` är redan deklarerat i sidan som `const hasItems = Object.keys(menuItems).length > 0`.

- [ ] **Steg 3: Lägg till banner i `app/shopping/page.js`**

Importera komponenten:
```javascript
import NextStepBanner from '../../components/NextStepBanner'
```

I shopping-sidan: beräkna om alla varor är bockade. Lägg till detta i komponenten (efter att `items`-state är läst):

```javascript
const allChecked = items.length > 0 && items.every(item => item.checked)
```

Lägg till bannern i JSX precis före sista stängande `</div>`:

```javascript
{allChecked && (
  <NextStepBanner
    text="Klart! Alla varor är bockade"
    cta="Dags att laga"
    href="/cook"
  />
)}
```

- [ ] **Steg 4: Lägg till banner i `app/cook/[recipeId]/page.js`**

Obs: sidan har redan `done`-state (sätts till `true` när alla steg är klara) och inbyggd rating-UI (`rating`, `ratingComment`, `ratedDone`). Bannern ska länka till dashboard och bara visas när `done === true` och `ratedDone === true` (after rating).

Importera komponenten:
```javascript
import NextStepBanner from '../../../components/NextStepBanner'
```

Lägg till bannern i JSX (efter rating-sektionen, nära slutet av `return`):

```javascript
{done && ratedDone && (
  <NextStepBanner
    text="Klart för idag!"
    cta="Tillbaka till start"
    href="/"
  />
)}
```

- [ ] **Steg 5: Verifiera banners**

```bash
npm run dev
```

1. Gå till `/menu` med en meny som har rätter → grön banner ska synas längst ned
2. Gå till `/shopping` och bocka av alla varor → grön banner ska synas
3. Gå till ett recept i `/cook/[id]` och gå igenom alla steg → grön banner ska synas
4. Verifiera att bannern sitter ovanför bottom nav på mobil (375px bredd)

- [ ] **Steg 6: Commit**

```bash
git add components/NextStepBanner.js app/menu/page.js app/shopping/page.js app/cook/
git commit -m "feat: kontextuella nästa-steg-banners i Planera, Handla och Laga"
```

---

## Slutverifiering

- [ ] **Deploy till Vercel**

```bash
git push origin main
vercel --prod
```

- [ ] **Mobil-test (live-URL)**

På telefon: öppna appen i inkognitoläge → landningssida ska visas → registrering → onboarding → meny → inköpslista → laga.
Bekräfta att bannarna är synliga och att bottom nav inte täcker över innehåll.

---

## Vad som INTE ingår i denna plan

- Inga ändringar av AI-routes eller databasschema
- Inga premium-features
- Inga tester (projektet saknar test-infrastruktur — sätt upp Jest + React Testing Library som ett separat steg om det behövs)
- Invite-flödet (`app/invite/[token]/page.js`) berörs ej
