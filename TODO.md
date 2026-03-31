# TODO — Mathandelsagenten

## Nuläge
Kärnflödet är komplett: planera, handla och laga fungerar end-to-end. Kampanj/prisinformation är implementerad via Claude-baserad uppskattning. Nästa prioritet är att aktivera price_cache i Supabase och börja bygga Premium-betalflödet.

## Senaste session — 2026-03-31
**Gjort:**
- Konsoliderade 6 docs-filer till CONTEXT.md + TODO.md
- Uppdaterade CLAUDE.md med nya dokumentationspekare
- Raderade docs/ARCHITECTURE.md, FEATURES.md, FLOWS.md, DESIGN.md, ROADMAP.md, BUSINESS.md

**Beslut:**
- Approach C valdes: CLAUDE.md (invarianter) / CONTEXT.md (nuläge) / TODO.md (sessionlogg)
- Löst bugghistorik raderas — finns i git-historiken

## Nästa steg (prioriterat)
1. [ ] Skapa price_cache-tabellen i Supabase (SQL finns i CONTEXT.md → Affärsbeslut)
2. [ ] Bygg api/cron/update-prices/route.js — daglig prisuppdatering via Vercel Cron
3. [ ] Aktivera invite/[token]/page.js — hushållsinbjudningar
4. [ ] Klarna-integration — Premium-tier + betalvägg i middleware
5. [ ] Aktivera Secrets scanning i GitHub Actions (repo-inställningar)

## Öppna beslut
- Ska price_cache fyllas manuellt initialt eller direkt via cron?
- Ska Klarna eller Stripe användas för betalning? (CONTEXT.md anger Klarna)

## Kända blockers
- Inga aktiva blockers
