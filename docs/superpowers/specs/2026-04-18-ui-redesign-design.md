# UI Redesign — Mathandelsagenten
**Datum:** 2026-04-18  
**Typ:** Visual design + navigation overhaul  
**Approach:** Minimal kirurgi — maximal visuell effekt

---

## Mål

Appen upplevs platt och oinbjudande. Flödet är oklart. Målet är ett Apple-inspirerat formspråk: exklusivt men balanserat, funktionellt men vackert. Användaren ska känna förtroende vid första anblick.

---

## Designbeslut (godkända i brainstorming)

### Riktning: Varm & Funktionell
- Solid color-hero (ingen matfoto — eliminerar layout shift)
- Icon + chevron-rader för navigation
- Tre tydliga hierarkinivåer på kort
- Ingen "fjantig" emoji i hälsning

### Navigation: Dashboard-driven
- `ModeSelector`-komponenten **tas bort helt**
- `body { padding-top: 104px }` → `56px`
- Navigation sker via dashboard-korten (Planera / Handla / Laga)
- Varje undersida (menu, shopping, cook, pantry) får en `← Tillbaka`-knapp

### Implementation: Minimal kirurgi
- Inga nya sidor skapas
- Nya CSS-klasser läggs till i `components.css`
- Inline styles i befintliga sidor konverteras till CSS-klasser
- `Navbar.js` slimmas
- `page.js` (dashboard) byggs om

---

## Designsystem — uppdaterade regler

### Bakgrund & Material
| Nivå | Värde | Användning |
|------|-------|-----------|
| 0 — Sida | `#F7F3EC` | `--bg` (varm parchment, inte vit) |
| 1 — Kort | `#FFFFFF` | `--bg-card` (papper) |
| 2 — Glass | `rgba(255,255,255,0.09)` + `backdrop-filter: blur(24px) saturate(140%)` | Hero-overlay, modaler |
| 3 — CTA | `linear-gradient(145deg, #2D4A3E 0%, #1e3529 100%)` | Primär CTA-knapp/kort |

### Typografi
```
Hero-rubrik:      Playfair Display 800, 52px, line-height 0.95, letter-spacing -0.04em
Sidrubrik:        Playfair Display 700, 28px, letter-spacing -0.03em
Kortrubriker:     Inter 700, 14px, letter-spacing -0.02em
Brödtext:         Inter 400, 15px, line-height 1.6
Metadata/muted:   Inter 400, 12px, color rgba(0,0,0,0.45)
Etiketter:        Inter 600, 10px, letter-spacing 0.14em, VERSALER
font-feature-settings: "kern" 1, "liga" 1 (på alla rubriker)
```

### Skuggsystem (varm umbra — forest-tintad)
```css
--shadow-sm:  0 1px 3px rgba(45,74,62,0.06), 0 4px 16px rgba(45,74,62,0.06);
--shadow-md:  0 4px 12px rgba(45,74,62,0.10), 0 16px 40px rgba(45,74,62,0.09);
--shadow-lg:  0 8px 24px rgba(45,74,62,0.28), 0 24px 56px rgba(45,74,62,0.22),
              inset 0 1px 0 rgba(255,255,255,0.07);
```

### Radier (konsistenta — aldrig blandade)
```css
--radius-sm:   10px   (alerts, pills)
--radius-md:   13px   (ikonwrappers)
--radius-card: 18px   (alla kort, hero-overlay)
--radius-full: 99px   (pills, nav-pill)
```

### Ikoner
- **Lucide SVG** genomgående. Stroke-width: `1.8`. Stroke-linecap: `round`.
- **Inga emojis** i funktionella UI-element.
- Ikonwrapper: 46×46px, border-radius 13px, bakgrundsfärg tematisk.

### Motion
```css
/* Spring-out easing — Apple-känsla */
transition: transform 0.18s cubic-bezier(.25,.46,.45,.94),
            box-shadow 0.18s cubic-bezier(.25,.46,.45,.94);

/* Hover */   translateY(-3px) + djupare skugga
/* Active */  scale(0.98)
/* Enter */   slideUp: opacity 0→1, translateY(16px→0), 0.5–0.6s, stagger 80ms
```

---

## Komponenter att skapa/uppdatera

### 1. `globals.css` — uppdatera variabler
```css
--bg: #F7F3EC;  /* var: varm parchment, ej #F5F0E8 */
--shadow-sm / --shadow-md / --shadow-lg  /* nya 2-lagers värden */
--radius-card: 18px
```

### 2. `components.css` — nya klasser

**`.step-card`** — bas-kort med hover/active
```css
background: #fff; border-radius: 18px; border: 1px solid rgba(45,74,62,0.08);
padding: 16px 18px; display: flex; align-items: center; gap: 14px;
box-shadow: var(--shadow-sm);
transition: transform 0.18s ..., box-shadow 0.18s ...;
cursor: pointer;
/* hover: translateY(-3px) + shadow-md */
/* active: scale(0.98) */
```

