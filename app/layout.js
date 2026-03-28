import './globals.css'
import Navbar from '../components/Navbar'

export const metadata = {
  title: 'Mathandelsagenten',
  description: 'Planera mat, recept och inköp för hela familjen',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }) {
  return (
    <html lang="sv">
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
