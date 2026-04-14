import Skeleton from '../Skeleton'

export default function PantrySkeleton() {
  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }}>
      {/* Title */}
      <Skeleton width="140px" height="28px" style={{ marginBottom: '28px' }} />

      {/* Ingredient cards */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <Skeleton width="50%" height="15px" style={{ marginBottom: '6px' }} />
            <Skeleton width="30%" height="13px" />
          </div>
          <Skeleton width="60px" height="13px" />
        </div>
      ))}
    </div>
  )
}
