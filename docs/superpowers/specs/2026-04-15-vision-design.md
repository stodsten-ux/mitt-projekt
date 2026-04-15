# Mathandelsagenten — Vision & Målarkitektur

**Datum:** 2026-04-15
**Status:** Godkänd

---

## Vision

> "Mathandelsagenten är familjens intelligenta köksmästare — en app som lär sig ditt hushålls smak, budget och vardag för att göra varje måltid enklare och billigare, från plan till tallrik."

---

## Målgrupp

**Primär:** Barnfamiljer med tajt schema och budgetfokus.

- Vill ha snabba beslut, inte krångliga val — "det ska bara funka"
- Primärdrivkraften är att spara tid och pengar, inte kulinarisk inspiration
- Appen används framför allt i köket och i butiken — mobil-first, touch-optimerat

---

## Kärnerbjudande

Helhetsupplevelsen från planering till tallriken är produkten. Tre lägen, ett flöde:

| Läge | Vad det gör | Vad det lär sig |
|------|-------------|-----------------|
| **Planera** | AI föreslår veckomeny baserat på kampanjer, skafferi och profil. Användaren godkänner. | Preferenser, budgetval, godkända rätter |
| **Handla** | Optimerad inköpslista, kampanjmatchning, offline-bockning | Faktiska priser, vad som faktiskt köptes |
| **Laga** | Steg-för-steg med röststyrning, portionsjustering, Wake Lock | Betyg (1–5), tillagningsfrekvens |

---

## Produktstrategi — Hushållets Intelligensloop

Hushållsprofilen är produktens kärna och konkurrensfördel. Varje interaktion gör den rikare:

```
Planera → Hushållsprofil → Handla → Hushållsprofil → Laga → Hushållsprofil → [loop]
```

**Moat:** Historiken är svår att byta bort ifrån. Ju längre en familj använder appen, desto bättre blir förslagen — och desto högre är bortbyteskostnaden.

### Magic moments (de ögonblick som skapar lojalitet)

1. "Appen lade fram en hel veckas middagar på 10 sekunder, anpassade till vad vi redan har hemma"
2. "Jag stod i butiken, bockade av varor, och appen sparade 180 kr mot vad det brukar kosta"
3. "Appen minns att vi inte gillar koriander och att vi brukar handla på Willys — den lär sig oss"

### AI:ns roll — semi-proaktiv

AI föreslår, människan bestämmer. Appen ska aldrig agera utan godkännande. Exempel på rätt beteende:

- ✅ "Kycklingfilé är på rea hos Willys — vill du planera runt det den här veckan?"
- ✅ "Baserat på vad ni brukar gilla föreslår jag den här veckan — ändra gärna"
- ❌ Automatiskt boka, beställa eller köpa utan bekräftelse

---

## Freemium-modell

### Gratis (för alltid)
- 1 hushåll, max 2 medlemmar
- Manuell veckomeny (ingen AI)
- Grundläggande inköpslista
- Skafferihantering
- Steg-för-steg lagning
- Max 20 sparade recept
- Panikfunktion ("vad kan jag laga?")

**Syfte:** Ge nog med värde för att bygga vana och samla hushållsdata — utan att ge bort intelligensen.

### Premium — 99 kr/mån (~3 kr/dag)
- Allt i Gratis
- Obegränsat hushåll och medlemmar
- **AI-menyförslag varje vecka**
- **Kampanjanpassad planering**
- 3 budgetalternativ (500 / 800 / 1 200 kr/vecka)
- **Lärande hushållsprofil**
- Obegränsade recept
- Offline-läge (Handla & Laga)
- Näringsinformation per portion
- Dietist-chat (AI-baserad)
- Prisjämförelse mellan butiker

**Kärnlöfte:** Sparar mer än 99 kr/mån i onödiga matinköp — annars är det gratis.

### Naturliga uppgraderingspunkter
| Var i appen | Trigger |
|-------------|---------|
| Veckomeny | "Vill du att AI ska lägga upp hela veckan åt dig?" |
| Inköpslista | "Kycklingfilé är på rea — låt mig anpassa listan" |
| Receptgräns | "Du har sparat 20 recept — uppgradera för obegränsat" |
| I butiken | "Håll inköpslistan tillgänglig utan nät" |

---

## Säkerhetsarkitektur — Defense-in-depth

### Lager 1 — Kant
- **Nu:** Rate limiting i `proxy.js`
- **Vid 1:a betalande kund:** Cloudflare Free (SSL, Bot Fight Mode, CDN)
- **Vid 500+ kunder:** Cloudflare Pro (WAF, avancerat bot-skydd)

### Lager 2 — API
- **Nu:** Zod-validering på alla inputs, API-nycklar server-side only, `CRON_SECRET` på cron-routes
- **Nästa:** Sentry DSN konfigureras (`NEXT_PUBLIC_SENTRY_DSN`), GitHub Secrets scanning aktiveras

### Lager 3 — Data
- **Nu:** RLS på alla tabeller, publika tabeller innehåller aldrig `household_id`, `SERVICE_ROLE_KEY` aldrig i klientkod
- **Nästa:** GDPR-rensning vid hushållsavslut (radera all household-data)

### Principerna som aldrig bryts
1. Sök alltid i databasen INNAN Claude API anropas
2. Server-side Supabase-klient i API-routes, browser-klient i komponenter
3. AI-genererade recept sparas alltid i `recipes`-tabellen
4. Modifieringar av delade recept sparas som privata kopior

---

## Teknisk målarkitektur

### Frontend
- Next.js — mobil-first, touch-optimerat (min 60px touch-ytor)
- SWR — stale-while-revalidate för hushållsdata, menyer, skafferi
- PWA + Service Worker — offline-läge för Handla och Laga
- Wake Lock API — skärm på vid lagning
- Web Speech API — röststyrning i Laga-läget
- `next/image` för alla bilder

### Backend & Data
- Supabase — auth, RLS, realtid
- Claude Sonnet 4.6 — alla AI-routes (snabbt + kostnadseffektivt)
- Vercel Cron — daglig prisuppdatering (kl 05:00)
- `price_cache` — kampanjdata med TTL 7 dagar
- Edge runtime för enkla API-routes (priser, kampanjer)
- Matpriser.se API — aktiveras i v2 för verifierade priser

---

## Hushållsintelligens — datamodell och mognadsgrad

### v1 — Profil (nu)
`household_preferences`: allergier, diet, favoriter, portionsjustering, föredragna butiker

### v2 — Lärande (nästa)
`consumption_log`, `meal_ratings`, tillagningsfrekvens, säsongsmönster, faktiska inköpspriser

### v3 — Insikter (framtid)
`household_insights`, personaliserad meny per hushållsmedlem, `member_profiles` (ålder, aktivitetsnivå, mål), näringstracking, budgetprognos

---

## Roadmap mot målbilden

| Prioritet | Feature | Motivation |
|-----------|---------|------------|
| P0 | Skeleton screens klara | Upplevd hastighet, pågår |
| P1 | Klarna/Stripe — Premium-tier | Intäkter möjliggör v2 |
| P2 | price_cache migration + Matpriser.se | Magic moment B (spara pengar) |
| P3 | PWA offline + Service Worker | Magic moment "handla utan nät" |
| P4 | consumption_log + meal_ratings | Grunden för lärande profil (v2) |
| P5 | Hushållsinbjudningar (`invite/[token]`) | Fler medlemmar = mer data = bättre förslag |
| P6 | Näringsinformation (Livsmedelsverket) | Premium-differentiator |
| P7 | Personaliserad meny per medlem | v3-insikter |
