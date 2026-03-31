# CONTEXT — Mathandelsagenten
> Nuläge för projektet. Uppdateras när vi lägger till eller ändrar funktioner.
> Se TODO.md för sessionlogg och nästa steg.

---

## Projektstruktur
```
app/
  page.js                         # Dashboard ✅
  layout.js                       # Root layout ✅
  auth/login/page.js              # Inloggning ✅
  auth/register/page.js           # Registrering ✅
  household/page.js               # Lista hushåll ✅
  household/[id]/page.js          # Hushållsdetalj ✅
  cook/page.js                    # Välj recept att laga ✅
  cook/[recipeId]/page.js         # Steg-för-steg lagning ✅
  menu/page.js                    # Veckomenyn ✅
  recipes/page.js                 # Receptbibliotek ✅
  recipes/[id]/page.js            # Receptdetalj ✅
  shopping/page.js                # Inköpslista ✅
  pantry/page.js                  # Skafferiet ✅
  invite/[token]/page.js          # Acceptera inbjudan 🔲
  api/ai/route.js                 # AI-endpoint ✅
  api/recipes/route.js            # Receptsökning ✅
  api/shopping/generate/route.js  # Generera inköpslista ✅
  api/menu/expand/route.js        # Expandera meny med recept ✅
  api/pantry/check/route.js       # Skafferiavstämning ✅
  api/prices/route.js             # Prisuppskattning ✅
  api/campaigns/route.js          # Kampanjtips ✅
  api/cron/update-prices/route.js # Prisuppdatering via cron 🔲
lib/
  supabase.js                     # Browser-klient ✅
  unsplash.js                     # Bildhjälpfunktioner ✅
components/
  Navbar.js                       # Global navbar ✅
  ModeSelector.js                 # Planera/Handla/Laga ✅
```

---

## Databastabeller (RLS aktiverat på alla)

### Privata (per hushåll)
- **households** — id, name, display_name, adults, children, weekly_budget, created_by, household_type, subscription_tier ('free'|'premium')
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

### Premium (framtida)
- **dietist_conversations** — id, household_id, messages (JSONB), created_at, updated_at

### Säkerhetsprinciper
- Publika tabeller innehåller ALDRIG household_id
- Modifieringar av delade recept sparas alltid som privata kopior
- SERVER_ROLE_KEY exponeras aldrig i klientkod

### Pris & kampanjer (ej skapad ännu 🔲)
- **price_cache** — id, item_name, store, price, unit, is_campaign, campaign_label, valid_from, valid_until, source, created_at

---

## AI-integration

- Route: `POST /api/ai` — tar emot `{ prompt, householdId }`
- Hushållets profil skickas som systemkontext (namn, vuxna, barn, budget, allergier, preferenser)
- Modell: `claude-opus-4-6` — svarar alltid på svenska

### Receptsökningslogik
```
1. Sök i recipes (hushållets egna)
2. Sök i shared_recipes (publikt)
3. Om inget → Claude API
4. Spara AI-recept med ai_generated: true
5. Erbjud publicering till shared_recipes
```

### Kritiska API-routes
- `POST /api/menu/expand` — tar menu_id → genererar recept för alla custom_title utan recipe_id → sparar i recipes → uppdaterar menu_items.recipe_id
- `POST /api/shopping/generate` — tar menu_id → hämtar alla recipe.ingredients → subtraherar pantry → skapar shopping_list + shopping_items med kategorier
- `POST /api/pantry/check` — tar ingredienslista → matchar mot pantry (fuzzy) → returnerar vad som finns/saknas
- `GET /api/campaigns` — tar `stores[]` + `weekOffset` → returnerar kampanjtips via Claude

---

## Kritiska gotchas

### Stale React state i async-kedjor
`setMenuId(mid)` uppdaterar state asynkront. Om en funktion läser `menuId` från closure direkt efter `setMenuId` i samma async-kedja får den det gamla värdet.

**Lösning:** Låt funktioner som skapar resurser *returnera* det nya ID:t och skicka det explicit vidare.
```javascript
// ✅ Rätt
const savedMenuId = await saveMenu(newItems)
await expandMenu(savedMenuId)

// ❌ Fel — menuId är stale
await saveMenu(newItems)
await expandMenu()
```

