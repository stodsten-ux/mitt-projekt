
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
  layout.js                  # Root layout (uppdatera med Navbar + tema)
  auth/
    login/page.js            # Inloggning (klar — förbättra design)
    register/page.js         # Registrering (klar — förbättra design)
  household/
    page.js                  # Lista hushåll (klar — förbättra design)
    [id]/page.js             # Hushållsdetalj & preferenser (klar)
  invite/
    [token]/page.js          # Acceptera inbjudan (BYGG DENNA)
  menu/page.js               # BYGG DENNA
  recipes/
    page.js                  # BYGG DENNA
    [id]/page.js             # BYGG DENNA
  shopping/page.js           # BYGG DENNA
  pantry/page.js             # BYGG DENNA
  api/
    ai/route.js              # AI-endpoint (klar)
    recipes/route.js         # Receptsökning databas + AI (BYGG DENNA)
    prices/route.js          # Prisjämförelse via AI web search (BYGG DENNA)
lib/
  supabase.js                # Browser-klient (klar)
  theme.js                   # Temakonstanter ljust/mörkt (BYGG DENNA)
components/
  Navbar.js                  # Global navbar (BYGG DENNA)
  HouseholdCard.js           # Hushållskort dashboard (BYGG DENNA)
  ThemeToggle.js             # Ljust/mörkt-knapp (BYGG DENNA)
```

## Miljövariabler
```
NEXT_PUBLIC_SUPABASE_URL=https://vrclvpocdqglqrdlotop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
ANTHROPIC_API_KEY=...
```

## Databastabeller (alla har RLS aktiverat)

### Privata tabeller (per hushåll)
- **households** — id, name, display_name, adults, children, weekly_budget, created_by, preferred_stores (TEXT[]), store_split (JSONB), household_type (TEXT)
- **household_members** — id, household_id, user_id, role (admin/member)
- **household_preferences** — id, household_id, allergies[], diet_preferences[], favorite_foods[], disliked_foods[], portion_modifier (DECIMAL default 1.0), diverse_menu (BOOLEAN default true), theme (TEXT default 'system')
- **recipes** — id, household_id, title, description, servings, ingredients (JSONB), instructions, created_by, source_url (TEXT), ai_generated (BOOLEAN)
- **menus** — id, household_id, week_start (DATE), created_by
- **menu_items** — id, menu_id, recipe_id, day_of_week (1-7), meal_type, custom_title
- **shopping_lists** — id, household_id, menu_id, title, created_by
- **shopping_items** — id, shopping_list_id, name, quantity, unit, store, price, checked (BOOLEAN), category (TEXT)
- **pantry** — id, household_id, name, quantity, unit, expires_at (DATE)
- **meal_ratings** — id, household_id, recipe_id, user_id, rating (1-5), comment
- **household_invites** — id, household_id, email, token, accepted, expires_at

### Publika tabeller (ingen household_id)
- **shared_recipes** — id, title, description, servings, ingredients (JSONB), instructions, published_at, source_url
- **recipe_ratings** — id, shared_recipe_id, household_id, rating (1-5), times_cooked
- **recipe_stats** — id, shared_recipe_id, avg_rating, total_ratings, total_cooked, total_saved

## Säkerhetsprinciper
- RLS aktiverat på ALLA tabeller
- Hushåll är strikt separerade — data korsar aldrig hushållsgränsen
- Publika tabeller innehåller aldrig household_id
- Modifieringar av delade recept sparas alltid som privata kopior
- Server-side Supabase-klient i API-routes via @supabase/ssr

## AI-integration
- API-route: POST /api/ai
- Tar emot: { prompt: string, householdId: string }
- Hushållets fulla profil skickas alltid som systemkontext
- Modell: claude-opus-4-6
- Svarar alltid på svenska
- AI-genererade recept sparas alltid automatiskt i recipes-tabellen

### Receptsökningslogik (databas först, AI som fallback)
```
1. Sök i recipes-tabellen (hushållets egna recept)
2. Sök i shared_recipes (publikt bibliotek)
3. Om inget matchar preferenser → anropa Claude API
4. Spara AI-recept automatiskt i recipes med ai_generated: true
5. Erbjud att publicera till shared_recipes
```

---

## PRIORITET 1 — Design & UX

### Mörkt/ljust läge
- Följer enhetens systeminställning som default (prefers-color-scheme)
- Användaren kan åsidosätta via ThemeToggle i navbaren
- Valet sparas i household_preferences.theme ('light' | 'dark' | 'system')
- Implementera med CSS-variabler i globals.css

**CSS-variabler att definiera:**
```css
:root {
  --bg: #ffffff;
  --bg-card: #f9f9f9;
  --text: #000000;
  --text-muted: #666666;
  --border: #e5e5e5;
  --accent: #000000;
  --accent-text: #ffffff;
  --danger: #ff3b30;
  --warning: #ff9500;
  --success: #34c759;
}

