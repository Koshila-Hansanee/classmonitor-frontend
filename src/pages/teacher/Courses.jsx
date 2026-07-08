import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { createCourse, getTeacherCourses, updateCourse, deleteCourse } from '../../firebase/firestore'
import Badge from '../../components/shared/Badge'

const GRADES = [
  'Grade 1','Grade 2','Grade 3','Grade 4','Grade 5',
  'Grade 6','Grade 7','Grade 8','Grade 9','Grade 10',
  'Grade 11','Grade 12','Year 1','Year 2','Year 3','Year 4'
]

const EMPTY_FORM = { name: '', subject: '', targetGrade: '', schedule: '', zoomLink: '', description: '', enrollKeyword: '' }

export default function TeacherCourses() {
  const { user, profile } = useAuth()
  const [courses, setCourses]   = useState([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm]         = useState(EMPTY_FORM)

  const refresh = () => getTeacherCourses(user.uid).then(setCourses)

  useEffect(() => { refresh() }, [user])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const startCreate = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowForm(true)
  }

  const startEdit = (c) => {
    setForm({
      name: c.name || '', subject: c.subject || '', targetGrade: c.targetGrade || '',
      schedule: c.schedule || '', zoomLink: c.zoomLink || '', description: c.description || '',
      enrollKeyword: c.enrollKeyword || '',
    })
    setEditingId(c.id)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim())          { alert('Course name is required'); return }
    if (!form.targetGrade)          { alert('Please select a grade'); return }
    if (!form.enrollKeyword.trim()) { alert('Enrollment keyword is required'); return }

    setLoading(true)
    try {
      const payload = { ...form, enrollKeyword: form.enrollKeyword.toUpperCase().trim() }

      if (editingId) {
        await updateCourse(editingId, payload)
      } else {
        await createCourse({
          ...payload,
          teacherId:   user.uid,
          teacherName: profile?.name || 'Teacher',
          schoolCode:  profile?.schoolCode || '',
          schoolName:  profile?.schoolName || '',
        })
      }

      setForm(EMPTY_FORM)
      setEditingId(null)
      setShowForm(false)
      await refresh()
    } catch (e) {
      alert('Error: ' + e.message)
    }
    setLoading(false)
  }

  const handleDelete = async (course) => {
    const studentCount = course.enrolledStudents?.length || 0
    const warning = studentCount > 0
      ? `"${course.name}" has ${studentCount} enrolled student(s). Deleting it will remove the course but their past attendance/report records will be kept. Delete anyway?`
      : `Delete "${course.name}"? This cannot be undone.`
    if (!window.confirm(warning)) return

    try {
      await deleteCourse(course.id)
      await refresh()
    } catch (e) {
      alert('Error: ' + e.message)
    }
  }

  return (
    <div className="wrap">
      <div className="page-header">
        <div>
          <h2>My Courses</h2>
          <p>School: {profile?.schoolName || '—'} · Code: {profile?.schoolCode || '—'}</p>
        </div>
        <button className="btn-primary" onClick={showForm ? () => setShowForm(false) : startCreate}>
          {showForm ? 'Close' : '+ New Course'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
            {editingId ? 'Edit Course' : 'Create New Course'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="form-label">Course Name *</label>
              <input className="form-input" placeholder="e.g. Grade 5 Sinhala" value={form.name} onChange={set('name')} />
            </div>
            <div>
              <label className="form-label">Subject *</label>
              <input className="form-input" placeholder="e.g. Sinhala" value={form.subject} onChange={set('subject')} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="form-label">Target Grade *</label>
              <select className="form-input" value={form.targetGrade} onChange={set('targetGrade')}>
                <option value="">Select grade</option>
                {GRADES.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Schedule</label>
              <input className="form-input" placeholder="e.g. Mon, Wed · 09:00 AM" value={form.schedule} onChange={set('schedule')} />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="form-label">Zoom Link</label>
            <input className="form-input" placeholder="https://zoom.us/j/..." value={form.zoomLink} onChange={set('zoomLink')} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="form-label">Description</label>
            <input className="form-input" placeholder="Brief course description" value={form.description} onChange={set('description')} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="form-label">Enrollment Keyword *</label>
            <input
              className="form-input"
              placeholder="e.g. SINHALA5A"
              value={form.enrollKeyword}
              onChange={(e) => setForm((f) => ({ ...f, enrollKeyword: e.target.value.toUpperCase() }))}
              style={{ textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}
            />
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
              🔑 Share this keyword with your students so they can enroll in this specific course
            </div>
          </div>

          <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text2)' }}>Course Preview</div>
            <div style={{ color: 'var(--text)', marginBottom: 2 }}>🏫 {profile?.schoolName || 'Your School'} · {form.targetGrade || 'Grade —'}</div>
            <div style={{ color: 'var(--text)', marginBottom: 2 }}>📚 {form.name || 'Course Name'} — {form.subject || 'Subject'}</div>
            <div style={{ color: 'var(--primary)', fontWeight: 700 }}>🔑 Keyword: {form.enrollKeyword || 'KEYWORD'}</div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn-primary" onClick={handleSave} disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Saving...' : editingId ? 'Save Changes' : 'Create Course'}
            </button>
            <button className="btn-secondary" onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM) }}>Cancel</button>
          </div>
        </div>
      )}

      {courses.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text2)' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📚</div>
          <div style={{ fontWeight: 700 }}>No courses yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Click "New Course" to create your first course</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {courses.map((c) => (
            <div key={c.id} className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{c.targetGrade} · {c.subject}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Badge type="Active" />
                  <button onClick={() => startEdit(c)}
                    style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                    Edit
                  </button>
                  <button onClick={() => handleDelete(c)}
                    style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                    Delete
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>📅 {c.schedule || 'No schedule set'}</div>
              <div style={{ fontSize: 12, color: 'var(--blue)', marginBottom: 4 }}>🔗 {c.zoomLink || 'No link yet'}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
                👥 {c.enrolledStudents?.length || 0} students enrolled
              </div>
              <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '8px 12px', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text2)' }}>Enrollment keyword:</span>
                <span style={{ fontWeight: 800, color: 'var(--primary)', letterSpacing: '1px' }}>{c.enrollKeyword}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}