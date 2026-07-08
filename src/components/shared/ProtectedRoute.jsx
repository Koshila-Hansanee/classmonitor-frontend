import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ children, allowedRole }) {
  const { user, role, profile } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (allowedRole && role !== allowedRole) {
    return <Navigate to={role === 'teacher' ? '/teacher/dashboard' : '/student/home'} replace />
  }
  if (role === 'student' && profile && !profile.profileComplete && window.location.pathname !== '/student/complete-profile') {
    return <Navigate to="/student/complete-profile" replace />
  }
  return children
}
