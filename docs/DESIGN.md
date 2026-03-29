# Design

## Designkänsla
Naturlig & organisk — varm lanthandel möter modern matapp.
Inspirationskällor: Airbnb (kort), Headspace (övergångar), ICA-appen (svensk matkänsla)

## Färgpalett (globals.css)
```css
:root {
  --color-forest:      #2D4A3E;
  --color-sage:        #7C9A82;
  --color-cream:       #F5F0E8;
  --color-warm-gray:   #E8E0D4;
  --color-soil:        #8B6914;
  --color-terracotta:  #C4622D;
  --color-text:        #1A1A1A;
  --color-muted:       #6B6B6B;
  --color-border:      #D4CCC0;
  --bg:                var(--color-cream);
  --bg-card:           #FFFFFF;
  --accent:            var(--color-forest);
  --accent-text:       #FFFFFF;
  --cta:               var(--color-terracotta);
}

[data-theme='dark'] {
  --bg:                #1C1F1A;
  --bg-card:           #252923;
  --color-text:        #F0EDE6;
  --color-muted:       #A0A89A;
  --color-border:      #3A3F38;
  --accent:            var(--color-sage);
  --accent-text:       #1A1A1A;
}
```

## Typografi
- Rubriker: Playfair Display (Google Fonts)
- Brödtext: Inter (Google Fonts)
- Importera via next/font/google i layout.js

## Ikoner — Lucide React (INGA emojis i UI)
```javascript
import {
  ChefHat,       // Laga-läget
  ShoppingBag,   // Handla-läget
  CalendarDays,  // Planera-läget
  Refrigerator,  // Skafferi
  Sparkles,      // AI-förslag
  AlertCircle,   // Panikknapp
  Settings,      // Inställningar
  Home,          // Hushåll
  Sun, Sunset, Moon,  // Hälsning
  Star,          // Betyg
  Timer,         // Timer i lagaläget
  Mic,           // Röststyrning
  ChevronRight,  // Navigeringspil
  Check, Plus, Minus, Search, BookOpen,
} from 'lucide-react'
```

## Bilder — Unsplash
```javascript
// lib/unsplash.js
export const categoryImages = {
  kyckling:    'https://images.unsplash.com/photo-1598103442097-8b74394b95c4?w=800',
  pasta:       'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800',
  fisk:        'https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=800',
  vegetarisk:  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
  soppa:       'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800',
  tacos:       'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800',
  pizza:       'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
  default:     'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
}
```

## Kortdesign
- border-radius: 16px
- box-shadow: 0 2px 12px rgba(0,0,0,0.08)
- hover: translateY(-2px), starkare shadow (200ms ease)
- overflow: hidden (för bilder)

## Animationer
- Sidövergångar: fade + translateY(8px), 300ms
- Kort: scale(0.97→1), 200ms
- Bocka av: scale-pulse + genomstrykning
- Timer: puls-animation

## Dashboard hero
```javascript
// Gradient baserat på tid på dygnet
function getGreeting() {
  const h = new Date().getHours()
  if (h < 10) return { text: 'God morgon',      gradient: '#f59e0b, #d97706' }
  if (h < 17) return { text: 'God eftermiddag', gradient: '#2D4A3E, #7C9A82' }
  if (h < 21) return { text: 'God kväll',       gradient: '#c2410c, #9a3412' }
  return       { text: 'God natt',               gradient: '#1e1b4b, #312e81' }
}

// Hero med matbild som bakgrund
background: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.65)), url(${heroImage})`
```

## Mobilnavigation
- Desktop: top navbar
- Mobil (< 768px): bottom navigation med ikoner