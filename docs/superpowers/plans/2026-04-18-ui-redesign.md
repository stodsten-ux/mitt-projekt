# UI Redesign — Implementationsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Byt ut det platta, emoji-drivna UI:t mot ett Apple-inspirerat formspråk med materialhierarki, djupa skuggor, dramatisk typografi och dashboard-driven navigation.

**Architecture:** Minimal kirurgi — inga nya sidor eller API-routes. Enbart CSS-system + komponentjusteringar. ModeSelector tas bort, dashboard byggs om med steg-kort, alla undersidor får tillbaka-knapp.

**Tech Stack:** Next.js 16.2, React 19, Lucide-react 1.7, CSS custom properties (globals.css + components.css)

**Spec:** `docs/superpowers/specs/2026-04-18-ui-redesign-design.md`

---

## Filöversikt

| Fil | Förändring |
|-----|-----------|
| `app/globals.css` | Uppdatera `--bg`, `--shadow-*`, `--radius-card`; lägga till dark-mode shadow-override |
| `app/components.css` | Lägga till `.step-card`, `.cta-card`, `.step-icon-wrap`, `.progress-micro`, `.alert-card`, `.nav-pill`, `.nav-icon-btn`, `.dashboard-hero`, `.dashboard-content`, `@keyframes slideUp` |
| `app/layout.js` | Ta bort ModeSelector-import + `<ModeSelector />`, ändra `paddingTop` 104px → 56px |
| `components/ModeSelector.js` | Ingen ändring behövs — importet tas bort i layout.js |
| `components/Navbar.js` | Frosted glass, ta bort emoji, ny `nav-pill` + `nav-icon-btn` |
| `app/page.js` | Fullständig ombyggnad med hero + steg-kort |
| `app/menu/page.js` | Lägga till tillbaka-knapp, ta bort inline styles |
| `app/shopping/page.js` | Lägga till tillbaka-knapp |
| `app/cook/[recipeId]/page.js` | Lägga till tillbaka-knapp |
| `app/pantry/page.js` | Lägga till tillbaka-knapp |

---

## Task 1: CSS-foundation — design tokens + komponentklasser

**Files:**
- Modify: `app/globals.css`
- Modify: `app/components.css`

### Steg 1.1 — Uppdatera design tokens i globals.css

Hitta `:root`-blocket och ersätt följande rader:

```css
/* NULÄGE i :root — ersätt dessa */
--bg:               var(--color-cream);
--shadow:           0 2px 12px rgba(45,74,62,0.10);
--shadow-hover:     0 8px 24px rgba(45,74,62,0.18);
--radius-card: 20px;

/* NY version */
--bg:               #F7F3EC;
--shadow:           0 1px 3px rgba(45,74,62,0.06), 0 4px 16px rgba(45,74,62,0.06);
--shadow-hover:     0 4px 12px rgba(45,74,62,0.10), 0 16px 40px rgba(45,74,62,0.09);
--radius-card:      18px;
```

Lägg till dessa rader i `:root` efter befintliga shadow-definitioner:

```css
  /* Ny shadow-skala (varm umbra — forest-tintad) */
  --shadow-sm:  0 1px 3px rgba(45,74,62,0.06), 0 4px 16px rgba(45,74,62,0.06);
  --shadow-md:  0 4px 12px rgba(45,74,62,0.10), 0 16px 40px rgba(45,74,62,0.09);
  --shadow-lg:  0 8px 24px rgba(45,74,62,0.28), 0 24px 56px rgba(45,74,62,0.22),
                inset 0 1px 0 rgba(255,255,255,0.07);
  --radius-full: 99px;
```

### Steg 1.2 — Uppdatera dark mode shadow-override i globals.css

Hitta `[data-theme='dark']`-blocket och lägg till i slutet av det:

```css
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.14);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.24), 0 16px 40px rgba(0,0,0,0.20);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.42), 0 24px 56px rgba(0,0,0,0.32),
               inset 0 1px 0 rgba(255,255,255,0.04);
```

Gör samma sak i `@media (prefers-color-scheme: dark)` → `:root:not([data-theme='light'])`-blocket.

### Steg 1.3 — Lägg till nya komponentklasser i slutet av components.css

Lägg till hela detta block i slutet av `components.css`:

