import { useState, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { updateUserProfile, uploadProfilePhoto } from '../../firebase/firestore'

export default function TeacherProfile() {
  const { user, profile, refreshProfile } = useAuth()
  const fileInputRef = useRef(null)

  const [name, setName] = useState(profile?.name || '')
  const [qualifications, setQualifications] = useState(profile?.qualifications || '')
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [error, setError] = useState('')

  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be under 5MB')
      return
    }

    setError('')
    setUploading(true)
    try {
      const url = await uploadProfilePhoto(user.uid, file)
      setPhotoURL(url)
      await updateUserProfile(user.uid, { photoURL: url })
      if (refreshProfile) await refreshProfile()
      setSavedMsg('Photo updated')
    } catch (e) {
      setError('Photo upload failed: ' + e.message)
    }
    setUploading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSavedMsg('')
    try {
      await updateUserProfile(user.uid, { name, qualifications })
      if (refreshProfile) await refreshProfile()
      setSavedMsg('Profile saved')
    } catch (e) {
      setError('Save failed: ' + e.message)
    }
    setSaving(false)
  }

  return (
    <div className="wrap">
      <div className="page-header">
        <div><h2>My Profile</h2><p>Shown to students when they view your course details</p></div>
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 88, height: 88, borderRadius: '50%', overflow: 'hidden',
              background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, fontWeight: 800, color: 'var(--text2)',
            }}>
              {photoURL ? (
                <img src={photoURL} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (name || 'T').charAt(0).toUpperCase()
              )}
            </div>
            {uploading && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11 }}>
                ...
              </div>
            )}
          </div>
          <div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-secondary"
              style={{ opacity: uploading ? 0.7 : 1 }}
            >
              {uploading ? 'Uploading...' : 'Change Photo'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              style={{ display: 'none' }}
            />
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>JPG or PNG, under 5MB</div>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="form-label">Full Name</label>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="form-label">Email</label>
          <input className="form-input" value={user?.email || ''} disabled style={{ background: 'var(--surface2)', color: 'var(--text2)' }} />
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
            Email is tied to your sign-in and can't be changed here. Contact support if you need it updated.
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label className="form-label">Education Qualifications</label>
          <textarea
            className="form-input"
            rows={4}
            placeholder="e.g. B.Ed in Mathematics, University of Colombo (2018)&#10;M.Sc in Education Technology (2021)"
            value={qualifications}
            onChange={(e) => setQualifications(e.target.value)}
            style={{ resize: 'vertical', fontFamily: 'inherit' }}
          />
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
            Visible to students on your course pages
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 14, background: 'var(--red-bg)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--red)' }}>
            {error}
          </div>
        )}
        {savedMsg && (
          <div style={{ marginBottom: 14, background: 'var(--green-bg)', border: '1px solid rgba(22,163,74,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>
            {savedMsg}
          </div>
        )}

        <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}