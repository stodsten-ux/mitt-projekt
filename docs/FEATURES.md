# Funktioner

## Status
✅ = Klar | 🔧 = Delvis klar | 🔲 = Inte byggd

## AKUT — Fixa nu
*(Alla akuta buggar fixade 2026-03-29)*

## Lösta buggar (referens)
- ✅ **/cook/page.js** — visar nu menyrecept korrekt
- ✅ **/cook/[recipeId]/page.js** — timer, röststyrning, substitut, Wake Lock är implementerade
- ✅ **Inköpslista** — generering fungerar; stale-closure-bug i menu/page.js fixad (se nedan)
- ✅ **Receptdatabas** — AI-recept sparas korrekt via /api/menu/expand

## Prioritet 1 — Kärnflödet
```
Recept (databas → AI) →
Anpassa preferenser & portioner →
Stäm av skafferi →
Skapa inköpslista →
Hitta bästa pris
```

### Veckomenyn (/menu) ✅
- Visa mån-sön med rätt per dag ✅
- AI-förslag → skapar recept i DB direkt via /api/menu/expand ✅
- Generera inköpslista → POST /api/shopping/generate ✅
- Navigera veckor ✅

### Receptbibliotek (/recipes) ✅
- Lista egna + fliken Upptäck (shared_recipes) ✅
- Sök databas först → AI om inget hittas ✅
- Generera med AI → spara automatiskt med ai_generated: true ✅
- Betygsätt egna → meal_ratings ✅
- Betygsätt delade recept anonymt → recipe_ratings ✅
- Publicera → shared_recipes utan household_id ✅

### Inköpslista (/shopping) ✅
- Generera från meny minus skafferi ✅
- Gruppera: Frukt & grönt, Mejeri, Kött & fisk, Torrvaror, Övrigt ✅
- Bocka av varor ✅
- Visa kostnad vs budget ✅
- Prisjämförelse via /api/prices ✅
- Kampanjtips denna vecka ✅
- Nästa veckas erbjudanden ✅

### Skafferiet (/pantry) ✅
- Lista varor med utgångsdatum ✅
- Varningar: rött = utgånget, gult = inom 3 dagar ✅
- Panikknapp → /panic med skafferiinnehåll ✅

### Lagaläget (/cook/[recipeId]) ✅
- Steg-för-steg, ett steg i taget ✅
- Timer per steg (Web Notifications API) ✅
- Portionsjustering i realtid ✅
- Substitut via AI per ingrediens ✅
- Röststyrning (Web Speech API) ✅
- Wake Lock — skärmen slocknar inte ✅
- Betygsätt vid avslut ✅

## Prioritet 2 — Socialt & delning ✅
- ✅ Inbjudningar (/invite/[token]) — token-baserat, 7 dagars utgång
- ✅ Publicera recept till shared_recipes
- ✅ Betygsätt delade recept anonymt → recipe_ratings per hushåll

## Prioritet 3 — Pris & butik ✅
- ✅ /api/prices — Claude-baserad prisuppskattning
- ✅ /api/campaigns — kampanjtips med weekOffset (denna vecka + nästa vecka)
- ✅ Butikspreferenser (preferred_stores + store_split i hushållsinställningar)
- ✅ Nästa veckas erbjudanden — knapp i shopping-sidan

## Kritiska API-routes
### POST /api/menu/expand
Tar menu_id → genererar recept för alla custom_title utan recipe_id
→ sparar i recipes → uppdaterar menu_items.recipe_id

### POST /api/shopping/generate  
Tar menu_id → hämtar alla recipe.ingredients → subtraherar pantry
→ skapar shopping_list + shopping_items med kategorier

### POST /api/pantry/check
Tar ingredienslista → matchar mot pantry (fuzzy)
→ returnerar vad som finns/saknas

## Inköpslista — kända buggar att åtgärda
*(Alla tre fixade 2026-03-29 i /api/shopping/generate/route.js)*

### ✅ 1. Filtrera bort vatten och basvaror
SKIP_ITEMS-konstant i route.js filtrerar bort vatten, salt, peppar, olja m.fl.

### ✅ 2. Begränsa till aktuell vecka
`weekStart`-parameter kan skickas med — routen slår upp rätt menu via
`menus WHERE week_start = weekStart` om parametern finns.

### ✅ 3. Aggregera lök och liknande
`normalizeForMerge()` strippar adjektiv ("gul", "röd", "färsk" etc.) vid
merge-nyckeln. Originalnamnet från första förekomsten behålls i visningen.

## Laga-sidan — förbättringar

### 1. Bildfallback när Unsplash inte hittar bild
Om getRecipeImage() returnerar null → använd getFallbackImage(title)
från lib/unsplash.js. Ingen rätt ska visas utan bild.

