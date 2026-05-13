'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

type Mode = 'login' | 'signup'
interface FormState { username: string; email: string; password: string }
interface FieldErrors { username?: string; email?: string; password?: string; general?: string }

const validators = {
  username: (v: string) => {
    if (!v) return 'Pick a nickname.'
    if (v.length < 2) return 'Min 2 characters.'
    if (v.length > 16) return 'Max 16 characters.'
    if (!/^[a-zA-Z0-9_]+$/.test(v)) return 'Letters, numbers and underscores only.'
    return ''
  },
  email: (v: string) => {
    if (!v) return 'Email required.'
    if (!/^\S+@\S+\.\S+$/.test(v)) return "That doesn't look like an email."
    return ''
  },
  password: (v: string) => {
    if (!v) return 'Password required.'
    if (v.length < 8) return 'Min 8 characters.'
    return ''
  },
}

function getPasswordStrength(p: string) {
  let s = 0
  if (p.length >= 8) s++
  if (/[A-Z]/.test(p)) s++
  if (/[0-9]/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  return s
}

const WORDS = ['banana', 'volcano', 'astronaut', 'spaghetti', 'dragon', 'submarine', 'penguin', 'tornado']

const floaters = [
  { emoji: '✏️', top: '8%',  left: '4%',  size: 30, dur: 14, delay: 0,   rot: -18 },
  { emoji: '🖌️', top: '70%', left: '3%',  size: 26, dur: 18, delay: 1.2, rot: 24  },
  { emoji: '🎨', top: '20%', left: '90%', size: 22, dur: 11, delay: 0.4, rot: 0   },
  { emoji: '🖍️', top: '80%', left: '88%', size: 24, dur: 13, delay: 2.0, rot: -12 },
  { emoji: '📐', top: '50%', left: '96%', size: 20, dur: 16, delay: 0.8, rot: 8   },
  { emoji: '⭐', top: '5%',  left: '50%', size: 16, dur: 17, delay: 1.6, rot: 0   },
]

// ─── Form Field ───────────────────────────────────────────────────────────────
function FormField({ label, type, value, onChange, onBlur, error, touched, placeholder, autoComplete, icon, rightElement }: {
  label: string; type: string; value: string; onChange: (v: string) => void; onBlur: () => void
  error?: string; touched?: boolean; placeholder?: string; autoComplete?: string; icon?: string; rightElement?: React.ReactNode
}) {
  const [focused, setFocused] = useState(false)
  const bad = touched && error
  const ok  = touched && !error && value
  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#5A5275', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
        {label}
        {ok && <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#10B981', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff' }}>✓</span>}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.8)', border: `1px solid ${bad ? 'rgba(236,72,153,0.7)' : focused ? 'rgba(49,46,129,0.7)' : 'rgba(27,24,48,0.1)'}`, borderRadius: 12, boxShadow: bad ? '0 0 0 3px rgba(236,72,153,0.12)' : focused ? '0 0 0 3px rgba(49,46,129,0.12)' : 'none', transition: 'border-color 0.15s, box-shadow 0.15s', paddingLeft: 12 }}>
        {icon && <span style={{ fontSize: 15, opacity: 0.7, flexShrink: 0 }}>{icon}</span>}
        <input type={type} value={value} placeholder={placeholder} autoComplete={autoComplete}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); onBlur() }}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', padding: '11px 0', fontSize: 15, color: '#1B1830', fontFamily: "'Inter',system-ui,sans-serif" }}
        />
        {rightElement && <div style={{ paddingRight: 8 }}>{rightElement}</div>}
      </div>
      {bad && <p style={{ margin: '4px 0 0 4px', fontSize: 12, color: '#EC4899', fontWeight: 500 }}>{error}</p>}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function LandingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/lobby'

  const [mode, setMode]               = useState<Mode>('login')
  const [form, setForm]               = useState<FormState>({ username: '', email: '', password: '' })
  const [errors, setErrors]           = useState<FieldErrors>({})
  const [touched, setTouched]         = useState<Record<string, boolean>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [wordIdx, setWordIdx]         = useState(0)
  const [wordVisible, setWordVisible] = useState(true)

  useEffect(() => {
    const iv = setInterval(() => {
      setWordVisible(false)
      setTimeout(() => { setWordIdx(i => (i + 1) % WORDS.length); setWordVisible(true) }, 300)
    }, 2200)
    return () => clearInterval(iv)
  }, [])

  const passwordStrength = useMemo(() => getPasswordStrength(form.password), [form.password])
  const strengthColors   = ['', '#EC4899', '#F59E0B', '#10B981', '#312E81']
  const strengthLabels   = ['', 'weak', 'okay', 'strong', '💪 solid']

  const setField = (key: keyof FormState, value: string) => {
    setForm(f => ({ ...f, [key]: value }))
    if (touched[key]) setErrors(e => ({ ...e, [key]: validators[key]?.(value) || '' }))
  }
  const blurField = (key: keyof FormState) => {
    setTouched(t => ({ ...t, [key]: true }))
    setErrors(e => ({ ...e, [key]: validators[key]?.(form[key]) || '' }))
  }

  const isValid = useMemo(() => {
    const required: (keyof FormState)[] = mode === 'signup' ? ['username', 'email', 'password'] : ['email', 'password']
    return required.every(k => form[k] && !validators[k](form[k]))
  }, [form, mode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const required: (keyof FormState)[] = mode === 'signup' ? ['username', 'email', 'password'] : ['email', 'password']
    const newErrors: FieldErrors = {}
    const newTouched: Record<string, boolean> = {}
    required.forEach(k => { newErrors[k] = validators[k](form[k]); newTouched[k] = true })
    setErrors(newErrors); setTouched(newTouched)
    if (Object.values(newErrors).some(Boolean)) return
    setSubmitting(true); setErrors({})
    try {
      const endpoint = mode === 'signup' ? '/api/auth/register' : '/api/auth/login'
      const body = mode === 'signup'
        ? { username: form.username, email: form.email, password: form.password }
        : { email: form.email, password: form.password }
      const res  = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) { setErrors(data.errors || { general: data.message || 'Something went wrong.' }); return }
      router.push(redirect); router.refresh()
    } catch {
      setErrors({ general: 'Network error. Please check your connection.' })
    } finally {
      setSubmitting(false)
    }
  }

  const switchMode = (m: Mode) => { setMode(m); setErrors({}); setTouched({}) }

  return (
    <div style={{
      height: '100svh', overflow: 'hidden',
      backgroundColor: '#FBF6EC',
      backgroundImage: `radial-gradient(rgba(27,24,48,0.035) 1px,transparent 1px),radial-gradient(rgba(27,24,48,0.025) 1px,transparent 1px)`,
      backgroundSize: '3px 3px,7px 7px', backgroundPosition: '0 0,1px 1px',
      fontFamily: "'Inter',system-ui,sans-serif",
      display: 'flex', flexDirection: 'column', position: 'relative',
    }}>
      {/* Floating emojis */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {floaters.map((f, i) => (
          <div key={i} style={{ position: 'absolute', top: f.top, left: f.left, fontSize: f.size, transform: `rotate(${f.rot}deg)`, animation: `${i % 2 === 0 ? 'floatA' : 'floatB'} ${f.dur}s ease-in-out infinite`, animationDelay: `${f.delay}s`, opacity: 0.55, userSelect: 'none' }}>
            {f.emoji}
          </div>
        ))}
      </div>

      {/* Top nav */}
      <header style={{ flexShrink: 0, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: '#312E81', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-8deg)', boxShadow: '0 5px 0 -2px #1F1B5C', position: 'relative', flexShrink: 0 }}>
            <span style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, color: '#FBF6EC', fontSize: 18 }}>i</span>
            <span style={{ position: 'absolute', top: -3, right: -3, width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} />
          </div>
          <div style={{ lineHeight: 1 }}>
            <div style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 20 }}>inkblot</div>
            <div style={{ fontFamily: "'Caveat',cursive", color: '#5A5275', fontSize: 11 }}>draw • guess • repeat</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#5A5275', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
          servers online
        </div>
      </header>

      {/* Main content — two column on desktop, single on mobile */}
      <main style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr minmax(0,420px)', gap: 0, alignItems: 'center', padding: '0 24px 16px', position: 'relative', zIndex: 10 }} className="login-main">

        {/* Hero left */}
        <div className="login-hero" style={{ paddingRight: 48 }}>
          <div style={{ fontFamily: "'Caveat',cursive", color: '#F59E0B', fontSize: 20, marginBottom: 6 }}>draw. guess. win.</div>
          <h1 style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 'clamp(2.6rem,5vw,5.5rem)', lineHeight: 0.95, letterSpacing: '-0.02em', margin: '0 0 20px' }}>
            Doodle it.<br />
            <span style={{ position: 'relative', display: 'inline-block' }}>
              <span style={{ position: 'relative', zIndex: 1 }}>Guess it.</span>
              <span style={{ position: 'absolute', left: 0, right: 0, bottom: '0.1em', height: '0.45em', background: 'linear-gradient(90deg,transparent 0%,#FCD34D 15%,#FCD34D 85%,transparent 100%)', transform: 'skewX(-6deg)', borderRadius: 999, zIndex: 0 }} />
            </span>
            <br />
            <span style={{ fontFamily: "'Caveat',cursive", color: '#F59E0B', fontWeight: 400 }}>be the loudest pencil.</span>
          </h1>

          <p style={{ color: '#2A2545', fontSize: 16, lineHeight: 1.7, maxWidth: 420, marginBottom: 24 }}>
            A real-time scribble battle for friends &amp; the chronically online. One pencil. Sixty seconds. Today's word is{' '}
            <span style={{ fontFamily: "'Caveat',cursive", color: '#F59E0B', fontWeight: 700, fontSize: '1.15em', display: 'inline-block', transition: 'opacity 0.3s,transform 0.3s', opacity: wordVisible ? 1 : 0, transform: wordVisible ? 'translateY(0)' : 'translateY(8px)' }}>
              "{WORDS[wordIdx]}"
            </span>
            <span style={{ animation: 'blink 1s steps(1) infinite', marginLeft: 1 }}>|</span>
          </p>

          {/* Simple feature pills — no fake numbers */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['🎨 Real-time drawing', '⚡ Instant matchmaking', '👥 Up to 12 players', '🔒 Password-protected rooms'].map(f => (
              <span key={f} style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: 999, padding: '7px 14px', fontSize: 13, fontWeight: 500, color: '#2A2545', boxShadow: '0 1px 4px rgba(31,27,92,0.07)' }}>
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Auth card right */}
        <div style={{ position: 'relative', width: '100%' }}>
          {/* Tape strips */}
          <div style={{ position: 'absolute', top: -10, left: 28, width: 56, height: 18, background: 'rgba(252,211,77,0.85)', transform: 'rotate(-6deg)', borderRadius: 2, zIndex: 20 }} />
          <div style={{ position: 'absolute', top: -6, right: 36, width: 44, height: 18, background: 'rgba(236,72,153,0.3)', transform: 'rotate(8deg)', borderRadius: 2, zIndex: 20 }} />

          <div style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.85),rgba(255,255,255,0.6))', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.65)', boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset,0 24px 48px -16px rgba(31,27,92,0.2)', borderRadius: 22, padding: 24 }}>

            {/* Card header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <div style={{ fontFamily: "'Caveat',cursive", color: '#F59E0B', fontSize: 20, lineHeight: 1, marginBottom: 2 }}>welcome to</div>
                <div style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 20 }}>the sketchbook</div>
              </div>
            </div>

            {/* Mode toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: 4, background: 'rgba(27,24,48,0.05)', borderRadius: 14, marginBottom: 20, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 4, bottom: 4, width: 'calc(50% - 6px)', left: mode === 'login' ? 4 : 'calc(50% + 2px)', background: '#fff', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)' }} />
              {(['login', 'signup'] as Mode[]).map(m => (
                <button key={m} onClick={() => switchMode(m)} style={{ position: 'relative', zIndex: 1, padding: '9px 0', fontFamily: "'Fredoka',sans-serif", fontWeight: 600, fontSize: 15, color: mode === m ? '#312E81' : '#5A5275', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 10, transition: 'color 0.2s' }}>
                  {m === 'login' ? 'Log in' : 'Sign up'}
                </button>
              ))}
            </div>

            {/* Error banner */}
            {errors.general && (
              <div style={{ background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#9D174D', fontWeight: 500 }}>
                {errors.general}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {mode === 'signup' && (
                <FormField label="Nickname" type="text" value={form.username} icon="🎨"
                  onChange={v => setField('username', v)} onBlur={() => blurField('username')}
                  error={errors.username} touched={touched.username}
                  placeholder="your_handle" autoComplete="username"
                />
              )}
              <FormField label="Email" type="email" value={form.email} icon="✉️"
                onChange={v => setField('email', v)} onBlur={() => blurField('email')}
                error={errors.email} touched={touched.email}
                placeholder="you@example.com" autoComplete="email"
              />
              <div>
                <FormField label="Password" type={showPassword ? 'text' : 'password'} value={form.password} icon="🔒"
                  onChange={v => setField('password', v)} onBlur={() => blurField('password')}
                  error={errors.password} touched={touched.password}
                  placeholder={mode === 'signup' ? 'min 8 characters' : '••••••••'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  rightElement={
                    <button type="button" onClick={() => setShowPassword(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, opacity: 0.6, padding: '4px' }}>
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  }
                />
                {mode === 'signup' && form.password && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <div style={{ flex: 1, height: 4, borderRadius: 999, background: 'rgba(27,24,48,0.08)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${passwordStrength * 25}%`, background: strengthColors[passwordStrength], borderRadius: 999, transition: 'width 0.3s,background 0.3s' }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: strengthColors[passwordStrength], minWidth: 40 }}>{strengthLabels[passwordStrength]}</span>
                  </div>
                )}
              </div>

              {mode === 'login' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#2A2545', cursor: 'pointer' }}>
                    <input type="checkbox" style={{ accentColor: '#312E81', width: 14, height: 14 }} />
                    Keep me sketching
                  </label>
                  <a href="#" style={{ fontSize: 13, fontWeight: 600, color: '#312E81', textDecoration: 'none' }}>Forgot?</a>
                </div>
              )}

              <button type="submit" disabled={submitting} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: "'Fredoka',sans-serif", fontWeight: 600, fontSize: 17, color: '#FBF6EC', background: submitting ? '#5A5275' : '#312E81', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', padding: '13px 0', borderRadius: 14, boxShadow: submitting ? 'none' : '0 5px 0 -1px #1F1B5C', transition: 'background 0.2s,box-shadow 0.2s,transform 0.1s', transform: submitting ? 'translateY(2px)' : 'translateY(0)', marginTop: 2 }}>
                {submitting ? (
                  <><span style={{ width: 15, height: 15, borderRadius: '50%', border: '2px solid rgba(251,246,236,0.3)', borderTopColor: '#FBF6EC', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Sharpening pencils…</>
                ) : (
                  mode === 'login' ? '⚡ Take me to my room' : '✏️ Create my sketchbook'
                )}
              </button>
            </form>

            <p style={{ marginTop: 14, fontSize: 11, color: '#5A5275', textAlign: 'center', lineHeight: 1.5 }}>
              By {mode === 'signup' ? 'signing up' : 'logging in'}, you agree to keep your drawings <strong style={{ color: '#1B1830' }}>mostly</strong> wholesome.
            </p>
          </div>

          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, color: '#5A5275' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981' }} />
            end-to-end encrypted · no ads · open source
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ flexShrink: 0, padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: '#5A5275', borderTop: '1px solid rgba(27,24,48,0.07)', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#F59E0B' }} />
          © 2026 inkblot studios
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {['Privacy', 'Rules', 'Discord', 'v0.3.1'].map(l => (
            <a key={l} href="#" style={{ color: '#5A5275', textDecoration: 'none' }}>{l}</a>
          ))}
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Caveat:wght@500;700&display=swap');
        @keyframes floatA { 0%,100%{transform:translateY(0) rotate(var(--r,0deg))} 50%{transform:translateY(-10px) rotate(calc(var(--r,0deg) + 5deg))} }
        @keyframes floatB { 0%,100%{transform:translateY(0) rotate(var(--r,0deg))} 50%{transform:translateY(9px) rotate(calc(var(--r,0deg) - 4deg))} }
        @keyframes blink  { 50%{opacity:0} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        ::selection { background:#F59E0B; color:#1B1830; }
        * { box-sizing:border-box; }

        /* Mobile: stack hero above card, allow scroll */
        @media (max-width: 700px) {
          .login-main {
            grid-template-columns: 1fr !important;
            overflow-y: auto !important;
            padding: 12px 16px 20px !important;
            align-items: start !important;
          }
          .login-hero {
            padding-right: 0 !important;
            padding-bottom: 12px !important;
          }
          .login-hero h1 { font-size: 2.4rem !important; }
          .login-hero p  { font-size: 14px !important; }
        }

        /* Tablet: shrink hero text */
        @media (max-width: 900px) and (min-width: 701px) {
          .login-main { gap: 0 !important; padding: 0 16px 12px !important; }
          .login-hero { padding-right: 24px !important; }
          .login-hero h1 { font-size: 3rem !important; }
        }
      `}</style>
    </div>
  )
}

export default function Page() {
  return <Suspense><LandingPage /></Suspense>
}