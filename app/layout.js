import './globals.css'
import Navbar from '../components/Navbar'
import ModeSelector from '../components/ModeSelector'

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
    <html lang="sv">
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
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ paddingTop: '104px' }}>
        <Navbar />
        <ModeSelector />
        {children}
      </body>
    </html>
  )
}