### 2. Korta ner beskrivningar på kort
Max 80 tecken i kortbeskrivningen — trunkera med "..."
Ta bort fraser som "Perfekt för hela familjen X!"
Dessa är för personliga för ett kort — spara för receptdetaljsidan.

### 3. Visa veckoperiod tydligt
Under rubriken "Veckans meny" — visa:
"Vecka 14 · 29 mars – 4 april"

## Lagaläget — saknade steg
*(Fixat 2026-03-29)*

### ✅ Automatisk konvertering instructions → steps
`generateSteps()` i `/cook/[recipeId]/page.js` körs när `recipe.steps` är
null/tom. Anropar `/api/ai`, parsar JSON-arrayen, sparar till `recipes.steps`.
Nästa gång receptet öppnas hämtas stegen direkt från DB utan AI-anrop.

### Fix 2 — Vid AI-generering av recept
När Claude genererar ett nytt recept ska steps alltid inkluderas
direkt — aldrig bara instructions som en lång textsträng.

---
---

## BUGGFIXAR — Åtgärda nu
*(Alla tre fixade 2026-03-30)*

### ✅ Dashboard — navigeringsproblem
- "Ikväll lagar vi" visar nu "Visa recept →" (→ /recipes/[id]) + "Börja laga" som sekundär knapp
- Utgående varor visar "Vad kan jag laga?" (→ /panic?items=...) + "Se skafferiet →"

### ✅ Klickbara recept i veckomenyn
- `loadMenu` hämtar nu även `recipe_id` → separat state `menuRecipeIds`
- Dagar med recipe_id: klickbar länk → /recipes/[id] + redigeringsknapp (✏️)
- Dagar utan recipe_id: klickbart fält som öppnar redigeringsinput (som förut)

### ✅ SOS-funktion baserat på bäst-före-datum
- Dashboard hämtar varor som går ut inom 2 dagar och visar dem
- "Vad kan jag laga?" → /panic?items=namn1,namn2 förväljer de utgående varorna
- Panikfunktionen: sorterar varor med expires_at överst, visar ⚠️-badge per vara
- Varor som skickades via ?items= är förkryssade, övriga okryssade

---

## PRISLAGRING & KAMPANJER

### Datamodell
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

-- Index för snabb sökning
CREATE INDEX idx_price_cache_item ON price_cache(item_name, valid_until);
```

### Uppdateringslogik
- Priser uppdateras EN gång per dag via cron-job (Vercel Cron)
- Giltiga under innevarande vecka (mån-sön)
- Om pris äldre än 7 dagar → hämta nytt via AI web search
- Lagra kampanjpriser separat med campaign_label

### Tre veckors planering
```
Denna vecka:   Aktuella priser och kampanjer
Nästa vecka:   Förhandsvisning av kända kampanjer
Om 2 veckor:   Gissning baserat på historiska mönster
```

### Vercel Cron-job
```javascript
// app/api/cron/update-prices/route.js
// Körs varje dag kl 06:00
export const dynamic = 'force-dynamic'
export async function GET(request) {
  // Verifiera Vercel Cron-header
  if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  // Hämta priser för vanliga varor via Claude web search
  // Spara i price_cache
  // Rensa poster äldre än 14 dagar
}
```

---

## EXTERNA INTEGRATIONER

### Matpriser.se API
- Registrera på matpriser.se för API-åtkomst
- Använd för verifierade priser på dagligvaror
- Komplettera med AI web search för kampanjer
- Miljövariabel: MATPRISER_API_KEY

### Receptkällor (ICA, Arla, Coop)
- ICA: ica.se/recept — länka till originalrecept
- Arla: arla.se/recept — bra för laktosfria alternativ
- Coop: coop.se/recept
- Spara source_url och källa i recipes-tabellen
- Visa alltid: "Källa: ICA [länk]" på receptsidan
- Validera länk vid sparande — markera trasiga med ⚠️

### Livsmedelsverkets näringsdatabas
- API: livsmedelsverket.se/api
- Hämta näringsvärden per ingrediens
- Beräkna per portion och per dag
- Visa: kalorier, protein, kolhydrater, fett, fiber
- Miljövariabel: LIVSMEDELSVERKET_API_KEY

### Google Maps — butikslägen
- API: maps.googleapis.com
- Hitta närmaste butiker baserat på position
- Visa avstånd och öppettider
- Optimera inköpsrutt vid flera butiker
- Miljövariabel: NEXT_PUBLIC_GOOGLE_MAPS_KEY

---

## DIETIST-CHATFUNKTION (Premium)

### Route: POST /api/dietist
```javascript
// Systemkontext för dietist-AI
const systemPrompt = `
Du är en legitimerad dietist med specialisering på 
familjer och vardagsmat i Sverige.
Du ger praktiska, evidensbaserade råd på svenska.
Du känner till hushållet: ${householdContext}
Du har tillgång till veckans meny: ${menuContext}
Du ger alltid konkreta, genomförbara förändringar.
Du hänvisar till Livsmedelsverkets rekommendationer.
Du är INTE en läkare — vid medicinska frågor hänvisar 
du alltid till vården.
`
```

### UI: /dietist
- Chattgränssnitt likt en vanlig meddelandeapp
- Konversationshistorik sparas per hushåll
- Föreslagna frågor: 
  "Hur ser proteinbalansen ut denna vecka?"
  "Vad saknar vi i menyn näringsbara?"
  "Hur kan vi äta billigare utan att tappa kvalitet?"
- Markera tydligt: "AI-dietist — inte medicinsk rådgivning"

### Datamodell
```sql
CREATE TABLE dietist_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## NÄRINGSINFORMATION (Premium)

