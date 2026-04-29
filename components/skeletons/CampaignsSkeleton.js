import Skeleton from '../Skeleton'

export default function CampaignsSkeleton() {
  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }}>
      {/* Back link */}
      <Skeleton width="90px" height="14px" style={{ marginBottom: '16px' }} />

      {/* Title */}
      <Skeleton width="260px" height="24px" style={{ marginBottom: '6px' }} />

      {/* Subtitle */}
      <Skeleton width="320px" height="14px" style={{ marginBottom: '28px' }} />

      {/* Week selector pills */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[100, 90, 90, 95].map((w, i) => (
          <Skeleton key={i} width={`${w}px`} height="36px" borderRadius="20px" />
        ))}
      </div>

      {/* Store selector */}
      <div style={{ marginBottom: '20px' }}>
        <Skeleton width="60px" height="12px" style={{ marginBottom: '10px' }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {[70, 50, 80, 55, 65].map((w, i) => (
            <Skeleton key={i} width={`${w}px`} height="34px" borderRadius="20px" />
          ))}
        </div>
      </div>

      {/* Search button */}
      <Skeleton width="100%" height="48px" borderRadius="10px" style={{ marginBottom: '28px' }} />

      {/* Result placeholder cards */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '16px', marginBottom: '12px',
        }}>
          <Skeleton width="120px" height="16px" style={{ marginBottom: '12px' }} />
          <Skeleton width="90%" height="14px" style={{ marginBottom: '6px' }} />
          <Skeleton width="70%" height="14px" />
        </div>
      ))}
    </div>
  )
}
