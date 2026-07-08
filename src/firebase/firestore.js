import {
  collection, addDoc, getDocs, getDoc, setDoc, updateDoc,
  deleteDoc, doc, query, where, orderBy, onSnapshot,
  serverTimestamp, arrayUnion,
} from 'firebase/firestore'
import { db } from './config'

// ANNOUNCEMENTS
export const postAnnouncement = async (data) => {
  return await addDoc(collection(db, 'announcements'), { ...data, createdAt: serverTimestamp() })
}

export const listenCourseAnnouncements = (courseId, callback) => {
  const q = query(collection(db, 'announcements'), where('courseId', '==', courseId))
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      items.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
      callback(items)
    },
    (error) => console.error('listenCourseAnnouncements failed:', error)
  )
}

export const listenAllAnnouncements = (courseIds, callback) => {
  if (!courseIds || courseIds.length === 0) { callback([]); return () => {} }
  const q = query(collection(db, 'announcements'), where('courseId', 'in', courseIds.slice(0, 10)))
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      items.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
      callback(items)
    },
    (error) => console.error('listenAllAnnouncements failed:', error)
  )
}
export const listenActiveSessionsForCourses = (courseIds, callback) => {
  if (!courseIds || courseIds.length === 0) { callback([]); return () => {} }
  const q = query(
    collection(db, 'sessions'),
    where('courseId', 'in', courseIds.slice(0, 10))
  )
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((s) => s.status === 'active')
        .sort((a, b) => (b.startTime?.toMillis?.() || 0) - (a.startTime?.toMillis?.() || 0))
      callback(items)
    },
    (err) => console.error('listenActiveSessionsForCourses failed:', err)
  )
}

export const deleteAnnouncement = async (id) => {
  return await deleteDoc(doc(db, 'announcements', id))
}
export const updateAnnouncement = async (id, data) => {
  return await updateDoc(doc(db, 'announcements', id), data)
}

// COURSES
export const createCourse = async (data) => {
  return await addDoc(collection(db, 'courses'), { ...data, enrolledStudents: [], createdAt: serverTimestamp() })
}

export const getAllCourses = async () => {
  const snap = await getDocs(collection(db, 'courses'))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}
export const updateCourse = async (id, data) => {
  return await updateDoc(doc(db, 'courses', id), data)
}

export const deleteCourse = async (id) => {
  return await deleteDoc(doc(db, 'courses', id))
}

