# Affärsmodell & Betalvägg

## Prismodell
- **Gratis:** Basfunktioner för ett hushåll
- **Premium:** 99 kr/mån — faktureras månadsvis via Klarna

## Vad ingår var

### Gratis
- Ett hushåll, max 2 medlemmar
- Veckomenyn (manuell)
- Max 20 recept
- Grundläggande inköpslista
- Lagaläget steg-för-steg
- Skafferiet

### Premium (99 kr/mån)
- Obegränsade hushåll och medlemmar
- AI-genererade menyförslag
- Tre budgetalternativ per vecka (💚 Billig / 🧡 Balanserad / 💜 Lyx)
- Prisjämförelse och kampanjer
- Dietist-chatfunktion
- Näringsinformation (kalorier, protein, fett, kolhydrater)
- Obegränsade recept
- Offline-läge
- Prishistorik och kampanjplanering

## Betalvägg — implementation
- Betalvägg via Klarna Payments
- Supabase-kolumn: households.subscription_tier ('free' | 'premium')
- Kontrollera tier i middleware innan Premium-routes
- Visa "Uppgradera till Premium" modal vid försök att nå låst funktion

## Tre budgetalternativ per vecka
```
💚 Budgetvecka    ~500 kr
  - Enkla råvaror
  - Säsongsanpassat
  - Vegetariskt 3-4 dagar
  - Kyckling som primärt kött

🧡 Balanserad     ~800 kr  
  - Mix billigt och gott
  - Kyckling + fläsk
  - En fiskrätt
  - Varierad meny

💜 Lyxvecka      ~1200 kr
  - Bättre råvaror
  - Nötkött, lax
  - Mer variation
  - Helgrätt med extra omsorg
```

AI väljer recept baserat på:
1. Budgetval
2. Veckans kampanjer (billigaste huvudingrediensen)
3. Skafferiinnehåll (minskar kostnaden)
4. Hushållets preferenser och allergier
5. Balans kött/fisk/vegetariskt per vecka

## Klarna-integration
- npm install @klarna/klarna-payments
- Skapa subscription i Klarna
- Webhook: uppdatera subscription_tier i Supabase vid betalning
- Hantera avslut och förnyelse automatiskt

---

## Cloudflare — Säkerhetsstrategi

### Trigger för aktivering
**Aktivera Cloudflare Free när första betalande kund registrerar sig.**
Det tar 10 minuter och kostar ingenting.

### Implementeringsplan

#### Fas 1 — Nu (0 kr)
Gör dessa saker INNAN Cloudflare:
- Rate limiting på /api/ai (max 10 anrop/minut per IP)
- Rate limiting på /api/auth (max 5 försök/minut)
- Input-validering med Zod på alla formulär
- Verifiera att inga API-nycklar exponeras i klientkod
- Verifiera att .env.local aldrig committas till GitHub
```javascript
// Enkel rate limiting i Next.js middleware
// middleware.js
import { NextResponse } from 'next/server'

const rateLimits = new Map()

export function middleware(request) {
  if (request.nextUrl.pathname.startsWith('/api/ai')) {
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
    const now = Date.now()
    const windowMs = 60 * 1000 // 1 minut
    const maxRequests = 10

    const requests = rateLimits.get(ip) ?? []
    const recent = requests.filter(t => now - t < windowMs)

    if (recent.length >= maxRequests) {
      return NextResponse.json(
        { error: 'För många anrop — försök igen om en minut' },
        { status: 429 }
      )
    }

    rateLimits.set(ip, [...recent, now])
  }
  return NextResponse.next()
}
```

#### Fas 2 — Vid första betalande kund (0 kr)
1. Skapa konto på cloudflare.com
2. Lägg till domän (om ni har egen domän — annars vänta)
3. Byt DNS till Cloudflare nameservers
4. Aktivera: SSL/TLS → Full (strict)
5. Aktivera: Bot Fight Mode
6. Aktivera: Browser Integrity Check

**Värde:** CDN, grundläggande DDoS, SSL, bot-skydd

#### Fas 3 — Vid 500+ betalande kunder (~250 kr/mån)
Uppgradera till Cloudflare Pro:
- WAF med OWASP-regler
- Avancerat bot-skydd
- Rate limiting i Cloudflare (mer robust än Next.js)
- Analytics och säkerhetsrapporter
- 20ms snabbare laddningstid för svenska användare

**Motivering:** Vid 500 kunder × 99 kr = 49 500 kr/mån intäkt.
250 kr/mån för Pro är 0.5% av intäkten — självklart val.

#### Fas 4 — Aldrig (overkill)
- Cloudflare Business (2 500 kr/mån)
- Cloudflare Enterprise
Dessa är dimensionerade för banker och e-handel i stor skala.

### För- och nackdelar (sammanfattning)

| | För | Nackdel |
|---|---|---|
| **Free** | Gratis, enkel setup, SSL | Begränsad WAF |
| **Pro** | Stark WAF, bot-skydd | 250 kr/mån, viss komplexitet |
| **Vercel-konflikt** | — | Caching kan kräva finjustering |
| **DNS-beroende** | — | Sällsynt men Cloudflare kan ha driftstörning |

### Viktigaste säkerhetsåtgärder just nu (utan Cloudflare)
Dessa ger 80% av säkerhetsvärdet till 0 kr:

1. Rate limiting på AI-routes ← skyddar Claude API-budget
2. Zod-validering på alla formulär ← förhindrar skadlig input
3. Verifiera RLS-policies ← hushåll aldrig läcker data
4. Aldrig exponera SERVICE_ROLE_KEY i klientkod
5. GitHub secret scanning aktiverat
6. Dependency-uppdatering månadsvis (npm audit)