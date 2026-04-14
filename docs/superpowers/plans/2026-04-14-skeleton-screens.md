# Skeleton Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all spinner loading states across the app with page-specific skeleton screens featuring a shimmer animation.

**Architecture:** A shared `<Skeleton>` base component provides the shimmer animation via a CSS class in `globals.css`. Ten page-specific skeleton components compose `<Skeleton>` blocks to mirror each page's real layout. Each page replaces its `if (loading) return <div className="loading-screen"><Spinner />...` guard with `if (loading) return <PageSkeleton />`.

**Tech Stack:** React (Next.js App Router), CSS custom properties (`--color-warm-gray`, `--color-cream`), existing SWR hooks (`useHousehold`, `useMenu`, `useRecipes`, `useShoppingLists`, `usePantry`).

---

## File Map

**New files:**
- `components/Skeleton.js` — base block component, renders a `<div className="skeleton">` with configurable width/height/borderRadius/style
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

**Modified files:**
- `app/globals.css` — add `@keyframes shimmer` and `.skeleton` class
- `app/page.js` — replace spinner with `<DashboardSkeleton />`
- `app/menu/page.js` — replace spinner with `<MenuSkeleton />`
- `app/recipes/page.js` — replace spinner with `<RecipesSkeleton />`
- `app/recipes/[id]/page.js` — replace spinner with `<RecipeDetailSkeleton />`
- `app/shopping/page.js` — replace spinner with `<ShoppingSkeleton />`
- `app/pantry/page.js` — replace spinner with `<PantrySkeleton />`
- `app/cook/page.js` — replace spinner with `<CookSkeleton />`
- `app/cook/[recipeId]/page.js` — replace spinner with `<CookDetailSkeleton />`
- `app/household/page.js` — replace spinner with `<HouseholdSkeleton />`
- `app/household/[id]/page.js` — replace spinner with `<HouseholdDetailSkeleton />`

---

## Task 1: Add shimmer CSS to globals.css

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add shimmer keyframe and skeleton class**

Open `app/globals.css` and add the following after the `.spinner-lg` block (around line 320):

```css
/* ───────────────────────────────────────────
   SKELETON SHIMMER
─────────────────────────────────────────── */

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
  animation: shimmer 1.4s ease infinite;
  border-radius: 8px;
}
```

- [ ] **Step 2: Verify dev server still starts**

Run: `npm run dev`
Expected: No CSS errors, server starts on port 3000.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: add skeleton shimmer CSS"
```

---

## Task 2: Create Skeleton base component

**Files:**
- Create: `components/Skeleton.js`

- [ ] **Step 1: Create the component**

```jsx
// components/Skeleton.js
export default function Skeleton({ width = '100%', height = '16px', borderRadius = '8px', style = {} }) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius, flexShrink: 0, ...style }}
    />
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/Skeleton.js
git commit -m "feat: add Skeleton base component"
```

---

## Task 3: DashboardSkeleton + wire up dashboard

**Files:**
- Create: `components/skeletons/DashboardSkeleton.js`
- Modify: `app/page.js`

The dashboard shows: a greeting hero section, 3 mode cards (Planera/Handla/Laga), and a list of quick-action items.

- [ ] **Step 1: Create DashboardSkeleton**

```jsx
// components/skeletons/DashboardSkeleton.js
import Skeleton from '../Skeleton'

