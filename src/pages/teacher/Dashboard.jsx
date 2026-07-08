import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import Badge from '../../components/shared/Badge'
import EngagementBar from '../../components/shared/EngagementBar'
import {
  getTeacherCourses,
  getCourseEnrollments,
  listenCourseAttendance,
  listenClassSessions,
  startSession,
  endSession,
  saveSessionReport,
  markAttendance,
} from '../../firebase/firestore'

export default function Dashboard() {
  const { user, profile } = useAuth()

  const [courses, setCourses]             = useState([])
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [loadingCourses, setLoadingCourses] = useState(true)

  const [sessionActive, setSessionActive] = useState(false)
  const [sessionId, setSessionId]         = useState(null)
  const [seconds, setSeconds]             = useState(0)
  const [savingReport, setSavingReport]   = useState(false)
  const [reportSavedMsg, setReportSavedMsg] = useState('')

  const [enrollments, setEnrollments]         = useState([])
  const [attendanceDocs, setAttendanceDocs]   = useState([])
  const [studentSessions, setStudentSessions] = useState([])

  const timerRef  = useRef(null)
  const unsubAttendanceRef = useRef(null)
  const unsubSessionsRef   = useRef(null)

  // Dashboard always starts clean on load/login — no stale mock data,
  // no leftover report shown here (reports live on the Reports page).
  useEffect(() => {
    setLoadingCourses(true)
    getTeacherCourses(user.uid).then((data) => {
      setCourses(data)
      if (data.length > 0) setSelectedCourse(data[0])
      setLoadingCourses(false)
    })
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (unsubAttendanceRef.current) unsubAttendanceRef.current()
      if (unsubSessionsRef.current) unsubSessionsRef.current()
    }
  }, [user])

  const fmt = (s) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')

  const startMonitoring = async () => {
    if (!selectedCourse) return
    setReportSavedMsg('')

    const roster = await getCourseEnrollments(selectedCourse.id)
    setEnrollments(roster)

    const sid = await startSession(user.uid, selectedCourse.id, selectedCourse.name)
    setSessionId(sid)
    setSeconds(0)
    setSessionActive(true)

    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)

    unsubAttendanceRef.current = listenCourseAttendance(selectedCourse.id, sid, setAttendanceDocs)