```css
/* ───────────────────────────────────────────
   DASHBOARD HERO
─────────────────────────────────────────── */

.dashboard-hero {
  background: linear-gradient(145deg, #1e3529 0%, #2D4A3E 60%, #3a5e4d 100%);
  padding: 32px 22px 36px;
  position: relative;
  overflow: hidden;
}

/* Ambient glow — top right */
.dashboard-hero::before {
  content: '';
  position: absolute;
  top: -80px;
  right: -60px;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(124,154,130,0.22) 0%, transparent 65%);
  pointer-events: none;
}

.hero-eyebrow {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.38);
  margin-bottom: 10px;
  position: relative;
  z-index: 1;
}

.hero-title {
  font-family: var(--font-heading);
  font-size: 52px;
  font-weight: 800;
  color: #fff;
  line-height: 0.95;
  letter-spacing: -0.04em;
  margin-bottom: 12px;
  position: relative;
  z-index: 1;
}

.hero-desc {
  font-size: 14px;
  line-height: 1.55;
  color: rgba(255,255,255,0.55);
  margin-bottom: 24px;
  position: relative;
  z-index: 1;
  font-weight: 400;
  letter-spacing: -0.01em;
}

.hero-desc strong {
  color: rgba(255,255,255,0.88);
  font-weight: 600;
}

/* Glasskort för "Ikväll lagar vi" */
.tonight-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(255,255,255,0.09);
  backdrop-filter: blur(24px) saturate(140%);
  -webkit-backdrop-filter: blur(24px) saturate(140%);
  border: 1px solid rgba(255,255,255,0.13);
  border-radius: var(--radius-card);
  padding: 16px 18px;
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  transition: background 0.2s ease;
  position: relative;
  z-index: 1;
}

.tonight-card:hover { background: rgba(255,255,255,0.13); }
.tonight-card:active { transform: scale(0.99); }

.tonight-icon-wrap {
  width: 46px;
  height: 46px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tonight-body { flex: 1; min-width: 0; }

.tonight-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.42);
  margin-bottom: 4px;
}

.tonight-name {
  font-family: var(--font-heading);
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.tonight-arrow {
  color: rgba(255,255,255,0.3);
  flex-shrink: 0;
}

/* ───────────────────────────────────────────
   DASHBOARD CONTENT
─────────────────────────────────────────── */

.dashboard-content {
  padding: 24px 18px 40px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ───────────────────────────────────────────
   STEG-KORT (bas-nivå)
─────────────────────────────────────────── */

.step-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  background: #fff;
  border-radius: var(--radius-card);
  border: 1px solid rgba(45,74,62,0.08);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  transition: transform 0.18s cubic-bezier(.25,.46,.45,.94),
              box-shadow 0.18s cubic-bezier(.25,.46,.45,.94);
  -webkit-tap-highlight-color: transparent;
}

.step-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
}

.step-card:active { transform: scale(0.98); }

.step-icon-wrap {
  width: 46px;
  height: 46px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-body { flex: 1; min-width: 0; }

.step-title {
  font-size: 14px;
  font-weight: 700;
  color: #0F1A14;
  letter-spacing: -0.02em;
  margin-bottom: 3px;
}

.step-sub {
  font-size: 12px;
  color: #7C9A82;
  font-weight: 500;
  letter-spacing: -0.01em;
}

.step-sub.urgent { color: #C4622D; }

.step-arrow {
  color: rgba(0,0,0,0.2);
  flex-shrink: 0;
}

/* Progress-rad inuti step-card */
.progress-wrap { margin-top: 6px; }

.progress-micro {
  height: 3px;
  background: #F0ECE4;
  border-radius: 2px;
  overflow: hidden;
}

.progress-micro-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, #7C9A82, #5a8262);
  transition: width 0.6s ease;
}

.progress-label {
  font-size: 10px;
  color: rgba(0,0,0,0.32);
  margin-top: 4px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

/* ───────────────────────────────────────────
   CTA-KORT — Laga ikväll (primär nivå)
─────────────────────────────────────────── */

.cta-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 18px;
  background: linear-gradient(145deg, #2D4A3E 0%, #1e3529 100%);
  border-radius: var(--radius-card);
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  box-shadow: var(--shadow-lg);
  transition: transform 0.18s cubic-bezier(.25,.46,.45,.94),
              box-shadow 0.18s cubic-bezier(.25,.46,.45,.94);
  -webkit-tap-highlight-color: transparent;
}

.cta-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 40px rgba(45,74,62,0.36), 0 30px 64px rgba(45,74,62,0.28),
              inset 0 1px 0 rgba(255,255,255,0.1);
}

.cta-card:active { transform: scale(0.98); }

.cta-icon-wrap {
  width: 46px;
  height: 46px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cta-body { flex: 1; min-width: 0; }

.cta-title {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.02em;
  margin-bottom: 2px;
}

.cta-sub {
  font-size: 12px;
  color: rgba(255,255,255,0.5);
  font-weight: 400;
  letter-spacing: -0.01em;
}

.cta-arrow {
  color: rgba(255,255,255,0.28);
  flex-shrink: 0;
}

/* ───────────────────────────────────────────
   ALERT-KORT — Pantry-varning
─────────────────────────────────────────── */

.alert-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #FFF8F4;
  border-radius: 14px;
  border: 1px solid rgba(196,98,45,0.16);
  box-shadow: 0 1px 4px rgba(196,98,45,0.08);
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  transition: background 0.15s ease;
}

.alert-card:hover { background: #FFF3EC; }

.alert-pip {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #C4622D;
  flex-shrink: 0;
  box-shadow: 0 0 0 3px rgba(196,98,45,0.15);
}

.alert-body { flex: 1; min-width: 0; }

.alert-title {
  font-size: 12px;
  font-weight: 600;
  color: #C4622D;
  letter-spacing: -0.01em;
}

.alert-sub {
  font-size: 11px;
  color: #8B6914;
  margin-top: 1px;
  font-weight: 400;
}

/* ───────────────────────────────────────────
   NAVBAR — ny nav-pill + nav-icon-btn
─────────────────────────────────────────── */

.nav-pill {
  height: 30px;
  padding: 0 12px;
  background: rgba(45,74,62,0.08);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #2D4A3E;
  cursor: pointer;
  border: none;
  letter-spacing: -0.01em;
  transition: background 0.15s ease;
  text-decoration: none;
}

.nav-pill:hover { background: rgba(45,74,62,0.13); }

.nav-icon-btn {
  width: 32px;
  height: 32px;
  background: rgba(45,74,62,0.07);
  border-radius: 10px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #2D4A3E;
  text-decoration: none;
  transition: background 0.15s ease;
  flex-shrink: 0;
}

.nav-icon-btn:hover { background: rgba(45,74,62,0.13); }

/* ───────────────────────────────────────────
   ENTER-ANIMATION (staggered slideUp)
─────────────────────────────────────────── */

@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

.slide-up-1 { animation: slideUp 0.55s cubic-bezier(.25,.46,.45,.94) 0.10s both; }
.slide-up-2 { animation: slideUp 0.55s cubic-bezier(.25,.46,.45,.94) 0.18s both; }
.slide-up-3 { animation: slideUp 0.55s cubic-bezier(.25,.46,.45,.94) 0.26s both; }
.slide-up-4 { animation: slideUp 0.55s cubic-bezier(.25,.46,.45,.94) 0.34s both; }
.slide-up-5 { animation: slideUp 0.50s cubic-bezier(.25,.46,.45,.94) 0.42s both; }
.slide-up-6 { animation: slideUp 0.50s cubic-bezier(.25,.46,.45,.94) 0.50s both; }
.slide-up-7 { animation: slideUp 0.50s cubic-bezier(.25,.46,.45,.94) 0.58s both; }
.slide-up-8 { animation: slideUp 0.50s cubic-bezier(.25,.46,.45,.94) 0.64s both; }
```

