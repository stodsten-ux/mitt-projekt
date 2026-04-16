# Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bygga ett komponentbibliotek (tokens + CSS-klasser) och applicera det på meny- och dashboardsidan för en ICA-inspirerad, varm och editorial matapp-känsla.

**Architecture:** Nya design tokens läggs till i `globals.css`. En ny `app/components.css` definierar alla komponentklasser (`.drow`, `.ai-card`, `.btn-action`, `.pill`, `.rcard`, `.t-*`). Sidor byter ut inline-styles mot dessa klasser. Inga CSS Modules, inga beteendeändringar.

**Tech Stack:** Next.js 16, CSS (vanilla), Google Fonts (Playfair Display + Inter)

---

## Filstruktur

| Fil | Åtgärd | Ansvar |
|-----|--------|--------|
| `app/layout.js` | Modifiera | Lägg till Playfair 800 + italic + Inter 300 i font-URL. Importera `components.css`. |
| `app/globals.css` | Modifiera | Lägg till nya tokens (typography-skala, shadow-skala, 2 färger). Uppdatera `.btn-secondary`, lägg till `.btn-ghost`. |
| `app/components.css` | Skapa | Alla nya komponentklasser. |
| `app/menu/page.js` | Modifiera | Byt inline-styles mot nya klasser. |
| `app/page.js` | Modifiera | Byt inline-styles mot nya klasser på hero och kort. |

---

## Task 1: Uppdatera fonter i layout.js

**Files:**
- Modify: `app/layout.js:37-38`

- [ ] **Steg 1: Byt ut Google Fonts-länken**

Nuläge (rad 37–38 i `app/layout.js`):
```jsx
<link
  href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

Ersätt med:
```jsx
<link
  href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;1,400&family=Inter:wght@300;400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

Ändringen: lägger till Playfair Display 800 (upright) + 400 italic, och Inter 300 (light).

- [ ] **Steg 2: Starta dev-servern och verifiera att fonten laddas**

```bash
npm run dev
```

Öppna http://localhost:3000 i webbläsaren. Öppna DevTools → Network → filtrera på "fonts". Verifiera att en Playfair Display-request inkluderar `ital,wght@0,700;0,800;1,400`.

- [ ] **Steg 3: Committa**

```bash
git add app/layout.js
git commit -m "style: add Playfair Display 800 + italic and Inter 300 to font stack"
```

---

## Task 2: Utöka design tokens i globals.css

**Files:**
- Modify: `app/globals.css:8-49` (`:root`-blocket)

- [ ] **Steg 1: Lägg till nya tokens i `:root`**

Lägg till följande i slutet av `:root`-blocket (efter `--radius-xl: 24px;`, rad 48):

```css
  /* Nya färger */
  --color-sage-light: #b5ceba;
  --color-warm-white: #FDFCF9;

  /* Typografiskala */
  --text-xs:   11px;
  --text-sm:   13px;
  --text-base: 15px;
  --text-lg:   18px;
  --text-xl:   22px;
  --text-2xl:  28px;
  --text-3xl:  40px;

  /* Shadow-skala */
  --shadow-sm: 0 1px 4px rgba(45,74,62,0.08);
  --shadow-md: 0 4px 20px rgba(45,74,62,0.10);
  --shadow-lg: 0 12px 40px rgba(45,74,62,0.13);
```

- [ ] **Steg 2: Lägg till shadow-skala för dark mode**

I blocket `[data-theme='dark']` (rad 52–67), lägg till i slutet:

```css
  --shadow-sm: 0 1px 4px rgba(0,0,0,0.20);
  --shadow-md: 0 4px 20px rgba(0,0,0,0.30);
  --shadow-lg: 0 12px 40px rgba(0,0,0,0.45);
```

Gör samma sak i `@media (prefers-color-scheme: dark)` blocket (rad 70–87).

- [ ] **Steg 3: Uppdatera `.btn-secondary` och lägg till `.btn-ghost`**

Hitta `.btn-secondary`-definitionen (runt rad 197). Ändra `background: transparent` till `background: var(--bg-card)` och lägg till `box-shadow: var(--shadow-sm)`:

