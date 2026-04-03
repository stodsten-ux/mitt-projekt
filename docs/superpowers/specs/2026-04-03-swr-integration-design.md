# SWR-integration med delade hooks

## Syfte

Ersätta manuell `useEffect`-baserad datahämtning i alla sidor med SWR-hooks. Ger automatisk caching, stale-while-revalidate, deduplicering och renare sidkomponenter.

## Nuläge

Alla 5 huvudsidor (meny, skafferi, shopping, recept, kampanjer) har samma mönster:
- `useEffect` som hämtar user -> household -> sidspecifik data
- Duplicerad auth/household-logik (~10 rader per sida)
- Ingen caching — varje sidnavigering triggar nya Supabase-anrop
- Manuell `loading`-state med `<Spinner />`

## Arkitektur

### Nya filer

```
lib/
  hooks/
    useHousehold.js    — auth + household_id, redirect vid behov
    useMenu.js         — menydata (menu_items) för given vecka
    usePantry.js       — skafferivaror
    useShoppingList.js — inköpslistor + shopping_items
    useRecipes.js      — recept (egna + delade + ratings)
```

### Global SWR-konfiguration

`SWRConfig` provider i `app/layout.js`:
- `revalidateOnFocus: true` (standard)
- `dedupingInterval: 2000`
- Ingen global fetcher — varje hook har sin egen Supabase-query som fetcher

### useHousehold

SWR-nyckel: `['household']` (user hämtas via `supabase.auth.getUser()` inuti fetcher).

Returnerar: `{ user, householdId, householdData, isLoading, error }`

Redirect-logik:
- Ingen inloggad user -> `router.push('/auth/login')`
- Ingen household-membership -> `router.push('/household')`

Redirects hanteras via `useEffect` som reagerar på SWR-data, inte inuti fetcher.

### useMenu(householdId, weekStart)

SWR-nyckel: `householdId ? ['menu', householdId, weekStartStr] : null`

Fetcher: Hämtar `menus` + `menu_items` från Supabase.

Returnerar: `{ menuId, menuItems, menuRecipeIds, isLoading, error, mutate }`

### usePantry(householdId)

SWR-nyckel: `householdId ? ['pantry', householdId] : null`

Fetcher: Hämtar `pantry`-items sorterade på `expires_at`.

Returnerar: `{ items, isLoading, error, mutate }`

### useShoppingList(householdId)

SWR-nyckel: `householdId ? ['shopping-lists', householdId] : null`

Fetcher: Hämtar alla `shopping_lists` + items för senaste listan.

Returnerar: `{ lists, activeList, items, isLoading, error, mutate, setActiveList }`

Notering: `activeList` hanteras som lokal state, inte SWR — det är UI-state, inte serverdata. Vid byte av aktiv lista hämtas items via separat `useSWR` med `['shopping-items', activeListId]`.

### useRecipes(householdId)

SWR-nyckel: `householdId ? ['recipes', householdId] : null`

Fetcher: Hämtar `recipes` för hushållet.

Returnerar: `{ recipes, isLoading, error, mutate }`

Delade recept och ratings hämtas via separata SWR-anrop i receptsidan (de är inte household-specifika).

## Mutationer

Skrivoperationer (save, delete, toggle) stannar i sidkomponenterna. Efter lyckad mutation anropas `mutate()` för att revalidera cachen.

Optimistic updates används där det är enkelt och lågrisk:
- Toggle checkbox på shopping-item
- Ta bort vara från skafferi
- Ta bort menypost

Inga optimistic updates på operationer som skapar ny data i databasen (t.ex. spara recept, generera inköpslista).

## Vad som inte ändras

- API-routes — orörda
- Supabase-klient (`lib/supabase.js`) — orörd
- JSX/rendering i sidorna — behålls, bara datahämtning byts ut
- Spinner-komponenten — behålls (används i knappar vid actions)
- Auth-flow (login/register) — orört

## Migrationsordning

1. Installera `swr`
2. Skapa `useHousehold` + `SWRConfig` i layout
3. Pantry-sidan (enklast, minst state)
4. Meny-sidan (veckonavigering kräver dynamisk SWR-nyckel)
5. Shopping-sidan (mest komplex — flera listor, items, prisresultat)
6. Recept-sidan (flera vyer + sök)
7. Kampanj-sidan (enkel, mest on-demand)

## Beroenden

- `swr` — npm-paket, inga andra nya beroenden