### Steg 1.4 — Verifiera visuellt

```bash
npm run dev
```

Öppna `http://localhost:3000`. Befintliga sidor ska se ut som förut — inga synliga förändringar ännu (nya klasser är ej applicerade). Om sidan kraschar, kontrollera CSS-syntax.

- [ ] Steg 1.1 — Uppdatera shadow + bg + radius tokens i globals.css
- [ ] Steg 1.2 — Lägg till dark mode shadow-override i globals.css
- [ ] Steg 1.3 — Lägg till alla komponentklasser i slutet av components.css
- [ ] Steg 1.4 — Starta dev-server, verifiera att inga CSS-fel syns i konsolen

### Steg 1.5 — Commit

```bash
git add app/globals.css app/components.css
git commit -m "style: nytt shadow-system, radius-card 18px och dashboard-komponentklasser"
```

- [ ] Steg 1.5 — Commit

---

## Task 2: Layout chrome — ta bort ModeSelector, fixa padding

**Files:**
- Modify: `app/layout.js`

### Steg 2.1 — Ta bort ModeSelector från layout.js

Öppna `app/layout.js`. Gör dessa tre ändringar:

**Rad 1 — Ta bort import:**
```js
// Ta bort denna rad:
import ModeSelector from '../components/ModeSelector'
```

