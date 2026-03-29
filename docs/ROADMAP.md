# Roadmap — Framtida funktioner

## Kampanjer & prisinformation
- Visa nästa veckas erbjudanden per butik
- Sök kampanjpris inom datumintervall
- Rekommendera optimalt inköpsdatum
- Implementation: Claude web search → JSON med vara/pris/butik/datum

## Positionering & butiksnärhet
- Spara bostadsort eller GPS-position
- Visa närmaste butiker per kedja
- Optimera inköpsrutt (30/70-fördelning)
- Geolocation API eller manuell inmatning

## Personaliserad meny per medlem
- Medlem bantar → lägre kalorier
- Medlem tränar → mer protein
- Datamodell: member_profiles (age, activity_level, goal, restrictions)

## Dietist-funktion & kostråd
- Beräkna näringsvärde per måltid och vecka
- Jämför mot RDI
- Flagga om menyn saknar viktiga näringsämnen
- Integration med Livsmedelsverkets databas

## Lärande hushållsprofil
- Lär sig förbrukning av basvaror (mjölk, pasta, smör)
- Betygshistorik påverkar framtida förslag
- Säsongsmönster
- Datamodell: consumption_log, household_insights

## Hushållskategorier
| Typ | AI-kontext |
|---|---|
| barnfamilj | Enkla rätter, milda smaker, snabb tillagning |
| par | Mer variation, matlagning som hobby |
| singel | Små portioner, enkel, budgetvänligt |
| storformat | Många portioner, batch cooking |
| senior | Lättlagat, näringsrikt, inte för starkt |

## Receptkällor
- Länka till externa recept (source_url)
- Validera länk vid sparande
- Markera trasiga länkar med varning
- Scrapa INTE — länka alltid till originalet