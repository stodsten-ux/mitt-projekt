'use client'

import Link from 'next/link'

export default function HouseholdCard({ household, preferences, householdId }) {
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
      style={{ display: 'block', textDecoration: 'none', color: 'var(--text)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', marginBottom: '24px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '17px', fontWeight: '600', marginBottom: '4px' }}>🏠 {name}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: tags.length ? '10px' : 0 }}>
            {household.adults} vuxna · {household.children} barn · {household.weekly_budget} kr/vecka
          </p>
          {tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {tags.map(tag => (
                <span key={tag} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '16px', marginLeft: '12px', flexShrink: 0 }}>✏️</span>
      </div>
      {tags.length > 0 && (
        <p style={{ marginTop: '10px', fontSize: '12px', color: 'var(--success)', fontWeight: '500' }}>
          ✨ Dina preferenser används för AI-förslag
        </p>
      )}
    </Link>
  )
}
