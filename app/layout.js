import './globals.css'

export const metadata = {
  title: 'Mitt Projekt',
  description: 'Min Next.js PWA-app',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }) {
  return (
    <html lang="sv">
      <body>{children}</body>
    </html>
  )
}
