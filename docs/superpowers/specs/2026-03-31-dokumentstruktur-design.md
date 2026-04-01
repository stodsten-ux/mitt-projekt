# Dokumentstruktur — Design Spec
**Datum:** 2026-03-31  
**Mål:** Konsolidera 6 docs-filer till 2 (CONTEXT.md + TODO.md) för att minska AI:s filläsningskostnad vid sessionsstart.

---

## Approach: Invarianter / Nuläge / Sessionlogg

Tre filer med tydligt separerade ansvarsområden:

| Fil | Syfte | Uppdateras |
|-----|-------|------------|
| `CLAUDE.md` | Invarianter — stack, regler, env, mönster | Sällan |
| `docs/CONTEXT.md` | Nuläge — arkitektur, features, design, affär | Vid varje ny funktion |
| `TODO.md` | Sessionlogg — var vi är, vad som är nästa | Varje session |

---

## Filstruktur efter omstrukturering

```
mathandelsagenten/
├── CLAUDE.md          ← invarianter
├── AGENTS.md          ← orörd (Next.js 16-varning)
├── TODO.md            ← sessionlogg (ny fil)
└── docs/
    ├── CONTEXT.md     ← nuläge (ny fil, absorberar 6 gamla)
    └── superpowers/
        └── plans/     ← implementationsplaner (oförändrade)
```

**Raderas:** `docs/ARCHITECTURE.md`, `docs/FEATURES.md`, `docs/FLOWS.md`, `docs/DESIGN.md`, `docs/ROADMAP.md`, `docs/BUSINESS.md`

---

## CLAUDE.md — innehåll (invarianter)

Behåller nuvarande struktur med dessa justeringar:
- Stack, live-URL, GitHub (oförändrat)
- 5 viktigaste regler (oförändrat)
- Miljövariabler (oförändrat)
- Supabase-klientmönster (oförändrat)
- Git-workflow (oförändrat)
- `@AGENTS.md`-referens (oförändrat)
- **Tillägg:** Pekare till CONTEXT.md och TODO.md med instruktion om när respektive läses

---

## docs/CONTEXT.md — innehåll (nuläge)

Absorberar från alla 6 befintliga docs-filer. Sektioner i ordning:

1. **Projektstruktur** — app-routes med ✅/🔲-status (från ARCHITECTURE.md)
2. **Databastabeller** — alla tabeller med kolumner och RLS-noter (från ARCHITECTURE.md)
3. **AI-integration** — route, modell, receptsökningslogik (från ARCHITECTURE.md)
4. **Kritiska gotchas** — stale React state, store vs category (från ARCHITECTURE.md)
5. **Feature-status** — öppna/pågående, ej löst bugghistorik (från FEATURES.md)
6. **Kritiska API-routes** — /api/menu/expand, /api/shopping/generate, /api/pantry/check (från FEATURES.md)
7. **Design-tokens** — färgpalett, typografi, ikoner, Unsplash-bilder, animationer (från DESIGN.md)
8. **Användarflöden** — de 3 lägena + panikfunktion + onboarding + navbar-layout (från FLOWS.md)
9. **Affärsbeslut** — prismodell (gratis/premium), Cloudflare-strategi per fas (från BUSINESS.md)
10. **Roadmap** — framtida funktioner i prioritetsordning (från ROADMAP.md)

**Tas bort:**
- Löst bugghistorik (✅-märkta buggar med datum) — finns i git
- Duplicerad Cloudflare-info mellan BUSINESS.md och FEATURES.md

---

## TODO.md — format (sessionlogg)

```markdown
# TODO — Mathandelsagenten

## Nuläge
[1-3 meningar om var projektet är just nu]

## Senaste session — YYYY-MM-DD
**Gjort:**
- ...

**Beslut:**
- ...

## Nästa steg (prioriterat)
1. [ ] ...
2. [ ] ...
3. [ ] ...

## Öppna beslut
- ...

## Kända blockers
- ...
```

**Principer:**
- Bara en "Senaste session"-sektion — ersätts varje gång (historik finns i git)
- Max 30-40 rader totalt — tät, inte narrativ
- AI uppdaterar TODO.md i slutet av varje session som avslutningsrutin

---

## Ej i scope

- Ändra AGENTS.md
- Ändra docs/superpowers/plans/
- Lägga till ny funktionalitet