**Rad 2 — Ta bort JSX-elementet:**
```jsx
// Ta bort denna rad inuti <body>:
<ModeSelector />
```

**Rad 3 — Ändra paddingTop:**
```jsx
// Nuläge:
<body style={{ paddingTop: '104px' }}>

// Ny version:
<body style={{ paddingTop: '56px' }}>
```

### Steg 2.2 — Verifiera

```bash
npm run dev
```

Öppna `http://localhost:3000`. Kontrollera:
- Flik-baren (Planera/Handla/Laga) är borta
- Sidans innehåll börjar 56px ned istället för 104px
- Inga konsol-fel om ModeSelector

- [ ] Steg 2.1 — Ta bort ModeSelector-import och JSX, ändra paddingTop
- [ ] Steg 2.2 — Verifiera visuellt i webbläsaren

### Steg 2.3 — Commit

```bash
git add app/layout.js
git commit -m "feat: ta bort ModeSelector-tabbar, minska nav-chrome 104px → 56px"
```

- [ ] Steg 2.3 — Commit

---

## Task 3: Navbar — frosted glass, ingen emoji, nya CSS-klasser

**Files:**
- Modify: `components/Navbar.js`

### Steg 3.1 — Ersätt hela Navbar.js

Ersätt hela innehållet i `components/Navbar.js` med:

```jsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../lib/supabase'
import { Home, Settings, ChevronDown, LogOut, RefreshCw, User } from 'lucide-react'

const supabase = createClient()

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [household, setHousehold] = useState(null)
  const [householdId, setHouseholdId] = useState(null)
  const [currentUser, setCurrentUser] = useState(undefined)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  const hide = pathname.startsWith('/auth') || pathname.startsWith('/invite')

  useEffect(() => {
    if (hide) return
    async function loadHousehold() {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
      if (!user) return
      const { data: members } = await supabase
        .from('household_members')
        .select('household_id, households(id, display_name, name)')
        .eq('user_id', user.id)
        .limit(1)
      if (members?.length > 0) {
        setHouseholdId(members[0].household_id)
        setHousehold(members[0].households)
      }
    }
    loadHousehold()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.push('/auth/login')
    })
    return () => subscription.unsubscribe()
  }, [hide, router])

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (hide) return null

  const navStyle = {
    position: 'fixed',
    top: 0, left: 0, right: 0,
    height: '56px',
    background: 'rgba(247,243,236,0.88)',
    backdropFilter: 'blur(24px) saturate(160%)',
    WebkitBackdropFilter: 'blur(24px) saturate(160%)',
    borderBottom: '0.5px solid rgba(45,74,62,0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 18px',
    zIndex: 100,
  }

  const logoStyle = {
    textDecoration: 'none',
    fontFamily: 'var(--font-heading)',
    fontSize: '17px',
    fontWeight: '800',
    color: '#1a2f25',
    letterSpacing: '-0.03em',
  }

  // Ej inloggad — landing navbar
  if (currentUser === null) {
    return (
      <nav style={{ ...navStyle, background: 'transparent', borderBottom: 'none' }}>
        <Link href="/" style={logoStyle}>Mathandel</Link>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link href="/auth/login" style={{ fontSize: '14px', color: 'var(--text-muted)', textDecoration: 'none', fontWeight: '500' }}>
            Logga in
          </Link>
          <Link href="/auth/register" className="btn-cta" style={{ fontSize: '13px', padding: '8px 16px' }}>
            Kom igång
          </Link>
        </div>
      </nav>
    )
  }

  if (currentUser === undefined) return null

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const householdName = household?.display_name || household?.name || 'Hushåll'

  return (
    <nav style={navStyle}>
      <Link href="/" style={logoStyle}>Mathandel</Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {householdId ? (
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setDropdownOpen(v => !v)}
              className="nav-pill"
            >
              <Home size={11} strokeWidth={2.5} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                {householdName}
              </span>
              <ChevronDown size={10} style={{ opacity: 0.6, flexShrink: 0 }} />
            </button>

            {dropdownOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-md)',
                minWidth: '180px',
                overflow: 'hidden',
                zIndex: 200,
              }}>
                <Link href={`/household/${householdId}`} onClick={() => setDropdownOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', textDecoration: 'none', color: 'var(--text)', fontSize: '14px', borderBottom: '1px solid var(--border)' }}>
                  <Home size={15} /> Mitt hushåll
                </Link>
                <Link href="/household" onClick={() => setDropdownOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', textDecoration: 'none', color: 'var(--text)', fontSize: '14px', borderBottom: '1px solid var(--border)' }}>
                  <RefreshCw size={15} /> Byt hushåll
                </Link>
                <button onClick={handleLogout}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '14px', textAlign: 'left' }}>
                  <LogOut size={15} /> Logga ut
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link href="/household" className="nav-pill">
            Skapa hushåll
          </Link>
        )}

        <Link
          href={householdId ? `/household/${householdId}` : '/household'}
          className="nav-icon-btn"
          title="Inställningar"
        >
          <Settings size={15} strokeWidth={1.8} />
        </Link>
      </div>
    </nav>
  )
}
```

