import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  getTeacherCourses,
  listenClassSessions,
} from '../../firebase/firestore'

export default function LiveMonitor() {
  const { user } = useAuth()

  const [courses, setCourses] = useState([])
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [studentSessions, setStudentSessions] = useState([])

  useEffect(() => {
    // Load courses...
  }, [user])

  useEffect(() => {
    if (!selectedCourse) return
    const unsub = listenClassSessions(selectedCourse.id, setStudentSessions)
    return () => unsub()
  }, [selectedCourse])

  return (
    <div className="wrap">
      <div className="page-header">
        <h2>Student Cognitive Load Monitor</h2>
        <p>Real-time view from students' self-monitoring</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {studentSessions.map((s) => (
          <div key={s.id} className="card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700 }}>{s.studentId}</div>
            <div style={{ fontSize: 48, margin: '10px 0' }}>
              {s.cognitiveLoad || '—'}%
            </div>
            <div style={{ color: s.cognitiveLoad > 70 ? 'red' : 'green' }}>
              {s.loadLevel || 'Unknown'}
            </div>
          </div>
        ))}
      </div>

      {studentSessions.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          No students sending data yet. Students should start self-monitoring.
        </div>
      )}
    </div>
  )
}