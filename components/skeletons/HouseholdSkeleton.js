import Skeleton from '../Skeleton'

export default function HouseholdSkeleton() {
  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 20px' }}>
      {/* Title */}
      <Skeleton width="160px" height="28px" style={{ marginBottom: '28px' }} />

      {/* Household cards */}
      {[0, 1, 2].map(i => (
        <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', marginBottom: '12px' }}>
          <Skeleton width="55%" height="18px" style={{ marginBottom: '8px' }} />
          <Skeleton width="35%" height="13px" style={{ marginBottom: '16px' }} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <Skeleton width="80px" height="32px" borderRadius="8px" />
            <Skeleton width="80px" height="32px" borderRadius="8px" />
          </div>
        </div>
      ))}
    </div>
  )
}
