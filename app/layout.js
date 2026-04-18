import './globals.css'
import './components.css'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import Navbar from '../components/Navbar'
import CookieBanner from '../components/CookieBanner'
import SWRProvider from './swr-provider'

export const metadata = {
  title: 'Mathandelsagenten — Planera, handla och laga smartare',
  description: 'Planera veckomenyn, hitta recept anpassade för din familj, generera inköpslistor och hitta bästa priser i din butik.',
  manifest: '/manifest.json',
  openGraph: {
    title: 'Mathandelsagenten',
    description: 'Planera, handla och laga smartare med AI-stöd',
    locale: 'sv_SE',
    type: 'website',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="sv" data-scroll-behavior="smooth">
      <head>
        {/* Tema-script — körs innan render för att undvika flash */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('theme');
            if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
            else if (t === 'light') document.documentElement.setAttribute('data-theme', 'light');
          } catch(e) {}
        ` }} />
        {/* Google Fonts — Playfair Display + Inter */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;1,400&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ paddingTop: '56px' }}>
        <Navbar />
        <SWRProvider>{children}</SWRProvider>
        <CookieBanner />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
