export default function Badge({ type, children }) {
  const classes = {
    High: 'badge-green', Medium: 'badge-yellow', Low: 'badge-red',
    Present: 'badge-green', Late: 'badge-yellow', Absent: 'badge-red',
    Active: 'badge-green', Upcoming: 'badge-yellow',
    Exam: 'badge-red', Assignment: 'badge-yellow', Reminder: 'badge-blue', General: 'badge-green',
  }
  return <span className={'badge ' + (classes[type] || 'badge-blue')}>{children || type}</span>
}