[data-theme='dark'] {
  --bg: #000000;
  --bg-card: #1c1c1e;
  --text: #ffffff;
  --text-muted: #aeaeb2;
  --border: #38383a;
  --accent: #ffffff;
  --accent-text: #000000;
  --danger: #ff453a;
  --warning: #ffd60a;
  --success: #30d158;
}
```

### Global Navbar (components/Navbar.js)
Visas på ALLA sidor utom /auth/login och /auth/register.

**Layout:**
```
[🛒 Mathandelsagenten]  [🏠 Fam Hallgren]  [🌙 ⚙️ Logga ut]
```

- Vänster: appnamn som länk till /
- Mitten: hushållets namn som länk till /household/[id]
- Höger: ThemeToggle + kugghjul (länk till /household/[id]) + logga ut
- Om inget hushåll: visa "Skapa hushåll →" i mitten
- Responsiv — kollapsad version på mobil

### Formulärdesign — förbättra alla formulär
Gäller: login, register, skapa hushåll, preferenser

**Standard för alla formulär:**
- Centrerad kort med max-width: 440px
- Tydlig ram: border: 1px solid var(--border), border-radius: 16px
- Padding: 40px
- Rubrik 24px bold centrerad
- Input-fält: border-radius: 10px, padding: 12px, border: 1px solid var(--border)
- Focus-state: outline: 2px solid var(--accent)
- Primär knapp: full bredd, padding: 14px, border-radius: 10px
- Felmeddelanden i rött under respektive fält
- Alla färger via CSS-variabler (fungerar i både ljust och mörkt läge)

### Hushållskort på dashboarden (components/HouseholdCard.js)
```
┌─────────────────────────────────────────┐
│ 🏠 Fam Hallgren                      ✏️ │
│ 2 vuxna · 3 barn · 3 000 kr/vecka       │
│ Laktosfritt · Utan fisk · Utan nötkött  │
│ ✨ Dina preferenser används för AI-förslag│
└─────────────────────────────────────────┘
```

### Onboarding för nya användare
1. Ny användare loggar in → kontrollera household_members
2. Om tom → redirect till /household med meddelande:
   "Välkommen! Skapa ditt hushåll för att komma igång."
3. Efter skapande → redirect till /household/[id] för att fylla i preferenser
4. Efter preferenser → redirect till dashboard

---

## PRIORITET 2 — Kärnflödet

Det primära flödet i appen är:
```
Hitta recept (databas → AI)
    ↓
Anpassa till preferenser & portioner
    ↓
Stäm av mot skafferiet
    ↓
Skapa inköpslista
    ↓
