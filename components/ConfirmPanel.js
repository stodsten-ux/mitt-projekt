'use client'

export default function ConfirmPanel({
  children,
  confirmLabel,
  cancelLabel = 'Avbryt',
  loadingLabel,
  loading = false,
  onConfirm,
  onCancel,
  style = {},
}) {
  return (
    <div
      style={{
        background: 'rgba(217,79,59,0.08)',
        border: '1px solid var(--danger)',
        borderRadius: '12px',
        padding: '16px',
        color: 'var(--text)',
        ...style,
      }}
    >
      <p style={{ fontSize: '14px', marginBottom: '12px' }}>{children}</p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onConfirm}
          disabled={loading}
          style={{ flex: 1, padding: '10px 12px', background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
        >
          {loading ? loadingLabel || confirmLabel : confirmLabel}
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          style={{ flex: 1, padding: '10px 12px', background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  )
}