**`.cta-card`** — primär CTA-kort (Laga)
```css
background: linear-gradient(145deg, #2D4A3E, #1e3529);
border-radius: 18px; padding: 18px 16px;
box-shadow: var(--shadow-lg);
/* hover: translateY(-3px) + djupare shadow */
```

**`.step-icon-wrap`** — 46×46px ikoncontainer
```css
width: 46px; height: 46px; border-radius: 13px;
display: flex; align-items: center; justify-content: center; flex-shrink: 0;
```

**`.progress-micro`** — 3px progress-bar inuti kort
```css
height: 3px; background: #F0ECE4; border-radius: 2px; overflow: hidden;
/* fill: gradient #7C9A82 → #5a8262 */
```

**`.alert-card`** — varningsrad
```css
background: #FFF8F4; border: 1px solid rgba(196,98,45,0.16);
border-radius: 14px; padding: 12px 16px;
```

**`.nav-pill`** — hushållsknapp i navbar
```css
height: 30px; padding: 0 12px; background: rgba(45,74,62,0.08);
border-radius: 15px; display: flex; align-items: center; gap: 6px;
font-size: 12px; font-weight: 600; color: #2D4A3E;
```

**`@keyframes slideUp`**
```css
from { opacity: 0; transform: translateY(16px); }
to   { opacity: 1; transform: translateY(0); }
```

### 3. `Navbar.js` — slimmas
- Hårdkodade `style`-attribut ersätts med CSS-klasser
- Emoji `🌿` tas bort från logotyp
- `nav-pill` + `nav-icon-btn` klasser
- Frosted glass: `backdrop-filter: blur(24px) saturate(160%)`
- Height: 56px (oförändrad)

### 4. `ModeSelector.js` — **tas bort**
- Komponenten raderas: ta bort `import ModeSelector` och `<ModeSelector />` från `layout.js`
- `body { paddingTop: '104px' }` i `layout.js` ändras till `'56px'`
- ModeSelector.js-filen kan behållas tom eller raderas

### 5. `page.js` (Dashboard) — byggs om
**Ny struktur:**
```
<div class="page animate-fade-in">
  <HeroSection>                    // Solid forest-hero
    <p class="hero-eyebrow">       // Dag · Vecka X
    <h1 class="hero-title">        // "God kväll" (no emoji)
    <p class="hero-desc">          // Kontextuell text
    <TonightCard>                  // Glass-overlay med dagens rätt
  </HeroSection>

  <div class="content">
    <StepCard planera>             // Progress-bar
    <StepCard handla>              // Varor + kostnad
    <CtaCard laga>                 // CTA (forest gradient)
    <AlertCard?>                   // Pantry-varning (villkorlig)
  </div>
</div>
```

**Borttaget från nuläget:**
- `expiringItems`-sektionen (absorberas i AlertCard)
- Panikknapp som separat sektion (länk via AlertCard)
- Inline `style`-attribut → CSS-klasser
- Emoji i hälsning

### 6. `menu/page.js` — tillbaka-knapp + CSS-rensning
- Lägg till `<Link href="/" className="btn-ghost">← Tillbaka</Link>` överst
- Sidans rubrik: `t-heading`-klass
- Veckonavigering: `step-card`-liknande stil
- Inline styles → befintliga CSS-klasser

### 7. `shopping/page.js`, `cook/[recipeId]/page.js`, `pantry/page.js` — tillbaka-knapp
- `shopping`: `← Tillbaka` href="/"
- `cook/[recipeId]`: `← Tillbaka` href="/menu"
- `pantry`: `← Tillbaka` href="/"
- Använd `btn-ghost`-klassen genomgående

---

## Vad förblir oförändrat
- Hela datalagret (Supabase-queries, hooks, SWR)
- API-routes
- Autentiseringsflödet

## Dark mode
De nya forest-rgba-skuggorna fungerar inte i dark mode (för ljusa mot mörk bakgrund). Komplettera `[data-theme='dark']`-blocket i `globals.css`:
```css
[data-theme='dark'] {
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.14);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.24), 0 16px 40px rgba(0,0,0,0.20);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.42), 0 24px 56px rgba(0,0,0,0.32),
               inset 0 1px 0 rgba(255,255,255,0.04);
}
```
Detsamma för `@media (prefers-color-scheme: dark)`-blocket.

---

## Acceptanskriterier
- [ ] Ingen emoji synlig i funktionellt UI
- [ ] Hero-rubrik ≥ 48px på mobilvy
- [ ] Tre tydliga kortnivåer (bas / featured / CTA) visuellt urskiljbara
- [ ] `ModeSelector` renderar inte (104px chrome borta)
- [ ] Alla undersidor har tillbaka-knapp
- [ ] Hover + active states på alla klickbara kort
- [ ] Skuggor varm-tintade (forest-rgba), inte grå
- [ ] Inga inline `style`-attribut på komponentnivå (CSS-klasser används)
- [ ] Dark mode fungerar utan visuell regression
