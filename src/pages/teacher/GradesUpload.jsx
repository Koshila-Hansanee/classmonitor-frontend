import { useState, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { uploadGrades, getTeacherCourses } from '../../firebase/firestore'
import { useEffect } from 'react'
import Badge from '../../components/shared/Badge'

export default function GradesUpload() {
  const { user } = useAuth()
  const fileRef = useRef(null)

  const [courses, setCourses]     = useState([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [term, setTerm]           = useState('Term 1')
  const [preview, setPreview]     = useState([])
  const [fileName, setFileName]   = useState('')
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess]     = useState('')
  const [error, setError]         = useState('')
  const [uploadedCount, setUploadedCount] = useState(0)

  useEffect(() => {
    getTeacherCourses(user.uid).then((data) => {
      setCourses(data)
      if (data.length > 0) setSelectedCourse(data[0].id)
    })
  }, [user])

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)
    setError('')
    setSuccess('')
    setPreview([])

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const text = evt.target.result
        const rows = text.trim().split('\n')
        const headers = rows[0].toLowerCase().split(',').map((h) => h.trim())

        // Validate headers
        const required = ['studentid', 'subject', 'grade', 'score']
        const missing  = required.filter((r) => !headers.includes(r))
        if (missing.length > 0) {
          setError(`Missing columns: ${missing.join(', ')}. Required: studentId, subject, grade, score`)
          return
        }

        const data = rows.slice(1).map((row) => {
          const values = row.split(',').map((v) => v.trim())
          const obj    = {}
          headers.forEach((h, i) => { obj[h] = values[i] || '' })
          return {
            studentId: obj['studentid'] || obj['student_id'] || '',
            subject:   obj['subject']   || '',
            grade:     obj['grade']     || '',
            score:     Number(obj['score']) || 0,
            term:      obj['term']      || term,
          }
        }).filter((r) => r.studentId && r.subject)

        setPreview(data)
      } catch (e) {
        setError('Failed to parse CSV file. Please check the format.')
      }
    }
    reader.readAsText(file)
  }

  const handleUpload = async () => {
    if (preview.length === 0) { setError('No data to upload'); return }
    if (!selectedCourse)      { setError('Please select a course'); return }

    setUploading(true)
    setError('')
    setSuccess('')

    try {
      await uploadGrades(preview, user.uid, preview[0]?.subject || 'General', term)
      setUploadedCount(preview.length)
      setSuccess(`✅ Successfully uploaded grades for ${preview.length} students!`)
      setPreview([])
      setFileName('')
      if (fileRef.current) fileRef.current.value = ''
    } catch (e) {
      setError('Upload failed: ' + e.message)
    }
    setUploading(false)
  }

  const gradeColor = (score) => {
    if (score >= 90) return 'var(--green)'
    if (score >= 80) return 'var(--blue)'
    if (score >= 70) return 'var(--yellow)'
    return 'var(--red)'
  }

  const downloadTemplate = () => {
    const csv = 'studentId,subject,grade,score,term\nSTU-2024-001,Mathematics,A,92,Term 1\nSTU-2024-002,Mathematics,B+,81,Term 1\nSTU-2024-003,Mathematics,B,74,Term 1'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'grades_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="wrap">
      <div className="page-header">
        <div>
          <h2>Upload Grades</h2>
          <p>Upload student grades via CSV file</p>
        </div>
        <button className="btn-secondary" onClick={downloadTemplate}>
          ⬇ Download Template
        </button>
      </div>

      {/* Upload settings */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Upload Settings</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label className="form-label">Course</label>
            <select className="form-input" value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Term / Semester</label>
            <select className="form-input" value={term} onChange={(e) => setTerm(e.target.value)}>
              {['Term 1', 'Term 2', 'Term 3', 'Semester 1', 'Semester 2', 'Final'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* File upload area */}
        <div
          onClick={() => fileRef.current?.click()}
          style={{ border: '2px dashed var(--border2)', borderRadius: 12, padding: '32px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all .15s', background: fileName ? 'var(--green-bg)' : 'var(--surface2)' }}
        >
          <div style={{ fontSize: 36, marginBottom: 10 }}>{fileName ? '📄' : '📂'}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: fileName ? 'var(--green)' : 'var(--text)' }}>
            {fileName || 'Click to select CSV file'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
            {fileName ? `${preview.length} students found` : 'Supports .csv files only'}
          </div>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
        </div>

        {/* CSV format hint */}
        <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '10px 14px', marginTop: 12, fontSize: 12, color: 'var(--text2)' }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Required CSV format:</div>
          <code style={{ fontSize: 11, color: 'var(--primary)' }}>
            studentId, subject, grade, score, term
          </code>
          <div style={{ marginTop: 2 }}>
            Example: <code style={{ fontSize: 11 }}>STU-2024-001, Mathematics, A, 92, Term 1</code>
          </div>
        </div>
      </div>

      {/* Error / Success */}
      {error && (
        <div style={{ background: 'var(--red-bg)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: 'var(--red)', fontWeight: 600 }}>
          ❌ {error}
        </div>
      )}
      {success && (
        <div style={{ background: 'var(--green-bg)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>
          {success}
        </div>
      )}

      {/* Preview table */}
      {preview.length > 0 && (
        <div className="table-container" style={{ marginBottom: 16 }}>
          <div className="table-header">
            <span style={{ fontSize: 14, fontWeight: 700 }}>Preview — {preview.length} students</span>
            <button onClick={handleUpload} disabled={uploading}
              style={{ background: 'var(--primary)', color: '#fff', padding: '8px 20px', borderRadius: 8, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', opacity: uploading ? 0.7 : 1 }}>
              {uploading ? 'Uploading...' : `⬆ Upload ${preview.length} Records`}
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface2)' }}>
                {['Student ID', 'Subject', 'Grade', 'Score', 'Term'].map((h) => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600 }}>{row.studentId}</td>
                  <td style={{ padding: '11px 14px', fontSize: 13 }}>{row.subject}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ fontWeight: 800, color: gradeColor(row.score), fontSize: 14 }}>{row.grade}</span>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 60, background: 'var(--border)', borderRadius: 3, height: 5 }}>
                        <div style={{ width: row.score + '%', background: gradeColor(row.score), height: '100%', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{row.score}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--text2)' }}>{row.term}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* How to guide */}
      {preview.length === 0 && !success && (
        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>How to Upload Grades</div>
          {[
            ['1️⃣', 'Download the template', 'Click "Download Template" button above'],
            ['2️⃣', 'Fill in your grades', 'Add each student\'s ID, subject, grade letter, and score'],
            ['3️⃣', 'Save as CSV', 'Save the file as .csv format'],
            ['4️⃣', 'Upload here', 'Click the upload area and select your file'],
            ['5️⃣', 'Review and confirm', 'Check the preview then click Upload'],
          ].map(([icon, title, desc]) => (
            <div key={title} style={{ display: 'flex', gap: 14, marginBottom: 14, alignItems: 'flex-start' }}>
              <div style={{ fontSize: 20, flexShrink: 0 }}>{icon}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}