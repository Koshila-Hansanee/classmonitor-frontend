import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getStudentEnrollments, listenAllAnnouncements } from '../../firebase/firestore'
import Badge from '../../components/shared/Badge'

export default function StudentAnnouncements() {
  const { user } = useAuth()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsub = () => {}
    getStudentEnrollments(user.uid).then((enrollments) => {
      if (enrollments.length === 0) { setLoading(false); return }
      const ids = enrollments.map((e) => e.courseId)
      unsub = listenAllAnnouncements(ids, (data) => { setList(data); setLoading(false) })
    })
    return () => unsub()
  }, [user])

  const formatDate = (ts) => {
    if (!ts) return 'Just now'
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="wrap">
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text2)' }}>Loading announcements...</div>
      </div>
    )
  }

  return (
    <div className="wrap">
      <div className="page-header">
        <div>
          <h2>Announcements</h2>
          <p>Messages from your teachers</p>
        </div>
        <span className="badge badge-blue" style={{ padding: '7px 16px', fontSize: 13 }}>{list.length} announcements</span>
      </div>

      {list.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text2)' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📢</div>
          <div style={{ fontWeight: 700 }}>No announcements yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Enroll in courses to see teacher announcements</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((a) => (
            <div key={a.id} className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{a.title}</div>
                <Badge type={a.type} />
              </div>
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{a.body}</p>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 10 }}>{a.author} · {formatDate(a.createdAt)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
