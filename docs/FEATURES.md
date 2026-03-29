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

### Receptbibliotek (/recipes) 🔧
- Lista egna + fliken Upptäck (shared_recipes)
- Sök databas först → AI om inget hittas
- Generera med AI → spara automatiskt med ai_generated: true
- Betygsätt → meal_ratings
- Publicera → shared_recipes utan household_id

### Inköpslista (/shopping) 🔧
- Generera från meny minus skafferi
- Gruppera: Frukt & grönt, Mejeri, Kött & fisk, Torrvaror, Övrigt
- Bocka av varor
- Visa kostnad vs budget

### Skafferiet (/pantry) 🔧
- Lista varor med utgångsdatum
- Varningar: rött = utgånget, gult = inom 3 dagar
- Panikknapp → /cook med skafferiinnehåll

### Lagaläget (/cook/[recipeId]) ✅
- Steg-för-steg, ett steg i taget ✅
- Timer per steg (Web Notifications API) ✅
- Portionsjustering i realtid ✅
- Substitut via AI per ingrediens ✅
- Röststyrning (Web Speech API) ✅
- Wake Lock — skärmen slocknar inte ✅
- Betygsätt vid avslut ✅

## Prioritet 2 — Socialt & delning
- 🔲 Inbjudningar (/invite/[token])
- 🔲 Publicera recept till shared_recipes
- 🔲 Betygsätt delade recept anonymt

## Prioritet 3 — Pris & butik
- 🔲 /api/prices — AI web search för kampanjer
- 🔲 Butikspreferenser (preferred_stores, store_split)
- 🔲 Nästa veckas erbjudanden

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