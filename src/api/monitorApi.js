const API_BASE = import.meta.env.VITE_MONITOR_API_URL || 'http://localhost:8000'

export async function predictEngagement(canvas) {
  const imageBase64 = canvas.toDataURL('image/jpeg', 0.8)
  const res = await fetch(`${API_BASE}/predict/engagement`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_base64: imageBase64 }),
  })
  if (!res.ok) throw new Error('Engagement prediction failed')
  return res.json()
}

// dataset: 'sinhala' | 'ravdess'
export async function predictSpeech(audioBlob, dataset = 'sinhala') {
  const formData = new FormData()
  formData.append('audio', audioBlob, 'clip.webm')
  const res = await fetch(`${API_BASE}/predict/speech/${dataset}`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error('Speech prediction failed')
  return res.json()
}

export async function predictFusion(canvas, speechLabel, speechConfidence) {
  const imageBase64 = canvas.toDataURL('image/jpeg', 0.8)
  const res = await fetch(`${API_BASE}/predict/fusion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_base64: imageBase64, speech_label: speechLabel, speech_confidence: speechConfidence }),
  })
  if (!res.ok) throw new Error('Fusion prediction failed')
  return res.json()
}