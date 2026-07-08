import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/shared/ProtectedRoute'
import Navbar from './components/shared/Navbar'

import Login from './pages/Login'
import TeacherProfile from './pages/teacher/Profile'
import Dashboard from './pages/teacher/Dashboard'
import Announcements from './pages/teacher/Announcements'
import { ClassLinks } from './pages/teacher/ClassLinks'
import Reports from './pages/teacher/Reports'
import TeacherCourses from './pages/teacher/Courses'
import GradesUpload from './pages/teacher/GradesUpload'

import StudentHome from './pages/student/Home'
import Attendance from './pages/student/Attendance'
import Grades from './pages/student/Grades'
import StudentAnnouncements from './pages/student/Announcements'
import MyCourses from './pages/student/MyCourses'
import StudentMonitor from './pages/student/Monitor'
import CompleteProfile from './pages/student/CompleteProfile'

function Layout({ children }) {
  return <><Navbar />{children}</>
}

function T({ children }) {
  return <ProtectedRoute allowedRole="teacher"><Layout>{children}</Layout></ProtectedRoute>
}

function S({ children }) {
  return <ProtectedRoute allowedRole="student"><Layout>{children}</Layout></ProtectedRoute>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/student/complete-profile" element={<ProtectedRoute allowedRole="student"><CompleteProfile /></ProtectedRoute>} />

          <Route path="/teacher/profile" element={<T><TeacherProfile /></T>} />
          <Route path="/teacher/dashboard"     element={<T><Dashboard /></T>} />
          <Route path="/teacher/courses"       element={<T><TeacherCourses /></T>} />
          <Route path="/teacher/grades" element={<T><GradesUpload /></T>} />
          <Route path="/teacher/announcements" element={<T><Announcements /></T>} />
          <Route path="/teacher/links"         element={<T><ClassLinks /></T>} />
          <Route path="/teacher/reports"       element={<T><Reports /></T>} />

          <Route path="/student/home"          element={<S><StudentHome /></S>} />
          <Route path="/student/monitor" element={<S><StudentMonitor /></S>} />
          <Route path="/student/attendance"    element={<S><Attendance /></S>} />
          <Route path="/student/grades"        element={<S><Grades /></S>} />
          <Route path="/student/announcements" element={<S><StudentAnnouncements /></S>} />
          <Route path="/student/courses"       element={<S><MyCourses /></S>} />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
