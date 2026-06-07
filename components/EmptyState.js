export default function EmptyState({
  icon: Icon,
  title,
  children,
  primaryAction,
  secondaryAction,
  style,
}) {
  return (
    <section className="empty-state" style={style}>
      {Icon && (
        <div className="empty-state-icon" aria-hidden="true">
          <Icon size={26} />
        </div>
      )}
      <h2 className="empty-state-title">{title}</h2>
      {children && <p className="empty-state-text">{children}</p>}
      {(primaryAction || secondaryAction) && (
        <div className="empty-state-actions">
          {primaryAction}
          {secondaryAction}
        </div>
      )}
    </section>
  )
}