### Steg 3.2 — Verifiera

```bash
npm run dev
```

Kontrollera i webbläsaren:
- Logotypen "Mathandel" utan emoji
- Navbar har frostad glaseffekt (synlig om du scrollar sidan nedanför ett kort)
- Hushållets namn visas i en rundad pill
- Inställningsikon i kvadratisk bakgrund
- Dropdown fungerar och stängs vid klick utanför

- [ ] Steg 3.1 — Ersätt Navbar.js
- [ ] Steg 3.2 — Verifiera navbar visuellt och dropdown-funktion

### Steg 3.3 — Commit

```bash
git add components/Navbar.js
git commit -m "style: navbar frosted glass, emoji borttagen, nav-pill + nav-icon-btn"
```

- [ ] Steg 3.3 — Commit

---

## Task 4: Dashboard — fullständig ombyggnad

**Files:**
- Modify: `app/page.js`

### Steg 4.1 — Ersätt hela page.js

Ersätt hela innehållet i `app/page.js` med:

```jsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DashboardSkeleton from '../components/skeletons/DashboardSkeleton'
import { getFallbackImage } from '../lib/images'
import { ChefHat, CalendarDays, ShoppingBag, ChevronRight, UtensilsCrossed } from 'lucide-react'
import { useHousehold } from '../lib/hooks/useHousehold'
import Landing from '../components/Landing'

const supabase = createClient()

export default function DashboardPage() {
  const { user, householdId, isLoading: authLoading } = useHousehold({ redirectTo: 'none' })
  const router = useRouter()
  const [dataLoading, setDataLoading] = useState(false)
  const [todayItem, setTodayItem] = useState(null)
  const [weekItems, setWeekItems] = useState([])
  const [shoppingList, setShoppingList] = useState(null)
  const [expiringItems, setExpiringItems] = useState([])

  const loading = authLoading || dataLoading

  useEffect(() => {
    if (authLoading) return
    if (user && !householdId) router.push('/onboarding')
  }, [user, householdId, authLoading, router])

  useEffect(() => {
    if (!householdId) return
    async function load() {
      setDataLoading(true)
      const hid = householdId
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
          .select('recipe_id, custom_title, day_of_week, recipes(id, title)')
          .eq('menu_id', menu[0].id)
          .order('day_of_week')
        const allItems = items || []
        setWeekItems(allItems)
        const todayDow = getTodayDayOfWeek()
        setTodayItem(allItems.find(i => i.day_of_week === todayDow) || null)
      }

      const { data: lists } = await supabase
        .from('shopping_lists')
        .select('id, title')
        .eq('household_id', hid)
        .order('id', { ascending: false })
        .limit(1)

      if (lists?.length) {
        const { data: sitems } = await supabase
          .from('shopping_items')
          .select('id, checked, price')
          .eq('shopping_list_id', lists[0].id)
        const total = sitems?.reduce((s, i) => s + (i.price || 0), 0) || 0
        setShoppingList({ ...lists[0], count: sitems?.length || 0, estimatedCost: Math.round(total) })
      }

      const soon = new Date()
      soon.setDate(soon.getDate() + 2)
      const { data: pantry } = await supabase
        .from('pantry')
        .select('name, expires_at')
        .eq('household_id', hid)
        .not('expires_at', 'is', null)
        .lte('expires_at', soon.toISOString().split('T')[0])
        .order('expires_at')
        .limit(1)
      setExpiringItems(pantry || [])

      setDataLoading(false)
    }
    load()
  }, [householdId])

  if (!authLoading && !user) return <Landing />
  if (!authLoading && user && !householdId) return <DashboardSkeleton />
  if (loading) return <DashboardSkeleton />

  const hour = new Date().getHours()
  const greeting = getGreeting(hour)
  const todayTitle = todayItem?.recipes?.title || todayItem?.custom_title

  // Kontextuell hero-beskrivning
  const heroDesc = todayTitle
    ? <>Redo att laga <strong>{todayTitle}</strong> ikväll?</>
    : weekItems.length > 0
      ? 'Veckans meny är planerad.'
      : 'Planera veckans middagar med AI-stöd.'

  return (
    <div className="animate-fade-in">

      {/* ── Hero ── */}
      <div className="dashboard-hero">
        <p className="hero-eyebrow slide-up-1">{getDayName()} · Vecka {getWeekNumber()}</p>
        <h1 className="hero-title slide-up-2">{greeting}</h1>
        <p className="hero-desc slide-up-3">{heroDesc}</p>

        {todayTitle && (
          <Link
            href={todayItem?.recipes?.id ? `/cook/${todayItem.recipes.id}` : '/menu'}
            className="tonight-card slide-up-4"
          >
            <div className="tonight-icon-wrap">
              <UtensilsCrossed size={20} color="rgba(255,255,255,0.8)" strokeWidth={1.8} />
            </div>
            <div className="tonight-body">
              <p className="tonight-label">Ikväll lagar vi</p>
              <p className="tonight-name">{todayTitle}</p>
            </div>
            <ChevronRight size={18} className="tonight-arrow" />
          </Link>
        )}
      </div>

      {/* ── Steg-kort ── */}
      <div className="dashboard-content">

        {/* Planera */}
        <Link href="/menu" className="step-card slide-up-5">
          <div className="step-icon-wrap" style={{ background: '#EEF4F0' }}>
            <CalendarDays size={20} color="#2D4A3E" strokeWidth={1.8} />
          </div>
          <div className="step-body">
            <p className="step-title">Planera veckan</p>
            {weekItems.length > 0 ? (
              <div className="progress-wrap">
                <div className="progress-micro">
                  <div className="progress-micro-fill" style={{ width: `${(weekItems.length / 7) * 100}%` }} />
                </div>
                <p className="progress-label">{weekItems.length} av 7 dagar planerade</p>
              </div>
            ) : (
              <p className="step-sub">Planera veckans middagar</p>
            )}
          </div>
          <ChevronRight size={16} className="step-arrow" />
        </Link>

        {/* Handla */}
        <Link href="/shopping" className="step-card slide-up-6">
          <div className="step-icon-wrap" style={{ background: '#FFF3EC' }}>
            <ShoppingBag size={20} color="#C4622D" strokeWidth={1.8} />
          </div>
          <div className="step-body">
            <p className="step-title">Handla</p>
            {shoppingList ? (
              <p className="step-sub urgent">
                {shoppingList.count} varor
                {shoppingList.estimatedCost > 0 ? ` · uppskattad kostnad ${shoppingList.estimatedCost} kr` : ''}
              </p>
            ) : (
              <p className="step-sub">Ingen aktiv inköpslista</p>
            )}
          </div>
          <ChevronRight size={16} className="step-arrow" />
        </Link>

        {/* Laga — CTA om dagens rätt finns, annars base-kort */}
        {todayTitle && todayItem?.recipes?.id ? (
          <Link href={`/cook/${todayItem.recipes.id}`} className="cta-card slide-up-7">
            <div className="cta-icon-wrap">
              <ChefHat size={20} color="rgba(255,255,255,0.85)" strokeWidth={1.8} />
            </div>
            <div className="cta-body">
              <p className="cta-title">Börja laga ikväll</p>
              <p className="cta-sub">{todayTitle} · steg-för-steg</p>
            </div>
            <ChevronRight size={16} className="cta-arrow" />
          </Link>
        ) : (
          <Link href="/cook" className="step-card slide-up-7">
            <div className="step-icon-wrap" style={{ background: '#EEF4F0' }}>
              <ChefHat size={20} color="#2D4A3E" strokeWidth={1.8} />
            </div>
            <div className="step-body">
              <p className="step-title">Laga</p>
              <p className="step-sub">Receptbiblioteket</p>
            </div>
            <ChevronRight size={16} className="step-arrow" />
          </Link>
        )}

        {/* Pantry-alert (villkorlig) */}
        {expiringItems.length > 0 && (
          <Link
            href={`/panic?items=${expiringItems.map(i => encodeURIComponent(i.name)).join(',')}`}
            className="alert-card slide-up-8"
          >
            <div className="alert-pip" />
            <div className="alert-body">
              <p className="alert-title">{expiringItems[0].name} {formatExpiry(expiringItems[0].expires_at)}</p>
              <p className="alert-sub">Vad kan jag laga med det som finns hemma?</p>
            </div>
            <ChevronRight size={14} color="#C4622D" style={{ opacity: 0.5, flexShrink: 0 }} />
          </Link>
        )}

      </div>
    </div>
  )
}

/* ── Hjälpfunktioner ── */

function getGreeting(hour) {
  if (hour < 5)  return 'God natt'
  if (hour < 10) return 'God morgon'
  if (hour < 12) return 'God förmiddag'
  if (hour < 17) return 'God eftermiddag'
  return 'God kväll'
}

function getWeekStart() {
  const d = new Date()
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split('T')[0]
}

function getTodayDayOfWeek() {
  const d = new Date().getDay()
  return d === 0 ? 7 : d
}

function getDayName() {
  const days = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag']
  return days[new Date().getDay()]
}

function getWeekNumber() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
}

function formatExpiry(dateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exp = new Date(dateStr)
  const diff = Math.round((exp - today) / 86400000)
  if (diff < 0) return '— utgånget'
  if (diff === 0) return '— går ut idag'
  if (diff === 1) return '— går ut imorgon'
  return `— går ut om ${diff} dagar`
}
```

