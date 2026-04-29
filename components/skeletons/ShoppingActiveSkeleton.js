import Skeleton from '../Skeleton'

export default function ShoppingActiveSkeleton() {
  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 16px 80px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <Skeleton width="80px" height="12px" style={{ marginBottom: '6px' }} />
          <Skeleton width="140px" height="17px" />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Skeleton width="42px" height="42px" borderRadius="10px" />
          <Skeleton width="70px" height="42px" borderRadius="10px" />
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <Skeleton width="130px" height="14px" />
          <Skeleton width="30px" height="13px" />
        </div>
        <Skeleton width="100%" height="8px" borderRadius="4px" />
      </div>

      {/* Category groups × 2 */}
      {[4, 3].map((count, gi) => (
        <div key={gi} style={{ marginBottom: '20px' }}>
          {/* Category header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', marginBottom: '8px' }}>
            <Skeleton width="20px" height="20px" borderRadius="4px" />
            <Skeleton width="90px" height="13px" />
            <div style={{ flex: 1 }} />
            <Skeleton width="30px" height="13px" />
          </div>

          {/* Item rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                minHeight: '64px', padding: '14px 16px',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: '12px',
              }}>
                <Skeleton width="26px" height="26px" borderRadius="50%" style={{ flexShrink: 0 }} />
                <Skeleton width={`${40 + (i % 3) * 15}%`} height="16px" style={{ flex: 1 }} />
                <Skeleton width="40px" height="14px" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
