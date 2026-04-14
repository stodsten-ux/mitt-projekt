# Design: Skeleton Screens (P3)

**Datum:** 2026-04-14
**Status:** Godkänd, redo för implementation

---

## Mål

Ersätt alla spinner-laddningstillstånd i appen med sidspecifika skeleton screens med shimmer-animation. Förbättrar upplevd hastighet och minskar layout shift.

---

## Arkitektur

### Bas-komponent

`components/Skeleton.js` — en enkel block-komponent med shimmer-animation via CSS `@keyframes`. Shimmer använder `--color-warm-gray` och `--color-cream` så den fungerar i både ljust och mörkt läge (design-tokens redan definierade i `globals.css`).

```jsx
// Exempel på API
<Skeleton width="100%" height="24px" borderRadius="8px" />
<Skeleton width="60%" height="16px" />
```

### Sidspecifika skeleton-komponenter

```
components/skeletons/
  DashboardSkeleton.js
  MenuSkeleton.js
  RecipesSkeleton.js
  RecipeDetailSkeleton.js
  ShoppingSkeleton.js
  PantrySkeleton.js
  CookSkeleton.js
  CookDetailSkeleton.js
  HouseholdSkeleton.js
  HouseholdDetailSkeleton.js
```

Varje komponent återspeglar sidans verkliga layout — kort, rader, rubriker — med korrekt storlek och avstånd.

---

## Integration med SWR

Alla sidor använder redan SWR-hooks (`useHousehold`, `useMenu`, `useRecipes`, osv.) som exponerar `isLoading`. Bytet är rakt:

```jsx
// Innan
if (isLoading) return <div className="spinner" />

// Efter
if (isLoading) return <DashboardSkeleton />
```

Inga ändringar krävs i hookarna.

---

## Shimmer-animation

Implementeras en gång i `Skeleton.js` via inline `<style>` eller i `globals.css`:

```css
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-warm-gray) 25%,
    var(--color-cream)     50%,
    var(--color-warm-gray) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 8px;
}
```

Mörkt läge hanteras automatiskt via CSS-variablerna.

---

## Sidor och deras skeletons

| Sida | Hook/datakälla | Skeleton-innehåll |
|---|---|---|
| `app/page.js` (Dashboard) | `useHousehold` | Hälsningshuvud, 3 läges-kort, snabbåtgärder |
| `app/menu/page.js` | `useMenu` | Veckogrid med 7 dag-kort |
| `app/recipes/page.js` | `useRecipes` | Grid med 6 receptkort (bild + titel + metadata) |
| `app/recipes/[id]/page.js` | direkt fetch | Hero-bild, titel, ingredienslista, steg |
| `app/shopping/page.js` | `useShoppingList` | Listhuvud + 8 rader med checkbox-platshållare |
| `app/pantry/page.js` | `usePantry` | Grid med 6 ingredienskort |
| `app/cook/page.js` | `useHousehold` | 4 receptkort |
| `app/cook/[recipeId]/page.js` | direkt fetch | Stegrubriker + timerblockar |
| `app/household/page.js` | `useHousehold` | 2–3 hushållskort |
| `app/household/[id]/page.js` | `useHousehold` | Profilhuvud + inställningsrader |

---

## Felhantering

Skeleton visas enbart under `isLoading === true`. Fel-tillstånd (`error`) behåller befintlig felvisning — inga ändringar där.

---

## Avgränsningar

- Inget skeleton på `auth/login` eller `auth/register` — dessa har ingen async datahämtning.
- `invite/[token]/page.js` är inte byggd ännu — exkluderas.
- Ingen optimistic UI — skeleton ersätter spinner, inget mer.
- P4 (campaign_cache, trimning av system-prompts) hanteras i separat plan.

---

## Filer som berörs

**Nya filer:**
- `components/Skeleton.js`
- `components/skeletons/DashboardSkeleton.js`
- `components/skeletons/MenuSkeleton.js`
- `components/skeletons/RecipesSkeleton.js`
- `components/skeletons/RecipeDetailSkeleton.js`
- `components/skeletons/ShoppingSkeleton.js`
- `components/skeletons/PantrySkeleton.js`
- `components/skeletons/CookSkeleton.js`
- `components/skeletons/CookDetailSkeleton.js`
- `components/skeletons/HouseholdSkeleton.js`
- `components/skeletons/HouseholdDetailSkeleton.js`
**Modifierade filer (laddningstillstånd byts ut + shimmer-animation läggs till):**
- `app/globals.css` (shimmer `@keyframes` + `.skeleton`-klass)

- `app/page.js`
- `app/menu/page.js`
- `app/recipes/page.js`
- `app/recipes/[id]/page.js`
- `app/shopping/page.js`
- `app/pantry/page.js`
- `app/cook/page.js`
- `app/cook/[recipeId]/page.js`
- `app/household/page.js`
- `app/household/[id]/page.js`