### Kalorier & makronutrienter
- Hämta från Livsmedelsverkets databas per ingrediens
- Beräkna per portion (justerat med portion_modifier)
- Visa per rätt och summerat per dag/vecka
- Jämför mot rekommenderat dagligt intag (RDI)

### Preferenser i household_preferences
```sql
ALTER TABLE household_preferences 
  ADD COLUMN IF NOT EXISTS calorie_goal INTEGER,
  ADD COLUMN IF NOT EXISTS protein_goal INTEGER,
  ADD COLUMN IF NOT EXISTS carb_preference TEXT 
    DEFAULT 'normal'; -- low, normal, high
```

---

## SEO — Åtgärder

### Teknisk SEO
- Sitemap: app/sitemap.js — generera automatiskt
- robots.txt: app/robots.js
- Strukturerad data (schema.org Recipe) på alla receptsidor
- Open Graph-bilder för sociala medier
- Canonical URLs

### Landningssida (app/om/page.js)
Publik sida utan inloggning — optimerad för:
- "matplanering app Sverige"
- "veckomenyn familj app"  
- "inköpslista recept app"
- "minska matsvinn app"
- "billig matkasse vecka"

### Innehåll för SEO
- Bloggsektioner om matplanering (genereras med AI)
- Receptsidor publikt tillgängliga (shared_recipes)
- FAQ om matplanering och ekonomi

---

## GDPR & SÄKERHET

### GDPR-krav
- ✅ Cookie-banner (components/CookieBanner.js) — localStorage-baserat, nödvändiga cookies enbart
- ✅ Integritetspolicy: /integritet
- ✅ Användarvillkor: /villkor
- ✅ Rätt att radera: knapp i Inställningar → /api/account/delete (DELETE) → anonymiserar ratings, raderar members + auth-user
- ✅ Data i EU: Supabase Frankfurt
- ✅ Ingen delning med tredje part
- 🔲 Secrets scanning i GitHub Actions (aktivera i repo-inställningar)

### Säkerhet
- ✅ Rate limiting i proxy.js (Fas 1 — in-memory, sliding-window):
  - /api/ai → max 10 req/min per IP
  - /api/* → max 30 req/min per IP
  - Returnerar 429 med svensk felmeddelandetext
- ✅ Zod-validering på login- och register-formulär
- ✅ CORS-konfiguration i next.config.js (headers() — begränsar till produktionsdomän)
- 🔲 Regelbunden dependency-uppdatering (npm audit månadsvis)
- 🔲 Cloudflare Free (Fas 2 — vid första betalande kund)
- 🔲 Cloudflare Pro (Fas 3 — vid 500+ kunder)

### Dataradering
```sql
-- När användare raderar konto
DELETE FROM household_members WHERE user_id = auth.uid();
-- Hushåll raderas via CASCADE om sista admin
-- Anonymisera meal_ratings istället för att radera
UPDATE meal_ratings SET user_id = NULL WHERE user_id = auth.uid();
```

---

## OPTIMERING & PRESTANDA

### Kodbas
- 🔲 Dela upp stora komponenter (> 200 rader) i mindre
- 🔲 Lazy load sidor med next/dynamic
- 🔲 Cacha Supabase-queries med SWR eller React Query

### Bilder
- ✅ next/image med fill + sizes på receptkort i /recipes
- 🔲 Konvertera övriga img-taggar (cook-sidan m.fl.)

### API
- ✅ Cache-Control: s-maxage=3600 på /api/prices och /api/campaigns
- ✅ Recept och steg lagras i DB — cachen är DB:n
- 🔲 Edge runtime för enkla API-routes

### Monitoring
- ✅ Sentry (@sentry/nextjs) — konfigurerat med NEXT_PUBLIC_SENTRY_DSN
  - sentry.client.config.js, sentry.server.config.js, sentry.edge.config.js
  - Kräver miljövariabel: NEXT_PUBLIC_SENTRY_DSN (hämta DSN från sentry.io)
  - Valfritt: SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN för source maps
- 🔲 Logga API-kostnader (Claude, Unsplash)
