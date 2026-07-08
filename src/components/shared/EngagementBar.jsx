export default function EngagementBar({ value, width = 80 }) {
  const color = value > 75 ? 'var(--green)' : value > 50 ? 'var(--yellow)' : 'var(--red)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width, background: 'var(--border)', borderRadius: 3, height: 6 }}>
        <div style={{ width: value + '%', background: color, height: '100%', borderRadius: 3 }} />
      </div>
      <span style={{ fontWeight: 700, fontSize: 13 }}>{value}%</span>
    </div>
  )
}
