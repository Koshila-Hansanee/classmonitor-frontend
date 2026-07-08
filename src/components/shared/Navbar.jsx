import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const teacherLinks = [
  { to: '/teacher/profile', label: 'My Profile' },
  { to: '/teacher/dashboard',     label: 'Dashboard' },
  { to: '/teacher/courses',       label: 'My Courses' },
  { to: '/teacher/announcements', label: 'Announcements' },
  { to: '/teacher/grades',        label: 'Upload Grades' },
  { to: '/teacher/links',         label: 'Class Links' },
  { to: '/teacher/reports',       label: 'Reports' },
]

const studentLinks = [
  { to: '/student/home',          label: 'Home' },
  { to: '/student/monitor',       label: '🔴 Join Class' },
  { to: '/student/attendance',    label: 'Attendance' },
  { to: '/student/grades',        label: 'Grades' },
  { to: '/student/announcements', label: 'Announcements' },
  { to: '/student/courses',       label: 'My Courses' },
  
]

export default function Navbar() {
  const { role, logout } = useAuth()
  const navigate = useNavigate()
  const links = role === 'teacher' ? teacherLinks : studentLinks
  const isStudent = role === 'student'

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <nav style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', height: 52, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 3, position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)', marginRight: 16, letterSpacing: '-.3px' }}>
        ◆ ClassMonitor AI
      </div>
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          style={({ isActive }) => ({
            padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            textDecoration: 'none', border: '1px solid transparent', transition: 'all .15s',
            background: isActive ? (isStudent ? '#EDE9FE' : '#EBF2FF') : 'transparent',
            color: isActive ? (isStudent ? '#7C3AED' : '#1A6BE8') : '#4A5568',
            borderColor: isActive ? (isStudent ? 'rgba(124,58,237,0.2)' : 'rgba(26,107,232,0.2)') : 'transparent',
          })}
        >
          {l.label}
        </NavLink>
      ))}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 99, padding: '4px 12px' }}>
          <span>{isStudent ? '📚' : '🎓'}</span>
          <span style={{ color: isStudent ? '#7C3AED' : '#1A6BE8' }}>{isStudent ? 'Student' : 'Teacher'}</span>
        </div>
        <button onClick={handleLogout} style={{ fontSize: 12, fontWeight: 600, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', borderRadius: 8 }}>
          Sign Out
        </button>
      </div>
    </nav>
  )
}
