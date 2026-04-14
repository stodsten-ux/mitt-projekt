import Skeleton from '../Skeleton'

export default function RecipeDetailSkeleton() {
  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }}>
      {/* Back link */}
      <Skeleton width="60px" height="14px" style={{ marginBottom: '16px' }} />

      {/* Title + description */}
      <Skeleton width="70%" height="28px" style={{ marginBottom: '10px' }} />
      <Skeleton width="90%" height="14px" style={{ marginBottom: '6px' }} />
      <Skeleton width="75%" height="14px" style={{ marginBottom: '28px' }} />

      {/* Metadata row */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
        <Skeleton width="140px" height="32px" borderRadius="8px" />
        <Skeleton width="120px" height="32px" borderRadius="8px" />
        <Skeleton width="100px" height="32px" borderRadius="8px" />
      </div>

      {/* Save standard button */}
      <Skeleton width="200px" height="32px" borderRadius="8px" style={{ marginBottom: '20px' }} />

      {/* Rating section */}
      <div style={{ marginBottom: '28px' }}>
        <Skeleton width="80px" height="14px" style={{ marginBottom: '10px' }} />
        <div style={{ display: 'flex', gap: '8px' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} width="28px" height="28px" borderRadius="4px" />
          ))}
        </div>
      </div>

      {/* Ingredients section */}
      <div style={{ marginBottom: '28px' }}>
        <Skeleton width="120px" height="20px" style={{ marginBottom: '14px' }} />
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', marginBottom: '10px', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
              <Skeleton width={`${40 + i * 8}%`} height="14px" />
              <Skeleton width="60px" height="14px" />
            </div>
          ))}
        </div>
      </div>

      {/* Steps section */}
      <div style={{ marginBottom: '28px' }}>
        <Skeleton width="100px" height="20px" style={{ marginBottom: '14px' }} />
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', lineHeight: '1.8' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ marginBottom: i < 2 ? '16px' : 0 }}>
              <Skeleton width="100%" height="14px" style={{ marginBottom: '6px' }} />
              <Skeleton width="90%" height="14px" style={{ marginBottom: '6px' }} />
              <Skeleton width="85%" height="14px" />
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
        <Skeleton width="100%" height="40px" borderRadius="10px" />
        <Skeleton width="100%" height="40px" borderRadius="10px" />
        <Skeleton width="100%" height="40px" borderRadius="10px" />
      </div>
    </div>
  )
}