### store vs category i shopping_items
`shopping_items.store` används som kategorifält (inte butik) när inköpslistan genereras via `/api/shopping/generate`. Shopping-sidan grupperar på `item.store`. Inkonsekvent men konsekvent genomfört — ändra inte utan att uppdatera båda ställena.

---

## Feature-status

### Öppna (🔲 ej byggda)
- `invite/[token]/page.js` — acceptera hushållsinbjudan
- `api/cron/update-prices/route.js` — daglig prisuppdatering (Vercel Cron)
- `price_cache`-tabell i Supabase — se SQL i Affärsbeslut-sektionen
- Secrets scanning i GitHub Actions
- Regelbunden dependency-uppdatering (npm audit månadsvis)
- Cloudflare Free (aktivera vid första betalande kund)
- Lazy load sidor med next/dynamic
- Cacha Supabase-queries med SWR eller React Query
- Edge runtime för enkla API-routes
- Logga API-kostnader (Claude, Unsplash)
- Konvertera övriga img-taggar till next/image
- Sentry DSN konfigurerat (`@sentry/nextjs` installerat, kräver env: `NEXT_PUBLIC_SENTRY_DSN`)

### Externa integrationer (🔲 ej aktiverade, env vars saknas)
- **Matpriser.se API** — verifierade matpriser, env: `MATPRISER_API_KEY`
- **Livsmedelsverkets näringsdatabas** — kalorier/makros per ingrediens, env: `LIVSMEDELSVERKET_API_KEY`
- **Google Maps** — butikslägen och inköpsrutt, env: `NEXT_PUBLIC_GOOGLE_MAPS_KEY`

### Premium-features (🔲 ej byggda)
- Klarna-betalintegration — `npm install @klarna/klarna-payments`
- Dietist-chatfunktion (`/dietist`, `POST /api/dietist`)
- Näringsinformation via Livsmedelsverkets databas
- Personaliserad meny per hushållsmedlem
- Lärande hushållsprofil (consumption_log, household_insights)

---

## Design-tokens

### Färgpalett (globals.css)
```css
:root {
  --color-forest:      #2D4A3E;
  --color-sage:        #7C9A82;
  --color-cream:       #F5F0E8;
  --color-warm-gray:   #E8E0D4;
  --color-soil:        #8B6914;
  --color-terracotta:  #C4622D;
  --color-text:        #1A1A1A;
  --color-muted:       #6B6B6B;
  --color-border:      #D4CCC0;
  --bg:                var(--color-cream);
  --bg-card:           #FFFFFF;
  --accent:            var(--color-forest);
  --accent-text:       #FFFFFF;
  --cta:               var(--color-terracotta);
}
[data-theme='dark'] {
  --bg:                #1C1F1A;
  --bg-card:           #252923;
  --color-text:        #F0EDE6;
  --color-muted:       #A0A89A;
  --color-border:      #3A3F38;
  --accent:            var(--color-sage);
  --accent-text:       #1A1A1A;
}
```

### Typografi
- Rubriker: Playfair Display (Google Fonts via link-tag i layout.js)
- Brödtext: Inter (Google Fonts)

### Ikoner — Lucide React (INGA emojis i UI)
```javascript
import {
  ChefHat, ShoppingBag, CalendarDays, Refrigerator,
  Sparkles, AlertCircle, Settings, Home,
  Sun, Sunset, Moon, Star, Timer, Mic,
  ChevronRight, Check, Plus, Minus, Search, BookOpen,
} from 'lucide-react'
```

### Bilder — Unsplash (lib/unsplash.js)
```javascript
export const categoryImages = {
  kyckling:    'https://images.unsplash.com/photo-1598103442097-8b74394b95c4?w=800',
  pasta:       'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800',
  fisk:        'https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=800',
  vegetarisk:  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
  soppa:       'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800',
  tacos:       'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800',
  pizza:       'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
  default:     'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
}
```

### Kortdesign & animationer
- border-radius: 16px, box-shadow: 0 2px 12px rgba(0,0,0,0.08)
- hover: translateY(-2px), 200ms ease
- Sidövergångar: fade + translateY(8px), 300ms
- Bocka av: scale-pulse + genomstrykning
- Timer: puls-animation

---

## Användarflöden

