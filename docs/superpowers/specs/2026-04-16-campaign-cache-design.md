# Design: campaign_cache (P4)
> 2026-04-16

## Syfte

Cachelagra AI-genererade kampanjsvar per butik och vecka i Supabase för att eliminera onödiga Claude-anrop. Kampanjer löper veckovis i svenska butikskedjor — samma svar kan återanvändas hela veckan för alla hushåll.

---

## Databas

Ny tabell `campaign_cache`:

```sql
CREATE TABLE campaign_cache (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store       TEXT NOT NULL,
  week_number INTEGER NOT NULL,
  year        INTEGER NOT NULL,
  payload     JSONB NOT NULL,
  valid_until DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (store, week_number, year)
);
CREATE INDEX idx_campaign_cache_lookup ON campaign_cache(store, week_number, year);
```

**RLS:**
- `SELECT`: authenticated
- `INSERT/UPDATE`: service_role

`payload` innehåller hela AI-svaret för den butiken: `{ campaigns[], recommendations[], seasonalTips, disclaimer }`.

`valid_until` = söndagen i samma ISO-vecka som `targetDate`.

---

## Route-logik (`POST /api/campaigns`)

```
1. Beräkna week_number + year från weekOffset
2. Beräkna valid_until = närmaste söndag från targetDate
3. För varje butik i storeList (parallellt):
   a. SELECT från campaign_cache WHERE store=? AND week_number=? AND year=?
   b. Träff → använd payload (source: 'cache')
   c. Miss → anropa Claude, spara i campaign_cache (source: 'ai')
4. Merga payloads från alla butiker
5. Om items[] skickades: filtrera campaigns[] och recommendations[]
   server-side på item-matchning (case-insensitive substring)
6. Returnera svar med source per butik
```

---

## Felhantering

| Scenario | Beteende |
|---|---|
| Claude misslyckas för en butik | Logga, hoppa över butiken, inkludera i `warnings[]` |
| Supabase INSERT misslyckas | Logga, returnera AI-svaret ändå (ej blockerande) |
| Alla butiker misslyckas | `200` med tomma arrayer + `seasonalTips: "Kampanjinformation är inte tillgänglig just nu."` |

Aldrig `500` — inga kampanjer är ett giltigt tillstånd för användaren.

---

## Personalisering från delad cache

Cachen är global (store + vecka). Personaliseringen sker server-side vid servering:

- `items[]` → filtrera `campaigns[]` och `recommendations[]` på item-matchning
- Tom `items[]` → returnera allt
- Hushållets `preferred_stores` → styr vilka butiker som efterfrågas (befintlig logik, oförändrad)

---

## Vad ingår inte

- Manuell cache-invalidering (cron eller ny vecka räcker)
- Per-hushålls-cache (onödig komplexitet)
- Prompt-trimning (separat task i P4)
