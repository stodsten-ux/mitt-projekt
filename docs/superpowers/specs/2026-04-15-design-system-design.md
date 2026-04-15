# Design System — Spec

**Datum:** 2026-04-15
**Status:** Godkänd

---

## Mål

Lyfta appens visuella kvalitet från funktionell-men-torr till editorial matapp-känsla. Inspirationskälla: ICA.se — men med gröna jordfärger (forest/sage) istället för rött. Implementeras som ett komponentbibliotek i en ny `components.css` som importeras i `layout.js`.

---

## Strategi — Ansats 3: Design tokens + komponentklasser

`globals.css` utökas med spacing-, shadow- och typografiskalor. En ny `components.css` definierar alla komponentklasser. Sidor byter ut inline-styles mot klasser. Inga CSS Modules.

```
globals.css      — design tokens (färger, spacing, shadow, typografi)
components.css   — komponentklasser (.btn-*, .drow, .ai-card, .rcard, ...)
layout.js        — importerar båda
```

---

## Font rendering

Global antialiasing appliceras i `globals.css`:

```css
* {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

---

## Typografisystem

### Regel: italic bara i hero
Playfair Display italic används **endast** i hero-subtiteln på dashboard. Aldrig i funktionella listor, knappar eller receptkort.

### Klasser

| Klass | Font | Vikt | Storlek | Användning |
|-------|------|------|---------|------------|
| `.t-eyebrow` | Inter | 600 | 11px | Sektion-label ovanför rubriker |
| `.t-display` | Playfair 800 | — | 40px | Sidans huvudrubrik (hero) |
| `.t-display-italic` | Playfair italic | 400 | 38px | Hero-subtitle (enda undantaget) |
| `.t-heading` | Playfair 700 | — | 22px | Sektionsrubriker |
| `.t-body` | Inter | 400 | 15px | Brödtext, beskrivningar |
| `.t-body-medium` | Inter | 500 | 15px | Funktionell text (dagstitel, receptnamn) |
| `.t-muted` | Inter | 300 | 13px | Stödtext, metadata |
| `.section-label` | Inter | 700 | 11px | Avsnittsetiketter (uppercase, letter-spacing) |

### Tokens som läggs till i globals.css

```css
/* Typografiskala */
--text-xs:   11px;
--text-sm:   13px;
--text-base: 15px;
--text-lg:   18px;
--text-xl:   22px;
--text-2xl:  28px;
--text-3xl:  40px;

