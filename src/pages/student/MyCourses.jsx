import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  getCoursesBySchool,
  getStudentEnrollments,
  enrollStudentWithKeyword,
} from '../../firebase/firestore'
import TeacherProfileModal from '../../components/shared/TeacherProfileModal'

export default function MyCourses() {
  const { user, profile } = useAuth()

  const [allCourses, setAllCourses]   = useState([])
  const [enrolledIds, setEnrolledIds] = useState([])
  const [loading, setLoading]         = useState(true)
  const [enrolling, setEnrolling]     = useState(null)
  const [keyword, setKeyword]         = useState('')
  const [search, setSearch]           = useState('')
  const [gradeFilter, setGradeFilter] = useState('All')
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')
  const [viewingTeacherId, setViewingTeacherId] = useState(null)

  useEffect(() => {
    const load = async () => {
      if (!profile?.schoolCode) { setLoading(false); return }
      const [courses, enrollments] = await Promise.all([
        getCoursesBySchool(profile.schoolCode),
        getStudentEnrollments(user.uid),
      ])
      setAllCourses(courses)
      setEnrolledIds(enrollments.map((e) => e.courseId))
      setLoading(false)
    }
    load()
  }, [user, profile])

  // Get unique grades from courses
  const grades = ['All', ...new Set(allCourses.map((c) => c.targetGrade).filter(Boolean))]

  // Filter courses by search + grade
  const filtered = allCourses.filter((c) => {
    const matchSearch = search === '' ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.subject?.toLowerCase().includes(search.toLowerCase()) ||
      c.teacherName?.toLowerCase().includes(search.toLowerCase())
    const matchGrade = gradeFilter === 'All' || c.targetGrade === gradeFilter
    return matchSearch && matchGrade
  })

  const enrolled  = filtered.filter((c) => enrolledIds.includes(c.id))
  const available = filtered.filter((c) => !enrolledIds.includes(c.id))

  const handleEnroll = async (course) => {
    setError('')
    setSuccess('')
    if (!keyword.trim()) { setError('Please enter the enrollment keyword'); return }
    setLoading(true)
    try {
      await enrollStudentWithKeyword(course.id, user.uid, keyword)
      setEnrolledIds((prev) => [...prev, course.id])
      setSuccess('Successfully enrolled in ' + course.name)
      setEnrolling(null)
      setKeyword('')
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="wrap">
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text2)' }}>
          Loading courses...
        </div>
      </div>
    )
  }

  if (!profile?.schoolCode) {
    return (
      <div className="wrap">
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text2)' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🏫</div>
          <div style={{ fontWeight: 700 }}>No school code found</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Please complete your profile with your school code</div>
        </div>
      </div>
    )
  }

  return (
    <div className="wrap">
      <div className="page-header">
        <div>
          <h2>My Courses</h2>
          <p>🏫 {profile?.schoolName || profile?.schoolCode} · {profile?.grade || ''}</p>
        </div>
        <span className="badge badge-purple" style={{ padding: '7px 16px', fontSize: 13 }}>
          {enrolledIds.length} enrolled
        </span>
      </div>

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--text3)' }}>🔍</span>
          <input
            className="form-input"
            placeholder="Search courses, subjects or teachers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 38 }}
          />
        </div>
        <select
          className="form-input"
          style={{ width: 160 }}
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
        >
          {grades.map((g) => <option key={g}>{g}</option>)}
        </select>
      </div>

      {success && (
        <div style={{ background: 'var(--green-bg)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>
          ✅ {success}
        </div>
      )}

      {/* Enrolled courses */}
      {enrolled.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            ✅ Enrolled Courses
            <span className="badge badge-green">{enrolled.length}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {enrolled.map((c) => (
              <div key={c.id} className="card" style={{ borderLeft: '4px solid #7C3AED' }}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: 'var(--purple)', fontWeight: 600, marginBottom: 8 }}>
                  {c.targetGrade} · {c.subject}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 3 }}>📅 {c.schedule || 'Schedule TBA'}</div>
                <div
  onClick={() => setViewingTeacherId(c.teacherId)}
  style={{ fontSize: 12, color: 'var(--primary)', marginBottom: 10, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2, width: 'fit-content' }}
>
  👨‍🏫 {c.teacherName}
</div>
                {c.zoomLink ? (
                  <a href={c.zoomLink} target="_blank" rel="noreferrer"
                    style={{ display: 'inline-block', background: '#1D4ED8', color: '#fff', padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                    📹 Join Class
                  </a>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>No Zoom link yet</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available courses */}
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        📚 Available Courses
        <span className="badge badge-blue">{available.length}</span>
        <TeacherProfileModal teacherId={viewingTeacherId} onClose={() => setViewingTeacherId(null)} />
      </div>

      {available.length === 0 && enrolled.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text2)' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
          <div style={{ fontWeight: 700 }}>No courses found</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            {search ? 'Try a different search term' : 'No courses available for your school yet'}
          </div>
        </div>
      ) : available.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text2)' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
          <div style={{ fontWeight: 700 }}>You are enrolled in all available courses!</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {available.map((c) => (
            <div key={c.id} className="card">
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, marginBottom: 8 }}>
                {c.targetGrade} · {c.subject}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 3 }}>📅 {c.schedule || 'Schedule TBA'}</div>
              <div
  onClick={() => setViewingTeacherId(c.teacherId)}
  style={{ fontSize: 12, color: 'var(--primary)', marginBottom: 10, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2, width: 'fit-content' }}
>
  👨‍🏫 {c.teacherName}
</div>

              {enrolling === c.id ? (
                <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                    🔑 Enter enrollment keyword from your teacher:
                  </div>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Enrollment keyword"
                    value={keyword}
                    onChange={(e) => { setKeyword(e.target.value.toUpperCase()); setError('') }}
                    style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}
                    autoFocus
                  />
                  {error && (
                    <div style={{ fontSize: 11, color: 'var(--red)', marginBottom: 8 }}>❌ {error}</div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleEnroll(c)}
                      disabled={loading}
                      style={{ background: '#7C3AED', color: '#fff', padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
                      {loading ? 'Enrolling...' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => { setEnrolling(null); setKeyword(''); setError('') }}
                      style={{ background: 'var(--surface)', color: 'var(--text)', padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1px solid var(--border2)', cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setEnrolling(c.id); setError(''); setSuccess('') }}
                  style={{ background: 'var(--pl)', color: 'var(--primary)', padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, border: '1px solid rgba(26,107,232,0.2)', cursor: 'pointer' }}>
                  + Enroll in Course
                </button>
              )}
            </div>
          ))}
        </div>
        
      )}
    </div>
  )
}