'use client'

import Link from 'next/link'
import { House, Pencil, Sparkles } from 'lucide-react'

export default function HouseholdCard({ household, preferences, householdId, role }) {
  if (!household) return null

  const name = household.display_name || household.name
  const tags = [
    ...(preferences?.allergies || []),
    ...(preferences?.diet_preferences || []),
    ...(preferences?.disliked_foods?.map(f => `Utan ${f}`) || []),
  ].slice(0, 4)

  return (
    <Link
      href={`/household/${householdId}`}
      className="household-card"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', fontSize: 'var(--text-lg)', fontWeight: '600', marginBottom: 'var(--space-xs)', color: 'var(--text)' }}>
            <House size={18} aria-hidden="true" />
            {name}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginBottom: tags.length ? 'var(--space-10)' : 0 }}>
            {household.adults} vuxna · {household.children} barn · {household.weekly_budget} kr/vecka
          </p>
          {tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
              {tags.map(tag => (
                <span key={tag} style={{ background: 'var(--bg)', border: 'var(--border-width-sm) solid var(--border)', borderRadius: 'var(--radius-full)', padding: 'var(--space-3xs) var(--space-10)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginLeft: 'var(--space-lg)', flexShrink: 0 }}>
          {role && (
            <span className={`role-badge ${role === 'admin' ? 'role-badge--admin' : 'role-badge--member'}`}>
              {role === 'admin' ? 'Admin' : 'Medlem'}
            </span>
          )}
          <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 'var(--space-32)', height: 'var(--space-32)' }}>
            <Pencil size={16} aria-hidden="true" />
          </span>
        </div>
      </div>
      {tags.length > 0 && (
        <p style={{ marginTop: 'var(--space-10)', fontSize: 'var(--text-xs)', color: 'var(--success)', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2xs)' }}>
          <Sparkles size={13} aria-hidden="true" />
          Dina preferenser används för AI-förslag
        </p>
      )}
    </Link>
  )
}
