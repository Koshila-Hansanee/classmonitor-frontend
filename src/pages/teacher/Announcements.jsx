import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getTeacherCourses, postAnnouncement, listenCourseAnnouncements, deleteAnnouncement, updateAnnouncement } from '../../firebase/firestore'
import Badge from '../../components/shared/Badge'

export default function Announcements() {
  const { user } = useAuth()
  const [courses, setCourses] = useState([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [list, setList] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', type: 'General' })
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    getTeacherCourses(user.uid).then((data) => {
      setCourses(data)
      if (data.length > 0) setSelectedCourse(data[0].id)
    })
  }, [user])

  useEffect(() => {
    if (!selectedCourse) return
    const unsub = listenCourseAnnouncements(selectedCourse, setList)
    return () => unsub()
  }, [selectedCourse])

  const post = async () => {
  if (!form.title.trim() || !form.body.trim() || !selectedCourse) return
  setLoading(true)
  try {
    if (editingId) {
      await updateAnnouncement(editingId, { title: form.title, body: form.body, type: form.type })
    } else {
      const course = courses.find((c) => c.id === selectedCourse)
      await postAnnouncement({ ...form, courseId: selectedCourse, courseName: course?.name || '', author: user.displayName || 'Teacher', authorId: user.uid })
    }
    setForm({ title: '', body: '', type: 'General' })
    setEditingId(null)
    setShowForm(false)
  } catch (e) { alert('Error: ' + e.message) }
  setLoading(false)
}

const startEdit = (a) => {
  setForm({ title: a.title, body: a.body, type: a.type })
  setEditingId(a.id)
  setShowForm(true)
}

  const remove = async (id) => {
    if (window.confirm('Delete this announcement?')) await deleteAnnouncement(id)
  }

  const formatDate = (ts) => {
    if (!ts) return 'Just now'
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="wrap">
      <div className="page-header">
        <div><h2>Announcements</h2><p>Post updates visible to enrolled students</p></div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>+ New Announcement</button>
      </div>

      {courses.length > 1 && (
        <div style={{ marginBottom: 16 }}>
          <label className="form-label">Select Course</label>
          <select className="form-input" style={{ maxWidth: 300 }} value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>New Announcement</div>
          <div style={{ marginBottom: 12 }}>
            <label className="form-label">Title</label>
            <input className="form-input" placeholder="Announcement title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label className="form-label">Message</label>
            <textarea className="form-input" rows={3} placeholder="Write your message..." value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <select className="form-input" style={{ width: 160 }} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {['General', 'Assignment', 'Exam', 'Reminder'].map((t) => <option key={t}>{t}</option>)}
            </select>
            <button className="btn-primary" onClick={post} disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
  {loading ? 'Saving...' : editingId ? 'Save Changes' : 'Post'}
</button>
<button className="btn-secondary" onClick={() => { setShowForm(false); setEditingId(null); setForm({ title: '', body: '', type: 'General' }) }}>Cancel</button>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text2)' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📢</div>
          <div style={{ fontWeight: 700 }}>No announcements yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Click "New Announcement" to post your first one</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((a) => (
            <div key={a.id} className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{a.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                   <Badge type={a.type} />
<button onClick={() => startEdit(a)} style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
<button onClick={() => remove(a.id)} style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                </div>
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
