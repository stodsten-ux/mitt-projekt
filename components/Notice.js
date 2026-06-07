'use client'

const toneStyles = {
  error: {
    background: 'rgba(217,79,59,0.08)',
    border: 'var(--danger)',
    color: 'var(--danger)',
  },
  success: {
    background: 'rgba(52,199,89,0.08)',
    border: 'var(--success)',
    color: 'var(--success)',
  },
  neutral: {
    background: 'var(--bg-card)',
    border: 'var(--border)',
    color: 'var(--text)',
  },
}

export default function Notice({ type = 'neutral', children, style = {}, role }) {
  const tone = toneStyles[type] || toneStyles.neutral

  return (
    <div
      role={role || (type === 'error' ? 'alert' : 'status')}
      style={{
        background: tone.background,
        border: `1px solid ${tone.border}`,
        borderRadius: '10px',
        padding: '12px 16px',
        marginBottom: '18px',
        fontSize: '14px',
        color: tone.color,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
