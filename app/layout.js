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
      <body style={{ paddingBottom: '70px' }}>
        {children}
        <Navbar />
      </body>
    </html>
  )
}
