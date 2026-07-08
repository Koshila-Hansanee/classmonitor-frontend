import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getStudentEnrollments, listenAllAnnouncements } from '../../firebase/firestore'
import Badge from '../../components/shared/Badge'

export default function StudentHome() {
  const { user, profile } = useAuth()
  const [enrollments, setEnrollments] = useState([])
  const [announcements, setAnnouncements] = useState([])

  useEffect(() => {
    getStudentEnrollments(user.uid).then((data) => {
      setEnrollments(data)
      if (data.length > 0) {
        const ids = data.map((e) => e.courseId)
        const unsub = listenAllAnnouncements(ids, setAnnouncements)
        return unsub
      }
    })
  }, [user])

  return (
    <div>
      {/* Hero */}
      <div style={{ background: '#0F1923', padding: '28px 24px', color: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#7C3AED,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
            {(profile?.name || 'S').charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.4px' }}>Welcome back, {profile?.name || 'Student'}!</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 3 }}>
              {profile?.grade || ''} · {profile?.school || ''} · ID: {profile?.studentId || ''}
            </p>
            <div style={{ display: 'flex', gap: 24, marginTop: 14 }}>
              {[
                [enrollments.length, 'Courses Enrolled'],
                [announcements.length, 'Announcements'],
              ].map(([v, l]) => (
                <div key={l} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{v}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.5px' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Enrolled courses */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>My Courses</div>
              <Link to="/student/courses" style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>View all →</Link>
            </div>
            {enrollments.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text2)' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📚</div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>No courses yet</div>
                <div style={{ fontSize: 12 }}>
                  <Link to="/student/courses" style={{ color: 'var(--primary)', fontWeight: 600 }}>Browse and enroll in courses →</Link>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {enrollments.map((e) => (
                  <div key={e.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{e.courseName}</div>
                      <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>👨‍🏫 {e.teacherName}</div>
                      <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 1 }}>📅 {e.schedule}</div>
                    </div>
                    {e.zoomLink ? (
                      <a href={e.zoomLink} target="_blank" rel="noreferrer"
                        style={{ background: '#1D4ED8', color: '#fff', padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>
                        Join
                      </a>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>No link</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Announcements */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Recent Announcements</div>
              <Link to="/student/announcements" style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>View all →</Link>
            </div>
            {announcements.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 32, color: 'var(--text2)' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📢</div>
                <div style={{ fontWeight: 700 }}>No announcements yet</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Enroll in courses to see announcements</div>
              </div>
            ) : (
              announcements.slice(0, 3).map((a) => (
                <div key={a.id} className="card" style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{a.title}</div>
                    <Badge type={a.type} />
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>{a.body.substring(0, 100)}...</p>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>{a.author}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