### De tre lägena
```
[CalendarDays Planera]  [ShoppingBag Handla]  [ChefHat Laga]
```

**Flöde 1 — Planera:** Dashboard → Veckomenyn → Välj/generera recept → Stäm av skafferi → Skapa inköpslista → Hitta pris

**Flöde 2 — Handla:** Öppna inköpslistan → Bocka av varor → "Flytta till skafferi?"
- Krav: stora bockar (60px touch-yta), offlineläge via PWA, Wake Lock

**Flöde 3 — Laga:** /cook → Välj rätt → /cook/[id] → Portionsjustering → Steg 1 → Timer → Klart → Betygsätt
- Krav: fullskärm, text ≥ 20px, Wake Lock, röststyrning ("Nästa", "Starta timer", "Substitut för X")

### Panikfunktionen
Dashboard/Skafferi → "Vad kan jag laga?" → Välj ingredienser → Sök DB → Om inget → Claude AI → Börja laga

### Onboarding (ny användare)
```
Registrera → Bekräfta e-post → Logga in →
Ingen household_member → Redirect /household + välkomstmeddelande →
Skapa hushåll → Fyll preferenser → Dashboard
```

### Navbar-layout
```
Desktop:  [🌿 Mathandel]  [Planera] [Handla] [Laga]  [Fam X ▾] [Settings]
Mobil:    bottom navigation — CalendarDays / ShoppingBag / ChefHat / Home
```

---

## Affärsbeslut

### Prismodell
- **Gratis:** 1 hushåll, max 2 medlemmar, max 20 recept, manuell meny, grundläggande inköpslista, lagaläge, skafferi
- **Premium (99 kr/mån):** Obegränsat, AI-menyförslag, 3 budgetalternativ, prisjämförelse & kampanjer, dietist-chat, näringsinformation, offline-läge

### Tre budgetalternativ (Premium)
- 💚 Budgetvecka ~500 kr — enkla råvaror, säsongsanpassat, vegetariskt 3-4 dagar, kyckling
- 🧡 Balanserad ~800 kr — mix billigt/gott, kyckling + fläsk, en fiskrätt
- 💜 Lyxvecka ~1200 kr — bättre råvaror, nötkött/lax, mer variation, helgrätt

AI väljer recept baserat på: budgetval → veckans kampanjer → skafferiinnehåll → preferenser/allergier → balans kött/fisk/vegetariskt

### price_cache — SQL
```sql
CREATE TABLE price_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name TEXT NOT NULL,
  store TEXT NOT NULL,
  price DECIMAL(10,2),
  unit TEXT,
  is_campaign BOOLEAN DEFAULT FALSE,
  campaign_label TEXT,
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_until DATE DEFAULT CURRENT_DATE + INTERVAL '7 days',
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_price_cache_item ON price_cache(item_name, valid_until);
```

### Klarna-integration
- `npm install @klarna/klarna-payments`
- Kolumn: `households.subscription_tier ('free' | 'premium')`
- Webhook uppdaterar subscription_tier vid betalning/avslut

### Cloudflare-strategi
- **Fas 1 (nu):** Rate limiting i proxy.js (implementerat) + Zod-validering + RLS-verifiering
- **Fas 2 (vid 1:a betalande kund):** Cloudflare Free — SSL, Bot Fight Mode, CDN
- **Fas 3 (vid 500+ kunder):** Cloudflare Pro (~250 kr/mån) — WAF, avancerat bot-skydd

---

## Roadmap

1. **price_cache + cron-job** — daglig prisuppdatering, kampanjplanering tre veckor framåt
2. **Klarna-betalning** — Premium-tier, webhook, betalvägg i middleware
3. **Dietist-chatfunktion** — `/dietist`, `POST /api/dietist`, konversationshistorik per hushåll
4. **Näringsinformation** — Livsmedelsverkets API, kalorier/makros per portion
5. **Positionering & butiksnärhet** — Google Maps API, optimera inköpsrutt
6. **Personaliserad meny per medlem** — member_profiles (age, activity_level, goal)
7. **Lärande hushållsprofil** — consumption_log, household_insights, säsongsmönster
8. **SEO** — sitemap.js, robots.js, schema.org Recipe, Open Graph-bilder
9. **PWA offline-läge** — service worker för Handla-läget