export default function DashboardSkeleton() {
  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }}>
      {/* Hero */}
      <div style={{ borderRadius: '16px', padding: '32px 24px', marginBottom: '28px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <Skeleton width="40%" height="14px" style={{ marginBottom: '12px' }} />
        <Skeleton width="65%" height="28px" style={{ marginBottom: '8px' }} />
        <Skeleton width="50%" height="14px" />
      </div>

      {/* 3 mode cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px 16px' }}>
            <Skeleton width="32px" height="32px" borderRadius="50%" style={{ marginBottom: '12px' }} />
            <Skeleton width="70%" height="14px" style={{ marginBottom: '6px' }} />
            <Skeleton width="50%" height="12px" />
          </div>
        ))}
      </div>

      {/* Quick actions */}
      {[0, 1, 2].map(i => (
        <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '8px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Skeleton width="40px" height="40px" borderRadius="10px" />
          <div style={{ flex: 1 }}>
            <Skeleton width="55%" height="14px" style={{ marginBottom: '6px' }} />
            <Skeleton width="35%" height="12px" />
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Wire up in app/page.js**

In `app/page.js`, add the import at the top:
```jsx
import DashboardSkeleton from '../components/skeletons/DashboardSkeleton'
```

Replace the loading guard (around line 84):
```jsx
// Before
if (loading) return (
  <div className="loading-screen-center">
    <Spinner />Laddar...
  </div>
)

// After
if (loading) return <DashboardSkeleton />
```

Remove the `Spinner` import if it's no longer used on this page:
```jsx
// Remove this line if Spinner is only used in the loading guard
import Spinner from '../components/Spinner'
```

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`, navigate to `/` while not logged in or with a slow network. Confirm shimmer blocks appear instead of spinner.

- [ ] **Step 4: Commit**

```bash
git add components/skeletons/DashboardSkeleton.js app/page.js
git commit -m "feat: skeleton screen for dashboard"
```

---

## Task 4: MenuSkeleton + wire up menu page

**Files:**
- Create: `components/skeletons/MenuSkeleton.js`
- Modify: `app/menu/page.js`

The menu page shows a week-navigation bar and 7 day-rows.

- [ ] **Step 1: Create MenuSkeleton**

```jsx
// components/skeletons/MenuSkeleton.js
import Skeleton from '../Skeleton'

export default function MenuSkeleton() {
  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }}>
      {/* Title */}
      <Skeleton width="180px" height="28px" style={{ marginBottom: '32px' }} />

      {/* Week navigation bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 20px', marginBottom: '20px' }}>
        <Skeleton width="48px" height="36px" borderRadius="8px" />
        <Skeleton width="120px" height="16px" />
        <Skeleton width="48px" height="36px" borderRadius="8px" />
      </div>

      {/* 7 day rows */}
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', marginBottom: '8px' }}>
          <Skeleton width="76px" height="14px" borderRadius="4px" />
          <Skeleton width="55%" height="14px" borderRadius="4px" />
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Wire up in app/menu/page.js**

Add import at top of file:
```jsx
import MenuSkeleton from '../../components/skeletons/MenuSkeleton'
```

Replace the loading guard (around line 170):
```jsx
// Before
if (householdLoading) return <div className="loading-screen"><Spinner />Laddar...</div>

// After
if (householdLoading) return <MenuSkeleton />
```

Remove unused `Spinner` import if applicable.

- [ ] **Step 3: Commit**

```bash
git add components/skeletons/MenuSkeleton.js app/menu/page.js
git commit -m "feat: skeleton screen for menu page"
```

---

## Task 5: RecipesSkeleton + wire up recipes page

**Files:**
- Create: `components/skeletons/RecipesSkeleton.js`
- Modify: `app/recipes/page.js`

The recipes page shows tabs + a grid of recipe cards with title and metadata.

- [ ] **Step 1: Create RecipesSkeleton**

```jsx
// components/skeletons/RecipesSkeleton.js
import Skeleton from '../Skeleton'

export default function RecipesSkeleton() {
  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }}>
      {/* Title */}
      <Skeleton width="140px" height="28px" style={{ marginBottom: '28px' }} />

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
        <Skeleton width="100px" height="36px" borderRadius="6px 6px 0 0" />
        <Skeleton width="100px" height="36px" borderRadius="6px 6px 0 0" />
      </div>

      {/* Action buttons row */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <Skeleton width="50%" height="42px" borderRadius="10px" />
        <Skeleton width="50%" height="42px" borderRadius="10px" />
      </div>

      {/* Recipe cards — single column list */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', marginBottom: '10px', overflow: 'hidden', display: 'flex', gap: '12px', padding: '12px' }}>
          <Skeleton width="64px" height="64px" borderRadius="8px" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <Skeleton width="65%" height="16px" style={{ marginBottom: '8px' }} />
            <Skeleton width="45%" height="13px" />
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Wire up in app/recipes/page.js**

Add import at top:
```jsx
import RecipesSkeleton from '../../components/skeletons/RecipesSkeleton'
```

Replace loading guard (around line 100):
```jsx
// Before
if (loading) return <div className="loading-screen"><Spinner />Laddar...</div>

// After
if (loading) return <RecipesSkeleton />
```

Remove unused `Spinner` import if applicable.

- [ ] **Step 3: Commit**

```bash
git add components/skeletons/RecipesSkeleton.js app/recipes/page.js
git commit -m "feat: skeleton screen for recipes page"
```

---

## Task 6: RecipeDetailSkeleton + wire up recipes/[id] page

**Files:**
- Create: `components/skeletons/RecipeDetailSkeleton.js`
- Modify: `app/recipes/[id]/page.js`

The recipe detail page shows: a hero image, title, description, ingredient list, and instruction steps.

- [ ] **Step 1: Create RecipeDetailSkeleton**

```jsx
// components/skeletons/RecipeDetailSkeleton.js
import Skeleton from '../Skeleton'

export default function RecipeDetailSkeleton() {
  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }}>
      {/* Hero image */}
      <Skeleton width="100%" height="240px" borderRadius="16px" style={{ marginBottom: '24px' }} />

      {/* Title + description */}
      <Skeleton width="70%" height="28px" style={{ marginBottom: '10px' }} />
      <Skeleton width="90%" height="14px" style={{ marginBottom: '6px' }} />
      <Skeleton width="75%" height="14px" style={{ marginBottom: '28px' }} />

      {/* Metadata row */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '28px' }}>
        <Skeleton width="80px" height="32px" borderRadius="20px" />
        <Skeleton width="80px" height="32px" borderRadius="20px" />
      </div>

      {/* Ingredients section */}
      <Skeleton width="120px" height="20px" style={{ marginBottom: '14px' }} />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
          <Skeleton width="8px" height="8px" borderRadius="50%" style={{ flexShrink: 0 }} />
          <Skeleton width={`${50 + i * 8}%`} height="14px" />
        </div>
      ))}

      {/* Steps section */}
      <Skeleton width="100px" height="20px" style={{ marginTop: '28px', marginBottom: '14px' }} />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '10px' }}>
          <Skeleton width="40px" height="14px" style={{ marginBottom: '8px' }} />
          <Skeleton width="100%" height="14px" style={{ marginBottom: '6px' }} />
          <Skeleton width="80%" height="14px" />
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Find loading guard in app/recipes/[id]/page.js**

