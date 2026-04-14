import Skeleton from '../Skeleton'

export default function ShoppingSkeleton() {
  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }}>
      {/* Title */}
      <Skeleton width="160px" height="28px" style={{ marginBottom: '28px' }} />

      {/* Summary bar */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
        <Skeleton width="100px" height="14px" />
        <Skeleton width="80px" height="14px" />
      </div>

      {/* Category label */}
      <Skeleton width="80px" height="12px" style={{ marginBottom: '10px' }} />

      {/* Item rows — large touch targets (60px) */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', marginBottom: '8px' }}>
          <Skeleton width="28px" height="28px" borderRadius="8px" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <Skeleton width={`${45 + (i % 3) * 15}%`} height="15px" />
          </div>
          <Skeleton width="50px" height="13px" />
        </div>
      ))}
    </div>
  )
}