```css
.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  background: var(--bg-card);
  color: var(--text);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: background 150ms ease, box-shadow 150ms ease;
  box-shadow: var(--shadow-sm);
}

.btn-secondary:hover { background: var(--bg); box-shadow: var(--shadow-md); }
```

Lägg till `.btn-ghost` direkt efter `.btn-secondary:hover`:

```css
/* Ghost knapp — avbryt/bakåt */
.btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 16px;
  background: transparent;
  color: var(--text-muted);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition: background 150ms ease;
}

.btn-ghost:hover { background: var(--bg-card); }
```

- [ ] **Steg 4: Verifiera i webbläsaren**

Öppna http://localhost:3000. Inga visuella regressioner ska synas — sidan ska se identisk ut som innan (tokens används inte ännu av befintliga komponenter). Kontrollera att inga fel syns i konsolen.

- [ ] **Steg 5: Committa**

```bash
git add app/globals.css
git commit -m "style: add typography scale, shadow scale, and new color tokens"
```

---

## Task 3: Skapa app/components.css — typografiklasser

**Files:**
- Create: `app/components.css`

- [ ] **Steg 1: Skapa filen med typografikladdar**

Skapa `/Users/jonashallgren/Projekt/mathandelsagenten/.claude/worktrees/peaceful-jemison/app/components.css` med följande innehåll:

```css
/* ═══════════════════════════════════════════
   COMPONENTS.CSS — Mathandelsagenten
   Komponentklasser som kompletterar globals.css
   Import: app/layout.js
   ═══════════════════════════════════════════ */

/* ───────────────────────────────────────────
   TYPOGRAFI
   Regel: Playfair Display italic BARA i .t-display-italic (hero-subtitle).
   Aldrig i funktionella listor (dagsrader, knappar, receptkort).
─────────────────────────────────────────── */

.t-eyebrow {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-sage);
}

.t-display {
  font-family: var(--font-heading);
  font-size: var(--text-3xl);
  font-weight: 800;
  line-height: 1.08;
  color: var(--color-forest);
  letter-spacing: -0.025em;
}

/* Endast för hero-subtitle — enda tillåtna användningen av italic */
.t-display-italic {
  font-family: var(--font-heading);
  font-size: 38px;
  font-style: italic;
  font-weight: 400;
  line-height: 1.12;
  color: var(--color-forest);
}

.t-heading {
  font-family: var(--font-heading);
  font-size: var(--text-xl);
  font-weight: 700;
  line-height: 1.25;
  color: var(--color-forest);
  letter-spacing: -0.01em;
}

.t-body {
  font-family: var(--font-body);
  font-size: var(--text-base);
  font-weight: 400;
  line-height: 1.7;
  color: var(--text);
}

.t-body-medium {
  font-family: var(--font-body);
  font-size: var(--text-base);
  font-weight: 500;
  line-height: 1.6;
  color: var(--text);
}

.t-muted {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 300;
  line-height: 1.5;
  color: var(--text-muted);
  letter-spacing: 0.01em;
}
```

- [ ] **Steg 2: Importera components.css i layout.js**

Öppna `app/layout.js`. Lägg till import direkt efter den befintliga `globals.css`-importen (rad 1):

```js
import './globals.css'
import './components.css'   // ← lägg till denna rad
```

- [ ] **Steg 3: Verifiera att inga fel uppstår**

```bash
npm run dev
```

Öppna http://localhost:3000. Sidan ska se identisk ut (klasserna används inte ännu). Inga konsolfel.

- [ ] **Steg 4: Committa**

```bash
git add app/components.css app/layout.js
git commit -m "style: create components.css with typography classes"
```

---

## Task 4: Lägg till komponentklasser i components.css

**Files:**
- Modify: `app/components.css`

- [ ] **Steg 1: Lägg till dagsradsklasser**

Lägg till i slutet av `app/components.css`:

