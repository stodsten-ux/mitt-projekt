import Skeleton from '../Skeleton'

export default function DashboardSkeleton() {
  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }}>
      {/* Hero */}
      <div style={{ borderRadius: '16px', padding: '32px 24px', marginBottom: '28px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <Skeleton width="40%" height="14px" style={{ marginBottom: '12px' }} />
        <Skeleton width="65%" height="28px" style={{ marginBottom: '8px' }} />
        <Skeleton width="50%" height="14px" />
      </div>

      {/* 3 mode cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px 16px' }}>
            <Skeleton width="32px" height="32px" borderRadius="50%" style={{ marginBottom: '12px' }} />
            <Skeleton width="70%" height="14px" style={{ marginBottom: '6px' }} />
            <Skeleton width="50%" height="12px" />
          </div>
        ))}
      </div>

      {/* Quick actions */}
      {[0, 1, 2].map(i => (
        <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '8px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Skeleton width="40px" height="40px" borderRadius="10px" />
          <div style={{ flex: 1 }}>
            <Skeleton width="55%" height="14px" style={{ marginBottom: '6px' }} />
            <Skeleton width="35%" height="12px" />
          </div>
        </div>
      ))}
    </div>
  )
}
