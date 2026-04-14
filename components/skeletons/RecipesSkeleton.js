import Skeleton from '../Skeleton'

export default function RecipesSkeleton() {
  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }}>
      {/* Title */}
      <Skeleton width="140px" height="28px" style={{ marginBottom: '28px' }} />

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
        <Skeleton width="100px" height="36px" borderRadius="6px 6px 0 0" />
        <Skeleton width="100px" height="36px" borderRadius="6px 6px 0 0" />
      </div>

      {/* Action buttons row */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <Skeleton width="50%" height="42px" borderRadius="10px" />
        <Skeleton width="50%" height="42px" borderRadius="10px" />
      </div>

      {/* Recipe cards — single column list */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', marginBottom: '10px', overflow: 'hidden', display: 'flex', gap: '12px', padding: '12px' }}>
          <Skeleton width="64px" height="64px" borderRadius="8px" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <Skeleton width="65%" height="16px" style={{ marginBottom: '8px' }} />
            <Skeleton width="45%" height="13px" />
          </div>
        </div>
      ))}
    </div>
  )
}
