import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { updateUserProfile, saveFaceDescriptor } from '../../firebase/firestore'
import * as faceapi from 'face-api.js'

export default function CompleteProfile() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)

  const [step, setStep]               = useState(1)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [scanning, setScanning]       = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const [faceSaved, setFaceSaved]     = useState(false)
  const [countdown, setCountdown]     = useState(3)
  const [loadingMsg, setLoadingMsg]   = useState('')

  const streamRef   = useRef(null)
  const intervalRef = useRef(null)

  const [form, setForm] = useState({ school: '', grade: '', studentId: '' })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    if (step === 2) loadModels()
    return () => stopCamera()
  }, [step])

  const loadModels = async () => {
    setLoading(true)
    setError('')
    try {
      setLoadingMsg('Loading face detector...')
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models')

      setLoadingMsg('Loading landmark model...')
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models')

      setLoadingMsg('Loading recognition model...')
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models')

      setLoadingMsg('')
      setModelsLoaded(true)
    } catch (e) {
      console.error('Model error:', e)
      setError('Failed to load AI models: ' + e.message + '. Check that all model files are in public/models/')
    }
    setLoading(false)
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setScanning(true)
      setError('')
      startDetectionLoop()
    } catch (e) {
      setError('Camera access denied. Please allow camera permission in your browser.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setScanning(false)
  }

  const startDetectionLoop = () => {
    intervalRef.current = setInterval(async () => {
      if (!videoRef.current) return
      try {
        const detection = await faceapi
  .detectSingleFace(
    videoRef.current,
    new faceapi.TinyFaceDetectorOptions({
      inputSize: 320,
      scoreThreshold: 0.2
    })
  )
  .withFaceLandmarks()
  .withFaceDescriptor()

        if (!canvasRef.current || !videoRef.current) return
        const canvas = canvasRef.current
        canvas.width  = videoRef.current.videoWidth
        canvas.height = videoRef.current.videoHeight
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        if (detection) {
          setFaceDetected(true)
          const { x, y, width, height } = detection.detection.box

          // Green box
          ctx.strokeStyle = '#16A34A'
          ctx.lineWidth   = 3
          ctx.strokeRect(x, y, width, height)
          ctx.fillStyle   = '#16A34A'
          ctx.fillRect(x, y - 28, width, 28)
          ctx.fillStyle   = '#fff'
          ctx.font        = 'bold 13px Inter, sans-serif'
          ctx.fillText('✓ Face Detected — Ready!', x + 6, y - 9)
        } else {
          setFaceDetected(false)

          // Guide box
          const gx = canvas.width  * 0.2
          const gy = canvas.height * 0.1
          const gw = canvas.width  * 0.6
          const gh = canvas.height * 0.8

          ctx.strokeStyle = '#CA8A04'
          ctx.lineWidth   = 2
          ctx.setLineDash([8, 4])
          ctx.strokeRect(gx, gy, gw, gh)
          ctx.setLineDash([])
          ctx.fillStyle   = '#CA8A04'
          ctx.font        = 'bold 13px Inter, sans-serif'
          ctx.fillText('Position your face here', gx + 10, gy - 8)
        }
      } catch (e) {
        console.error('Detection loop error:', e)
      }
    }, 600)
  }

  const captureFace = async () => {
    if (!videoRef.current || !faceDetected) return
    setLoading(true)
    setError('')

    try {
      // Countdown
      for (let i = 3; i >= 1; i--) {
        setCountdown(i)
        await new Promise((r) => setTimeout(r, 700))
      }

      const detection = await faceapi
  .detectSingleFace(
    videoRef.current,
    new faceapi.TinyFaceDetectorOptions({
      inputSize: 320,
      scoreThreshold: 0.2
    })
  )
  .withFaceLandmarks()
  .withFaceDescriptor()

      if (!detection) {
        setError('No face detected during capture. Please try again.')
        setLoading(false)
        return
      }

      await saveFaceDescriptor(user.uid, detection.descriptor)
await updateUserProfile(user.uid, { profileComplete: true })
setFaceSaved(true)
stopCamera()

// Auto redirect after 2 seconds
setTimeout(() => {
  window.location.href = '/student/home'
}, 2000)

    } catch (e) {
      console.error('Capture error:', e)
      setError('Face capture failed: ' + e.message)
    }
    setLoading(false)
  }

  const handleProfileSubmit = async () => {
    if (!form.school.trim() || !form.grade.trim() || !form.studentId.trim()) {
      setError('Please fill in all fields')
      return
    }
    setLoading(true)
    try {
      await updateUserProfile(user.uid, { ...form, profileComplete: false })
      setStep(2)
      setError('')
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  const handleFinish = async () => {
    setLoading(true)
    try {
      await updateUserProfile(user.uid, { profileComplete: true })
      navigate('/student/home')
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0F1923', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 36, width: '100%', maxWidth: 480 }}>

        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
          {[{ n: 1, label: 'Profile' }, { n: 2, label: 'Face Scan' }].map((s, i) => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14,
                  background: step > s.n ? '#16A34A' : step === s.n ? '#7C3AED' : '#E2E8F0',
                  color: step >= s.n ? '#fff' : '#8898A4' }}>
                  {step > s.n ? '✓' : s.n}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4, color: step === s.n ? '#7C3AED' : 'var(--text2)' }}>
                  {s.label}
                </div>
              </div>
              {i < 1 && (
                <div style={{ height: 2, flex: 1, background: step > 1 ? '#16A34A' : '#E2E8F0', margin: '0 8px', marginBottom: 20 }} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1 — Profile form */}
        {step === 1 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
              <h2 style={{ fontSize: 20, fontWeight: 800 }}>Complete Your Profile</h2>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6 }}>Fill in your details to get started</p>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="form-label">School / Institution</label>
              <input className="form-input" type="text" placeholder="Jefferson High School" value={form.school} onChange={set('school')} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="form-label">Grade / Year</label>
              <select className="form-input" value={form.grade} onChange={set('grade')}>
                <option value="">Select your grade</option>
                {['Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12','Year 1','Year 2','Year 3','Year 4'].map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label className="form-label">Student ID</label>
              <input className="form-input" type="text" placeholder="e.g. STU-2024-001" value={form.studentId} onChange={set('studentId')} />
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Used to match your grades and attendance</div>
            </div>

            {error && (
              <div style={{ fontSize: 12, color: 'var(--red)', background: 'var(--red-bg)', borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}>{error}</div>
            )}

            <button onClick={handleProfileSubmit} disabled={loading}
              style={{ width: '100%', padding: 13, background: '#7C3AED', color: '#fff', borderRadius: 12, fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Saving...' : 'Next — Register Face →'}
            </button>
          </>
        )}

        {/* Step 2 — Face scan */}
        {step === 2 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📸</div>
              <h2 style={{ fontSize: 20, fontWeight: 800 }}>Register Your Face</h2>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6, lineHeight: 1.6 }}>
                Used to verify your identity during class attendance
              </p>
            </div>

            {/* Loading models indicator */}
            {loading && loadingMsg && (
              <div style={{ background: 'var(--pl)', border: '1px solid rgba(26,107,232,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>
                ⏳ {loadingMsg}
              </div>
            )}

            {/* Video */}
            <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#0F1928', marginBottom: 16, aspectRatio: '4/3' }}>
              <video ref={videoRef} autoPlay muted playsInline
                style={{ width: '100%', display: 'block', transform: 'scaleX(-1)' }} />
              <canvas ref={canvasRef}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: 'scaleX(-1)' }} />

              {!scanning && !faceSaved && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F1928' }}>
                  <div style={{ textAlign: 'center', color: '#fff' }}>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>📷</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                      {loading ? loadingMsg || 'Loading AI models...' : modelsLoaded ? 'Click "Start Camera" below' : 'Loading models...'}
                    </div>
                  </div>
                </div>
              )}

              {faceSaved && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(22,163,74,0.9)' }}>
                  <div style={{ textAlign: 'center', color: '#fff' }}>
                    <div style={{ fontSize: 52, marginBottom: 10 }}>✅</div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>Face Registered!</div>
                    <div style={{ fontSize: 13, marginTop: 6, color: 'rgba(255,255,255,0.8)' }}>Your face has been saved</div>
                  </div>
                </div>
              )}

              {/* Countdown overlay */}
              {loading && scanning && countdown >= 1 && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
                  <div style={{ fontSize: 80, fontWeight: 800, color: '#fff' }}>{countdown}</div>
                </div>
              )}
            </div>

            {/* Face status */}
            {scanning && !faceSaved && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, marginBottom: 14,
                background: faceDetected ? 'var(--green-bg)' : 'var(--yellow-bg)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: faceDetected ? 'var(--green)' : 'var(--yellow)', animation: 'blink 1s infinite' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: faceDetected ? 'var(--green)' : 'var(--yellow)' }}>
                  {faceDetected ? '✓ Face detected — ready to capture!' : 'Position your face in the frame'}
                </span>
              </div>
            )}

            {error && (
              <div style={{ fontSize: 12, color: 'var(--red)', background: 'var(--red-bg)', borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}>{error}</div>
            )}

            {/* Buttons */}
            {!faceSaved ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {!scanning ? (
                  <button onClick={startCamera} disabled={!modelsLoaded || loading}
                    style={{ width: '100%', padding: 12, background: modelsLoaded && !loading ? '#7C3AED' : '#4A5568', color: '#fff', borderRadius: 12, fontWeight: 800, fontSize: 14, border: 'none', cursor: modelsLoaded && !loading ? 'pointer' : 'not-allowed' }}>
                    {loading ? '⏳ ' + (loadingMsg || 'Loading...') : modelsLoaded ? '📷 Start Camera' : '⏳ Loading models...'}
                  </button>
                ) : (
                  <button onClick={captureFace} disabled={!faceDetected || loading}
                    style={{ width: '100%', padding: 12, background: faceDetected && !loading ? '#16A34A' : '#4A5568', color: '#fff', borderRadius: 12, fontWeight: 800, fontSize: 14, border: 'none', cursor: faceDetected && !loading ? 'pointer' : 'not-allowed' }}>
                    {loading ? 'Capturing...' : faceDetected ? '📸 Capture Face' : 'Position your face first'}
                  </button>
                )}
              </div>
            ) : (
              <button onClick={handleFinish} disabled={loading}
                style={{ width: '100%', padding: 13, background: '#16A34A', color: '#fff', borderRadius: 12, fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Finishing...' : '✅ Complete Setup →'}
              </button>
            )}

          </>
        )}
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  )
}