Open the file and find where `loading` or `isLoading` is used in the return statement. Add import:
```jsx
import RecipeDetailSkeleton from '../../../components/skeletons/RecipeDetailSkeleton'
```

Replace the loading guard:
```jsx
// Before (exact text may vary)
if (loading) return <div className="loading-screen"><Spinner />Laddar...</div>
// or
if (loading) return <div className="loading-screen-center"><Spinner />Laddar...</div>

// After
if (loading) return <RecipeDetailSkeleton />
```

- [ ] **Step 3: Commit**

```bash
git add components/skeletons/RecipeDetailSkeleton.js "app/recipes/[id]/page.js"
git commit -m "feat: skeleton screen for recipe detail page"
```

---

## Task 7: ShoppingSkeleton + wire up shopping page

**Files:**
- Create: `components/skeletons/ShoppingSkeleton.js`
- Modify: `app/shopping/page.js`

The shopping page shows: a title, list selector tabs, a summary bar, and grouped item rows.

- [ ] **Step 1: Create ShoppingSkeleton**

```jsx
// components/skeletons/ShoppingSkeleton.js
import Skeleton from '../Skeleton'

export default function ShoppingSkeleton() {
  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }}>
      {/* Title */}
      <Skeleton width="160px" height="28px" style={{ marginBottom: '28px' }} />

      {/* Summary bar */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
        <Skeleton width="100px" height="14px" />
        <Skeleton width="80px" height="14px" />
      </div>

      {/* Category label */}
      <Skeleton width="80px" height="12px" style={{ marginBottom: '10px' }} />

      {/* Item rows — large touch targets (60px) */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', marginBottom: '8px' }}>
          <Skeleton width="28px" height="28px" borderRadius="8px" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <Skeleton width={`${45 + (i % 3) * 15}%`} height="15px" />
          </div>
          <Skeleton width="50px" height="13px" />
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Wire up in app/shopping/page.js**

Add import at top:
```jsx
import ShoppingSkeleton from '../../components/skeletons/ShoppingSkeleton'
```

Replace loading guard (around line 187):
```jsx
// Before
if (loading) return <div className="loading-screen"><Spinner />Laddar...</div>

