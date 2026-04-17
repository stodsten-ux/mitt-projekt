'use client'

import Link from 'next/link'
import { CalendarDays, ShoppingBag, ChefHat, ChevronRight } from 'lucide-react'

const HERO_IMAGE = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80'

const BENEFITS = [
  { icon: CalendarDays, text: 'AI planerar veckan åt dig' },
  { icon: ShoppingBag, text: 'Inköpslistan skapas automatiskt' },
  { icon: ChefHat, text: 'Steg-för-steg när du lagar' },
]

const FLOW_STEPS = [
  { label: 'Planera', icon: CalendarDays, desc: 'Välj veckans rätter' },
  { label: 'Handla', icon: ShoppingBag, desc: 'Listan är klar' },
  { label: 'Laga', icon: ChefHat, desc: 'Steg för steg' },
]

const PRICING = {
  free: ['1 hushåll', '2 medlemmar', '20 recept', 'Inköpslista', 'Steg-för-steg lagning', 'Skafferi'],
  premium: ['Obegränsat', 'AI-menyförslag', '3 budgetalternativ', 'Prisjämförelse & kampanjer', 'Dietist-chat', 'Näringsinformation'],
}

export default function Landing() {
  return (
    <div style={{ paddingTop: '56px', background: 'var(--color-cream)', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>

      {/* ── Hero ── */}
      <section style={{
        background: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.60)), url(${HERO_IMAGE}) center/cover`,
        minHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: '60px 24px',
        color: '#fff',
      }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(36px, 8vw, 56px)', lineHeight: 1.15, marginBottom: '16px', maxWidth: '480px' }}>
          Veckans mat.<br />Klar på en minut.
        </h1>
        <p style={{ fontSize: '17px', opacity: 0.88, marginBottom: '36px', maxWidth: '340px', lineHeight: 1.6 }}>
          Planera, handla och laga — allt på ett ställe. Gratis.
        </p>
        <Link href="/auth/register" style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'var(--color-terracotta)', color: '#fff',
          padding: '16px 32px', borderRadius: '12px',
          textDecoration: 'none', fontSize: '16px', fontWeight: '700',
          boxShadow: '0 4px 20px rgba(196,98,45,0.45)',
        }}>
          Prova gratis <ChevronRight size={18} />
        </Link>
      </section>

      {/* ── Tre fördelar ── */}
      <section style={{ padding: '48px 20px' }}>
        <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '8px', scrollSnapType: 'x mandatory' }}>
          {BENEFITS.map(({ icon: Icon, text }) => (
            <div key={text} style={{
              flex: '0 0 240px', scrollSnapAlign: 'start',
              background: '#fff', borderRadius: 'var(--radius-card)',
              padding: '24px 20px', boxShadow: 'var(--shadow-sm)',
              display: 'flex', flexDirection: 'column', gap: '12px',
            }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--color-cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={22} color="var(--color-forest)" />
              </div>
              <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-text)', lineHeight: 1.4 }}>{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Flödesillustration ── */}
      <section style={{ padding: '0 20px 48px', textAlign: 'center' }}>
        <p style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '1.5px', color: 'var(--color-muted)', textTransform: 'uppercase', marginBottom: '24px' }}>
          Så fungerar det
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {FLOW_STEPS.map(({ label, icon: Icon, desc }, i) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ background: '#fff', borderRadius: 'var(--radius-card)', padding: '20px 16px', boxShadow: 'var(--shadow-sm)', textAlign: 'center', minWidth: '90px' }}>
                <Icon size={24} color="var(--color-forest)" style={{ marginBottom: '8px' }} />
                <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-text)' }}>{label}</p>
                <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px' }}>{desc}</p>
              </div>
              {i < FLOW_STEPS.length - 1 && (
                <ChevronRight size={20} color="var(--color-sage)" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Socialt bevis ── */}
      <section style={{ padding: '0 20px 48px' }}>
        <div style={{ background: 'var(--color-forest)', borderRadius: 'var(--radius-card)', padding: '28px 24px', color: '#fff' }}>
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', lineHeight: 1.5, marginBottom: '20px', fontStyle: 'italic' }}>
            "Vi sparar 300 kr i veckan och stressar mycket mindre med maten."
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
              👨‍👩‍👧
            </div>
            <div>
              <p style={{ fontWeight: '600', fontSize: '14px' }}>Emma &amp; Jonas</p>
              <p style={{ fontSize: '13px', opacity: 0.75 }}>Barnfamilj, Göteborg</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Prissättning ── */}
      <section style={{ padding: '0 20px 48px' }}>
        <p style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '1.5px', color: 'var(--color-muted)', textTransform: 'uppercase', marginBottom: '24px', textAlign: 'center' }}>
          Välj din plan
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius-card)', padding: '24px 18px', boxShadow: 'var(--shadow-sm)' }}>
            <p style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>Gratis</p>
            <p style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-forest)', marginBottom: '20px' }}>0 kr</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {PRICING.free.map(item => (
                <li key={item} style={{ fontSize: '13px', color: 'var(--color-text)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--color-forest)', fontWeight: '700', flexShrink: 0 }}>✓</span> {item}
                </li>
              ))}
            </ul>
            <Link href="/auth/register" style={{ display: 'block', marginTop: '24px', padding: '12px', borderRadius: '10px', border: '1.5px solid var(--color-forest)', color: 'var(--color-forest)', textAlign: 'center', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
              Kom igång
            </Link>
          </div>
          <div style={{ background: 'var(--color-forest)', borderRadius: 'var(--radius-card)', padding: '24px 18px', boxShadow: 'var(--shadow-md)' }}>
            <p style={{ fontWeight: '700', fontSize: '16px', color: '#fff', marginBottom: '4px' }}>Premium</p>
            <p style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-sage)', marginBottom: '20px' }}>99 kr<span style={{ fontSize: '13px', fontWeight: '500', opacity: 0.8 }}>/mån</span></p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {PRICING.premium.map(item => (
                <li key={item} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.9)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--color-sage)', fontWeight: '700', flexShrink: 0 }}>✓</span> {item}
                </li>
              ))}
            </ul>
            <Link href="/auth/register" style={{ display: 'block', marginTop: '24px', padding: '12px', borderRadius: '10px', background: 'var(--color-terracotta)', color: '#fff', textAlign: 'center', textDecoration: 'none', fontWeight: '700', fontSize: '14px' }}>
              Prova 30 dagar gratis
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section style={{ padding: '48px 20px 80px', textAlign: 'center', background: '#fff' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(24px, 6vw, 36px)', color: 'var(--color-text)', marginBottom: '20px', lineHeight: 1.3 }}>
          Börja den bästa<br />matkassen du haft.
        </h2>
        <Link href="/auth/register" style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'var(--color-terracotta)', color: '#fff',
          padding: '16px 28px', borderRadius: '12px',
          textDecoration: 'none', fontSize: '15px', fontWeight: '700',
        }}>
          Skapa konto — det tar 2 minuter <ChevronRight size={16} />
        </Link>
      </section>

    </div>
  )
}
