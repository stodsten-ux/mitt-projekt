
@AGENTS.md

# Mathandelsagenten — Projektdokumentation för Claude Code

## Stack
- Next.js 16 med App Router och Turbopack
- Supabase (auth, databas, RLS) via @supabase/ssr
- Anthropic Claude API via @anthropic-ai/sdk
- Vercel (deploy)
- GitHub: https://github.com/stodsten-ux/mitt-projekt
- Live: https://mitt-projekt-one.vercel.app

## Projektstruktur
```
app/
  page.js                    # Dashboard (klar)
  layout.js                  # Root layout (klar)
  auth/
    login/page.js            # Inloggning (klar)
    register/page.js         # Registrering (klar)
  household/
    page.js                  # Lista hushåll (klar)
    [id]/page.js             # Hushållsdetalj & preferenser (klar)
  api/
    ai/route.js              # AI-endpoint med hushållskontext (klar)
  menu/page.js               # BYGG DENNA
  recipes/page.js            # BYGG DENNA
  recipes/[id]/page.js       # BYGG DENNA
  shopping/page.js           # BYGG DENNA
  pantry/page.js             # BYGG DENNA
lib/
  supabase.js                # Browser-klient (klar)
```

## Miljövariabler
```
NEXT_PUBLIC_SUPABASE_URL=https://vrclvpocdqglqrdlotop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
ANTHROPIC_API_KEY=...
```

## Databastabeller (alla har RLS aktiverat)

### Privata tabeller (per hushåll)
- **households** — id, name, display_name, adults, children, 
weekly_budget, created_by
- **household_members** — id, household_id, user_id, role (admin/member)
- **household_preferences** — id, household_id, allergies[], 
diet_preferences[], favorite_foods[], disliked_foods[]
- **recipes** — id, household_id, title, description, servings, 
ingredients (JSONB), instructions, created_by
- **menus** — id, household_id, week_start (DATE), created_by
- **menu_items** — id, menu_id, recipe_id, day_of_week (1-7), meal_type, 
custom_title
- **shopping_lists** — id, household_id, menu_id, title, created_by
- **shopping_items** — id, shopping_list_id, name, quantity, unit, store, 
price, checked (BOOLEAN)
- **pantry** — id, household_id, name, quantity, unit, expires_at (DATE)
- **meal_ratings** — id, household_id, recipe_id, user_id, rating (1-5), 
comment
- **household_invites** — id, household_id, email, token, accepted, 
expires_at

### Publika tabeller (inga household_id)
- **shared_recipes** — id, title, description, servings, ingredients 
(JSONB), instructions, published_at
- **recipe_ratings** — id, shared_recipe_id, household_id, rating (1-5), 
times_cooked
- **recipe_stats** — id, shared_recipe_id, avg_rating, total_ratings, 
total_cooked, total_saved

## Säkerhetsprinciper
- RLS aktiverat på ALLA tabeller
- Hushåll är strikt separerade — data korsar aldrig hushållsgränsen
- Publika tabeller (shared_recipes, recipe_stats) innehåller aldrig 
household_id
- Modifieringar av delade recept sparas alltid som privata kopior
- Server-side Supabase-klient används i API-routes via @supabase/ssr

## AI-integration
- API-route: POST /api/ai
- Tar emot: { prompt: string, householdId: string }
- Hushållets profil (namn, vuxna, barn, budget, allergier, preferenser) 
skickas som systemkontext
- Modell: claude-opus-4-6
- Svarar alltid på svenska

## Funktioner att bygga — i prioritetsordning

### 1. Veckomenyn (/menu)
**Syfte:** Planera veckans middagar dag för dag

**Funktioner:**
- Visa aktuell vecka (mån-sön) med en rätt per dag
- Knapp: "AI-förslag på hela veckan" → anropar /api/ai med 
hushållskontext
- Varje dag: lägg till rätt manuellt ELLER välj från receptbiblioteket
- Spara meny till menus + menu_items i Supabase
- Knapp: "Generera inköpslista från menyn" → skapar shopping_list 
automatiskt
- Navigera mellan veckor (föregående/nästa)

**AI-prompt att använda:**
"Föreslå middagar för varje dag denna vecka. Ta hänsyn till hushållets 
preferenser och vad som finns i skafferiet. Returnera som JSON med dagarna 
måndag-söndag."

---

### 2. Receptbibliotek (/recipes och /recipes/[id])
**Syfte:** Spara, bläddra och hantera recept

**Funktioner:**
- Lista hushållets privata recept
- Skapa nytt recept manuellt (titel, ingredienser, instruktioner, 
portioner)
- Knapp: "Generera recept med AI" → Claude skapar komplett recept
- Visa receptdetalj med ingredienser och instruktioner
- Betygsätt recept (1-5 stjärnor) → sparas i meal_ratings
- Publicera recept till publikt bibliotek → kopieras till shared_recipes 
utan household_id
- Fliken "Upptäck" → visa shared_recipes med betyg från recipe_stats

---

### 3. Inköpslista (/shopping)
**Syfte:** Smarta inköpslistor baserade på meny och skafferi

**Funktioner:**
- Visa aktiv inköpslista
- Generera automatiskt från veckomenyn (subtrahera det som finns i 
skafferiet)
- Lägg till varor manuellt
- Bocka av varor (checked = true)
- Gruppera varor per butikskategori (frukt & grönt, mejeri, kött, 
torrvaror etc)
- Visa estimerad kostnad vs veckbudget
- Knapp: "AI-optimera inköpen" → Claude föreslår billigaste alternativ 
inom budget

---

### 4. Skafferiet (/pantry)
**Syfte:** Minska matsvinn genom att hålla koll på vad som finns hemma

**Funktioner:**
- Lista vad som finns i skafferiet (pantry-tabellen)
- Lägg till varor med mängd och utgångsdatum
- Markera varor som "snart utgångna" (expires_at inom 3 dagar)
- Knapp: "AI-förslag på rätter med det jag har hemma" → Claude föreslår 
recept baserat på skafferiet
- När inköpslista bockas av → flytta varor till skafferiet automatiskt

---

### 5. Inbjudningar (i /household/[id])
**Syfte:** Bjuda in familjemedlemmar till hushållet

**Funktioner:**
- Admin kan bjuda in via e-post → skapar rad i household_invites
- Inbjuden person får länk med token: /invite/[token]
- Ny sida: /invite/[token]/page.js → visar hushållets namn och knapp "Gå 
med"
- Vid accept → skapar rad i household_members med role: 'member'
- Lista väntande inbjudningar för admin

---

## Designprinciper
- Enkelt och rent UI med inline styles (ingen extern CSS-lib än)
- Mobilanpassat (max-width: 700px, centrerat)
- Laddningstillstånd på alla async-operationer
- Felhantering med tydliga felmeddelanden
- Svenska etiketter och text genomgående

## Supabase-klient — viktigt!
- **I React-komponenter (client):** använd createClient från 
lib/supabase.js
- **I API-routes (server):** använd createServerClient från @supabase/ssr 
med cookies()

## Git-workflow
```bash
git add .
git commit -m "beskrivning"
git push origin main
vercel --prod
```
