import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

/**
 * Kontextuell "nästa steg"-banner.
 * Visas längst ned i en vy när ett flödessteg är slutfört.
 *
 * Props:
 *   text  — string, ex. "Menyn är klar"
 *   cta   — string, ex. "Skapa inköpslistan"
 *   href  — string, sida att navigera till
 */
export default function NextStepBanner({ text, cta, href }) {
  return (
    <div style={{
      position: 'sticky',
      bottom: '72px', // över bottom nav (56px) + lite luft
      left: 0, right: 0,
      margin: '0 -16px', // bryt ut ur page-padding
      background: 'var(--color-forest)',
      padding: '14px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      zIndex: 50,
      borderTop: '1px solid rgba(255,255,255,0.1)',
    }}>
      <p style={{ color: 'rgba(255,255,255,0.80)', fontSize: '13px', margin: 0 }}>{text}</p>
      <Link
        href={href}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'var(--color-terracotta)', color: '#fff',
          padding: '9px 16px', borderRadius: '8px',
          textDecoration: 'none', fontSize: '13px', fontWeight: '700',
          whiteSpace: 'nowrap', flexShrink: 0,
        }}
      >
        {cta} <ChevronRight size={14} />
      </Link>
    </div>
  )
}
