import Skeleton from '../Skeleton'

export default function CookSkeleton() {
  return (
    <div className="page">
      {/* Title */}
      <div style={{ marginBottom: '28px' }}>
        <Skeleton width="100px" height="28px" style={{ marginBottom: '8px' }} />
        <Skeleton width="250px" height="15px" />
      </div>

      {/* Section label */}
      <Skeleton width="100px" height="12px" style={{ marginBottom: '10px' }} />

      {/* Menu recipe rows */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', marginBottom: '8px', overflow: 'hidden', display: 'flex' }}>
          <Skeleton width="80px" height="72px" borderRadius="0" style={{ flexShrink: 0 }} />
          <div style={{ padding: '14px 16px', flex: 1 }}>
            <Skeleton width="40%" height="11px" style={{ marginBottom: '6px' }} />
            <Skeleton width="65%" height="15px" style={{ marginBottom: '4px' }} />
            <Skeleton width="50%" height="13px" />
          </div>
        </div>
      ))}

      {/* All recipes grid label */}
      <Skeleton width="100px" height="12px" style={{ margin: '24px 0 10px' }} />

      {/* Recipe grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <Skeleton width="100%" height="140px" borderRadius="0" />
            <div style={{ padding: '14px 16px' }}>
              <Skeleton width="75%" height="15px" style={{ marginBottom: '6px' }} />
              <Skeleton width="55%" height="13px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
