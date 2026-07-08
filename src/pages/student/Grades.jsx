import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getStudentGrades } from '../../firebase/firestore'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

function gradeColor(s) {
  if (s >= 90) return 'var(--green)'
  if (s >= 80) return 'var(--blue)'
  if (s >= 70) return 'var(--yellow)'
  return 'var(--red)'
}

function gradeBg(s) {
  if (s >= 90) return 'var(--green-bg)'
  if (s >= 80) return 'var(--blue-bg)'
  if (s >= 70) return 'var(--yellow-bg)'
  return 'var(--red-bg)'
}

export default function Grades() {
  const { profile } = useAuth()
  const [grades, setGrades]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('All')
  const [terms, setTerms]     = useState([])

  useEffect(() => {
    const load = async () => {
      if (!profile?.studentId) { setLoading(false); return }
      const data = await getStudentGrades(profile.studentId)
      setGrades(data)

      // Get unique terms
      const uniqueTerms = [...new Set(data.map((g) => g.term).filter(Boolean))]
      setTerms(uniqueTerms)
      setLoading(false)
    }
    load()
  }, [profile])

  const filtered = filter === 'All' ? grades : grades.filter((g) => g.term === filter)

  // Calculate overall average
  const avgScore = grades.length > 0
    ? Math.round(grades.reduce((sum, g) => sum + g.score, 0) / grades.length)
    : 0

  // Best subject
  const bestGrade = grades.length > 0
    ? grades.reduce((best, g) => g.score > best.score ? g : best, grades[0])
    : null

  // Chart data — scores over time by subject
  const chartData = filtered.map((g) => ({
    subject: g.subject?.substring(0, 8) || '—',
    score:   g.score,
    term:    g.term,
  }))

  if (loading) {
    return (
      <div className="wrap">
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text2)' }}>
          Loading grades...
        </div>
      </div>
    )
  }

  return (
    <div className="wrap">
      <div className="page-header">
        <div>
          <h2>My Grades</h2>
          <p>Student ID: {profile?.studentId || '—'}</p>
        </div>
        {avgScore > 0 && (
          <span
            className={`badge ${avgScore >= 90 ? 'badge-green' : avgScore >= 80 ? 'badge-blue' : avgScore >= 70 ? 'badge-yellow' : 'badge-red'}`}
            style={{ padding: '7px 16px', fontSize: 13 }}
          >
            Avg: {avgScore}%
          </span>
        )}
      </div>

      {grades.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text2)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>No grades yet</div>
          <div style={{ fontSize: 13 }}>
            Your teacher hasn't uploaded grades yet.<br />
            Make sure your Student ID is correct: <strong>{profile?.studentId}</strong>
          </div>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
            <div className="metric-card">
              <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Overall Average</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: gradeColor(avgScore) }}>{avgScore}%</div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3 }}>{grades.length} subjects</div>
            </div>
            <div className="metric-card">
              <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Best Subject</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)', letterSpacing: '-.3px' }}>{bestGrade?.subject || '—'}</div>
              <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 3 }}>{bestGrade?.grade} · {bestGrade?.score}%</div>
            </div>
            <div className="metric-card">
              <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Terms</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--primary)' }}>{terms.length}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3 }}>recorded</div>
            </div>
          </div>

          {/* Score chart */}
          {chartData.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Score Overview</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 14 }}>Your scores across subjects</div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="subject" tick={{ fontSize: 10, fill: '#8898A4' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#8898A4' }} tickFormatter={(v) => v + '%'} />
                  <Tooltip formatter={(v) => [v + '%', 'Score']} />
                  <Line type="monotone" dataKey="score" stroke="#7C3AED" strokeWidth={2.5} dot={{ fill: '#7C3AED', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Grade bars */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Subject Grades</div>
              {terms.length > 0 && (
                <select
                  className="form-input"
                  style={{ width: 140, padding: '5px 10px', fontSize: 12 }}
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="All">All Terms</option>
                  {terms.map((t) => <option key={t}>{t}</option>)}
                </select>
              )}
            </div>
            {filtered.map((g, i) => (
              <div key={g.id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 130, fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{g.subject}</div>
                <div style={{ flex: 1, background: 'var(--border)', borderRadius: 3, height: 8 }}>
                  <div style={{ width: g.score + '%', background: gradeColor(g.score), height: '100%', borderRadius: 3, transition: 'width .4s' }} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: gradeColor(g.score), minWidth: 42, textAlign: 'right' }}>{g.score}%</div>
                <div style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: gradeBg(g.score), color: gradeColor(g.score), minWidth: 30, textAlign: 'center' }}>
                  {g.grade}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', minWidth: 52 }}>{g.term}</div>
              </div>
            ))}
          </div>

          {/* Detailed table */}
          <div className="table-container">
            <div className="table-header">
              <span style={{ fontSize: 14, fontWeight: 700 }}>Full Grade Report</span>
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>{filtered.length} records</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface2)' }}>
                  {['Subject', 'Grade', 'Score', 'Term', 'Status'].map((h) => (
                    <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((g, i) => (
                  <tr key={g.id || i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600 }}>{g.subject}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontWeight: 800, fontSize: 15, color: gradeColor(g.score) }}>{g.grade}</span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 60, background: 'var(--border)', borderRadius: 3, height: 5 }}>
                          <div style={{ width: g.score + '%', background: gradeColor(g.score), height: '100%', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{g.score}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--text2)' }}>{g.term}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <span className={`badge ${g.score >= 75 ? 'badge-green' : 'badge-red'}`}>
                        {g.score >= 75 ? 'Pass' : 'Fail'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}