
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
  layout.js                  # Root layout (klar — uppdatera med navbar)
  auth/
    login/page.js            # Inloggning (klar)
    register/page.js         # Registrering (klar)
  household/
    page.js                  # Lista hushåll (klar)
    [id]/page.js             # Hushållsdetalj & preferenser (klar)
  invite/
    [token]/page.js          # Acceptera inbjudan (BYGG DENNA)
  api/
    ai/route.js              # AI-endpoint med hushållskontext (klar)
  menu/page.js               # BYGG DENNA
  recipes/page.js            # BYGG DENNA
  recipes/[id]/page.js       # BYGG DENNA
  shopping/page.js           # BYGG DENNA
  pantry/page.js             # BYGG DENNA
lib/
  supabase.js                # Browser-klient (klar)
components/
  Navbar.js                  # BYGG DENNA — global navbar
  HouseholdCard.js           # BYGG DENNA — hushållskort för dashboard
```

## Miljövariabler
```
NEXT_PUBLIC_SUPABASE_URL=https://vrclvpocdqglqrdlotop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
ANTHROPIC_API_KEY=...
```

## Databastabeller (alla har RLS aktiverat)

### Privata tabeller (per hushåll)
- **households** — id, name, display_name, adults, children, weekly_budget, created_by
- **household_members** — id, household_id, user_id, role (admin/member)
- **household_preferences** — id, household_id, allergies[], diet_preferences[], favorite_foods[], disliked_foods[]
- **recipes** — id, household_id, title, description, servings, ingredients (JSONB), instructions, created_by
- **menus** — id, household_id, week_start (DATE), created_by
- **menu_items** — id, menu_id, recipe_id, day_of_week (1-7), meal_type, custom_title
- **shopping_lists** — id, household_id, menu_id, title, created_by
- **shopping_items** — id, shopping_list_id, name, quantity, unit, store, price, checked (BOOLEAN)
- **pantry** — id, household_id, name, quantity, unit, expires_at (DATE)
- **meal_ratings** — id, household_id, recipe_id, user_id, rating (1-5), comment
- **household_invites** — id, household_id, email, token, accepted, expires_at

### Publika tabeller (ingen household_id)
- **shared_recipes** — id, title, description, servings, ingredients (JSONB), instructions, published_at
- **recipe_ratings** — id, shared_recipe_id, household_id, rating (1-5), times_cooked
- **recipe_stats** — id, shared_recipe_id, avg_rating, total_ratings, total_cooked, total_saved

## Säkerhetsprinciper
- RLS aktiverat på ALLA tabeller
- Hushåll är strikt separerade — data korsar aldrig hushållsgränsen
- Publika tabeller (shared_recipes, recipe_stats) innehåller aldrig household_id
- Modifieringar av delade recept sparas alltid som privata kopior
- Server-side Supabase-klient används i API-routes via @supabase/ssr

## AI-integration
- API-route: POST /api/ai
- Tar emot: { prompt: string, householdId: string }
- Hushållets profil (namn, vuxna, barn, budget, allergier, preferenser) skickas som systemkontext
- Modell: claude-opus-4-6
- Svarar alltid på svenska

---

## UX & Navigation — viktigt att implementera

### Global Navbar (components/Navbar.js)
Navbaren ska visas på ALLA sidor utom /auth/login och /auth/register.
Lägg till den i app/layout.js så att den renderas globalt.

**Layout:**
```
vänster: 🛒 Mathandelsagenten (länk till /)
mitten:  🏠 Fam Hallgren (länk till /household/[aktivt household_id])
höger:   ⚙️ (länk till /household/[aktivt household_id]) · Logga ut
```

**Tekniskt:**
- Hämta inloggad användare via supabase.auth.getUser()
- Hämta aktivt hushåll via household_members → households
- Om användaren inte har något hushåll: visa "Skapa hushåll" istället
- Visa ingenting om användaren inte är inloggad

---

### Hushållskort på dashboarden (components/HouseholdCard.js)
Visa ett kompakt kort på dashboarden (app/page.js) som:
- Visar hushållets namn, antal vuxna och barn, veckbudget
- Visar aktiva preferenser kompakt (allergier, undviker etc)
- Har en tydlig länk/knapp "Redigera preferenser →"
- Inkluderar texten: "Dina preferenser används för alla AI-förslag"

**Exempel på utseende:**
```
┌─────────────────────────────────────────┐
│ 🏠 Fam Hallgren                      ✏️ │
│ 2 vuxna · 3 barn · 3 000 kr/vecka       │
│ Laktosfritt · Utan fisk · Utan nötkött  │
│ Dina preferenser används för AI-förslag │
└─────────────────────────────────────────┘
```

---

### Onboarding-flöde för nya användare
När en inloggad användare INTE har något hushåll ska de redirectas automatiskt.

**Flöde:**
1. Användare registrerar sig och bekräftar e-post
2. Loggar in → app/page.js kontrollerar om household_members är tom
3. Om inga hushåll finns → redirect till /household med ett välkomstmeddelande:
   "Välkommen! Börja med att skapa ditt hushåll så kan vi anpassa appen för dig."
4. Användaren skapar hushåll → fyller i preferenser → redirectas till dashboarden
5. Dashboarden visar nu hushållskortet med preferenserna

---

## Funktioner att bygga — i prioritetsordning

### 0. Navbar + HouseholdCard + Onboarding (bygg först)
Dessa är grunden för hela UX-upplevelsen och ska byggas innan övriga sidor.

- components/Navbar.js
- components/HouseholdCard.js
- Uppdatera app/layout.js med Navbar
- Uppdatera app/page.js med HouseholdCard och onboarding-redirect

---

### 1. Veckomenyn (/menu)
**Syfte:** Planera veckans middagar dag för dag

**Funktioner:**
- Visa aktuell vecka (mån-sön) med en rätt per dag
- Knapp: "AI-förslag på hela veckan" → anropar /api/ai med hushållskontext
- Varje dag: lägg till rätt manuellt ELLER välj från receptbiblioteket
- Spara meny till menus + menu_items i Supabase
- Knapp: "Generera inköpslista från menyn" → skapar shopping_list automatiskt
- Navigera mellan veckor (föregående/nästa)

**AI-prompt:**
"Föreslå middagar för varje dag denna vecka (måndag till söndag). Ta hänsyn till hushållets preferenser. Svara med en JSON-array med 7 objekt: [{day: 'Måndag', meal: 'Kycklinggryta'}]"

---

### 2. Receptbibliotek (/recipes och /recipes/[id])
**Syfte:** Spara, bläddra och hantera recept

**Funktioner:**
- Lista hushållets privata recept med sökfunktion
- Skapa nytt recept manuellt (titel, ingredienser, instruktioner, portioner)
- Knapp: "Generera recept med AI" → Claude skapar komplett recept baserat på namn
- Visa receptdetalj med ingredienser och instruktioner
- Betygsätt recept (1-5 stjärnor) → sparas i meal_ratings
- Visa snittbetyg från hushållets medlemmar
- Publicera recept till publikt bibliotek → kopieras till shared_recipes utan household_id
- Fliken "Upptäck" → visa shared_recipes med betyg från recipe_stats

---

### 3. Inköpslista (/shopping)
**Syfte:** Smarta inköpslistor baserade på meny och skafferi

**Funktioner:**
- Visa aktiv inköpslista med varor grupperade per kategori
- Generera automatiskt från veckomenyn (subtrahera det som finns i skafferiet)
- Lägg till varor manuellt med mängd och enhet
- Bocka av varor (checked = true) med genomstruken text
- Visa estimerad kostnad vs veckbudget
- Knapp: "AI-optimera inköpen" → Claude föreslår gruppering och billigaste alternativ

---

### 4. Skafferiet (/pantry)
**Syfte:** Minska matsvinn genom att hålla koll på vad som finns hemma

**Funktioner:**
- Lista vad som finns i skafferiet med mängd och utgångsdatum
- Lägg till varor manuellt
- Markera varor med varning om utgångsdatum inom 3 dagar (röd/orange indikator)
- Knapp: "Vad kan jag laga?" → AI föreslår recept baserat på skafferiet
- När inköpslista bockas av → möjlighet att flytta varor till skafferiet

---

### 5. Inbjudningar (/invite/[token])
**Syfte:** Bjuda in familjemedlemmar till hushållet

**Funktioner:**
- Admin bjuder in via e-post i /household/[id] → skapar rad i household_invites
- Ny sida /invite/[token]/page.js:
  - Hämta inbjudan via token
  - Visa hushållets namn och vem som bjudit in
  - Knapp "Gå med i hushållet" → skapar rad i household_members med role: 'member'
  - Redirect till dashboarden efter accept
- Lista väntande inbjudningar för admin

---

## Designprinciper
- Enkelt och rent UI med inline styles
- Mobilanpassat (max-width: 700px, centrerat)
- Laddningstillstånd (loading state) på alla async-operationer
- Felhantering med tydliga svenska felmeddelanden
- Navbar syns på alla sidor utom auth-sidor
- Svenska etiketter och text genomgående

## Supabase-klient — viktigt!
- **I React-komponenter (client):** använd createClient från lib/supabase.js
- **I API-routes (server):** använd createServerClient från @supabase/ssr med cookies()

## Git-workflow
```bash
git add .
git commit -m "beskrivning"
git push origin main
vercel --prod
```