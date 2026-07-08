import { useState, useEffect } from 'react'
import { getUserProfile } from '../../firebase/firestore'

export default function TeacherProfileModal({ teacherId, onClose }) {
  const [teacher, setTeacher] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!teacherId) return
    getUserProfile(teacherId).then((data) => {
      setTeacher(data)
      setLoading(false)
    })
  }, [teacherId])

  if (!teacherId) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{ width: 420, maxWidth: '90vw', position: 'relative' }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 12, right: 12, background: 'none', border: 'none',
            fontSize: 18, cursor: 'pointer', color: 'var(--text2)', lineHeight: 1,
          }}
        >
          ✕
        </button>

        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text2)' }}>Loading...</div>
        ) : !teacher ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text2)' }}>Teacher profile not found.</div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, fontWeight: 800, color: 'var(--text2)',
              }}>
                {teacher.photoURL ? (
                  <img src={teacher.photoURL} alt={teacher.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  (teacher.name || 'T').charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800 }}>{teacher.name || 'Teacher'}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>{teacher.schoolName || ''}</div>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>Email</div>
              <div style={{ fontSize: 13 }}>{teacher.email || '—'}</div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>Education Qualifications</div>
              <div style={{ fontSize: 13, whiteSpace: 'pre-line', lineHeight: 1.5 }}>
                {teacher.qualifications || 'Not provided yet.'}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}