### Steg 4.2 — Verifiera

```bash
npm run dev
```

Kontrollera på `http://localhost:3000` (inloggad med ett hushåll):
- Grön hero med stor "God kväll"-rubrik (52px)
- Tre steg-kort under hero med hover-effekt
- Om det finns dagens rätt: tonight-card och CTA-kort (mörkgrönt)
- Om det finns utgångna varor: orange alert-kort längst ned
- Korten glider in med stagger-animation vid sidladdning
- Ingen tab-bar synlig

- [ ] Steg 4.1 — Ersätt page.js
- [ ] Steg 4.2 — Verifiera dashboard visuellt

### Steg 4.3 — Commit

```bash
git add app/page.js
git commit -m "feat: dashboard ombyggd — hero, steg-kort, slideUp-animation, inga emojis"
```

- [ ] Steg 4.3 — Commit

---

## Task 5: Tillbaka-knappar på alla undersidor

**Files:**
- Modify: `app/menu/page.js`
- Modify: `app/shopping/page.js`
- Modify: `app/cook/[recipeId]/page.js`
- Modify: `app/pantry/page.js`

### Steg 5.1 — menu/page.js: lägg till tillbaka-knapp och rensa rubrik

Hitta return-satsens öppnande div i `app/menu/page.js`:

```jsx
// NULÄGE (rad ~177):
return (
  <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }}>
    <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '32px', color: 'var(--color-forest)', fontFamily: 'var(--font-heading)' }}>Veckomenyn</h1>
```

