import Skeleton from '../Skeleton'

export default function HouseholdDetailSkeleton() {
  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }}>
      {/* Header section */}
      <div style={{ marginBottom: '32px' }}>
        <Skeleton width="200px" height="24px" style={{ marginBottom: '8px' }} />
        <Skeleton width="280px" height="14px" style={{ marginBottom: '16px' }} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border)' }}>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} width="80px" height="16px" style={{ marginBottom: '8px' }} />
        ))}
      </div>

      {/* Profile header */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
        <Skeleton width="50%" height="24px" style={{ marginBottom: '8px' }} />
        <Skeleton width="35%" height="14px" style={{ marginBottom: '16px' }} />
        <div style={{ display: 'flex', gap: '8px' }}>
          <Skeleton width="70px" height="28px" borderRadius="20px" />
          <Skeleton width="70px" height="28px" borderRadius="20px" />
          <Skeleton width="90px" height="28px" borderRadius="20px" />
        </div>
      </div>

      {/* Settings rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Skeleton width="120px" height="15px" style={{ marginBottom: '5px' }} />
            <Skeleton width="80px" height="13px" />
          </div>
          <Skeleton width="40px" height="22px" borderRadius="11px" />
        </div>
      ))}
    </div>
  )
}