/* Ny färgnyans (saknas i nuläget) */
--color-sage-light: #b5ceba;  /* används i .ai-card border */
--color-warm-white: #FDFCF9;  /* kortbakgrund, varmare än #fff */
```

---

## Shadow-skala (ny)

```css
--shadow-sm: 0 1px 4px rgba(45,74,62,0.08);
--shadow-md: 0 4px 20px rgba(45,74,62,0.10);
--shadow-lg: 0 12px 40px rgba(45,74,62,0.13);
```

---

## Spacing-skala (ny)

```css
--space-xs:  4px;
--space-sm:  8px;
--space-md:  16px;
--space-lg:  24px;
--space-xl:  32px;
```

---

## Komponentklasser

### Knappar — hierarki

| Klass | Bakgrund | Användning |
|-------|----------|------------|
| `.btn-primary` | `--color-forest` | Primär handling (Generera inköpslista, Spara) |
| `.btn-secondary` | Vit + border | Sekundär handling (Visa recept, Börja laga) |
| `.btn-ghost` | Transparent + border | Avbryt, bakåt |

**Terracotta CTA används inte på AI-funktioner.** Terracotta reserveras för varnings- och konverteringskontex (t.ex. Premium-uppgradering).

Alla knappar: `border-radius: 10px`, `font-weight: 600`, `transition: all 180ms ease`.

### AI Suggestion Card (`.ai-card`)

Ersätter den gamla terracotta-knappen för AI-funktioner. Är ett klickbart kort, inte en knapp.

```
[forest-ikon 40×40] | [titel 14px/600 + sub 12px/300] | →
```

- Bakgrund: `linear-gradient(135deg, #f0f6f1, #e8f2ea)`
- Border: `1.5px solid --sage-light`
- Titel anpassas dynamiskt — beskriver vad AI kan göra just nu (t.ex. "Fyll resterande dagar · Lördag & söndag saknas")
- Hover: `translateY(-1px)` + `shadow-md`

### Dagsrader (`.drow`)

```
[dagnamn 64px/500] | [rätt-titel flex/500] | [pill?] | [›]
```

- Bakgrund: `--warm-white`
- Border: `1px solid --border`, `border-radius: 12px`
- `.drow.filled` — vänsterkant `3px solid --sage`
- `.drow.today` — bakgrund `#f0f6f1`, vänsterkant `3px solid --forest`, dagnamn forest/700
- Hover: `background: #faf8f4` + `shadow-sm`
- Dagnamn: Inter 500, `--muted` (today: forest/700)
- Rätttitel: Inter 500, `--text` — **aldrig Playfair, aldrig italic**
- Tom rad: Inter 300, `#ccc`, placeholder-text

### Pills (`.pill`)

```css
.pill       { font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 99px; }
.pill-today { background: var(--color-forest); color: #fff; }
.pill-warn  { background: #fff3ec; color: var(--color-terracotta); border: 1px solid #f5d0b8; }
```

### Receptkort (`.rcard`)

- `border-radius: 16px`, overflow hidden
- Bildyta: `height: 160px`, `object-fit: cover`
- Tag: `.rcard-tag` — Inter 700, 10px, uppercase, `--sage`, letter-spacing 0.08em
- Titel: `.rcard-title` — Playfair 700, 16px, `--forest`, **ej italic**
- Meta: `.rcard-meta` — Inter 300, 12px, `--muted`

### Åtgärdsrader (`.btn-action`)

Ersätter stora primärknappar i listformat (t.ex. "Generera inköpslista", "Generera ingredienser"):

```
[ikon --sage] [text Inter 500 15px] ————————————— [› --border]
```

- Samma visuella vikt som `.drow` — appen känns sammanhållen
- Hover: `background: #faf8f4` + `shadow-sm`

### Section labels

```css
.section-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-muted);
  margin-bottom: 10px;
}
```

---

## Vad ändras på befintliga sidor

### Globalt
- Lägg till `antialiased` i `globals.css`
- Importera `components.css` i `layout.js`
- Ta bort inline-styles för knappar, kort och listor — ersätt med klasser
- Ersätt emojis i UI med Lucide-ikoner (designguiden säger redan detta)

### `app/menu/page.js`
- Veckokontroll: behåll struktur, applicera `.week-nav`-klass
- Dagslista: byt inline-div mot `.drow` + `.drow.today` + `.drow.filled`
- AI-knapp: byt `<button>` mot `.ai-card`-komponent
- "Generera inköpslista" / "Generera ingredienser": byt mot `.btn-action`-rader

### `app/page.js` (Dashboard)
- Hero-sektion: behåll struktur, lägg till `.t-display` och `.t-display-italic` på rätt element
- Veckosummering (7 boxar): behåll men applicera korrekt typografi
- Kort: applicera `.card` + `.info-card.accent` / `.info-card.warn`

---

## Vad ändras inte

- Färgpaletten (`--color-forest`, `--sage`, `--cream`, etc.) — oförändrad
- Fonter (Playfair Display + Inter) — redan på plats
- Komponentstruktur och logik — inga beteendeändringar
- Dark mode tokens — appliceras automatiskt när klasser används

---

## Scope

Denna spec täcker komponentbiblioteket och applicering på `menu/page.js` och `page.js` (dashboard) som pilotpages. Övriga sidor (`recipes`, `shopping`, `cook`, `pantry`) implementeras i ett separat steg med samma klasser.
