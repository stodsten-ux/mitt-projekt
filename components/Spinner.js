export default function Spinner({ size = 'sm', color = 'currentColor' }) {
  return (
    <span
      className={size === 'lg' ? 'spinner spinner-lg' : 'spinner'}
      style={{ color }}
      aria-label="Laddar"
    />
  )
}
