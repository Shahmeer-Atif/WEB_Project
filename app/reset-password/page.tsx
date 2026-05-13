'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPw, setShowPw] = useState(false)

  useEffect(() => {
    if (!token) router.push('/')
  }, [token, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError("Passwords don't match."); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message || 'Something went wrong.'); return }
      setSuccess(true)
      setTimeout(() => router.push('/'), 2500)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!token) return null

  return (
    <div style={{
      height: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#FBF6EC',
      backgroundImage: `radial-gradient(rgba(27,24,48,0.035) 1px, transparent 1px)`,
      backgroundSize: '4px 4px',
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 32 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#312E81', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-8deg)', boxShadow: '0 5px 0 -2px #1F1B5C', position: 'relative' }}>
            <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#FBF6EC', fontSize: 20 }}>i</span>
            <span style={{ position: 'absolute', top: -3, right: -3, width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} />
          </div>
          <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 22 }}>inkblot</span>
        </div>

        {/* Card */}
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', top: -10, left: 28, width: 56, height: 18, background: 'rgba(252,211,77,0.85)', transform: 'rotate(-5deg)', borderRadius: 2, zIndex: 20 }} />

          <div style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,255,255,0.6))', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.65)', boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 24px 48px -16px rgba(31,27,92,0.2)', borderRadius: 22, padding: 28 }}>

            {success ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 22, marginBottom: 8 }}>Password updated!</div>
                <div style={{ color: '#5A5275', fontSize: 14 }}>Redirecting you to login…</div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 22 }}>
                  <div style={{ fontFamily: "'Caveat', cursive", color: '#F59E0B', fontSize: 20, lineHeight: 1, marginBottom: 4 }}>almost there —</div>
                  <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 22 }}>Set a new password</div>
                  <div style={{ fontSize: 13, color: '#5A5275', marginTop: 4 }}>Choose something strong. Min 8 characters.</div>
                </div>

                {error && (
                  <div style={{ background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: '#9D174D', fontSize: 13, fontWeight: 500 }}>
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* New password */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5A5275', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>New Password</label>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(27,24,48,0.1)', borderRadius: 12, paddingLeft: 12 }}>
                      <span style={{ fontSize: 15, opacity: 0.6 }}>🔒</span>
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="min 8 characters"
                        autoComplete="new-password"
                        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', padding: '11px 8px', fontSize: 15, color: '#1B1830', fontFamily: "'Inter', sans-serif" }}
                      />
                      <button type="button" onClick={() => setShowPw(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5A5275', fontSize: 13, padding: '0 12px' }}>
                        {showPw ? 'hide' : 'show'}
                      </button>
                    </div>
                  </div>

                  {/* Confirm */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5A5275', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                      Confirm Password
                      {confirm && password && (
                        <span style={{ marginLeft: 8, color: confirm === password ? '#10B981' : '#EC4899' }}>
                          {confirm === password ? '✓ match' : '✕ no match'}
                        </span>
                      )}
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.8)', border: `1px solid ${confirm && password && confirm !== password ? 'rgba(236,72,153,0.5)' : 'rgba(27,24,48,0.1)'}`, borderRadius: 12, paddingLeft: 12 }}>
                      <span style={{ fontSize: 15, opacity: 0.6 }}>🔒</span>
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                        placeholder="repeat your password"
                        autoComplete="new-password"
                        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', padding: '11px 8px', fontSize: 15, color: '#1B1830', fontFamily: "'Inter', sans-serif" }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 17, color: '#FBF6EC', background: submitting ? '#5A5275' : '#312E81', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', padding: '13px 0', borderRadius: 14, boxShadow: submitting ? 'none' : '0 5px 0 -1px #1F1B5C', marginTop: 4 }}
                  >
                    {submitting ? (
                      <><span style={{ width: 15, height: 15, borderRadius: '50%', border: '2px solid rgba(251,246,236,0.3)', borderTopColor: '#FBF6EC', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Updating…</>
                    ) : '🔑 Set new password'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <a href="/" style={{ fontSize: 13, color: '#5A5275', textDecoration: 'none', fontWeight: 500 }}>← Back to login</a>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Caveat:wght@500;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  )
}

export default function Page() {
  return <Suspense><ResetPasswordPage /></Suspense>
}