// After
if (loading) return <ShoppingSkeleton />
```

- [ ] **Step 3: Commit**

```bash
git add components/skeletons/ShoppingSkeleton.js app/shopping/page.js
git commit -m "feat: skeleton screen for shopping page"
```

---

## Task 8: PantrySkeleton + wire up pantry page

**Files:**
- Create: `components/skeletons/PantrySkeleton.js`
- Modify: `app/pantry/page.js`

The pantry page shows a grid of ingredient cards.

- [ ] **Step 1: Create PantrySkeleton**

```jsx
// components/skeletons/PantrySkeleton.js
import Skeleton from '../Skeleton'

export default function PantrySkeleton() {
  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }}>
      {/* Title */}
      <Skeleton width="140px" height="28px" style={{ marginBottom: '28px' }} />

      {/* Search bar */}
      <Skeleton width="100%" height="44px" borderRadius="10px" style={{ marginBottom: '20px' }} />

      {/* Ingredient cards */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <Skeleton width="50%" height="15px" style={{ marginBottom: '6px' }} />
            <Skeleton width="30%" height="13px" />
          </div>
          <Skeleton width="60px" height="13px" />
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Wire up in app/pantry/page.js**

Add import at top:
```jsx
import PantrySkeleton from '../../components/skeletons/PantrySkeleton'
```

Replace loading guard (around line 52):
```jsx
// Before
if (householdLoading || pantryLoading) return <div className="loading-screen"><Spinner />Laddar...</div>

// After
if (householdLoading || pantryLoading) return <PantrySkeleton />
```

- [ ] **Step 3: Commit**

```bash
git add components/skeletons/PantrySkeleton.js app/pantry/page.js
git commit -m "feat: skeleton screen for pantry page"
```

---

## Task 9: CookSkeleton + wire up cook page

**Files:**
- Create: `components/skeletons/CookSkeleton.js`
- Modify: `app/cook/page.js`

The cook page shows a list of menu recipe cards + a grid of all recipes.

- [ ] **Step 1: Create CookSkeleton**

```jsx
// components/skeletons/CookSkeleton.js
import Skeleton from '../Skeleton'

export default function CookSkeleton() {
  return (
    <div className="page">
      {/* Title */}
      <div style={{ marginBottom: '28px' }}>
        <Skeleton width="100px" height="28px" style={{ marginBottom: '8px' }} />
        <Skeleton width="250px" height="15px" />
      </div>

      {/* Section label */}
      <Skeleton width="100px" height="12px" style={{ marginBottom: '10px' }} />

      {/* Menu recipe rows */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', marginBottom: '8px', overflow: 'hidden', display: 'flex' }}>
          <Skeleton width="80px" height="72px" borderRadius="0" style={{ flexShrink: 0 }} />
          <div style={{ padding: '14px 16px', flex: 1 }}>
            <Skeleton width="40%" height="11px" style={{ marginBottom: '6px' }} />
            <Skeleton width="65%" height="15px" style={{ marginBottom: '4px' }} />
            <Skeleton width="50%" height="13px" />
          </div>
        </div>
      ))}

      {/* All recipes grid label */}
      <Skeleton width="100px" height="12px" style={{ margin: '24px 0 10px' }} />

      {/* Recipe grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <Skeleton width="100%" height="140px" borderRadius="0" />
            <div style={{ padding: '14px 16px' }}>
              <Skeleton width="75%" height="15px" style={{ marginBottom: '6px' }} />
              <Skeleton width="55%" height="13px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire up in app/cook/page.js**

Add import at top:
```jsx
import CookSkeleton from '../../components/skeletons/CookSkeleton'
```

Replace loading guard (around line 59):
```jsx
// Before
if (loading) return (
  <div className="loading-screen-center">
    <Spinner />Laddar...
  </div>
)

// After
if (loading) return <CookSkeleton />
```

- [ ] **Step 3: Commit**

```bash
git add components/skeletons/CookSkeleton.js app/cook/page.js
git commit -m "feat: skeleton screen for cook page"
```

---

## Task 10: CookDetailSkeleton + wire up cook/[recipeId] page

**Files:**
- Create: `components/skeletons/CookDetailSkeleton.js`
- Modify: `app/cook/[recipeId]/page.js`

The cook detail page shows full-screen step-by-step cooking mode: a large step block, timer area, and navigation buttons.

- [ ] **Step 1: Create CookDetailSkeleton**

```jsx
// components/skeletons/CookDetailSkeleton.js
import Skeleton from '../Skeleton'

export default function CookDetailSkeleton() {
  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }}>
      {/* Recipe title + step indicator */}
      <Skeleton width="60%" height="28px" style={{ marginBottom: '8px' }} />
      <Skeleton width="120px" height="15px" style={{ marginBottom: '32px' }} />

      {/* Step card */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px 24px', marginBottom: '24px' }}>
        <Skeleton width="50px" height="13px" style={{ marginBottom: '16px' }} />
        <Skeleton width="100%" height="20px" style={{ marginBottom: '10px' }} />
        <Skeleton width="95%" height="20px" style={{ marginBottom: '10px' }} />
        <Skeleton width="80%" height="20px" />
      </div>

      {/* Timer block */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Skeleton width="48px" height="48px" borderRadius="50%" />
        <div style={{ flex: 1 }}>
          <Skeleton width="80px" height="14px" style={{ marginBottom: '6px' }} />
          <Skeleton width="50px" height="12px" />
        </div>
      </div>

      {/* Navigation buttons */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <Skeleton width="50%" height="48px" borderRadius="10px" />
        <Skeleton width="50%" height="48px" borderRadius="10px" />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire up in app/cook/[recipeId]/page.js**

Add import at top:
```jsx
import CookDetailSkeleton from '../../../components/skeletons/CookDetailSkeleton'
```

Find the initial loading guard (around line 290 — the one that uses `loading` state, not `loadingSteps`):
```jsx
// Before
if (loading) return (
  <div className="loading-screen-center" style={{ height: '100vh' }}>
    <Spinner />...
  </div>
)

// After
if (loading) return <CookDetailSkeleton />
```

Note: Do NOT touch `loadingSteps` or `loadingSubstitut` — these are inline loading states within the step UI, not page-level loading screens.

- [ ] **Step 3: Commit**

```bash
git add components/skeletons/CookDetailSkeleton.js "app/cook/[recipeId]/page.js"
git commit -m "feat: skeleton screen for cook detail page"
```

---

## Task 11: HouseholdSkeleton + wire up household page

**Files:**
- Create: `components/skeletons/HouseholdSkeleton.js`
- Modify: `app/household/page.js`

The household page lists household membership cards.

- [ ] **Step 1: Create HouseholdSkeleton**

```jsx
// components/skeletons/HouseholdSkeleton.js
import Skeleton from '../Skeleton'

export default function HouseholdSkeleton() {
  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }}>
      {/* Title */}
      <Skeleton width="160px" height="28px" style={{ marginBottom: '28px' }} />

      {/* Household cards */}
      {[0, 1, 2].map(i => (
        <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', marginBottom: '12px' }}>
          <Skeleton width="55%" height="18px" style={{ marginBottom: '8px' }} />
          <Skeleton width="35%" height="13px" style={{ marginBottom: '16px' }} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <Skeleton width="80px" height="32px" borderRadius="8px" />
            <Skeleton width="80px" height="32px" borderRadius="8px" />
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Wire up in app/household/page.js**

Add import at top:
```jsx
import HouseholdSkeleton from '../../components/skeletons/HouseholdSkeleton'
```

Replace loading guard (around line 40):
```jsx
// Before
if (loading) return <div className="loading-screen"><Spinner />Laddar...</div>

// After
if (loading) return <HouseholdSkeleton />
```

- [ ] **Step 3: Commit**

```bash
git add components/skeletons/HouseholdSkeleton.js app/household/page.js
git commit -m "feat: skeleton screen for household page"
```

---

## Task 12: HouseholdDetailSkeleton + wire up household/[id] page

**Files:**
- Create: `components/skeletons/HouseholdDetailSkeleton.js`
- Modify: `app/household/[id]/page.js`

The household detail page shows: a household profile header and settings/preference rows.

- [ ] **Step 1: Create HouseholdDetailSkeleton**

```jsx
// components/skeletons/HouseholdDetailSkeleton.js
import Skeleton from '../Skeleton'

export default function HouseholdDetailSkeleton() {
  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }}>
      {/* Profile header */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
        <Skeleton width="50%" height="24px" style={{ marginBottom: '8px' }} />
        <Skeleton width="35%" height="14px" style={{ marginBottom: '16px' }} />
        <div style={{ display: 'flex', gap: '8px' }}>
          <Skeleton width="70px" height="28px" borderRadius="20px" />
          <Skeleton width="70px" height="28px" borderRadius="20px" />
          <Skeleton width="90px" height="28px" borderRadius="20px" />
        </div>
      </div>

      {/* Settings rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Skeleton width="120px" height="15px" style={{ marginBottom: '5px' }} />
            <Skeleton width="80px" height="13px" />
          </div>
          <Skeleton width="40px" height="22px" borderRadius="11px" />
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Wire up in app/household/[id]/page.js**

Add import at top:
```jsx
import HouseholdDetailSkeleton from '../../../components/skeletons/HouseholdDetailSkeleton'
```

Replace loading guard (around line 160):
```jsx
// Before
if (loading) return <div className="loading-screen"><Spinner />Laddar...</div>

// After
if (loading) return <HouseholdDetailSkeleton />
```

- [ ] **Step 3: Commit**

```bash
git add components/skeletons/HouseholdDetailSkeleton.js "app/household/[id]/page.js"
git commit -m "feat: skeleton screen for household detail page"
```

---

## Task 13: Final build verification

- [ ] **Step 1: Run production build**

```bash
npm run build
```

Expected: Build completes with no errors. All 10 pages compile successfully. No TypeScript/lint errors.

- [ ] **Step 2: Smoke-test in browser**

Start dev server: `npm run dev`

Visit each route and confirm skeleton appears on first load:
- `/` — dashboard shimmer blocks
- `/menu` — week navigation + 7 day rows
- `/recipes` — tabs + recipe card list
- `/recipes/[any-id]` — hero image + ingredient list
- `/shopping` — item rows with checkboxes
- `/pantry` — ingredient card list
- `/cook` — menu rows + recipe grid
- `/cook/[any-id]` — step card + timer block
- `/household` — household cards
- `/household/[any-id]` — profile header + settings rows

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "feat: complete skeleton screens on all pages (P3)"
```