unsubSessionsRef.current   = listenClassSessions(selectedCourse.id, sid, setStudentSessions)
  }

  const stopMonitoring = async () => {
    setSavingReport(true)
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }

    const today = new Date().toISOString().split('T')[0]
    const presentCount = attendanceDocs.filter((a) => a.status === 'Present').length
    const absentCount  = enrollments.length - presentCount
    const engagedScores = studentSessions.map((s) => s.engagementScore || 0)
    const avgEngagement = engagedScores.length > 0
      ? Math.round(engagedScores.reduce((a, b) => a + b, 0) / engagedScores.length)
      : 0
    const breakdown = { engaged: 0, neutral: 0, distracted: 0 }
    studentSessions.forEach((s) => {
      if (s.engagementLevel === 'Engaged') breakdown.engaged++
      else if (s.engagementLevel === 'Neutral') breakdown.neutral++
      else if (s.engagementLevel === 'Distracted') breakdown.distracted++
    })

    const studentRecords = enrollments.map((e) => {
      const att = attendanceDocs.find((a) => a.studentId === e.studentId)
      const live = studentSessions.find((s) => s.studentId === e.studentId)
      return {
        studentId: e.studentId,
        studentName: e.studentName || e.studentId,
        attendanceStatus: att?.status || 'Absent',
        engagementScore: live?.engagementScore || 0,
        engagementLevel: live?.engagementLevel || 'Neutral',
      }
    })

    if (sessionId) {
      await endSession(sessionId, { durationSeconds: seconds, presentCount, avgEngagement })
      await saveSessionReport({
        teacherId: user.uid,
        teacherName: profile?.name || 'Teacher',
        courseId: selectedCourse.id,
        courseName: selectedCourse.name,
        date: today,
        startedAt: new Date(Date.now() - seconds * 1000).toISOString(),
        endedAt: new Date().toISOString(),
        durationSeconds: seconds,
        totalStudents: enrollments.length,
        presentCount,
        absentCount,
        avgEngagement,
        engagementBreakdown: breakdown,
        studentRecords,
      })
    }

    if (unsubAttendanceRef.current) { unsubAttendanceRef.current(); unsubAttendanceRef.current = null }
    if (unsubSessionsRef.current)   { unsubSessionsRef.current();   unsubSessionsRef.current = null }

    // Reset dashboard completely — ready for the next class.
    setSessionActive(false)
    setSessionId(null)
    setSeconds(0)
    setEnrollments([])
    setAttendanceDocs([])
    setStudentSessions([])
    setSavingReport(false)
    setReportSavedMsg('Session report saved — view it on the Reports page.')
  }

  const overrideAttendance = async (studentId, newStatus) => {
    await markAttendance(studentId, selectedCourse.id, newStatus, 'teacher_override')
  }

  const presentCount = attendanceDocs.filter((a) => a.status === 'Present').length
  const absentCount  = enrollments.length - presentCount
  const avgEngagement = studentSessions.length > 0
    ? Math.round(studentSessions.reduce((sum, s) => sum + (s.engagementScore || 0), 0) / studentSessions.length)
    : 0

  if (loadingCourses) {
    return <div className="wrap"><div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text2)' }}>Loading dashboard...</div></div>
  }

  return (
    <div className="wrap">
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>{sessionActive ? `Session active — ${fmt(seconds)}` : 'No active session'}</p>
        </div>

        {!sessionActive && courses.length > 0 && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select
              value={selectedCourse?.id || ''}
              onChange={(e) => setSelectedCourse(courses.find((c) => c.id === e.target.value))}
              className="form-input"
              style={{ minWidth: 200 }}
            >
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button onClick={startMonitoring}
              style={{ background: 'var(--green)', color: '#fff', padding: '9px 20px', borderRadius: 10, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
              ▶ Start Monitoring
            </button>
          </div>
        )}

        {sessionActive && (
          <button onClick={stopMonitoring} disabled={savingReport}
            style={{ background: 'var(--red)', color: '#fff', padding: '9px 20px', borderRadius: 10, fontWeight: 700, fontSize: 13, border: 'none', cursor: savingReport ? 'not-allowed' : 'pointer', opacity: savingReport ? 0.7 : 1 }}>
            {savingReport ? 'Saving report...' : '⏹ Stop Monitoring'}
          </button>
        )}
      </div>

      {reportSavedMsg && (
        <div style={{ marginBottom: 16, background: 'var(--green-bg)', border: '1px solid rgba(22,163,74,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>
          ✅ {reportSavedMsg}
        </div>
      )}

      {sessionActive && studentSessions.some((s) => s.status === 'offline') && (
  <div style={{ marginBottom: 16, background: 'var(--red-bg)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--red)', fontWeight: 600 }}>
    ⚠ {studentSessions.filter((s) => s.status === 'offline').length} student(s) left the session:{' '}
    {studentSessions.filter((s) => s.status === 'offline').map((s) => s.studentName || s.studentId).join(', ')}
  </div>
)}

      {courses.length === 0 && (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text2)' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📚</div>
          <div style={{ fontWeight: 700 }}>No courses yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Create a course first from "My Courses" to start monitoring.</div>
        </div>
      )}

      {!sessionActive && courses.length > 0 && (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text2)' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>▶</div>
          <div style={{ fontWeight: 700 }}>Ready when you are</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Pick a course above and click "Start Monitoring" to begin a live session.</div>
        </div>
      )}

      {sessionActive && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
            {[
              { label: 'Total Students', value: String(enrollments.length), color: 'var(--text)', sub: selectedCourse?.name || '' },
              { label: 'Avg Engagement', value: avgEngagement + '%', color: 'var(--green)', sub: studentSessions.length + ' online' },
              { label: 'Present', value: String(presentCount), color: 'var(--blue)', sub: `${presentCount} of ${enrollments.length}` },
              { label: 'Absent', value: String(Math.max(absentCount, 0)), color: 'var(--red)', sub: 'Needs review' },
            ].map((c) => (
              <div key={c.label} className="metric-card">
                <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>{c.label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: c.color, letterSpacing: '-.5px' }}>{c.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3 }}>{c.sub}</div>
              </div>
            ))}
          </div>

          <div className="table-container">
            <div className="table-header">
              <span style={{ fontSize: 14, fontWeight: 700 }}>Student Roster — Live</span>
            </div>
            {enrollments.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>
                No students enrolled in this course yet.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--surface2)' }}>
                    {['Student', 'Verification', 'Attendance', 'Session Status', 'Engagement', 'Score', 'Override'].map((h) => (
                      <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((e) => {
                    const att = attendanceDocs.find((a) => a.studentId === e.studentId)
                    const live = studentSessions.find((s) => s.studentId === e.studentId)
                    const status = att?.status || 'Pending'
                    return (
                      <tr key={e.studentId} style={{ borderBottom: '1px solid var(--border)' }}>
  <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600 }}>{e.studentName || e.studentId}</td>
  <td style={{ padding: '11px 14px' }}>
    {live?.isVerified ? (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>
        ✓ Verified
      </span>
    ) : (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: 'var(--red)' }}>
        ✗ Not Verified
      </span>
    )}
  </td>
  <td style={{ padding: '11px 14px' }}><Badge type={status === 'Pending' ? 'Late' : status} /></td>
<td style={{ padding: '11px 14px' }}>
  {!live ? (
    <span style={{ fontSize: 12, color: 'var(--text2)' }}>Not joined</span>
  ) : live.status === 'online' ? (
    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>● In Session</span>
  ) : (
    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)' }}>⚠ Left Session</span>
  )}
</td>
<td style={{ padding: '11px 14px' }}><EngagementBar value={live?.engagementScore || 0} /></td>
                        <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text2)' }}>{live?.engagementLevel || '—'}</td>
                        <td style={{ padding: '11px 14px' }}>
                          {status !== 'Present' && (
                            <button onClick={() => overrideAttendance(e.studentId, 'Present')}
                              style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', background: 'var(--green-bg)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', marginRight: 6 }}>
                              Mark Present
                            </button>
                          )}
                          {status !== 'Absent' && (
                            <button onClick={() => overrideAttendance(e.studentId, 'Absent')}
                              style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)', background: 'var(--red-bg)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
                              Mark Absent
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}