Hitta bästa pris i vald butik
```

### Veckomenyn (/menu)
- Visa mån-sön med en rätt per dag
- Knapp: "AI-förslag på hela veckan" med hushållskontext
- AI returnerar JSON: [{day: 'Måndag', meal: 'Kycklinggryta', recipe_id: null}]
- Varje dag: välj från egna recept, publikt bibliotek, eller skapa nytt
- Spara till menus + menu_items
- Knapp: "Generera inköpslista" → skapar shopping_list från alla ingredienser minus skafferi
- Navigera föregående/nästa vecka

### Receptbibliotek (/recipes och /recipes/[id])
- Lista egna recept + fliken "Upptäck" för shared_recipes
- Sök i databas först — visa AI-knapp om inga resultat
- Skapa recept: manuellt ELLER "Generera med AI" (sparas automatiskt)
- Portionsjustering: multiplicera ingredienser med portion_modifier
- Betygsätt (1-5 stjärnor) → meal_ratings
- Publicera → kopieras till shared_recipes utan household_id
- Visa källlänk (source_url) om receptet kommer från extern sida

### Inköpslista (/shopping)
- Generera automatiskt från veckomenyn minus skafferiet
- Gruppera per kategori: 🥦 Frukt & grönt, 🥛 Mejeri, 🥩 Kött & fisk, 🧴 Torrvaror, 🧹 Övrigt
- Bocka av varor → checked: true (genomstruken text)
- Visa total estimerad kostnad vs veckbudget
- Välj butik per vara eller för hela listan
- Knapp: "Hitta bästa pris" → /api/prices

### Skafferiet (/pantry)
- Lista varor med mängd och utgångsdatum
- Varningsindikatorer: 🔴 utgånget, 🟡 utgår inom 3 dagar, 🟢 ok
- Knapp: "Vad kan jag laga?" → panikfunktion
- Lägg till varor manuellt eller via inköpslistan

### Panikfunktionen 🆘
Tillgänglig från skafferiet och navbaren som snabbknapp.

**Flöde:**
1. Visa checkboxar för alla varor i skafferiet
2. Användaren väljer vad de har
3. Sök i recipes-databasen efter matchande recept
4. Om inget matchar → fråga Claude API
5. Visa recept med portionsjustering

---

## PRIORITET 3 — Butiks- & prisintegration

### Butikspreferenser (i household_preferences)
- preferred_stores: TEXT[] — användarens valda butiker
- store_split: JSONB — ex. {"ICA": 70, "Willys": 30}
- Stödda butiker: ICA, Willys, Coop, Lidl, Hemköp, Mathem, Citygross, Netto

### Prisinformation via AI web search (/api/prices)
Eftersom svenska matbutiker saknar öppna API:er används Claude med web search:
```javascript
// POST /api/prices
// Tar emot: { items: string[], stores: string[], householdId: string }
// Returnerar: { items: [{name, bestPrice, store, campaign}] }