```css
/* ───────────────────────────────────────────
   DAGSRADER (.drow)
   Används i: app/menu/page.js
   Regel: Inter medium för rätttitel — aldrig Playfair, aldrig italic
─────────────────────────────────────────── */

.drow {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  margin-bottom: 5px;
  cursor: pointer;
  transition: background 150ms ease, box-shadow 150ms ease;
  text-decoration: none;
  color: inherit;
}

.drow:hover {
  background: var(--bg);
  box-shadow: var(--shadow-sm);
}

/* Dag med planerad rätt */
.drow.filled {
  border-left: 3px solid var(--color-sage);
}

/* Dagens rad */
.drow.today {
  background: rgba(45,74,62,0.05);
  border-left: 3px solid var(--color-forest);
}

.drow-day {
  width: 64px;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-muted);
  flex-shrink: 0;
}

.drow.today .drow-day {
  color: var(--color-forest);
  font-weight: 700;
}

/* Rätttitel: Inter medium — aldrig Playfair */
.drow-title {
  flex: 1;
  font-size: var(--text-base);
  font-weight: 500;
  color: var(--text);
}

.drow-empty {
  flex: 1;
  font-size: var(--text-sm);
  font-weight: 300;
  color: var(--border);
}

.drow-arrow {
  color: var(--border);
  font-size: 14px;
  flex-shrink: 0;
}

/* ───────────────────────────────────────────
   PILLS
─────────────────────────────────────────── */

.pill {
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 4px 10px;
  border-radius: 99px;
  flex-shrink: 0;
}

.pill-today {
  background: var(--color-forest);
  color: #fff;
}

.pill-warn {
  background: #fff3ec;
  color: var(--color-terracotta);
  border: 1px solid #f5d0b8;
}

[data-theme='dark'] .pill-today {
  background: var(--color-sage);
  color: #1A1A1A;
}

[data-theme='dark'] .pill-warn {
  background: rgba(196,98,45,0.15);
  border-color: rgba(196,98,45,0.30);
}
```

- [ ] **Steg 2: Lägg till AI suggestion card**

Lägg till i slutet av `app/components.css`:

```css
/* ───────────────────────────────────────────
   AI SUGGESTION CARD (.ai-card)
   Ersätter terracotta CTA-knapp för AI-funktioner.
   Visar vad AI:n kan göra just nu, med dynamisk sub-text.
─────────────────────────────────────────── */

.ai-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: linear-gradient(135deg, rgba(45,74,62,0.05) 0%, rgba(124,154,130,0.08) 100%);
  border: 1.5px solid var(--color-sage-light);
  border-radius: var(--radius-lg);
  padding: 15px 16px;
  cursor: pointer;
  transition: box-shadow 180ms ease, transform 180ms ease;
  text-decoration: none;
  color: inherit;
}

.ai-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.ai-card-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--color-forest);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ai-card-text {
  flex: 1;
  min-width: 0;
}

.ai-card-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-forest);
  margin-bottom: 2px;
}

.ai-card-sub {
  font-size: 12px;
  font-weight: 300;
  color: var(--text-muted);
}

.ai-card-arrow {
  color: var(--color-sage);
  font-size: 16px;
  flex-shrink: 0;
}

[data-theme='dark'] .ai-card {
  background: rgba(124,154,130,0.08);
  border-color: rgba(124,154,130,0.25);
}

[data-theme='dark'] .ai-card-title {
  color: var(--color-sage);
}
```

- [ ] **Steg 3: Lägg till åtgärdsrader och receptkort**

Lägg till i slutet av `app/components.css`:

