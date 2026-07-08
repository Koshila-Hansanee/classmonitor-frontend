import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { validateSchoolCode, createSchoolCode } from '../firebase/firestore'

export default function Login() {
  const { login, signup } = useAuth()
  const navigate = useNavigate()

  const [role, setRole]       = useState('teacher')
  const [tab, setTab]         = useState('in')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm]       = useState({
    name: '', email: '', password: '',
    schoolCode: '', studentId: '', schoolName: ''
  })

  const isStudent   = role === 'student'
  const accentColor = isStudent ? '#7C3AED' : '#1A6BE8'
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async () => {
    setError('')

    // Basic validation
    if (!form.email.trim())    { setError('Please enter your email'); return }
    if (!form.password.trim()) { setError('Please enter your password'); return }

    if (tab === 'up') {
      if (!form.name.trim())       { setError('Please enter your name'); return }
      if (!form.schoolCode.trim()) { setError('Please enter your school code'); return }
      if (!isStudent && !form.schoolName.trim()) { setError('Please enter your school name'); return }
      if (isStudent && !form.studentId.trim())   { setError('Please enter your student ID'); return }
    }

    setLoading(true)
    try {
      if (tab === 'in') {
        // ── SIGN IN ──
        await login(form.email, form.password, role)
        navigate(role === 'teacher' ? '/teacher/dashboard' : '/student/home')

      } else if (role === 'teacher') {
        // ── TEACHER SIGN UP ──
        // 1. Create account
        await signup(form.email, form.password, form.name, 'teacher', {
          schoolCode: form.schoolCode.toUpperCase().trim(),
          schoolName: form.schoolName.trim(),
        })
        // 2. Now authenticated — create school code
        await createSchoolCode(
          form.schoolCode,
          form.schoolName.trim(),
          form.email
        )
        navigate('/teacher/dashboard')

      } else {
        // ── STUDENT SIGN UP ──
        // 1. Create account with school code
        await signup(form.email, form.password, form.name, 'student', {
          schoolCode: form.schoolCode.toUpperCase().trim(),
          schoolName: '',
          studentId:  form.studentId.trim(),
        })

        // 2. Now authenticated — get school name from code
        try {
          const schoolData = await validateSchoolCode(form.schoolCode)
          // Update school name in profile
          const { updateUserProfile } = await import('../firebase/firestore')
          const { auth } = await import('../firebase/config')
          if (auth.currentUser) {
            await updateUserProfile(auth.currentUser.uid, {
              schoolName: schoolData.schoolName,
            })
          }
        } catch (e) {
          // School code not found — warn but continue
          console.warn('School code not found:', e.message)
        }

        navigate('/student/home')
      }

    } catch (e) {
      console.error('Auth error:', e)
      const msg = e.message || ''
      if (msg.includes('email-already-in-use')) {
        setError('This email is already registered. Please sign in instead.')
      } else if (msg.includes('weak-password')) {
        setError('Password must be at least 6 characters.')
      } else if (msg.includes('invalid-email')) {
        setError('Please enter a valid email address.')
      } else {
        setError(msg.replace('Firebase: ', '').replace(/\(.*\)/, '').trim() || 'Something went wrong. Please try again.')
      }
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* Left panel */}
      <div style={{ flex: 1, background: '#0F1923', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <div style={{ maxWidth: 340, width: '100%' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 10 }}>
            ◆ ClassMonitor AI
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 10, letterSpacing: '-.4px' }}>
            Smart Classroom Intelligence Platform
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, marginBottom: 28 }}>
            Real-time engagement tracking, attendance, grades, and AI-powered analytics for your school.
          </p>

          {/* Role selector */}
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 12 }}>
            Select your role
          </div>
          {[
            { key: 'teacher', icon: '🎓', title: 'Teacher', desc: 'Create courses, monitor class & upload grades' },
            { key: 'student', icon: '📚', title: 'Student', desc: 'View courses, attendance & grades' },
          ].map((r) => (
            <div key={r.key} onClick={() => { setRole(r.key); setError('') }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, borderRadius: 16, padding: '12px 14px', marginBottom: 10, cursor: 'pointer', transition: 'all .15s',
                border: '1px solid ' + (role === r.key ? accentColor : 'rgba(255,255,255,0.12)'),
                background: role === r.key ? accentColor + '22' : 'transparent' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: accentColor + '30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                {r.icon}
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{r.title}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 }}>{r.desc}</div>
              </div>
            </div>
          ))}

          {/* School code info box */}
          <div style={{ marginTop: 20, background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>
              🏫 How School Codes Work
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
              <div>👨‍🏫 <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Teachers</strong> create the school code when signing up first</div>
              <div style={{ marginTop: 4 }}>👨‍🎓 <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Students</strong> use the same code shared by their school</div>
              <div style={{ marginTop: 4 }}>📱 Share the code via WhatsApp or notice board</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ width: 440, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, background: '#fff', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.3px', marginBottom: 4 }}>
            {tab === 'in'
              ? (isStudent ? 'Student Sign In' : 'Teacher Sign In')
              : (isStudent ? 'Student Sign Up' : 'Teacher Sign Up')}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>
            {tab === 'in'
              ? 'Sign in to your account'
              : isStudent
                ? 'Join your school on ClassMonitor'
                : 'Set up your teacher account'}
          </p>

          {/* Tabs */}
          <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 10, padding: 3, marginBottom: 20 }}>
            {[['in', 'Sign In'], ['up', 'Sign Up']].map(([k, label]) => (
              <button key={k} onClick={() => { setTab(k); setError('') }}
                style={{ flex: 1, padding: '7px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all .15s',
                  background: tab === k ? '#fff' : 'transparent',
                  color: tab === k ? 'var(--text)' : 'var(--text2)',
                  boxShadow: tab === k ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Email */}
          <div style={{ marginBottom: 12 }}>
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="you@school.edu"
              value={form.email} onChange={set('email')} />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 12 }}>
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="Enter password"
              value={form.password} onChange={set('password')} />
          </div>

          {/* Sign up extra fields */}
          {tab === 'up' && (
            <>
              {/* Full name */}
              <div style={{ marginBottom: 12 }}>
                <label className="form-label">Full Name</label>
                <input className="form-input" type="text" placeholder="Your full name"
                  value={form.name} onChange={set('name')} />
              </div>

              {/* School code */}
              <div style={{ marginBottom: 12 }}>
                <label className="form-label">School Code</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder={isStudent ? 'Enter code from your school' : 'Create a unique code (e.g. STANTHONYS2024)'}
                  value={form.schoolCode}
                  onChange={(e) => setForm((f) => ({ ...f, schoolCode: e.target.value.toUpperCase().replace(/\s/g, '') }))}
                  style={{ textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}
                />
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                  {isStudent
                    ? '🔑 Get this code from your teacher or school notice board'
                    : '🔑 Create a unique code for your school. Share with all students & teachers.'}
                </div>
              </div>

              {/* School name — teacher only */}
              {!isStudent && (
                <div style={{ marginBottom: 12 }}>
                  <label className="form-label">School / Institution Name</label>
                  <input className="form-input" type="text"
                    placeholder="e.g. St. Anthony's College"
                    value={form.schoolName} onChange={set('schoolName')} />
                </div>
              )}

              {/* Student ID — student only */}
              {isStudent && (
                <div style={{ marginBottom: 12 }}>
                  <label className="form-label">Student ID</label>
                  <input className="form-input" type="text"
                    placeholder="e.g. STU-2024-001"
                    value={form.studentId} onChange={set('studentId')} />
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                    Your official student ID from your school
                  </div>
                </div>
              )}

              {/* Info box */}
              <div style={{ marginBottom: 14, padding: '10px 12px', background: isStudent ? 'var(--purple-bg)' : 'var(--pl)', borderRadius: 8, fontSize: 12, color: isStudent ? 'var(--purple)' : 'var(--primary)', lineHeight: 1.6 }}>
                {isStudent ? (
                  <>📌 You need the school code from your teacher before signing up.</>
                ) : (
                  <>📌 You are creating a new school code. Share <strong>{form.schoolCode || 'YOUR CODE'}</strong> with your students and colleagues.</>
                )}
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div style={{ fontSize: 12, color: 'var(--red)', background: 'var(--red-bg)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, lineHeight: 1.5 }}>
              ❌ {error}
            </div>
          )}

          {/* Submit */}
          <button onClick={handleSubmit} disabled={loading}
            style={{ width: '100%', padding: 13, background: accentColor, color: '#fff', borderRadius: 12, fontWeight: 800, fontSize: 14, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Please wait...' : tab === 'in' ? 'Sign In →' : 'Create Account →'}
          </button>
        </div>
      </div>
    </div>
  )
}