// Prompt till Claude:
"Sök efter aktuella priser och kampanjer för följande varor: [lista].
Fokusera på dessa butiker: [butiker].
Returnera som JSON med bästa pris per vara och var den är billigast."
```

**Viktigt:** Markera tydligt i UI att priserna är AI-uppskattningar och kan variera.

### Receptlänkar från externa sidor
- Spara source_url i recipes-tabellen
- Visa länk till originalkällan i receptvyn
- Validera länken vid sparande (fetch HEAD-request)
- Om länken är trasig → markera med ⚠️ och erbjud att söka nytt recept
- Scrapa INTE innehåll — länka alltid till originalet

---

## PRIORITET 4 — Receptdatabas & AI-förslag

### Hushållskategorier
Lägg till household_type i households-tabellen.
Används av AI för att anpassa receptförslag.

| Typ | AI-kontext |
|---|---|
| barnfamilj | Enkla rätter, milda smaker, snabb tillagning, barnvänligt |
| par | Mer variation, gärna matlagning som hobby, romantiska middagar |
| singel | Små portioner, enkel matlagning, budgetvänligt, snabbt |
| storformat | Många portioner, ekonomisk matlagning, batch cooking |
| senior | Lättlagat, näringsrikt, inte för starka smaker |

### Portionsjustering
- portion_modifier i household_preferences (DECIMAL, default 1.0)
- Exempel: 0.75 = 25% mindre, 1.5 = 50% mer
- Alla ingrediensmängder multipliceras med portion_modifier
- Kan ändras tillfälligt per recept eller permanent i preferenser
- Logga ändringar — barn växer, portioner ökar över tid

### Menydiversifiering
- diverse_menu BOOLEAN i household_preferences
- Om true: AI undviker att föreslå samma proteinkälla två dagar i rad
- Om false: hushållet föredrar samma typ av mat (t.ex. vegansk familj)

### Receptbetyg och lärande
- Hushållets betyg (meal_ratings) påverkar framtida AI-förslag
- Recept med snitt under 3 föreslås max 1 gång per månad
- Recept med snitt över 4 föreslås oftare
- Skicka betyghistorik som del av AI-kontexten

---

## PRIORITET 5 — Avancerade funktioner

### Panikfunktion (snabbåtkomst)
- Knapp i navbaren: 🆘 eller "Vad lagar jag?"
- Öppnar modal eller egen sida /panic
- Visar skafferiet som checkboxar
- Sök databas → AI fallback

### Portionsjustering per tillfälle
- På varje receptsida: +/- knappar för portioner
- Ingredienslistan uppdateras i realtid
- "Spara som ny standard" → uppdaterar portion_modifier

### Leveransalternativ
- Mathem.se som leveransalternativ i butikslistan
- Märk varor som "beställ online" vs "köp i butik"
- Visa estimerad leveranskostnad

---

## Designprinciper
- Alla färger via CSS-variabler (ljust/mörkt läge)
- Formulär: kort med ram, max-width 440px, centrerat
- Sidor: max-width 700px, centrerat
- Navbar alltid synlig utom på auth-sidor
- Laddningstillstånd på alla async-operationer
- Svenska etiketter och felmeddelanden genomgående
- Mobilanpassat — touch-vänliga knappar (min 44px höjd)

## Supabase-klient — viktigt!
- **I React-komponenter:** createClient från lib/supabase.js
- **I API-routes:** createServerClient från @supabase/ssr med cookies()

## Git-workflow
```bash
git add .
git commit -m "beskrivning"
git push origin main
vercel --prod
```

## Instruktion till Claude Code
Börja alltid med PRIORITET 1 (Design & UX) innan du bygger nya funktioner.
Använd CSS-variabler för alla färger så att ljust/mörkt läge fungerar överallt.
Sök alltid i databasen innan du anropar Claude API.
Spara alltid AI-genererade recept i databasen automatiskt.

---

## TEKNISK SPEC — Saknade kärnfunktioner (bygg dessa nu)

### FUNKTION A — Receptsökning med AI-fallback (/api/recipes)

**Route:** POST /api/recipes
**Fil:** app/api/recipes/route.js

**Tar emot:**
```json
{
  "query": "kycklinggryta",
  "householdId": "uuid",
  "generateIfEmpty": true
}
```

**Steg-för-steg logik:**
```
1. Hämta hushållets preferenser från household_preferences
2. Sök i recipes WHERE household_id = householdId AND title ILIKE '%query%'
3. Sök även i shared_recipes WHERE title ILIKE '%query%'
4. Om resultat finns → returnera dem direkt
5. Om inga resultat OCH generateIfEmpty = true:
   a. Anropa Claude API med hushållskontext + query
   b. Be Claude returnera recept som JSON
   c. Spara automatiskt i recipes med ai_generated: true
   d. Returnera det sparade receptet
