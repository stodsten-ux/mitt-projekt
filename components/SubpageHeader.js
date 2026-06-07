'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function SubpageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  backHref = '/',
  backLabel = 'Tillbaka',
  stats = [],
  action = null,
}) {
  return (
    <header className="subpage-hero">
      <div className="subpage-topline">
        <Link href={backHref} className="subpage-back">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>{backLabel}</span>
        </Link>
        {action}
      </div>

      <div className="subpage-title-row">
        {Icon && (
          <span className="subpage-icon" aria-hidden="true">
            <Icon size={22} strokeWidth={1.8} />
          </span>
        )}
        <div className="subpage-title-copy">
          {eyebrow && <p className="subpage-eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
      </div>

      {stats.length > 0 && (
        <div className="subpage-stats" aria-label="Sidstatus">
          {stats.map(stat => (
            <div key={`${stat.label}-${stat.value}`} className="subpage-stat">
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      )}
    </header>
  )
}
