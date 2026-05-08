'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
type Mode = 'login' | 'signup'

interface FormState {
  username: string
  email: string
  password: string
}

interface FieldErrors {
  username?: string
  email?: string
  password?: string
  general?: string
}

// ─── Client-side validators (mirrors server validation) ───────────────────────
const validators = {
  username: (v: string) => {
    if (!v) return 'Pick a nickname so people can roast you.'
    if (v.length < 2) return 'Too short — min 2 characters.'
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

// ─── Password strength scorer ────────────────────────────────────────────────
function getPasswordStrength(password: string): number {
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return score
}

// ─── Floating art supplies (decorative background) ───────────────────────────
const floaters = [
  { emoji: '✏️', top: '8%',  left: '6%',  size: 32, dur: 14, delay: 0,   rot: -18 },
  { emoji: '🖌️', top: '72%', left: '4%',  size: 28, dur: 18, delay: 1.2, rot: 24  },
  { emoji: '🎨', top: '18%', left: '42%', size: 24, dur: 11, delay: 0.4, rot: 0   },
  { emoji: '🖍️', top: '82%', left: '40%', size: 26, dur: 13, delay: 2.0, rot: -12 },
  { emoji: '📐', top: '14%', left: '72%', size: 22, dur: 16, delay: 0.8, rot: 8   },
  { emoji: '🎭', top: '58%', left: '88%', size: 30, dur: 20, delay: 0.2, rot: 0   },
  { emoji: '⭐', top: '4%',  left: '52%', size: 18, dur: 17, delay: 1.6, rot: 0   },
  { emoji: '🌀', top: '46%', left: '2%',  size: 16, dur: 10, delay: 0,   rot: 0   },
  { emoji: '💡', top: '30%', left: '94%', size: 20, dur: 9,  delay: 0.7, rot: 0   },
  { emoji: '🔮', top: '90%', left: '70%', size: 22, dur: 12, delay: 0.3, rot: 0   },
]

// ─── Rotating words in hero ───────────────────────────────────────────────────
const WORDS = ['banana', 'volcano', 'astronaut', 'spaghetti', 'dragon', 'submarine', 'penguin', 'tornado']

// ─── Inner page component (uses useSearchParams) ──────────────────────────────
function LandingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/lobby'

  const [mode, setMode] = useState<Mode>('login')
  const [form, setForm] = useState<FormState>({ username: '', email: '', password: '' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [wordIdx, setWordIdx] = useState(0)
  const [wordVisible, setWordVisible] = useState(true)

  // Rotate words in hero
  useEffect(() => {
    const interval = setInterval(() => {
      setWordVisible(false)
      setTimeout(() => {
        setWordIdx(i => (i + 1) % WORDS.length)
        setWordVisible(true)
      }, 300)
    }, 2200)
    return () => clearInterval(interval)
  }, [])

  const passwordStrength = useMemo(() => getPasswordStrength(form.password), [form.password])
  const strengthLabels = ['', 'weak', 'okay', 'strong', '💪 solid']
  const strengthColors = ['', '#EC4899', '#F59E0B', '#10B981', '#312E81']

  const setField = (key: keyof FormState, value: string) => {
    setForm(f => ({ ...f, [key]: value }))
    if (touched[key]) {
      setErrors(e => ({ ...e, [key]: validators[key]?.(value) || '' }))
    }
  }

  const blurField = (key: keyof FormState) => {
    setTouched(t => ({ ...t, [key]: true }))
    setErrors(e => ({ ...e, [key]: validators[key]?.(form[key]) || '' }))
  }

  const isValid = useMemo(() => {
    const required: (keyof FormState)[] = mode === 'signup'
      ? ['username', 'email', 'password']
      : ['email', 'password']
    return required.every(k => form[k] && !validators[k](form[k]))
  }, [form, mode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Touch all fields to show errors
    const required: (keyof FormState)[] = mode === 'signup'
      ? ['username', 'email', 'password']
      : ['email', 'password']

    const newErrors: FieldErrors = {}
    const newTouched: Record<string, boolean> = {}
    required.forEach(k => {
      newErrors[k] = validators[k](form[k])
      newTouched[k] = true
    })
    setErrors(newErrors)
    setTouched(newTouched)
    if (Object.values(newErrors).some(Boolean)) return

    setSubmitting(true)
    setErrors({})

    try {
      const endpoint = mode === 'signup' ? '/api/auth/register' : '/api/auth/login'
      const body = mode === 'signup'
        ? { username: form.username, email: form.email, password: form.password }
        : { email: form.email, password: form.password }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        // Server returned field errors or a general message
        if (data.errors) {
          setErrors(data.errors)
        } else {
          setErrors({ general: data.message || 'Something went wrong.' })
        }
        return
      }

      // Success — redirect to lobby (or wherever they were trying to go)
      router.push(redirect)
      router.refresh()

    } catch {
      setErrors({ general: 'Network error. Please check your connection.' })
    } finally {
      setSubmitting(false)
    }
  }

  const switchMode = (newMode: Mode) => {
    setMode(newMode)
    setErrors({})
    setTouched({})
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FBF6EC',
      backgroundImage: `
        radial-gradient(rgba(27,24,48,0.035) 1px, transparent 1px),
        radial-gradient(rgba(27,24,48,0.025) 1px, transparent 1px)
      `,
      backgroundSize: '3px 3px, 7px 7px',
      backgroundPosition: '0 0, 1px 1px',
      fontFamily: "'Inter', system-ui, sans-serif",
      overflowX: 'hidden',
      position: 'relative',
    }}>

      {/* Floating supplies */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {floaters.map((f, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: f.top,
            left: f.left,
            fontSize: f.size,
            transform: `rotate(${f.rot}deg)`,
            animation: `${i % 2 === 0 ? 'floatA' : 'floatB'} ${f.dur}s ease-in-out infinite`,
            animationDelay: `${f.delay}s`,
            opacity: 0.6,
          }}>
            {f.emoji}
          </div>
        ))}
      </div>

      {/* Nav */}
      <header style={{
        position: 'relative', zIndex: 30,
        maxWidth: 1280, margin: '0 auto',
        padding: '24px 40px 0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: '#312E81', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: 'rotate(-8deg)',
            boxShadow: '0 6px 0 -2px #1F1B5C',
            position: 'relative', flexShrink: 0,
          }}>
            <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#FBF6EC', fontSize: 22, lineHeight: 1 }}>i</span>
            <span style={{ position: 'absolute', top: -4, right: -4, width: 12, height: 12, borderRadius: '50%', background: '#F59E0B' }} />
          </div>
          <div style={{ lineHeight: 1 }}>
            <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 22 }}>inkblot</div>
            <div style={{ fontFamily: "'Caveat', cursive", color: '#5A5275', fontSize: 13, marginTop: -2 }}>draw • guess • repeat</div>
          </div>
        </div>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(16px)', borderRadius: 999, padding: '6px 8px', border: '1px solid rgba(255,255,255,0.6)' }}>
          {['How it works', 'Leaderboard', 'Changelog'].map(l => (
            <a key={l} href="#" style={{
              padding: '6px 14px', fontSize: 13, fontWeight: 500,
              color: '#2A2545', borderRadius: 999, textDecoration: 'none',
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.8)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >{l}</a>
          ))}
        </nav>
      </header>

      {/* Main layout */}
      <main style={{
        position: 'relative', zIndex: 10,
        maxWidth: 1280, margin: '0 auto',
        padding: '56px 40px 40px',
        display: 'grid',
        gridTemplateColumns: '1.1fr minmax(0, 440px)',
        gap: 64,
        alignItems: 'center',
      }}>

        {/* Hero */}
        <div>
          <h1 style={{
            fontFamily: "'Fredoka', sans-serif",
            fontWeight: 700,
            color: '#1B1830',
            fontSize: 'clamp(3rem, 7vw, 6.5rem)',
            lineHeight: 0.95,
            letterSpacing: '-0.02em',
            margin: 0,
          }}>
            Doodle it.<br />
            <span style={{ position: 'relative', display: 'inline-block' }}>
              <span style={{ position: 'relative', zIndex: 1 }}>Guess it.</span>
              <span style={{
                position: 'absolute', left: 0, right: 0, bottom: '0.12em', height: '0.5em',
                background: 'linear-gradient(90deg, transparent 0%, #FCD34D 18%, #FCD34D 80%, transparent 100%)',
                transform: 'skewX(-6deg)',
                borderRadius: 999,
                zIndex: 0,
              }} />
            </span>
            <br />
            <span style={{ fontFamily: "'Caveat', cursive", color: '#F59E0B', fontWeight: 400, fontSize: '1em' }}>
              be the loudest pencil.
            </span>
          </h1>

          <p style={{ marginTop: 28, maxWidth: 480, color: '#2A2545', fontSize: 17, lineHeight: 1.7 }}>
            A real-time scribble battle for friends, randos & the chronically online.
            One pencil. Sixty seconds. Today's secret word is{' '}
            <span style={{
              fontFamily: "'Caveat', cursive",
              color: '#F59E0B', fontWeight: 700, fontSize: '1.15em',
              display: 'inline-block',
              transition: 'opacity 0.3s, transform 0.3s',
              opacity: wordVisible ? 1 : 0,
              transform: wordVisible ? 'translateY(0)' : 'translateY(8px)',
            }}>
              "{WORDS[wordIdx]}"
            </span>
            <span style={{ animation: 'blink 1s steps(1) infinite', marginLeft: 1 }}>|</span>
          </p>

          <div style={{ marginTop: 36, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {[
              { dot: '#10B981', value: '2,841', label: 'drawing right now' },
              { dot: '#F59E0B', value: '184',   label: 'rooms open' },
              { dot: '#EC4899', value: '12,431', label: 'doodles today' },
            ].map(s => (
              <div key={s.label} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.8)',
                borderRadius: 999, padding: '8px 14px',
                boxShadow: '0 2px 8px rgba(31,27,92,0.08)',
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
                <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 600, color: '#1B1830', fontSize: 15 }}>{s.value}</span>
                <span style={{ fontSize: 12, color: '#5A5275' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Auth Card */}
        <div style={{ position: 'relative', width: '100%', maxWidth: 440 }}>
          {/* Tape strips */}
          <div style={{ position: 'absolute', top: -12, left: 32, width: 64, height: 20, background: 'rgba(252,211,77,0.8)', transform: 'rotate(-6deg)', borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', zIndex: 20 }} />
          <div style={{ position: 'absolute', top: -8, right: 40, width: 48, height: 20, background: 'rgba(236,72,153,0.35)', transform: 'rotate(8deg)', borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', zIndex: 20 }} />

          <div style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.78), rgba(255,255,255,0.5))',
            backdropFilter: 'blur(16px) saturate(140%)',
            WebkitBackdropFilter: 'blur(16px) saturate(140%)',
            border: '1px solid rgba(255,255,255,0.65)',
            boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 30px 60px -20px rgba(31,27,92,0.22)',
            borderRadius: 24, padding: 28,
          }}>
            {/* Card header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: "'Caveat', cursive", color: '#F59E0B', fontSize: 22, lineHeight: 1, marginBottom: 2 }}>welcome to</div>
                <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 22 }}>the sketchbook</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: '#5A5275', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Page</div>
                <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#5A5275', fontSize: 16 }}>01 / 04</div>
              </div>
            </div>

            {/* Mode toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: 4, background: 'rgba(27,24,48,0.05)', borderRadius: 16, marginBottom: 24, position: 'relative' }}>
              <div style={{
                position: 'absolute', top: 4, bottom: 4,
                width: 'calc(50% - 6px)',
                left: mode === 'login' ? 4 : 'calc(50% + 2px)',
                background: '#fff',
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)',
              }} />
              {(['login', 'signup'] as Mode[]).map(m => (
                <button key={m} onClick={() => switchMode(m)} style={{
                  position: 'relative', zIndex: 1,
                  padding: '10px 0',
                  fontFamily: "'Fredoka', sans-serif", fontWeight: 600,
                  fontSize: 15,
                  color: mode === m ? '#312E81' : '#5A5275',
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderRadius: 12, transition: 'color 0.2s',
                  textTransform: 'capitalize',
                }}>
                  {m === 'login' ? 'Log in' : 'Sign up'}
                </button>
              ))}
            </div>

            {/* General error */}
            {errors.general && (
              <div style={{
                background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.3)',
                borderRadius: 10, padding: '10px 14px', marginBottom: 16,
                color: '#9D174D', fontSize: 13, fontWeight: 500,
              }}>
                {errors.general}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Username field — signup only */}
              <div style={{
                overflow: 'hidden',
                maxHeight: mode === 'signup' ? 100 : 0,
                opacity: mode === 'signup' ? 1 : 0,
                transition: 'max-height 0.35s ease, opacity 0.25s ease',
              }}>
                <FormField
                  label="Nickname"
                  type="text"
                  value={form.username}
                  onChange={v => setField('username', v)}
                  onBlur={() => blurField('username')}
                  error={errors.username}
                  touched={touched.username}
                  placeholder="your_username"
                  autoComplete="nickname"
                  icon="👤"
                />
              </div>

              <FormField
                label="Email"
                type="email"
                value={form.email}
                onChange={v => setField('email', v)}
                onBlur={() => blurField('email')}
                error={errors.email}
                touched={touched.email}
                placeholder="you@example.com"
                autoComplete="email"
                icon="✉️"
              />

              <div>
                <FormField
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={v => setField('password', v)}
                  onBlur={() => blurField('password')}
                  error={errors.password}
                  touched={touched.password}
                  placeholder="min 8 characters"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  icon="🔒"
                  rightElement={
                    <button type="button" onClick={() => setShowPassword(s => !s)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#5A5275', fontSize: 14, padding: '0 4px',
                    }}>
                      {showPassword ? 'hide' : 'show'}
                    </button>
                  }
                />

                {/* Password strength bar — signup only */}
                {mode === 'signup' && form.password && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                      {[0, 1, 2, 3].map(i => (
                        <div key={i} style={{ height: 4, borderRadius: 999, background: passwordStrength > i ? strengthColors[passwordStrength] : 'rgba(27,24,48,0.1)', transition: 'background 0.3s' }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#5A5275', minWidth: 40, textAlign: 'right' }}>
                      {strengthLabels[passwordStrength]}
                    </span>
                  </div>
                )}
              </div>

              {/* Remember me / Forgot — login only */}
              {mode === 'login' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#2A2545', cursor: 'pointer' }}>
                    <input type="checkbox" style={{ accentColor: '#312E81', width: 14, height: 14 }} />
                    Keep me sketching
                  </label>
                  <a href="#" style={{ fontSize: 13, fontWeight: 600, color: '#312E81', textDecoration: 'none' }}>Forgot?</a>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 17,
                  color: '#FBF6EC',
                  background: submitting ? '#5A5275' : '#312E81',
                  border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
                  padding: '14px 0',
                  borderRadius: 16,
                  boxShadow: submitting ? 'none' : '0 6px 0 -1px #1F1B5C',
                  transition: 'background 0.2s, box-shadow 0.2s, transform 0.1s',
                  transform: submitting ? 'translateY(2px)' : 'translateY(0)',
                  marginTop: 4,
                }}
              >
                {submitting ? (
                  <>
                    <span style={{
                      width: 16, height: 16, borderRadius: '50%',
                      border: '2px solid rgba(251,246,236,0.3)',
                      borderTopColor: '#FBF6EC',
                      animation: 'spin 0.7s linear infinite',
                      display: 'inline-block',
                    }} />
                    Sharpening pencils…
                  </>
                ) : (
                  <>
                    {mode === 'login' ? '⚡ Take me to my room' : '✏️ Create my sketchbook'}
                  </>
                )}
              </button>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(27,24,48,0.1)' }} />
                <span style={{ fontFamily: "'Caveat', cursive", color: '#5A5275', fontSize: 16 }}>or</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(27,24,48,0.1)' }} />
              </div>

              {/* Guest button */}
              <button
                type="button"
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(27,24,48,0.1)',
                  borderRadius: 16, padding: '12px 0',
                  fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 15,
                  color: '#1B1830', cursor: 'pointer',
                }}
              >
                👥 Play as a guest
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', background: 'rgba(252,211,77,0.6)', padding: '2px 6px', borderRadius: 4 }}>
                  no email
                </span>
              </button>
            </form>

            <p style={{ marginTop: 16, fontSize: 12, color: '#5A5275', textAlign: 'center', lineHeight: 1.5 }}>
              By {mode === 'signup' ? 'signing up' : 'logging in'}, you agree to keep your drawings{' '}
              <strong style={{ color: '#1B1830' }}>mostly</strong> wholesome.
            </p>
          </div>

          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12, color: '#5A5275', fontWeight: 500 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
            end-to-end encrypted lobbies · no ads · open source
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        position: 'relative', zIndex: 10,
        maxWidth: 1280, margin: '0 auto',
        padding: '24px 40px',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        fontSize: 13, color: '#5A5275',
        borderTop: '1px solid rgba(27,24,48,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B' }} />
          © 2026 inkblot studios — handcrafted with tea
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          {['Privacy', 'Rules', 'Discord', 'v0.3.1'].map(l => (
            <a key={l} href="#" style={{ color: '#5A5275', textDecoration: 'none' }}>{l}</a>
          ))}
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Caveat:wght@500;700&display=swap');
        @keyframes floatA { 0%,100% { transform: translateY(0) rotate(var(--r,0deg)); } 50% { transform: translateY(-12px) rotate(calc(var(--r,0deg) + 6deg)); } }
        @keyframes floatB { 0%,100% { transform: translateY(0) rotate(var(--r,0deg)); } 50% { transform: translateY(10px) rotate(calc(var(--r,0deg) - 5deg)); } }
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        ::selection { background: #F59E0B; color: #1B1830; }
        * { box-sizing: border-box; }
        @media (max-width: 900px) {
          main { grid-template-columns: 1fr !important; padding: 32px 20px 20px !important; }
          header { padding: 20px 20px 0 !important; }
          header nav { display: none !important; }
          footer { padding: 20px !important; }
        }
      `}</style>
    </div>
  )
}

// ─── Reusable form field component ────────────────────────────────────────────
interface FormFieldProps {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  onBlur: () => void
  error?: string
  touched?: boolean
  placeholder?: string
  autoComplete?: string
  icon?: string
  rightElement?: React.ReactNode
}

function FormField({ label, type, value, onChange, onBlur, error, touched, placeholder, autoComplete, icon, rightElement }: FormFieldProps) {
  const [focused, setFocused] = useState(false)
  const bad = touched && error
  const ok = touched && !error && value

  return (
    <div>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 11, fontWeight: 700, color: '#5A5275',
        textTransform: 'uppercase', letterSpacing: '0.1em',
        marginBottom: 6,
      }}>
        {label}
        {ok && <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#10B981', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff' }}>✓</span>}
      </label>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(255,255,255,0.8)',
        border: `1px solid ${bad ? 'rgba(236,72,153,0.7)' : focused ? 'rgba(49,46,129,0.7)' : 'rgba(27,24,48,0.1)'}`,
        borderRadius: 12,
        boxShadow: bad ? '0 0 0 3px rgba(236,72,153,0.12)' : focused ? '0 0 0 3px rgba(49,46,129,0.12)' : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        paddingLeft: 12,
      }}>
        {icon && <span style={{ fontSize: 15, opacity: 0.7, flexShrink: 0 }}>{icon}</span>}
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); onBlur() }}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            padding: '11px 0', fontSize: 15, color: '#1B1830',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        />
        {rightElement && <div style={{ paddingRight: 8 }}>{rightElement}</div>}
      </div>
      {bad && (
        <p style={{ margin: '4px 0 0 4px', fontSize: 12, color: '#EC4899', fontWeight: 500 }}>{error}</p>
      )}
    </div>
  )
}

// ─── Exported page — wraps in Suspense for useSearchParams ───────────────────
export default function Page() {
  return (
    <Suspense>
      <LandingPage />
    </Suspense>
  )
}