```css
/* ───────────────────────────────────────────
   ÅTGÄRDSRADER (.btn-action)
   Listformat för sekundära handlingar (Generera inköpslista etc.)
   Samma visuella vikt som .drow för sammanhållen känsla.
─────────────────────────────────────────── */

.btn-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-family: var(--font-body);
  font-size: var(--text-base);
  text-decoration: none;
  color: inherit;
  transition: background 150ms ease, box-shadow 150ms ease;
  width: 100%;
  text-align: left;
  margin-bottom: 5px;
}

.btn-action:hover {
  background: var(--bg);
  box-shadow: var(--shadow-sm);
}

.btn-action:disabled {
  opacity: 0.4;
  cursor: default;
}

.btn-action-label {
  display: flex;
  align-items: center;
  gap: 9px;
  font-weight: 500;
  color: var(--text);
}

.btn-action-icon {
  color: var(--color-sage);
  flex-shrink: 0;
}

.btn-action-arrow {
  color: var(--border);
  font-size: 14px;
  flex-shrink: 0;
}

/* ───────────────────────────────────────────
   RECEPTKORT (.rcard)
─────────────────────────────────────────── */

.rcard {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: transform 200ms ease, box-shadow 200ms ease;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
}

.rcard:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
}

.rcard-img {
  width: 100%;
  height: 160px;
  object-fit: cover;
}

.rcard-body {
  padding: 14px 16px 16px;
}

.rcard-tag {
  display: block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-sage);
  margin-bottom: 5px;
}

/* Playfair upright — aldrig italic */
.rcard-title {
  font-family: var(--font-heading);
  font-size: var(--text-lg);
  font-weight: 700;
  line-height: 1.25;
  color: var(--color-forest);
  margin-bottom: 5px;
  letter-spacing: -0.01em;
}

.rcard-meta {
  font-size: 12px;
  font-weight: 300;
  color: var(--text-muted);
}
```

- [ ] **Steg 4: Verifiera att inga fel uppstår**

```bash
npm run dev
```

Öppna http://localhost:3000. Sidan ska fortfarande se identisk ut (klasserna används inte ännu). Inga konsolfel.

- [ ] **Steg 5: Committa**

```bash
git add app/components.css
git commit -m "style: add drow, pill, ai-card, btn-action, rcard component classes"
```

---

## Task 5: Applicera nya klasser på menu/page.js

**Files:**
- Modify: `app/menu/page.js`

Notera: Inga logikändringar — bara styling. Alla event handlers, state och API-anrop förblir oförändrade.

- [ ] **Steg 1: Ersätt veckonavigeringen**

Hitta veckonavs-blocket (runt rad 178–182). Ersätt med:

```jsx
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '12px 16px' }}>
  <button onClick={() => changeWeek(-1)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '16px', color: 'var(--text)' }}>←</button>
  <span style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', fontWeight: '700', color: 'var(--color-forest)', letterSpacing: '-0.01em' }}>{formatWeekLabel(weekStart)}</span>
  <button onClick={() => changeWeek(1)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '16px', color: 'var(--text)' }}>→</button>
</div>
```

- [ ] **Steg 2: Ersätt dagsraderna med .drow-klasser**

Lägg först till `todayDow` i komponenten. Hitta raden `const hasItems = Object.keys(menuItems).length > 0` (runt rad 169) och lägg till raden direkt innan:

```js
const todayDow = new Date().getDay() === 0 ? 7 : new Date().getDay()
const hasItems = Object.keys(menuItems).length > 0
```

Hitta `DAYS.map`-blocket (runt rad 186–233). Ersätt det inre `return`-blocket med:

```jsx
return (
  <div
    key={dayNum}
    className={`drow${title ? ' filled' : ''}${todayDow === dayNum ? ' today' : ''}`}
    style={{ marginBottom: '5px' }}
  >
    <span className="drow-day">{day}</span>
    {isEditing ? (
      <input
        autoFocus
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={() => finishEdit(dayNum)}
        onKeyDown={(e) => { if (e.key === 'Enter') finishEdit(dayNum); if (e.key === 'Escape') { setEditingDay(null); setEditValue('') } }}
        placeholder="Ange rätt..."
        style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--accent)', fontSize: '14px', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none' }}
      />
    ) : recipeId ? (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Link href={`/recipes/${recipeId}`} className="drow-title" style={{ textDecoration: 'none' }}>
          {title}
        </Link>
        <button onClick={() => startEdit(dayNum)} title="Redigera" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 2px', lineHeight: 1, flexShrink: 0 }}>
          <Pencil size={13} />
        </button>
      </div>
    ) : (
      <span onClick={() => startEdit(dayNum)} className={title ? 'drow-title' : 'drow-empty'}>
        {title || 'Klicka för att lägga till...'}
      </span>
    )}
    {todayDow === dayNum && title && !isEditing && (
      <span className="pill pill-today">Idag</span>
    )}
    {title && !isEditing && (
      <button onClick={() => { const n = { ...menuItems }; delete n[dayNum]; const r = { ...menuRecipeIds }; delete r[dayNum]; setLocalMenuItems(n); setLocalRecipeIds(r); saveMenu({ ...menuItems, [dayNum]: undefined }) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--border)', fontSize: '18px', padding: '0 4px', lineHeight: 1 }}>×</button>
    )}
  </div>
)
```

