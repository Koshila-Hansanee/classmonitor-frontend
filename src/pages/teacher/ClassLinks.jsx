import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getTeacherCourses } from '../../firebase/firestore'
import Badge from '../../components/shared/Badge'

export function ClassLinks() {
  const { user } = useAuth()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTeacherCourses(user.uid).then((data) => {
      setCourses(data)
      setLoading(false)
    })
  }, [user])

  if (loading) {
    return <div className="wrap"><div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text2)' }}>Loading...</div></div>
  }

  return (
    <div className="wrap">
      <div className="page-header">
        <div><h2>Class Links</h2><p>Zoom links for your courses</p></div>
      </div>

      {courses.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text2)' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📹</div>
          <div style={{ fontWeight: 700 }}>No courses have been created yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Create a course from "My Courses" and its Zoom link will appear here automatically.</div>
        </div>
      ) : (
        <>
          {courses[0]?.zoomLink && (
            <div style={{ borderRadius: 16, padding: '14px 16px', background: 'linear-gradient(135deg,#1D4ED8,#2563EB)', color: '#fff', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📹</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800 }}>{courses[0].name} — Live Session</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{courses[0].schedule}</div>
              </div>
              <a href={courses[0].zoomLink} target="_blank" rel="noreferrer"
                style={{ background: '#fff', color: '#1D4ED8', padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                Join Now
              </a>
            </div>
          )}

          <div className="table-container">
            <div className="table-header"><span style={{ fontSize: 14, fontWeight: 700 }}>Your Courses</span></div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: 'var(--surface2)' }}>
                {['Course', 'Day / Time', 'Zoom Link', 'Status'].map((h) => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{courses.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '11px 14px', fontWeight: 600, fontSize: 13 }}>{c.name}</td>
                  <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--text2)' }}>{c.schedule || '—'}</td>
                  <td style={{ padding: '11px 14px', fontSize: 13 }}>
                    {c.zoomLink ? (
                      <a href={c.zoomLink} target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>{c.zoomLink}</a>
                    ) : (
                      <span style={{ color: 'var(--text3)' }}>No link set</span>
                    )}
                  </td>
                  <td style={{ padding: '11px 14px' }}><Badge type="Active" /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}