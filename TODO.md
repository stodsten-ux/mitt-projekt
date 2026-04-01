# TODO — Mathandelsagenten

## Nuläge
Kärnflödet är komplett: planera, handla och laga fungerar end-to-end. Kampanj/prisinformation är implementerad via Claude-baserad uppskattning. Nästa prioritet är att aktivera price_cache i Supabase och börja bygga Premium-betalflödet.

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

## Nästa steg (prioriterat)
1. [ ] Kör SQL-migrationen i Supabase (kopiera från migrations-filen)
2. [ ] Lägg till CRON_SECRET i Vercel env vars
3. [ ] Testa cron-routen manuellt: `curl -H "Authorization: Bearer $CRON_SECRET" $URL/api/cron/update-prices`
4. [ ] Aktivera invite/[token]/page.js — hushållsinbjudningar
5. [ ] Klarna-integration — Premium-tier + betalvägg i middleware
6. [ ] Aktivera Secrets scanning i GitHub Actions (repo-inställningar)
7. [x] Koppla price_cache till inköpslistan — listgenerering sätter pris från cache, "Hitta bästa pris" skriver tillbaka priser till DB, total visas med 2 decimaler
8. [ ] Uppdatera deprecated npm-paket: rimraf, rollup-plugin-terser, sourcemap-codec, inflight, workbox-*, glob, node-domexception, source-map (beta)
9. [ ] Fixa @sentry/nextjs deprecation: byt `disableLogger` till `webpack.treeshake.removeDebugLogging`

## Öppna beslut
- Ska Klarna eller Stripe användas för betalning? (CONTEXT.md anger Klarna)

## Kända blockers
- Inga aktiva blockers