Lägg till `Pencil` i Lucide-importen överst i filen. Nuvarande import:
```js
import { ChevronRight, CalendarDays, ShoppingBag } from 'lucide-react'
```
Uppdatera till:
```js
import { ChevronRight, CalendarDays, ShoppingBag, Pencil, Sparkles, ShoppingCart, Zap } from 'lucide-react'
```

- [ ] **Steg 3: Ersätt knapp-sektionen med AI-kort och åtgärdsrader**

Hitta `{/* Knappar */}`-blocket (runt rad 244–269). Ersätt med:

```jsx
{/* AI suggestion card */}
<div className="ai-card" onClick={getAiSuggestion} style={{ marginBottom: '20px', opacity: (aiLoading || expandLoading) ? 0.6 : 1, pointerEvents: (aiLoading || expandLoading) ? 'none' : 'auto' }}>
  <div className="ai-card-icon">
    <Sparkles size={18} />
  </div>
  <div className="ai-card-text">
    <p className="ai-card-title">
      {(aiLoading || expandLoading)
        ? (expandLoading ? 'Genererar recept...' : 'Hämtar AI-förslag...')
        : 'Föreslå hela veckan med AI'}
    </p>
    <p className="ai-card-sub">Anpassas efter skafferi, budget och preferenser</p>
  </div>
  <span className="ai-card-arrow">→</span>
</div>

{/* Åtgärdsrader */}
<div style={{ display: 'flex', flexDirection: 'column' }}>
  <button
    className="btn-action"
    onClick={generateShoppingList}
    disabled={shoppingLoading || !hasItems}
  >
    <span className="btn-action-label">
      <ShoppingCart size={16} className="btn-action-icon" />
      {shoppingLoading ? 'Genererar inköpslista...' : 'Generera inköpslista'}
    </span>
    <span className="btn-action-arrow">›</span>
  </button>
  {hasItems && (
    <button
      className="btn-action"
      onClick={expandMenu}
      disabled={expandLoading || !menuId}
    >
      <span className="btn-action-label">
        <Zap size={16} className="btn-action-icon" />
        {expandLoading ? 'Genererar ingredienser...' : 'Generera ingredienser'}
      </span>
      <span className="btn-action-arrow">›</span>
    </button>
  )}
</div>
```

- [ ] **Steg 4: Ta bort emoji från sidrubriken**

Hitta `<h1 style=...>📅 Veckomenyn</h1>` (rad 175). Ersätt med:

```jsx
<h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '32px', color: 'var(--color-forest)', fontFamily: 'var(--font-heading)' }}>Veckomenyn</h1>
```

- [ ] **Steg 5: Verifiera i webbläsaren**

```bash
npm run dev
```

Öppna http://localhost:3000/menu. Kontrollera:
- Dagsrader har grön vänsterkant för ifyllda dagar
- Dagens rad har mörkgrön vänsterkant + mörkgrön dagnamn
- AI-kortet visas som ett klickbart kort (ej knapp)
- "Generera inköpslista" visas som åtgärdsrad
- Klicka på AI-kortet — spinner ska visas

- [ ] **Steg 6: Committa**

```bash
git add app/menu/page.js
git commit -m "style: apply design system classes to menu page"
```

---

## Task 6: Applicera nya klasser på app/page.js (Dashboard)

**Files:**
- Modify: `app/page.js`

- [ ] **Steg 1: Uppdatera hälsningen i hero-sektionen**

