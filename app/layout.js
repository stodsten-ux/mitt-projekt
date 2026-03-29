import './globals.css'
import { Playfair_Display, Inter } from 'next/font/google'
import Navbar from '../components/Navbar'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['400', '600', '700'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

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
    <html lang="sv" className={`${playfair.variable} ${inter.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('theme');
            if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
            else if (t === 'light') document.documentElement.setAttribute('data-theme', 'light');
          } catch(e) {}
        ` }} />
      </head>
      <body style={{ paddingTop: '56px' }}>
        <Navbar />
        {children}
      </body>
    </html>
  )
}