```

**Prompt till Claude för receptgenerering:**
```
Generera ett recept för "[query]" anpassat för detta hushåll.
Returnera ENDAST giltig JSON i detta format utan markdown:
{
  "title": "Receptnamn",
  "description": "Kort beskrivning",
  "servings": 4,
  "ingredients": [
    {"name": "Kycklingfilé", "amount": 400, "unit": "g"},
    {"name": "Lök", "amount": 1, "unit": "st"}
  ],
  "instructions": "Steg-för-steg instruktioner som en lång sträng"
}
```

**Returnerar:**
```json
{
  "success": true,
  "recipes": [...],
  "aiGenerated": false,
  "source": "database"
}
```

---

### FUNKTION B — Generera inköpslista från veckomenyn

**Route:** POST /api/shopping/generate
**Fil:** app/api/shopping/generate/route.js

**Tar emot:**
```json
{
  "menuId": "uuid",
  "householdId": "uuid"
}
```

**Steg-för-steg logik:**
```
1. Hämta menu_items WHERE menu_id = menuId
2. För varje menu_item → hämta recipes.ingredients (JSONB)
3. Slå ihop alla ingredienser till en lista
4. Aggregera dubletter (t.ex. två recept med lök → summera mängden)
5. Hämta pantry WHERE household_id = householdId
6. Subtrahera pantry-innehåll från ingredienslistan
7. Kategorisera varje vara:
   - 🥦 Frukt & grönt: grönsaker, frukt, örter
   - 🥛 Mejeri: mjölk, ost, smör, grädde, yoghurt
   - 🥩 Kött & fisk: kött, fisk, chark
   - 🧴 Torrvaror: pasta, ris, konserver, kryddor
   - 🧊 Fryst: frysta varor
   - 🧹 Övrigt: allt annat
8. Skapa ny rad i shopping_lists:
   {household_id, menu_id, title: "Vecka [veckonummer]"}
9. Skapa rader i shopping_items för varje vara med kategori
10. Returnera shopping_list med alla items
```

**Aggregeringslogik för dubletter:**
```javascript
// Exempel: slå ihop ingredienser med samma namn och enhet
const merged = ingredients.reduce((acc, item) => {
  const key = `${item.name.toLowerCase()}-${item.unit}`
  if (acc[key]) {
    acc[key].amount += item.amount
  } else {
    acc[key] = { ...item }
  }
  return acc
}, {})
```

**Returnerar:**
```json
{
  "success": true,
  "shoppingListId": "uuid",
  "items": [
    {
      "category": "Frukt & grönt",
      "emoji": "🥦",
      "items": [
        {"name": "Lök", "quantity": "3", "unit": "st", "checked": false}
      ]
    }
  ],
  "pantryDeducted": ["Pasta 400g", "Lök 1st"],
  "estimatedCost": null
}
```

---

### FUNKTION C — Skafferiavstämning

**Route:** POST /api/pantry/check
**Fil:** app/api/pantry/check/route.js

**Tar emot:**
```json
{
  "ingredients": [
    {"name": "Pasta", "amount": 400, "unit": "g"},
    {"name": "Lök", "amount": 2, "unit": "st"}
  ],
  "householdId": "uuid"
}
```

**Steg-för-steg logik:**
```
1. Hämta alla pantry-rader för hushållet
2. För varje ingrediens i listan:
   a. Sök efter matchande vara i pantry (fuzzy match på namn)
   b. Om match och tillräcklig mängd → markera som "har hemma"
   c. Om match men otillräcklig mängd → markera som "delvis hemma"
   d. Om ingen match → markera som "saknas"
3. Returnera kategoriserad lista
```

**Fuzzy matching — enkel implementation:**
```javascript
// Matcha om pantry-varans namn innehåller ingrediensens namn eller vice versa
const isMatch = (pantryItem, ingredient) => {
  const p = pantryItem.name.toLowerCase()
  const i = ingredient.name.toLowerCase()
  return p.includes(i) || i.includes(p)
}
```

**Returnerar:**
```json
{
  "success": true,
  "results": [
    {"name": "Pasta", "status": "har_hemma", "pantryAmount": "500g"},
    {"name": "Lök", "status": "delvis_hemma", "need": "1 st till"},
    {"name": "Kycklingfilé", "status": "saknas"}
  ]
}
```

---

### FUNKTION D — Panikfunktion (/panic)

**Fil:** app/panic/page.js
**Också tillgänglig som modal från navbaren**

**Steg-för-steg flöde i UI:**
```
1. Visa alla pantry-varor som checkboxar
2. Användaren väljer vad de har hemma just nu
3. Knapp: "Hitta recept" →
   a. POST /api/recipes med valda varor som query
   b. Sök i recipes-databasen efter recept som matchar ingredienserna
   c. SQL: SELECT * FROM recipes WHERE ingredients @> '[{"name": "vara"}]'
   d. Om inga resultat → anropa Claude API med valda ingredienser
