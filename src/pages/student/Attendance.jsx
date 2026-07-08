import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getStudentEnrollments, getStudentReports } from '../../firebase/firestore'
import Badge from '../../components/shared/Badge'

export default function Attendance() {
  const { user } = useAuth()
  const [enrollments, setEnrollments] = useState([])
  const [records, setRecords]         = useState([]) // one row per class session, built from reports
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!user?.uid) { setLoading(false); return }

      const enrollData = await getStudentEnrollments(user.uid)
      setEnrollments(enrollData)

      const courseIds = enrollData.map((e) => e.courseId)
      const reports = await getStudentReports(courseIds)

      // Each report is one class session across all its enrolled students.
      // Pull out just this student's own record from each one.
      const myRecords = reports
        .map((r) => {
          const mine = r.studentRecords?.find((s) => s.studentId === user.uid)
          if (!mine) return null
          return {
            id: r.id,
            courseName: r.courseName,
            date: r.date,
            startedAt: r.startedAt,
            endedAt: r.endedAt,
            status: mine.attendanceStatus,
            engagementScore: mine.engagementScore,
            engagementLevel: mine.engagementLevel,
          }
        })
        .filter(Boolean)

      setRecords(myRecords)
      setLoading(false)
    }
    load()
  }, [user])

  const present = records.filter((r) => r.status === 'Present').length
  const absent  = records.filter((r) => r.status === 'Absent').length
  const total   = records.length
  const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatTime = (isoStr) => {
    if (!isoStr) return '—'
    return new Date(isoStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  if (loading) {
    return <div className="wrap"><div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text2)' }}>Loading attendance...</div></div>
  }

  return (
    <div className="wrap">
      <div className="page-header">
        <div><h2>My Attendance</h2><p>Attendance and engagement per completed class</p></div>
        <span className="badge badge-green" style={{ padding: '7px 16px', fontSize: 13 }}>
          {attendanceRate}% Present
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Present', value: present, color: 'var(--green)' },
          { label: 'Absent',  value: absent,  color: 'var(--red)' },
          { label: 'Total Classes', value: total, color: 'var(--text)' },
        ].map((c) => (
          <div key={c.label} className="metric-card">
            <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="table-container">
        <div className="table-header">
          <span style={{ fontSize: 14, fontWeight: 700 }}>Attendance History</span>
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>{records.length} records</span>
        </div>

        {records.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text2)' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
            <div style={{ fontWeight: 700 }}>No attendance records yet</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              A record appears here once your teacher completes a monitoring session for a class you attended.
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface2)' }}>
                {['Course', 'Date', 'Time', 'Status', 'Engagement'].map((h) => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid var(--border)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600 }}>{r.courseName}</td>
                  <td style={{ padding: '11px 14px', fontSize: 13 }}>{formatDate(r.date)}</td>
                  <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text2)' }}>{formatTime(r.startedAt)} – {formatTime(r.endedAt)}</td>
                  <td style={{ padding: '11px 14px' }}><Badge type={r.status} /></td>
                  <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: r.engagementLevel === 'Engaged' ? 'var(--green)' : r.engagementLevel === 'Neutral' ? 'var(--yellow)' : 'var(--red)' }}>
                    {r.engagementScore}% · {r.engagementLevel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}