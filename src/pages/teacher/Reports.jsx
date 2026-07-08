import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getTeacherReports } from '../../firebase/firestore'
import Badge from '../../components/shared/Badge'
import EngagementBar from '../../components/shared/EngagementBar'

export default function Reports() {
  const { user } = useAuth()
  const [reports, setReports]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedReportId, setSelectedReportId] = useState(null)

  useEffect(() => {
    getTeacherReports(user.uid).then((data) => {
      setReports(data)
      if (data.length > 0) {
        setSelectedDate(data[0].date)
        setSelectedReportId(data[0].id)
      }
      setLoading(false)
    })
  }, [user])

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatTime = (isoStr) => {
    if (!isoStr) return '—'
    return new Date(isoStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  // Unique dates, newest first (reports already come sorted from getTeacherReports)
  const dates = [...new Set(reports.map((r) => r.date))]
  const reportsForDate = reports.filter((r) => r.date === selectedDate)
  const activeReport = reports.find((r) => r.id === selectedReportId)

  if (loading) {
    return <div className="wrap"><div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text2)' }}>Loading reports...</div></div>
  }

  if (reports.length === 0) {
    return (
      <div className="wrap">
        <div className="page-header"><div><h2>Reports</h2><p>Session history and attendance records</p></div></div>
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text2)' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
          <div style={{ fontWeight: 700 }}>No reports yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Run a monitoring session from the Dashboard — a report is generated automatically when you click "Stop Monitoring".</div>
        </div>
      </div>
    )
  }

  return (
    <div className="wrap">
      <div className="page-header">
        <div><h2>Reports</h2><p>Session history and attendance records</p></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>

        {/* Date list */}
        <div className="card" style={{ padding: 12, height: 'fit-content' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10, padding: '0 6px' }}>Dates</div>
          {dates.map((date) => (
            <div key={date}
              onClick={() => {
                setSelectedDate(date)
                const first = reports.find((r) => r.date === date)
                setSelectedReportId(first?.id)
              }}
              style={{
                padding: '10px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 4,
                background: selectedDate === date ? 'var(--pl)' : 'transparent',
                color: selectedDate === date ? 'var(--primary)' : 'var(--text)',
              }}>
              {formatDate(date)}
            </div>
          ))}
        </div>

        {/* Selected date's sessions */}
        <div>
          {reportsForDate.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {reportsForDate.map((r) => (
                <button key={r.id} onClick={() => setSelectedReportId(r.id)}
                  className={r.id === selectedReportId ? 'btn-primary' : 'btn-secondary'}
                  style={{ fontSize: 12 }}>
                  {r.courseName} · {formatTime(r.startedAt)}
                </button>
              ))}
            </div>
          )}

          {activeReport && (
            <>
              <div className="page-header" style={{ marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{activeReport.courseName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                    {formatDate(activeReport.date)} · {formatTime(activeReport.startedAt)} – {formatTime(activeReport.endedAt)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
                {[
                  { label: 'Total Students', value: String(activeReport.totalStudents ?? 0), color: 'var(--text)' },
                  { label: 'Avg Engagement', value: (activeReport.avgEngagement ?? 0) + '%', color: 'var(--green)' },
                  { label: 'Present', value: String(activeReport.presentCount ?? 0), color: 'var(--blue)' },
                  { label: 'Absent', value: String(activeReport.absentCount ?? 0), color: 'var(--red)' },
                ].map((c) => (
                  <div key={c.label} className="metric-card">
                    <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>{c.label}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: c.color }}>{c.value}</div>
                  </div>
                ))}
              </div>

              <div className="table-container">
                <div className="table-header">
                  <span style={{ fontSize: 14, fontWeight: 700 }}>Student Report</span>
                </div>
                {(!activeReport.studentRecords || activeReport.studentRecords.length === 0) ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>No students were enrolled in this course at the time of the session.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: 'var(--surface2)' }}>
                      {['Student', 'Attendance', 'Engagement', 'Level'].map((h) => (
                        <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>{activeReport.studentRecords.map((s) => (
                      <tr key={s.studentId} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600 }}>{s.studentName}</td>
                        <td style={{ padding: '11px 14px' }}><Badge type={s.attendanceStatus} /></td>
                        <td style={{ padding: '11px 14px' }}><EngagementBar value={s.engagementScore} width={70} /></td>
                        <td style={{ padding: '11px 14px', fontWeight: 700, color: 'var(--purple)', fontSize: 13 }}>{s.engagementLevel}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}