4. Visa matchande recept med hur många ingredienser som matchar
5. Välj recept → visa fullständigt recept med portionsjustering
```

**SQL-fråga för ingrediensmatchning:**
```sql
SELECT r.*, 
  COUNT(*) FILTER (
    WHERE ing->>'name' ILIKE ANY(ARRAY['%lök%', '%pasta%'])
  ) as match_count
FROM recipes r,
  jsonb_array_elements(r.ingredients) as ing
WHERE r.household_id = '[householdId]'
GROUP BY r.id
ORDER BY match_count DESC
LIMIT 5;
```

---

### Kopplingar i UI som måste finnas

**I /menu:**
```
[Generera inköpslista från menyn] → POST /api/shopping/generate
→ Redirect till /shopping med nya listan
```

**I /recipes:**
```
Sökfält → POST /api/recipes med query
[Generera med AI] → POST /api/recipes med generateIfEmpty: true
```

**I /shopping:**
```
[Stäm av mot skafferi] → POST /api/pantry/check
→ Visa vad som redan finns hemma
→ Ta bort dem från listan eller minska mängden
```

**I /pantry:**
```
[Vad kan jag laga? 🆘] → öppnar /panic
```

**I navbar:**
```
[🆘] → öppnar /panic som modal eller page
```

---

### Databas — SQL att köra i Supabase

Lägg till saknade kolumner:
```sql
-- Lägg till ai_generated och source_url i recipes
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Lägg till kategori i shopping_items
ALTER TABLE shopping_items ADD COLUMN IF NOT EXISTS category TEXT;

-- Lägg till household_type i households
ALTER TABLE households ADD COLUMN IF NOT EXISTS household_type TEXT DEFAULT 'barnfamilj';

-- Lägg till portion_modifier och diverse_menu i household_preferences
ALTER TABLE household_preferences ADD COLUMN IF NOT EXISTS portion_modifier DECIMAL DEFAULT 1.0;
ALTER TABLE household_preferences ADD COLUMN IF NOT EXISTS diverse_menu BOOLEAN DEFAULT TRUE;
ALTER TABLE household_preferences ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'system';
ALTER TABLE household_preferences ADD COLUMN IF NOT EXISTS preferred_stores TEXT[] DEFAULT '{}';
ALTER TABLE household_preferences ADD COLUMN IF NOT EXISTS store_split JSONB DEFAULT '{}';
```

---

## AKUT FELSÖKNING — Meny utan recept

### Problemet
Alla menu_items har recipe_id: null och custom_title som fritext.
Receptdatabasen är tom.
Inköpslistan kan därför inte generera ingredienser.

### Lösningen — ny API-route

**Route:** POST /api/menu/expand
**Fil:** app/api/menu/expand/route.js

**Syfte:** Ta en hel veckomeny med custom_titles och generera
fullständiga recept med ingredienser för varje rätt.

**Tar emot:**
```json
{
  "menuId": "uuid",
  "householdId": "uuid"
}
```

**Steg-för-steg logik:**
```
1. Hämta alla menu_items WHERE menu_id = menuId AND recipe_id IS NULL
2. För varje menu_item med custom_title:
   a. Anropa Claude API med custom_title och hushållskontext
   b. Be Claude returnera komplett recept som JSON
   c. Spara i recipes-tabellen med ai_generated: true
   d. Uppdatera menu_items SET recipe_id = nytt recept id