export const getTeacherCourses = async (teacherId) => {
  const q = query(collection(db, 'courses'), where('teacherId', '==', teacherId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const enrollStudent = async (courseId, studentId, password) => {
  const ref = doc(db, 'courses', courseId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Course not found')
  const course = snap.data()
  if (course.enrollmentPassword !== password) throw new Error('Wrong enrollment password. Please check with your teacher.')
  await updateDoc(ref, { enrolledStudents: arrayUnion(studentId) })
  await setDoc(doc(db, 'enrollments', studentId + '_' + courseId), {
    studentId, courseId,
    courseName: course.name,
    teacherId: course.teacherId,
    teacherName: course.teacherName,
    subject: course.subject,
    zoomLink: course.zoomLink || '',
    schedule: course.schedule || '',
    enrolledAt: serverTimestamp(),
  })
}

export const getStudentEnrollments = async (studentId) => {
  const q = query(collection(db, 'enrollments'), where('studentId', '==', studentId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const getCourseById = async (courseId) => {
  const snap = await getDoc(doc(db, 'courses', courseId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

// GRADES
export const uploadGrades = async (gradesArray, teacherId, subject, term) => {
  const batch = gradesArray.map((g) =>
    setDoc(doc(db, 'grades', g.studentId + '_' + subject + '_' + term), {
      studentId: g.studentId, subject, term,
      grade: g.grade, score: Number(g.score),
      teacherId, updatedAt: serverTimestamp(),
    })
  )
  return await Promise.all(batch)
}

export const getStudentGrades = async (studentId) => {
  const q = query(collection(db, 'grades'), where('studentId', '==', studentId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const getTeacherGrades = async (teacherId) => {
  const q = query(collection(db, 'grades'), where('teacherId', '==', teacherId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// USERS
export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export const updateUserProfile = async (uid, data) => {
  return await updateDoc(doc(db, 'users', uid), data)
}

// ─── ATTENDANCE ──────────────────────────────────────────

export const markAttendance = async (studentId, courseId, status, sessionId) => {
  const today = new Date().toISOString().split('T')[0]
  const docId = studentId + '_' + (sessionId || 'none')
  return await setDoc(doc(db, 'attendance', docId), {
    studentId,
    courseId,
    sessionId,
    status,
    date: today,
    markedAt: serverTimestamp(),
  })
}

export const getStudentAttendance = async (studentId) => {
  const q = query(
    collection(db, 'attendance'),
    where('studentId', '==', studentId),
    orderBy('date', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const getCourseAttendance = async (courseId, date) => {
  const q = query(
    collection(db, 'attendance'),
    where('courseId', '==', courseId),
    where('date', '==', date)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const startSession = async (teacherId, courseId, courseName) => {
  // Defensive cleanup: close any stale "active" sessions left over from a
  // previous run that never got a proper Stop Monitoring click.
  const staleQ = query(
    collection(db, 'sessions'),
    where('courseId', '==', courseId),
    where('status', '==', 'active')
  )
  const staleSnap = await getDocs(staleQ)
  await Promise.all(
    staleSnap.docs.map((d) => updateDoc(doc(db, 'sessions', d.id), { status: 'completed', endTime: serverTimestamp() }))
  )

  const sessionRef = await addDoc(collection(db, 'sessions'), {
    teacherId,
    courseId,
    courseName,
    startTime: serverTimestamp(),
    endTime: null,
    status: 'active',
    date: new Date().toISOString().split('T')[0],
  })
  return sessionRef.id
}

export const endSession = async (sessionId, stats) => {
  return await updateDoc(doc(db, 'sessions', sessionId), {
    endTime: serverTimestamp(),
    status: 'completed',
    ...stats,
  })
}

export const listenCourseAttendance = (courseId, sessionId, callback) => {
  const q = query(
    collection(db, 'attendance'),
    where('courseId', '==', courseId),
    where('sessionId', '==', sessionId)
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}
// ─── FACE REGISTRATION ───────────────────────────────────

export const saveFaceDescriptor = async (userId, descriptor) => {
  return await setDoc(doc(db, 'faces', userId), {
    userId,
    descriptor: Array.from(descriptor),
    registeredAt: serverTimestamp(),
  })
}

export const getFaceDescriptor = async (userId) => {
  const snap = await getDoc(doc(db, 'faces', userId))
  return snap.exists() ? snap.data() : null
}

export const getAllFaceDescriptors = async (courseId) => {
  const enrollSnap = await getDocs(
    query(collection(db, 'enrollments'), where('courseId', '==', courseId))
  )
  const enrollments = enrollSnap.docs.map((d) => d.data())

  const faces = []
  for (const enrollment of enrollments) {
    const faceSnap = await getDoc(doc(db, 'faces', enrollment.studentId))
    if (faceSnap.exists()) {
      faces.push({
        studentId:   enrollment.studentId,
        studentName: enrollment.studentName || enrollment.studentId,
        descriptor:  new Float32Array(faceSnap.data().descriptor),
      })
    }
  }
  return faces
}

// ─── STUDENT SESSION ─────────────────────────────────────

export const studentJoinSession = async (studentId, courseId, studentName, sessionId) => {
  const today = new Date().toISOString().split('T')[0]
  return await setDoc(doc(db, 'studentSessions', studentId + '_' + sessionId), {
    studentId,
    courseId,
    sessionId,
    studentName,
    joinedAt: serverTimestamp(),
    lastSeen: serverTimestamp(),
    status: 'online',
    engagementScore: 0,
    engagementLevel: 'Neutral',
    isVerified: false,
    date: today,
  })
}

export const markStudentVerified = async (studentId, sessionId) => {
  const docId = studentId + '_' + sessionId
  return await updateDoc(doc(db, 'studentSessions', docId), {
    isVerified: true,
  })
}

export const updateStudentEngagement = async (studentId, sessionId, engagementLevel, engagementScore) => {
  const docId = studentId + '_' + sessionId
  return await updateDoc(doc(db, 'studentSessions', docId), {
    lastSeen: serverTimestamp(),
    engagementLevel,
    engagementScore,
    status: 'online',
  })
}

export const studentLeaveSession = async (studentId, sessionId) => {
  const docId = studentId + '_' + sessionId
  return await updateDoc(doc(db, 'studentSessions', docId), {
    status: 'offline',
    leftAt: serverTimestamp(),
  })
}

export const listenClassSessions = (courseId, sessionId, callback) => {
  const q = query(
    collection(db, 'studentSessions'),
    where('sessionId', '==', sessionId)
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

// ─── INSTITUTION / SCHOOL CODES ──────────────────────────

export const validateSchoolCode = async (code) => {
  const codeUpper = code.toUpperCase().trim()
  const snap = await getDoc(doc(db, 'schoolCodes', codeUpper))
  if (!snap.exists()) {
    throw new Error('Invalid school code. Please check with your school administrator.')
  }
  return snap.data()
}

export const createSchoolCode = async (code, schoolName, createdBy) => {
  const codeUpper = code.toUpperCase().trim()
  const snap = await getDoc(doc(db, 'schoolCodes', codeUpper))
  if (snap.exists()) {
    // Code exists — just return it (allow multiple teachers same school)
    return snap.data()
  }
  await setDoc(doc(db, 'schoolCodes', codeUpper), {
    code:       codeUpper,
    schoolName,
    createdBy,
    createdAt:  serverTimestamp(),
  })
  return { code: codeUpper, schoolName }
}

export const checkStudentIdExists = async (studentId, schoolCode) => {
  const q = query(
    collection(db, 'users'),
    where('studentId', '==', studentId),
    where('schoolCode', '==', schoolCode.toUpperCase().trim()),
    where('role', '==', 'student')
  )
  const snap = await getDocs(q)
  return !snap.empty
}

export const getCoursesBySchool = async (schoolCode) => {
  const q = query(
    collection(db, 'courses'),
    where('schoolCode', '==', schoolCode.toUpperCase().trim())
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export const enrollStudentWithKeyword = async (courseId, studentId, keyword) => {
  const ref  = doc(db, 'courses', courseId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Course not found')
  const course = snap.data()

  if (course.enrollKeyword.toUpperCase().trim() !== keyword.toUpperCase().trim()) {
    throw new Error('Wrong enrollment keyword. Please check with your teacher.')
  }

  await updateDoc(ref, { enrolledStudents: arrayUnion(studentId) })

  await setDoc(doc(db, 'enrollments', studentId + '_' + courseId), {
    studentId,
    courseId,
    courseName:  course.name,
    teacherId:   course.teacherId,
    teacherName: course.teacherName,
    subject:     course.subject,
    grade:       course.targetGrade,
    zoomLink:    course.zoomLink    || '',
    schedule:    course.schedule    || '',
    schoolCode:  course.schoolCode  || '',
    enrolledAt:  serverTimestamp(),
  })
}

export const updateStudentSession = async (studentId, data) => {
  try {
    const sessionRef = doc(db, 'studentSessions', studentId)
    await setDoc(sessionRef, {
      ...data,
      studentId,
      updatedAt: new Date().toISOString()
    }, { merge: true })
    console.log("Student session updated")
    return true
  } catch (error) {
    console.error("Error updating session:", error)
    return false
  }
}

// ─── COURSE ROSTER ───────────────────────────────────────

export const getCourseEnrollments = async (courseId) => {
  const q = query(collection(db, 'enrollments'), where('courseId', '==', courseId))
  const snap = await getDocs(q)
  const enrollments = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

  // Backfill the name for any enrollment created before we started saving it.
  await Promise.all(enrollments.map(async (e) => {
    if (!e.studentName) {
      const userSnap = await getDoc(doc(db, 'users', e.studentId))
      e.studentName = userSnap.exists() ? (userSnap.data().name || e.studentId) : e.studentId
    }
  }))

  return enrollments
}

// ─── SESSION REPORTS ─────────────────────────────────────

export const saveSessionReport = async (reportData) => {
  return await addDoc(collection(db, 'reports'), { ...reportData, createdAt: serverTimestamp() })
}

export const getTeacherReports = async (teacherId) => {
  const q = query(collection(db, 'reports'), where('teacherId', '==', teacherId))
  const snap = await getDocs(q)
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  items.sort((a, b) => (a.date < b.date ? 1 : -1))
  return items
}

export const getStudentReports = async (courseIds) => {
  if (!courseIds || courseIds.length === 0) return []
  const q = query(collection(db, 'reports'), where('courseId', 'in', courseIds.slice(0, 10)))
  const snap = await getDocs(q)
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  items.sort((a, b) => (a.date < b.date ? 1 : -1))
  return items
}

// ─── TEACHER PROFILE (photo + qualifications) ────────────

import { storage } from './config'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

export const uploadProfilePhoto = async (uid, file) => {
  const photoRef = ref(storage, `profilePhotos/${uid}`)
  await uploadBytes(photoRef, file)
  return await getDownloadURL(photoRef)
}