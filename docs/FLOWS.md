# Användarflöden

## De tre lägena i navbaren
```
[CalendarDays Planera]  [ShoppingBag Handla]  [ChefHat Laga]
```
- Tre separata lägen med egna optimerade UI
- Appen minns senaste läge

## Flöde 1 — Planera (hemma, lugnt)
```
Dashboard → Veckomenyn → Välj/generera recept →
Stäm av skafferi → Skapa inköpslista → Hitta pris
```

## Flöde 2 — Handla (i butiken)
```
Öppna inköpslistan → Bocka av varor →
Alla klara → "Flytta till skafferi?"
```
UI-krav:
- Extremt enkelt, stora bockar (60px touch-yta)
- Offlineläge via PWA service worker
- Wake Lock — skärmen slocknar inte
- Progressbar: "X av Y varor"

## Flöde 3 — Laga (vid spisen)
```
/cook → Välj rätt → /cook/[id] →
Portionsjustering → Steg 1 → Timer →
Nästa steg → ... → Klart → Betygsätt
```
UI-krav:
- Ett steg i taget, fullskärm
- Text minst 20px
- Wake Lock
- Röststyrning: "Nästa", "Starta timer", "Substitut för X"

## Panikfunktionen
```
Dashboard/Skafferi → "Vad kan jag laga?" →
Välj ingredienser hemma →
Sök recept i DB →
Om inget → Claude AI →
Välj recept → Börja laga
```

## Onboarding (ny användare)
```
Registrera → Bekräfta e-post →
Logga in → Ingen household_member →
Redirect /household + välkomstmeddelande →
Skapa hushåll → Fyll preferenser →
Dashboard
```

## Navbar-layout
```
Desktop:
[🌿 Mathandel]  [Planera] [Handla] [Laga]  [Fam Hallgren ▾] [Settings]

Mobil — bottom navigation:
[CalendarDays]  [ShoppingBag]  [ChefHat]  [Home]
[Planera]       [Handla]       [Laga]     [Hem]
```

## Dashboard — statusöversikt
```
God kväll, Jonas
Söndag · Vecka 13
[Hero: matbild med overlay]

IKVÄLL LAGAR VI
[Ugnspannkaka] [Börja laga →]

DENNA VECKA
[Mån ✓] [Tis ✓] [Ons +] [Tor +] [Fre +] [Lör +] [Sön]

INKÖPSLISTA
12 varor · Est. 450 kr  [Öppna →]

SKAFFERI
⚠ Kycklingfilé går ut imorgon

VAD KAN JAG LAGA?
Baserat på skafferiet  [→]
```