3. Returnera antal recept som skapades
```

**Prompt till Claude per rätt:**
```
Generera ett komplett recept för "[custom_title]".
Hushållet: [adults] vuxna och [children] barn.
Allergier: [allergies].
Undviker: [disliked_foods].

Returnera ENDAST giltig JSON utan markdown-formattering:
{
  "title": "Receptnamn",
  "description": "Kort beskrivning",
  "servings": 4,
  "ingredients": [
    {"name": "Kycklingfilé", "amount": 400, "unit": "g"},
    {"name": "Kokosmjölk", "amount": 400, "unit": "ml"},
    {"name": "Lök", "amount": 1, "unit": "st"},
    {"name": "Vitlök", "amount": 2, "unit": "klyftor"},
    {"name": "Curry", "amount": 2, "unit": "tsk"}
  ],
  "instructions": "Steg-för-steg instruktioner"
}
```

**I UI (/menu):**
Lägg till en knapp som visas när recipe_id är null:
```
[⚡ Generera ingredienser för hela veckan]
→ POST /api/menu/expand
→ Visa progress: "Genererar recept 3 av 7..."
→ När klar: "Klart! Nu kan du skapa inköpslista."
→ Visa knapp: [Skapa inköpslista]
```

### Förhindra problemet framöver
När AI föreslår en veckomeny ska flödet vara:
1. Claude genererar rättnamn
2. För varje rätt → skapa recept i recipes-tabellen DIREKT
3. Spara recipe_id i menu_items — ALDRIG bara custom_title

Uppdatera /api/ai så att menyförslag alltid skapar recept:
- Ta emot menyförslag som JSON-array
- Loopa och skapa recept för varje rätt
- Spara recipe_id i menu_items
- Returnera menyn med recipe_ids

---

### KAMPANJER & PRISINFORMATION

**Syfte:** Hjälp hushållet handla smartare genom att utnyttja kampanjer

**Funktioner:**
- Visa nästa veckas erbjudanden och kampanjer per butik
- Sök efter specifika varor med kampanjpris inom datumintervall
  ex. "2 kaffe för lågt pris mellan [datum] och [datum]"
- Rekommendera optimalt inköpsdatum baserat på kampanjer
- Föreslå att köpa in varor i förväg när priset är lågt

**Implementation:**
- Claude web search söker kampanjer per butik och vecka
- Prompt: "Sök efter kampanjer och extrapriser på [varor] hos [butiker] 
  vecka [X]. Returnera som JSON med vara, pris, butik och datum."
- Markera tydligt att priser är AI-uppskattningar
- Spara kampanjhistorik för att lära sig mönster

**Inköpsrekommendation:**
- Analysera inköpslistans varor mot kända kampanjmönster
- Föreslå: "Köp kaffe nu — brukar vara på rea hos ICA nästa vecka"
- Visa estimerad besparing per vecka

---

### POSITIONERING & BUTIKSNÄRHET

**Syfte:** Hjälp hushållet handla i rätt butik baserat på var de är

**Funktioner:**
- Spara hushållets bostadsort eller position
- Visa närmaste butiker per kedja
- Optimera inköpsrutt om flera butiker används (30/70-fördelning)
- Föreslå: "Handla torrvaror på Willys, färskvaror på ICA"

**Datamodell:**
```sql
ALTER TABLE households ADD COLUMN IF NOT EXISTS 
  location_city TEXT;
ALTER TABLE households ADD COLUMN IF NOT EXISTS 
  location_coords JSONB; -- {lat, lng}
