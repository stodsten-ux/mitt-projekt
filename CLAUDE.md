
@AGENTS.md

# Mathandelsagenten

## Snabbfakta
- **Stack:** Next.js 16, Supabase, Anthropic Claude API, Vercel
- **Live:** https://mitt-projekt-one.vercel.app
- **GitHub:** https://github.com/stodsten-ux/mitt-projekt

## Dokumentation
- `TODO.md` — sessionlogg: nuläge + prioriterad backlog (läs detta först)
- `docs/CONTEXT.md` — arkitektur, DB-schema, feature-status, design-tokens, flows, affärsbeslut, roadmap

## Viktigaste regler (läs alltid dessa)
1. Sök alltid i databasen INNAN du anropar Claude API
2. Spara alltid AI-genererade recept i recipes-tabellen automatiskt
3. Använd CSS-variabler för ALLA färger
4. Server-side Supabase-klient i API-routes, browser-klient i komponenter
5. RLS är aktiverat — testa alltid med inloggad användare

## Miljövariabler
```
NEXT_PUBLIC_SUPABASE_URL=https://vrclvpocdqglqrdlotop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
ANTHROPIC_API_KEY=...
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=...
```

## Supabase-klient
```javascript
// I React-komponenter: import { createClient } from '../lib/supabase'
// I API-routes: import { createServerClient } from '@supabase/ssr'
```

## Git-workflow
```bash
git add .
git commit -m "beskrivning"
git push origin main
vercel --prod
```

## Worktrees
Worktree-katalog: `.worktrees/` (projektlokal, ignorerad av git)