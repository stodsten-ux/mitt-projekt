# Arkitektur

## Projektstruktur
```
app/
  page.js                    # Dashboard ✅
  layout.js                  # Root layout ✅
  auth/login/page.js         # Inloggning ✅
  auth/register/page.js      # Registrering ✅
  household/page.js          # Lista hushåll ✅
  household/[id]/page.js     # Hushållsdetalj ✅
  cook/page.js               # Välj recept att laga ✅
  cook/[recipeId]/page.js    # Steg-för-steg lagning ✅
  menu/page.js               # Veckomenyn ✅
  recipes/page.js            # Receptbibliotek ✅
  recipes/[id]/page.js       # Receptdetalj ✅
  shopping/page.js           # Inköpslista ✅
  pantry/page.js             # Skafferiet ✅
  invite/[token]/page.js     # Acceptera inbjudan 🔲
  api/ai/route.js            # AI-endpoint ✅
  api/recipes/route.js       # Receptsökning ✅
  api/shopping/generate/route.js  # Generera inköpslista ✅
  api/menu/expand/route.js   # Expandera meny med recept ✅
  api/pantry/check/route.js  # Skafferiavstämning ✅
  api/prices/route.js        # Prisjämförelse 🔲
lib/
  supabase.js                # Browser-klient ✅
  unsplash.js                # Bildhjälpfunktioner ✅
components/
  Navbar.js                  # Global navbar ✅
  ModeSelector.js            # Planera/Handla/Laga ✅
```

## Databastabeller (RLS aktiverat på alla)

### Privata (per hushåll)
- **households** — id, name, display_name, adults, children, weekly_budget, created_by, household_type
- **household_members** — id, household_id, user_id, role (admin/member)
- **household_preferences** — id, household_id, allergies[], diet_preferences[], favorite_foods[], disliked_foods[], portion_modifier, diverse_menu, theme, preferred_stores[], store_split
- **recipes** — id, household_id, title, description, servings, ingredients (JSONB), instructions, steps (JSONB), created_by, source_url, ai_generated, image_url
- **menus** — id, household_id, week_start (DATE), created_by
- **menu_items** — id, menu_id, recipe_id, day_of_week (1-7), meal_type, custom_title
- **shopping_lists** — id, household_id, menu_id, title, created_by
- **shopping_items** — id, shopping_list_id, name, quantity, unit, store, price, checked, category
- **pantry** — id, household_id, name, quantity, unit, expires_at
- **meal_ratings** — id, household_id, recipe_id, user_id, rating (1-5), comment
- **household_invites** — id, household_id, email, token, accepted, expires_at

### Publika (ingen household_id)
- **shared_recipes** — id, title, description, servings, ingredients, instructions, published_at, source_url
- **recipe_ratings** — id, shared_recipe_id, household_id, rating, times_cooked
- **recipe_stats** — id, shared_recipe_id, avg_rating, total_ratings, total_cooked, total_saved

## Säkerhetsprinciper
- RLS på ALLA tabeller — hushåll är strikt separerade
- Publika tabeller innehåller ALDRIG household_id
- Modifieringar av delade recept sparas alltid som privata kopior
- Server-side klient i API-routes, browser-klient i komponenter

## AI-integration
- Route: POST /api/ai
- Tar emot: { prompt, householdId }
- Hushållets profil (namn, vuxna, barn, budget, allergier, preferenser) skickas som systemkontext
- Modell: claude-opus-4-6
- Svarar alltid på svenska

## Receptsökningslogik
```
1. Sök i recipes (hushållets egna)
2. Sök i shared_recipes (publikt)
3. Om inget → Claude API
4. Spara AI-recept med ai_generated: true
5. Erbjud publicering till shared_recipes
```

## Viktiga mönster — undvik dessa misstag

### Stale React state i async-kedjor
`setMenuId(mid)` uppdaterar state asynkront. Om en funktion läser `menuId` från
closure direkt efter `setMenuId` i samma async-kedja får den det gamla värdet.

**Lösning:** Låt funktioner som skapar resurser *returnera* det nya ID:t och
skicka det explicit vidare — lita inte på att state hunnit uppdateras.

```javascript
// ✅ Rätt — saveMenu returnerar mid, expandMenu tar det som parameter
const savedMenuId = await saveMenu(newItems)
await expandMenu(savedMenuId)

async function expandMenu(mid) {
  const activeMenuId = mid || menuId  // parameter först, state som fallback
  if (!activeMenuId) return
  ...
}

// ❌ Fel — menuId är stale om saveMenu just skapade menyn
await saveMenu(newItems)
await expandMenu()  // menuId är fortfarande null!
```

### Kategorifältet store vs category i shopping_items
`shopping_items.store` används som kategorifält (inte butik) när inköpslistan
genereras via `/api/shopping/generate`. Shopping-sidan grupperar på `item.store`.
Det är inkonsekvent men konsekvent genomfört — ändra inte utan att uppdatera båda.