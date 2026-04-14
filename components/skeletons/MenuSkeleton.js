import Skeleton from '../Skeleton'

export default function MenuSkeleton() {
  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }}>
      {/* Title */}
      <Skeleton width="180px" height="28px" style={{ marginBottom: '32px' }} />

      {/* Week navigation bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 20px', marginBottom: '20px' }}>
        <Skeleton width="48px" height="36px" borderRadius="8px" />
        <Skeleton width="120px" height="16px" />
        <Skeleton width="48px" height="36px" borderRadius="8px" />
      </div>

      {/* 7 day rows */}
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', marginBottom: '8px' }}>
          <Skeleton width="76px" height="14px" borderRadius="4px" />
          <Skeleton width="55%" height="14px" borderRadius="4px" />
        </div>
      ))}
    </div>
  )
}