Hitta `<h1 style=...>{greeting} 👋</h1>` (runt rad 111). Ersätt med:

```jsx
<p className="t-eyebrow" style={{ color: 'rgba(255,255,255,0.65)', marginBottom: '6px' }}>
  {getDayName()} · vecka {getWeekNumber()}
</p>
<h1 className="t-display" style={{ color: '#fff', marginBottom: '20px' }}>
  {greeting}
</h1>
```

Ta bort den befintliga `<p style={{ fontSize: '13px', ... }}>` ovanför h1 (rad 108-110) — den ersätts av t-eyebrow ovan.

- [ ] **Steg 2: Lägg till .t-display-italic på "Ikväll lagar vi"-texten**

Hitta `<p style={{ fontSize: '11px', ...}}>Ikväll lagar vi</p>` (runt rad 117–119). Ersätt med:

```jsx
<p className="t-display-italic" style={{ color: '#fff', fontSize: '18px', marginBottom: '8px' }}>
  Ikväll lagar vi
</p>
```

- [ ] **Steg 3: Uppdatera inköpslista-kortet**

Hitta inköpsliste-kortets `<p style={{ fontSize: '15px', fontWeight: '600'...}}>` (runt rad 191). Ersätt rubrik och metadata:

```jsx
{shoppingList ? (
  <>
    <p className="t-body-medium">{shoppingList.count} varor</p>
    {shoppingList.estimatedCost > 0 && (
      <p className="t-muted">Est. {shoppingList.estimatedCost} kr</p>
    )}
  </>
) : (
  <p className="t-muted">Ingen aktiv inköpslista</p>
)}
```

- [ ] **Steg 4: Ta bort emojis från panikfunktionen**

Hitta panikknappens `<p style=...>⚠️ {item.name}` (runt rad 212). Ersätt `⚠️` med en `<AlertCircle>`-ikon (redan importerad). Hitta även panikknappens rubrik (rad 241) `<AlertCircle...> Vad kan jag laga just nu?` — den är redan korrekt. Kontrollera att `AlertCircle` används i stället för emoji.

- [ ] **Steg 5: Verifiera i webbläsaren**

```bash
npm run dev
```

Öppna http://localhost:3000. Kontrollera:
- Hero visar t-eyebrow (liten uppercase dagnamn) ovanför stor rubrik
- "Ikväll lagar vi" visas i Playfair italic (mjuk, editorial)
- Inköpslista-kortets text använder t-body-medium + t-muted
- Inga emojis i UI (utom hero-hälsningen 👋 som är OK i hero-kontext)

- [ ] **Steg 6: Bygg och kontrollera att inga TypeScript/lint-fel finns**

```bash
npm run build
```

Förväntat: build lyckas utan fel. Om varningar om oanvända imports — ta bort dem.

- [ ] **Steg 7: Committa**

```bash
git add app/page.js
git commit -m "style: apply design system classes to dashboard"
```

---

## Task 7: Skapa PR

- [ ] **Steg 1: Kontrollera att alla commits är på rätt gren**

```bash
git log --oneline -8
```

Förväntat: Du ser de 5 commits från denna plan (fonts, tokens, components.css, menu, dashboard).

- [ ] **Steg 2: Skapa PR**

```bash
gh pr create \
  --title "style: design system — ICA-inspirerad komponentbibliotek" \
  --body "## Vad

Inför ett komponentbibliotek (design tokens + CSS-klasser) med ICA-inspirerad editorial känsla och gröna jordfärger.

## Ändringar
- Playfair Display 800 + italic + Inter 300 i font-stacken
- Nya tokens: typografiskala, shadow-skala, sage-light, warm-white
- \`app/components.css\`: .drow, .pill, .ai-card, .btn-action, .rcard, .t-*
- Menysidan: dagsrader med grön vänsterkant, AI-funktion som suggestion card
- Dashboard: t-eyebrow/t-display hierarki i hero

## Testat
- Visuell inspektion på /menu och / (dashboard)
- npm run build utan fel
- Dark mode fungerar (tokens appliceras automatiskt)"
```
