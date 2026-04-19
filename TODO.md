# TODO — Mathandelsagenten

## Nuläge
Kärnflödet är komplett: planera, handla och laga fungerar end-to-end. Kampanj/prisinformation är implementerad via Claude-baserad uppskattning. **Appen är långsam** — alla 5 AI-routes använder Opus utan streaming, och `menu/expand` gör sekventiella Opus-anrop (7 rätter = 7× Opus i serie ≈ 2+ min). price_cache är byggd men migrationen inte körd.

## Pågående arbete — 2026-04-19

### UI-redesign (Apple-inspirerat formspråk)
**Plan:** `docs/superpowers/plans/2026-04-18-ui-redesign.md`
**Spec:** `docs/superpowers/specs/2026-04-18-ui-redesign-design.md`
**Dialog:** `.claude/projects/-Users-jonashallgren-Projekt-mathandelsagenten/0327091d-15ac-42e7-9ca0-1831af80c085.jsonl`

**Klart:**
- [x] Task 1 — CSS-foundation: shadow-system, radius-card 18px, alla dashboard-komponentklasser i components.css
- [x] Task 2 — Layout chrome: ModeSelector borttagen, paddingTop 104px → 56px
- [x] Task 3 — Navbar: frosted glass, ingen emoji, nav-pill + nav-icon-btn

**Återstår (kör subagent-driven-development):**
- [ ] Task 4 — Dashboard (`app/page.js`): hero + steg-kort + CTA-kort, ersätt hela filen
- [ ] Task 5 — Tillbaka-knappar: `menu/page.js`, `shopping/page.js`, `cook/[recipeId]/page.js`, `pantry/page.js`
- [ ] Task 6 — Bygga + driftsätta: `npm run build` → verifiera ikoner → `vercel --prod`

**Vad är nästa steg?** → Kör Task 4 (dispatch implementer för `app/page.js`).

---

## Senaste session — 2026-04-01
**Gjort:**
- Skapade price_cache SQL-migration (`supabase/migrations/20260401_create_price_cache.sql`)
- Byggde `api/cron/update-prices/route.js` — daglig prisuppdatering via Vercel Cron
- Uppdaterade `api/prices/route.js` — slår mot price_cache först, faller tillbaka på Claude API
- Skapade `vercel.json` med cron-schema (kl 05:00 dagligen)
- RLS-policy: läsbar för authenticated, skrivbar via service_role

**Beslut:**
- price_cache fylls via cron (Claude-uppskattningar), inte manuellt
- Cron-route skyddas med CRON_SECRET env-var
- Prisrouten visar `source: 'cache'` eller `source: 'ai'` per vara

---

## Prestandadiagnos — 2026-04-03

### Uppmätta flaskhalsar (kodgranskning, ej runtime-mätning ännu)

| Route | Modell | Streaming | Cache | Huvudproblem |
|---|---|---|---|---|
| `api/ai` | Opus | ❌ | ❌ | Väntar på komplett svar innan visning |
| `api/prices` | Opus | ❌ | price_cache (ej migrerad) | Opus för enkel prisuppskattning |
| `api/campaigns` | Opus | ❌ | Bara HTTP Cache-Control | Opus för kampanjgissningar |
| `api/menu/expand` | Opus | ❌ | ❌ | **VÄRST: sekventiell for-loop, 1 Opus-anrop per rätt** |
| `api/shopping/generate` | Opus | ❌ | price_cache | Opus för ingredienslistor |
| `api/pantry/check` | — | — | — | Ingen AI, OK |

### Åtgärdsplan (prioritetsordning)

#### P0 — Gör först (störst effekt, minst arbete)
1. [x] **Streaming på `/api/ai`** — `stream: true` parameter → ord-för-ord via ReadableStream. `askSubstitut` i cook-sidan streamar.
2. [x] **Parallellisera `menu/expand`** — `Promise.allSettled` istället för for-loop. 7 rätter genereras parallellt.
3. [x] **Modellbyte** — Sonnet 4.6 på alla routes (ai, prices, campaigns, expand, shopping/generate).

#### P1 — Aktivera det som redan är byggt
4. [x] Kör price_cache SQL-migrationen i Supabase
5. [x] Lägg till CRON_SECRET i Vercel env vars
6. [x] Testa cron-routen

#### P2 — Mätning (gör innan vidare optimering)
7. [x] Lägg till `console.time()`/`console.timeEnd()` runt AI-anrop i alla routes — logga TTFT och total tid
8. [x] Aktivera Vercel Analytics (Speed Insights) eller Web Vitals-logging

#### P3 — Frontend-upplevelse
9. [ ] Skeleton screens istället för spinners på meny- och receptsidor
10. [x] SWR för stale-while-revalidate på hushållsdata, menyer, skafferi

#### P4 — Caching lager 2
11. [x] Cache kampanjsvar i Supabase (campaign_cache, valid_until=veckoslutet) — kampanjer ändras inte per vecka
12. [x] Trimma system-prompts — kortare prompt = snabbare TTFT

#### P5 — Senare (inte nu)
13. [ ] Aktivera invite/[token]/page.js — hushållsinbjudningar
14. [ ] Klarna/Stripe-integration — Premium-tier + betalvägg
15. [ ] Aktivera Secrets scanning i GitHub Actions
16. [ ] Uppdatera deprecated npm-paket: rimraf, rollup-plugin-terser, sourcemap-codec, inflight, workbox-*, glob, node-domexception, source-map (beta)
17. [ ] Fixa @sentry/nextjs deprecation: byt `disableLogger` till `webpack.treeshake.removeDebugLogging`

### Avfärdade åtgärder
- **n8n för schemalagda jobb** — Vercel Cron redan byggt och konfigurerat. Onödig infrastruktur.
- **Supabase Edge Functions** — ej relevant vid nuvarande skala.
- **Optimistic UI** — streaming löser upplevd hastighet utan spekulativ rendering.
- **Redis** — Supabase price_cache + HTTP Cache-Control räcker. Redis motiverat först vid 500+ aktiva användare.

## Öppna beslut
- Ska Klarna eller Stripe användas för betalning? (CONTEXT.md anger Klarna)
- Runtime-mätningar saknas — prestandadiagnosen baseras på kodanalys, inte uppmätta svarstider

## Kända blockers
- price_cache-migrationen ej körd → cron-jobbet skriver till tomma intet
