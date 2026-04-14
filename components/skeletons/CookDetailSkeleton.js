import Skeleton from '../Skeleton'

export default function CookDetailSkeleton() {
  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }}>
      {/* Recipe title + step indicator */}
      <Skeleton width="60%" height="28px" style={{ marginBottom: '8px' }} />
      <Skeleton width="120px" height="15px" style={{ marginBottom: '32px' }} />

      {/* Step card */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px 24px', marginBottom: '24px' }}>
        <Skeleton width="50px" height="13px" style={{ marginBottom: '16px' }} />
        <Skeleton width="100%" height="20px" style={{ marginBottom: '10px' }} />
        <Skeleton width="95%" height="20px" style={{ marginBottom: '10px' }} />
        <Skeleton width="80%" height="20px" />
      </div>

      {/* Timer block */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Skeleton width="48px" height="48px" borderRadius="50%" />
        <div style={{ flex: 1 }}>
          <Skeleton width="80px" height="14px" style={{ marginBottom: '6px' }} />
          <Skeleton width="50px" height="12px" />
        </div>
      </div>

      {/* Navigation buttons */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <Skeleton width="50%" height="48px" borderRadius="10px" />
        <Skeleton width="50%" height="48px" borderRadius="10px" />
      </div>
    </div>
  )
}
