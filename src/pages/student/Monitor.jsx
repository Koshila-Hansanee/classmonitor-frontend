import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getStudentEnrollments, studentJoinSession, updateStudentEngagement, studentLeaveSession, markAttendance, getFaceDescriptor, listenActiveSessionsForCourses, markStudentVerified } from '../../firebase/firestore'
import * as faceapi from 'face-api.js'
import { predictFusion, predictSpeech } from '../../api/monitorApi'

const VERIFY_TIMEOUT_MS = 15000 // how long to try matching before declaring failure

export default function StudentMonitor() {
  const { user, profile } = useAuth()
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)

  const [enrollments, setEnrollments]       = useState([])
  const [activeSessions, setActiveSessions] = useState([])
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [modelsLoaded, setModelsLoaded]     = useState(false)
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState('')
  const [speechLanguage, setSpeechLanguage] = useState('sinhala') // 'sinhala' | 'ravdess'

  // phase: 'idle' | 'verifying' | 'verified' | 'failed' | 'monitoring'
  const [phase, setPhase] = useState('idle')

  const [seconds, setSeconds]               = useState(0)
  const [faceVisible, setFaceVisible]       = useState(false)
  const [alertMsg, setAlertMsg]             = useState('')
  const [micLevel, setMicLevel] = useState(0)
  const [micStatus, setMicStatus] = useState('inactive')

  const streamRef       = useRef(null)
  const intervalRef     = useRef(null)
  const timerRef        = useRef(null)
  const noFaceTimerRef  = useRef(null)
  const registeredDescriptorRef = useRef(null)
  const activeSessionIdRef = useRef(null)
  const verifyTimeoutRef   = useRef(null)
  const verifyLoopRef      = useRef(null)
  const mediaRecorderRef        = useRef(null)
  const audioChunksRef          = useRef([])
  const lastSpeechRef           = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const micLevelIntervalRef = useRef(null)
  const speechLanguageRef = useRef('sinhala')

  useEffect(() => {
    const load = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models')
        await faceapi.nets.faceExpressionNet.loadFromUri('/models')
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models')
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        setModelsLoaded(true)
      } catch (e) {
        setError('Failed to load AI models.')
      }
      setLoading(false)
    }
    load()
    return () => stopMonitoring()
  }, [])

  useEffect(() => {
    if (user) {
      getStudentEnrollments(user.uid).then((data) => {
        setEnrollments(data)
        if (data.length > 0) setSelectedCourse(data[0])
      })
    }
  }, [user])

  useEffect(() => {
    if (enrollments.length === 0) return
    const courseIds = enrollments.map((e) => e.courseId)
    const unsub = listenActiveSessionsForCourses(courseIds, setActiveSessions)
    return () => unsub()
  }, [enrollments])

  // ── Phase 1: start camera, run verification only ──────────────────────
  const startVerification = async () => {
    if (!modelsLoaded)    { setError('Models not loaded yet'); return }
    if (!selectedCourse)  { setError('Please select a course'); return }

    const liveSession = activeSessions.find((s) => s.courseId === selectedCourse.courseId)
    if (!liveSession) {
      setError('Your teacher hasn\'t started monitoring for this course yet. Please wait or pick the correct course.')
      return
    }
    activeSessionIdRef.current = liveSession.id
    setError('')

    try {
      // Verification only needs video — mic comes later, once verified.
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      const faceDoc = await getFaceDescriptor(user.uid)
      registeredDescriptorRef.current = faceDoc ? new Float32Array(faceDoc.descriptor) : null

      if (!registeredDescriptorRef.current) {
        setPhase('failed')
        setError('No registered face found on your account. Please contact your teacher — you may need to complete face registration.')
        return
      }

      setPhase('verifying')
      runVerificationLoop()

      verifyTimeoutRef.current = setTimeout(() => {
        if (verifyLoopRef.current) { clearInterval(verifyLoopRef.current); verifyLoopRef.current = null }
        setPhase((current) => {
          if (current === 'verifying') return 'failed'
          return current
        })
      }, VERIFY_TIMEOUT_MS)

    } catch (e) {
      setError('Camera access denied. Please allow camera permission and try again.')
    }
  }

  const runVerificationLoop = () => {
    verifyLoopRef.current = setInterval(async () => {
      if (!videoRef.current) return
      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }))
          .withFaceLandmarks()
          .withFaceDescriptor()

        if (detection?.descriptor) {
          const distance = faceapi.euclideanDistance(detection.descriptor, registeredDescriptorRef.current)
          if (distance < 0.6) {
            clearInterval(verifyLoopRef.current)
            verifyLoopRef.current = null
            clearTimeout(verifyTimeoutRef.current)
            verifyTimeoutRef.current = null
            await onVerificationSuccess()
          }
        }
      } catch (e) {
        // Ignore single-frame detection errors, keep trying until timeout
      }
    }, 800)
  }

  const onVerificationSuccess = async () => {
    setPhase('verified')

    await studentJoinSession(user.uid, selectedCourse.courseId, profile?.name || 'Student', activeSessionIdRef.current)
    await markStudentVerified(user.uid, activeSessionIdRef.current)
    await markAttendance(user.uid, selectedCourse.courseId, 'Present', activeSessionIdRef.current)

    // Brief confirmation display, then move into full monitoring.
    setTimeout(() => beginFullMonitoring(), 1500)
  }

  const retryVerification = () => {
    setError('')
    if (verifyTimeoutRef.current) { clearTimeout(verifyTimeoutRef.current); verifyTimeoutRef.current = null }
    if (verifyLoopRef.current)    { clearInterval(verifyLoopRef.current);   verifyLoopRef.current = null }
    setPhase('verifying')
    runVerificationLoop()
    verifyTimeoutRef.current = setTimeout(() => {
      if (verifyLoopRef.current) { clearInterval(verifyLoopRef.current); verifyLoopRef.current = null }
      setPhase((current) => (current === 'verifying' ? 'failed' : current))
    }, VERIFY_TIMEOUT_MS)
  }

  // ── Phase 2: verified — now add mic and start the real monitoring loop ─
 const beginFullMonitoring = async () => {
  setPhase('monitoring')
  setSeconds(0)
  setAlertMsg('')

  timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
  intervalRef.current = setInterval(() => detectAndUpdate(), 3000)
}

  const enableMicrophone = async () => {
  try {
    const micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const currentVideoTrack = streamRef.current?.getVideoTracks()[0]
    const combined = new MediaStream([
      ...(currentVideoTrack ? [currentVideoTrack] : []),
      ...micStream.getAudioTracks(),
    ])
    streamRef.current = combined
    if (videoRef.current) videoRef.current.srcObject = combined

    startAudioCapture(combined)
    startMicMeter(combined)
  } catch (e) {
    setError('Microphone access denied.')
  }
}

  const startAudioCapture = (stream) => {
    const audioTracks = stream.getAudioTracks()
    if (audioTracks.length === 0) return
    const audioOnlyStream = new MediaStream(audioTracks)
    const SEGMENT_MS = 6000

    const recordSegment = () => {
      if (!streamRef.current) return
      audioChunksRef.current = []
      let recorder
      try {
        recorder = new MediaRecorder(audioOnlyStream)
      } catch (e) {
        console.warn('MediaRecorder not supported for audio capture:', e)
        return
      }
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.onstop = async () => {
  const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
  try {
    const result = await predictSpeech(blob, speechLanguageRef.current)
    lastSpeechRef.current = { label: result.label, confidence: result.confidence, at: Date.now() }
  } catch (e) {
    console.warn('Speech prediction failed for this segment:', e)
  }
  if (streamRef.current) recordSegment()
}

      recorder.start()
      setTimeout(() => { if (recorder.state !== 'inactive') recorder.stop() }, SEGMENT_MS)
    }

    recordSegment()
  }

  const startMicMeter = (stream) => {
    if (stream.getAudioTracks().length === 0) return
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const source = audioCtx.createMediaStreamSource(stream)
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)

    audioContextRef.current = audioCtx
    analyserRef.current = analyser
    setMicStatus('active')

    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    micLevelIntervalRef.current = setInterval(() => {
      analyser.getByteFrequencyData(dataArray)
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
      setMicLevel(Math.min(100, Math.round((avg / 255) * 100 * 3)))
    }, 150)
  }

  const stopMicMeter = () => {
    if (micLevelIntervalRef.current) { clearInterval(micLevelIntervalRef.current); micLevelIntervalRef.current = null }
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null }
    setMicStatus('inactive')
    setMicLevel(0)
  }

  const stopMonitoring = async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop() } catch (e) {}
    }
    stopMicMeter()
    if (intervalRef.current)     { clearInterval(intervalRef.current);     intervalRef.current = null }
    if (timerRef.current)        { clearInterval(timerRef.current);        timerRef.current = null }
    if (noFaceTimerRef.current)  { clearTimeout(noFaceTimerRef.current);   noFaceTimerRef.current = null }
    if (verifyTimeoutRef.current){ clearTimeout(verifyTimeoutRef.current); verifyTimeoutRef.current = null }
    if (verifyLoopRef.current)   { clearInterval(verifyLoopRef.current);   verifyLoopRef.current = null }

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }

    if (selectedCourse && user && activeSessionIdRef.current) {
      await studentLeaveSession(user.uid, activeSessionIdRef.current)
    }

    setPhase('idle')
    setFaceVisible(false)
  }

  const getEngagementLevel = (expressions) => {
    const { happy, neutral, surprised } = expressions
    if (happy > 0.4 || surprised > 0.4) return { level: 'Engaged',    score: 90 }
    if (neutral > 0.5)                  return { level: 'Neutral',     score: 55 }
    return                                     { level: 'Distracted',  score: 15 }
  }

  const detectAndUpdate = async () => {
    if (!videoRef.current || !canvasRef.current) return
    const video  = videoRef.current
    const canvas = canvasRef.current
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    try {
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }))
        .withFaceExpressions()

      if (detection) {
        setFaceVisible(true)
        if (noFaceTimerRef.current) { clearTimeout(noFaceTimerRef.current); noFaceTimerRef.current = null }
        setAlertMsg('')

        const { x, y, width, height } = detection.detection.box
        const faceCanvas = document.createElement('canvas')
        faceCanvas.width = width
        faceCanvas.height = height
        faceCanvas.getContext('2d').drawImage(video, x, y, width, height, 0, 0, width, height)

        let level = 'Neutral', score = 55
        try {
          const speech = lastSpeechRef.current
          const speechIsFresh = speech && (Date.now() - speech.at) < 15000
          const result = await predictFusion(
            faceCanvas,
            speechIsFresh ? speech.label : null,
            speechIsFresh ? speech.confidence : null
          )
          level = result.engagement_level
          score = result.engagement_score
        } catch (e) {
          console.warn('Fusion prediction failed, falling back to local heuristic', e)
          ;({ level, score } = getEngagementLevel(detection.expressions))
        }

        ctx.strokeStyle = '#2563EB'
        ctx.lineWidth   = 2
        ctx.strokeRect(x, y, width, height)

        await updateStudentEngagement(user.uid, activeSessionIdRef.current, level, score)

      } else {
        setFaceVisible(false)
        if (!noFaceTimerRef.current) {
          noFaceTimerRef.current = setTimeout(() => {
            setAlertMsg('You have been away for 2 minutes!')
            updateStudentEngagement(user.uid, activeSessionIdRef.current, 'Distracted', 0)
          }, 120000)
        }
        ctx.strokeStyle = '#CA8A04'
        ctx.lineWidth   = 2
        ctx.setLineDash([8, 4])
        ctx.strokeRect(canvas.width * 0.2, canvas.height * 0.1, canvas.width * 0.6, canvas.height * 0.8)
        ctx.setLineDash([])
        ctx.fillStyle = '#CA8A04'
        ctx.font      = 'bold 14px Inter, sans-serif'
        ctx.fillText('Please position your face in the frame', canvas.width * 0.15, canvas.height * 0.07)
      }
    } catch (e) {
      console.error('Detection error:', e)
    }
  }

  const fmt = (s) =>
    String(Math.floor(s / 60)).padStart(2, '0') + ':' +
    String(s % 60).padStart(2, '0')

  const isBusy = phase === 'verifying' || phase === 'verified' || phase === 'monitoring'

  return (
    <div className="wrap">
      <div className="page-header">
        <div>
          <h2>Class Monitor</h2>
          <p>Keep this page open during your class</p>
        </div>
        {phase === 'monitoring' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--red-bg)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 99, padding: '6px 14px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', animation: 'blink 1s infinite' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)' }}>MONITORING - {fmt(seconds)}</span>
          </div>
        )}
      </div>

     <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        <div>
          {!isBusy && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Select Course</div>
              {enrollments.length === 0 ? (
                <div style={{ color: 'var(--text2)', fontSize: 13 }}>No enrolled courses. Enroll in a course first.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {enrollments.map((e) => (
                    <div key={e.id}
                      onClick={() => setSelectedCourse(e)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, cursor: 'pointer', border: '2px solid', transition: 'all .15s',
                        borderColor: selectedCourse?.courseId === e.courseId ? '#7C3AED' : 'var(--border)',
                        background:  selectedCourse?.courseId === e.courseId ? 'var(--purple-bg)' : 'var(--surface2)' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {e.courseName}
                          {activeSessions.some((s) => s.courseId === e.courseId) && (
                            <span style={{ fontSize: 10, fontWeight: 800, color: '#16A34A', background: 'var(--green-bg)', padding: '2px 6px', borderRadius: 99 }}>LIVE NOW</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{e.teacherName}</div>
                      </div>
                      {selectedCourse?.courseId === e.courseId && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#7C3AED' }}>Selected</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!isBusy && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Speech Language</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { value: 'sinhala', label: 'Sinhala' },
                  { value: 'ravdess', label: 'English' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setSpeechLanguage(opt.value); speechLanguageRef.current = opt.value }}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                      border: speechLanguage === opt.value ? '2px solid #7C3AED' : '2px solid var(--border)',
                      background: speechLanguage === opt.value ? 'var(--purple-bg)' : 'var(--surface2)',
                      color: speechLanguage === opt.value ? '#7C3AED' : 'var(--text)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                Choose the language you'll be speaking during this class
              </div>
            </div>
          )}

          <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#0F1928', aspectRatio: '16/9' }}>
            <video ref={videoRef} autoPlay muted playsInline
              style={{ width: '100%', display: 'block', transform: 'scaleX(-1)' }} />
            <canvas ref={canvasRef}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: 'scaleX(-1)' }} />

            {phase === 'idle' && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F1928' }}>
                <div style={{ textAlign: 'center', color: '#fff' }}>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
                    {loading ? 'Loading AI models...' : 'Select a course and click Start Monitoring'}
                  </div>
                </div>
              </div>
            )}

            {phase === 'verifying' && (
              <div style={{ position: 'absolute', top: 12, left: 12, right: 12, background: 'rgba(202,138,4,0.9)', color: '#fff', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, textAlign: 'center' }}>
                Verifying your identity... keep your face centered
              </div>
            )}

            {phase === 'verified' && (
              <div style={{ position: 'absolute', top: 12, left: 12, right: 12, background: 'rgba(22,163,74,0.95)', color: '#fff', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, textAlign: 'center' }}>
                ✓ Identity Verified<br />✓ Attendance Marked: Present
              </div>
            )}
          </div>

          {phase === 'failed' && (
            <div style={{ marginTop: 12, background: 'var(--red-bg)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 13, color: 'var(--red)', fontWeight: 700, marginBottom: 8 }}>
                Face verification failed. Please position your face clearly and try again.
              </div>
              <button onClick={retryVerification}
                style={{ background: 'var(--red)', color: '#fff', padding: '8px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
                Retry Verification
              </button>
            </div>
          )}

          {alertMsg && (
            <div style={{ marginTop: 12, background: 'var(--red-bg)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--red)', fontWeight: 600}}>
              {alertMsg}
            </div>
          )}

          {error && (
            <div style={{ marginTop: 12, background: 'var(--red-bg)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--red)' }}>
              {error}
            </div>
          )}

          <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
            {phase === 'idle' && (
              <>
                <button onClick={startVerification} disabled={!modelsLoaded || loading || !selectedCourse}
                  style={{ flex: 1, padding: '12px', background: modelsLoaded && selectedCourse ? '#16A34A' : '#4A5568', color: '#fff', borderRadius: 12, fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer' }}>
                  {loading ? 'Loading...' : 'Start Monitoring'}
                </button>
                {selectedCourse?.zoomLink && (
                  <a href={selectedCourse.zoomLink} target="_blank" rel="noreferrer"
                    style={{ flex: 1, padding: '12px', background: '#1D4ED8', color: '#fff', borderRadius: 12, fontWeight: 800, fontSize: 14, textDecoration: 'none', textAlign: 'center' }}>
                    Join Zoom Class
                  </a>
                )}
              </>
            )}
            {isBusy && (
              <button onClick={stopMonitoring}
                style={{ flex: 1, padding: '12px', background: '#DC2626', color: '#fff', borderRadius: 12, fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer' }}>
                Stop Monitoring
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {phase === 'monitoring' && (
            <div className="card">
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Session Stats</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>Duration</span>
                <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(seconds)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>Attendance</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>Present ✓</span>
              </div>
              <div style={{ marginTop: 12 }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
    <span style={{ fontSize: 12, color: 'var(--text2)' }}>
      Microphone {micStatus === 'active' ? '(Active)' : '(Inactive)'}
    </span>
  </div>
  <div style={{ background: 'var(--surface2)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
    <div style={{
      width: micLevel + '%', height: '100%', borderRadius: 4,
      background: micLevel > 5 ? '#16A34A' : '#4A5568',
      transition: 'width .1s linear',
    }} />
  </div>
  {micStatus !== 'active' && (
    <button onClick={enableMicrophone}
      style={{ marginTop: 8, width: '100%', padding: '8px', background: '#7C3AED', color: '#fff', borderRadius: 8, fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer' }}>
      🎤 Turn On Microphone
    </button>
  )}
</div>
            </div>
          )}

          {phase === 'idle' && (
            <div className="card">
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>How it works</div>
              {[
                ['1.', 'Select your course above'],
                ['2.', 'Click "Start Monitoring"'],
                ['3.', 'Hold still while your identity is verified'],
                ['4.', 'Once verified, monitoring begins automatically'],
                ['5.', 'Click "Stop Monitoring" when done'],
              ].map(([icon, text]) => (
                <div key={text} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
                  <span>{icon}</span><span>{text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  )
}