Ersätt med:

```jsx
return (
  <div className="page animate-fade-in">
    <Link href="/" className="btn-ghost" style={{ display: 'inline-flex', marginBottom: '20px', fontSize: '13px' }}>
      ← Tillbaka
    </Link>
    <h1 className="t-heading" style={{ marginBottom: '24px' }}>Veckomenyn</h1>
```

### Steg 5.2 — shopping/page.js: lägg till tillbaka-knapp och ta bort emoji i rubrik

Hitta rad ~202–204 i `app/shopping/page.js`:

```jsx
// NULÄGE (rad ~202):
  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '28px', color: 'var(--text)' }}>🛍️ Inköpslista</h1>
```

Ersätt med:

```jsx
  return (
    <div className="page animate-fade-in">
      <Link href="/" className="btn-ghost" style={{ display: 'inline-flex', marginBottom: '20px', fontSize: '13px' }}>
        ← Tillbaka
      </Link>
      <h1 className="t-heading" style={{ marginBottom: '24px' }}>Inköpslista</h1>
```

`Link` är redan importerad i filen.

### Steg 5.3 — cook/[recipeId]/page.js: lägg till tillbaka-knapp

Öppna `app/cook/[recipeId]/page.js`. Hitta return-satsens container (söka på `return (` följt av en `<div`). Lägg till tillbaka-knapp direkt efter container-divens öppningstag — men bara när `recipe` är laddat och vi inte är på `done`-skärmen:

