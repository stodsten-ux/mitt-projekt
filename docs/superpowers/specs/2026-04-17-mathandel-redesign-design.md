# Design: Mathandelsagenten — Redesign
**Datum:** 2026-04-17
**Scope:** Landningssida + app + flöde (sammanhållen designvision)
**Strategi:** "The Journey" — Planera → Handla → Laga som ett linjärt flöde

---

## Bakgrund

Appen har ett fungerande kärnflöde men saknar:
- Onboarding — nya användare möts av ett tomt dashboard
- Flödeskoppling — de tre lägena (Planera/Handla/Laga) är löst kopplade, övergångarna är oklara
- En landningssida som konverterar besökare

Designvision: **livsstil**, mobil-first, varm och kunnig ton. Maten är hjälten.

---

## 1. Visuell identitet

### Palett (befintlig, skärpt hierarki)
```css
--color-forest:     #2D4A3E;   /* primär accent, förtroende */
--color-terracotta: #C4622D;   /* CTA, värme, rörelse */
--color-cream:      #F5F0E8;   /* bakgrund, luft */
--color-sage:       #7C9A82;   /* sekundär, stöd */
```

### Typografi
- **Playfair Display** — rubriker, editorial, används friare och större än idag
- **Inter** — brödtext, knappar, labels

### Kortdesign
- `border-radius: 20px` (upp från 16px)
- Full-bleed matfoton — bildkort ersätter thumbnails
- Mer luft: generösa paddings, vita ytor

### Ton
Varm och kunnig. Appen ska kännas som en vän som kan mat — inte som ett kalkylblad.

### Animationer
- Rätt "glider in" när du bockar av den
- Onboardingsteg "grows" fram
- Mjuka övergångar (300ms ease)

---

## 2. Onboarding

Nytt flöde — 4 steg, ett skärm i taget. Ersätter direktlanding på tomt dashboard.

```
Välkommen  →  Hushållet  →  Budget  →  Första rätten
```

### Steg 1 — Välkommen
- Full-bleed matbild
- Playfair-rubrik: *"Mat för hela veckan. Enkelt."*
- En CTA: "Kom igång"

### Steg 2 — Hushållet
- Fråga: *"Hur många är ni?"* — stora tappbara sifferknappar (1–6+)
- Fråga: *"Har ni barn?"* — ja/nej
- Inget mer. Resten fylls i senare.

### Steg 3 — Budget
Tre tappbara kort (befintliga budgetnivåer):
- 💚 ~500 kr/vecka — Budgetvecka
- 🧡 ~800 kr/vecka — Balanserad
- 💜 ~1 200 kr/vecka — Lyxvecka

### Steg 4 — Första rätten
- AI genererar direkt ett förslag på veckans meny baserat på val
- Sju dagar som scrollbar rad
- *"Det här är din vecka — du kan ändra vad som helst."*
- CTA: "Visa min vecka →"

### UX-regler
- Progressindikator längst upp (4 punkter)
- Allt skippbart med "Hoppa över →" i hörnet
- Data från onboarding skrivs direkt till `households` och `household_preferences`

---

## 3. Landningssida

En enda scrollsida, mobil-first. Mål: registrering under 30 sekunder.

### Struktur (uppifrån och ned)

**Hero**
- Full-bleed matfoto (varm, familjär)
- Playfair-rubrik: *"Veckans mat. Klar på en minut."*
- Undertext: *"Planera, handla och laga — allt på ett ställe. Gratis."*
- CTA: "Prova gratis →" (terracotta)

**Tre fördelar** — horisontell scroll på mobil
- 📅 *"AI planerar veckan åt dig"*
- 🛒 *"Inköpslistan skapas automatiskt"*
- 👨‍🍳 *"Steg-för-steg när du lagar"*

**Flödesillustration**
Stiliserade kort med pilar: Planera → Handla → Laga. Inte screenshots.

**Socialt bevis**
Citat från barnfamilj: foto + namn + *"Vi sparar 300 kr i veckan och stressar mycket mindre."*

**Prissättning**
Två kolumner: Gratis vs Premium (99 kr/mån). CTA på Premium: *"Prova 30 dagar gratis"*.

**Footer CTA**
- Rubrik: *"Börja den bästa matkassen du haft."*
- Knapp: *"Skapa konto — det tar 2 minuter"*

---

## 4. App-navigation och flöde

### Bottom tab-bar

```
[Planera]  [Handla]  [Laga]  [Hem]
```

- Lägena visas i ordning vänster → höger (start → mål)
- Hem (dashboard) sitter längst till höger som nav-hub
- Aktiv flik: liten grön prick under ikonen (inte bara färgändring)

### Kontextuella "nästa steg"-banners

Varje vy avslutar med ett diskret men tydligt förslag (forest-grönt, längst ned):

| Var | Banner |
|---|---|
| Planera (menyn klar) | *"Menyn är klar — skapa inköpslistan →"* |
| Handla (allt bockat) | *"Klart! Dags att laga — se receptet →"* |
| Laga (rätten klar) | *"Vill du betygsätta rätten?"* |

Banners är icke-modala. Syns bara när steget är slutfört.

### Dashboard som nav-hub

Dashboarden svarar alltid på: *"vad gör jag härnäst?"*
Visar det mest aktuella steget i flödet — inte allt på en gång.

---

## Vad som INTE ingår i denna spec

- Implementationsdetaljer för AI-anrop (befintlig logik behålls)
- Premium-features (Klarna, dietist, näringsinformation)
- PWA/offline-läge
- Invitation-flödet

---

## Filer som berörs

| Fil | Förändring |
|---|---|
| `app/page.js` | Dashboard — ny nav-hub-logik, "nästa steg"-banner |
| `app/auth/register/page.js` | Triggar onboarding-flöde efter registrering |
| `app/onboarding/page.js` | **Ny sida** — 4-stegs onboarding |
| `app/page.js` | Auth-check: inloggad → dashboard, ej inloggad → landningssida (renderas inline, ingen redirect) |
| `components/Landing.js` | **Ny komponent** — landningssidans innehåll, importeras av page.js |
| `components/Navbar.js` | Bottom tab-bar med ordnad progression |
| `app/globals.css` | Skärpta design-tokens (border-radius, luft) |