```

**Implementation:**
- Använd webbläsarens Geolocation API (kräver tillstånd)
- Alternativ: manuell inmatning av stad/område
- Claude söker närmaste butiker baserat på position

---

### PERSONALISERAD MENY PER MEDLEM

**Syfte:** Olika familjemedlemmar har olika behov

**Exempel:**
- En medlem bantar → lägre kalorier, mer protein, mindre kolhydrater
- En medlem tränar mycket → mer protein, större portioner
- Barn med specialkost → anpassade ingredienser

**Datamodell:**
```sql
CREATE TABLE member_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  age INTEGER,
  activity_level TEXT, -- sedentary, moderate, active, very_active
  goal TEXT, -- maintain, lose_weight, gain_muscle, health
  additional_restrictions TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**AI-kontext per medlem:**
Skicka alla medlemmars profiler till Claude vid menyplanering:
"Familjen har 5 medlemmar: Vuxen 1 bantar (mål: -0.5kg/vecka), 
Vuxen 2 tränar styrka (behöver extra protein), 
Barn 1 (8 år, äter inte stark mat)..."

---

### DIETIST-FUNKTION & KOSTRÅD

**Syfte:** Näringsinformation och evidensbaserade kostråd

**Funktioner:**
- Beräkna näringsvärde per måltid och per vecka
- Jämför mot rekommenderat dagligt intag (RDI)
- Flagga om menyn saknar viktiga näringsämnen
- Ge kostråd baserade på aktuell forskning
- I förlängningen: integrering med Livsmedelsverkets databas

**Prompt till Claude:**
"Analysera denna veckomeny ur ett näringsperspektiv.
Hushållet: [profiler].
Meny: [rätter].
Ge en kort analys av:
1. Proteinbalans
2. Kolhydrater och fiber  
3. Fett och omega-3
4. Vitaminer och mineraler att tänka på
5. Konkreta förbättringsförslag"

---

### LÄRANDE HUSHÅLLSPROFIL

**Syfte:** Appen lär känna hushållet över tid och blir smartare

**Vad appen lär sig:**
- Förbrukning av basvaror (mjölk, mjöl, salt, smör, ost, pasta)
- Betyg på recept → undviker lågbetygsatta automatiskt
- Säsongsmönster → mer soppa på vintern, sallad på sommaren
- Inköpsfrekvens → påminn när basvaror troligen är slut

**Datamodell:**
```sql
CREATE TABLE consumption_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  amount DECIMAL,
  unit TEXT,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE household_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  insight_type TEXT, -- consumption, preference, seasonal
  data JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**AI-användning:**
Skicka konsumtionshistorik som kontext:
"Hushållet använder i snitt 3L mjölk/vecka, 500g pasta/vecka.
Senast köpte de pasta för 2 veckor sedan → påminn om påfyllning."

---

### RECEPTDATABAS — BYGGSTRATEGI

**Princip:** Databas alltid först, AI som fallback
```
Användaren söker recept
    ↓
1. Sök i household recipes (privata)
2. Sök i shared_recipes (publikt bibliotek)
3. Om inget matchar → Claude API genererar
4. Spara alltid AI-recept i recipes (ai_generated: true)
5. Erbjud att publicera till shared_recipes
```

**Receptkvalitet:**
- Betygsätt recept efter varje måltid (1-5 stjärnor)
- Recept under 3 stjärnor föreslås max 1 gång/månad
- Recept över 4 stjärnor föreslås oftare
- Visa betygstrend: "Familjen gillar detta recept ⭐ 4.8"

**Receptkällor att utforska:**
- Arla.se, ICA.se, Coop.se har öppna receptsidor
- Länka alltid till originalkällan (source_url)
- Validera länk vid sparande
- Markera trasiga länkar med ⚠️

---

### PRIORITETSORDNING FÖR ROADMAP

1. ✅ Kärnflödet (recept → skafferi → inköpslista)
2. ✅ Design & UX
3. 🔲 Kampanjer & prisinformation
4. 🔲 Positionering & butiksnärhet
5. 🔲 Personaliserad meny per medlem
6. 🔲 Lärande hushållsprofil
7. 🔲 Dietist-funktion & kostråd
8. 🔲 Receptdatabas från externa källor