```jsx
{/* Tillbaka-länk — visas inte på done-screen */}
{!done && (
  <Link href="/menu" className="btn-ghost" style={{ display: 'inline-flex', marginBottom: '16px', fontSize: '13px' }}>
    ← Tillbaka till menyn
  </Link>
)}
```

### Steg 5.4 — pantry/page.js: lägg till tillbaka-knapp

Öppna `app/pantry/page.js`. Hitta return-satsens container-div. Lägg till efter öppningstag:

```jsx
<Link href="/" className="btn-ghost" style={{ display: 'inline-flex', marginBottom: '20px', fontSize: '13px' }}>
  ← Tillbaka
</Link>
```

### Steg 5.5 — Verifiera alla undersidor

```bash
npm run dev
```

Kontrollera:
- `/menu` — tillbaka-knapp syns överst, rubriken "Veckomenyn" är stilad med `t-heading`-klassen
- `/shopping` — tillbaka-knapp syns överst
- `/cook/[recipeId]` — tillbaka-knapp "← Tillbaka till menyn" syns under laddning och under stegging (inte på betygs-skärmen)
- `/pantry` — tillbaka-knapp syns överst
- Knappen använder `.btn-ghost`-stilen (subtil, grå border)

- [ ] Steg 5.1 — Lägg till tillbaka-knapp i menu/page.js
- [ ] Steg 5.2 — Lägg till tillbaka-knapp i shopping/page.js
- [ ] Steg 5.3 — Lägg till tillbaka-knapp i cook/[recipeId]/page.js
- [ ] Steg 5.4 — Lägg till tillbaka-knapp i pantry/page.js
- [ ] Steg 5.5 — Verifiera alla fyra undersidor

### Steg 5.6 — Commit

```bash
git add app/menu/page.js app/shopping/page.js app/cook/[recipeId]/page.js app/pantry/page.js
git commit -m "feat: tillbaka-knappar på meny, shopping, cook och pantry"
```

- [ ] Steg 5.6 — Commit

---

## Task 6: Bygg och driftsätt

### Steg 6.1 — Bygg lokalt och kontrollera inga fel

```bash
npm run build
```

Förväntad output: `Route (app)` med gröna bockmarkeringar. Inga TypeScript- eller modulfel.

Om build misslyckas: kontrollera att `UtensilsCrossed` finns i `lucide-react@1.7`. Byt ut mot `Utensils` om den saknas:

```jsx
// Om UtensilsCrossed inte hittas, använd istället:
import { Utensils } from 'lucide-react'
// och byt ut <UtensilsCrossed ...> mot <Utensils ...>
```

### Steg 6.2 — Uppdatera TODO.md

Lägg till följande i `TODO.md` under `## Senaste session`:

```markdown
## Senaste session — 2026-04-18
**Gjort:**
- UI redesign: Apple-inspirerat formspråk med materialhierarki
- ModeSelector (tab-bar) borttagen — nav-chrome 104px → 56px
- Dashboard ombyggd: solid forest-hero, steg-kort med progress, CTA-kort för laga
- Nytt shadow-system (varm umbra, forest-tintad, 2–3 lager)
- Alla emojis i UI ersatta med Lucide SVG-ikoner
- Navbar: frosted glass, nav-pill, ingen emoji
- Tillbaka-knappar på meny, shopping, cook, pantry
- Staggered slideUp-animation (8 delay-klasser)
```

### Steg 6.3 — Driftsätt

```bash
git add TODO.md
git commit -m "docs: uppdatera TODO med UI-redesign-session"
vercel --prod
```

- [ ] Steg 6.1 — Kör npm run build, åtgärda eventuella iconfel
- [ ] Steg 6.2 — Uppdatera TODO.md
- [ ] Steg 6.3 — Commit + vercel --prod

---

## Acceptanschecklista (kör manuellt efter deploy)

- [ ] Ingen emoji synlig i funktionellt UI (navbar, dashboard, kort)
- [ ] Hero-rubrik är ≥ 48px på mobilvy (375px)
- [ ] Tre tydliga kortnivåer visuellt urskiljbara (vit/glass/forest)
- [ ] Tab-bar syns inte på någon sida
- [ ] Alla undersidor har tillbaka-knapp
- [ ] Hover + active-state på alla klickbara kort
- [ ] Skuggor har varm grönton (inte kall grå)
- [ ] Korten animeras in med stagger vid sidladdning
- [ ] Dark mode fungerar utan visuell regression
- [ ] Navbar är transparent/frosted (inte solid vit) vid scroll
