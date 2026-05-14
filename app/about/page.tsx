'use client'

import { useState } from 'react'

const Icon = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

export default function AboutPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) return
    setSending(true)
    // Simulate send — in production wire to Resend or similar
    await new Promise(r => setTimeout(r, 900))
    setSending(false)
    setSent(true)
  }

  const features = [
    { icon: '🎨', title: 'Real-time Drawing', desc: 'Draw on a shared canvas and watch strokes appear live for every player in the room.' },
    { icon: '💬', title: 'Live Guessing', desc: 'Type guesses in chat — the faster you guess, the more points you earn.' },
    { icon: '🔒', title: 'Private Rooms', desc: 'Password-protect your room and share the ID with only the people you want.' },
    { icon: '👥', title: 'Friends System', desc: 'Add friends, send game invites, and track each other across sessions.' },
    { icon: '🌟', title: 'Word of the Day', desc: 'A special word set daily by the admin. Guess it in any room for a bonus points boost.' },
    { icon: '👑', title: 'Admin Panel', desc: 'Full user management, word bank editing, and Word of the Day scheduling.' },
  ]

  const stack = [
    { label: 'Frontend', value: 'Next.js 15, TypeScript, Tailwind CSS' },
    { label: 'Backend', value: 'Next.js API Routes, MongoDB Atlas' },
    { label: 'Real-time', value: 'Socket.IO on Railway' },
    { label: 'Auth', value: 'JWT (jose), bcryptjs' },
    { label: 'Hosting', value: 'Vercel + Railway' },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FBF6EC',
      backgroundImage: `radial-gradient(rgba(27,24,48,0.035) 1px, transparent 1px)`,
      backgroundSize: '4px 4px',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Nav */}
      <header style={{ borderBottom: '1px solid rgba(27,24,48,0.07)', background: 'rgba(251,246,236,0.9)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 32px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: '#312E81', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-6deg)', boxShadow: '0 4px 0 -1px #1F1B5C', position: 'relative' }}>
              <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#FBF6EC', fontSize: 17 }}>i</span>
              <span style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, borderRadius: '50%', background: '#F59E0B' }} />
            </div>
            <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 18 }}>inkblot</span>
          </a>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href="/" style={{ padding: '7px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600, color: '#2A2545', textDecoration: 'none', background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(27,24,48,0.1)' }}>← Back to login</a>
            <a href="/lobby" style={{ padding: '7px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600, color: '#FBF6EC', textDecoration: 'none', background: '#312E81', border: 'none' }}>Play now</a>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 32px 80px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 72 }}>
          <div style={{ fontFamily: "'Caveat', cursive", color: '#F59E0B', fontSize: 22, marginBottom: 8 }}>the story behind the scribbles —</div>
          <h1 style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 'clamp(2.4rem,5vw,4rem)', margin: '0 0 20px', lineHeight: 1 }}>
            About inkblot
          </h1>
          <p style={{ color: '#5A5275', fontSize: 17, lineHeight: 1.75, maxWidth: 580, margin: '0 auto' }}>
            inkblot is a real-time multiplayer drawing and guessing game built by two CS students at FAST-NUCES Islamabad as a Web Programming course project. It's our love letter to Skribbl.io — rebuilt from scratch with a modern stack.
          </p>
        </div>

        {/* Team */}
        <div style={{ marginBottom: 72 }}>
          <h2 style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 28, marginBottom: 24, textAlign: 'center' }}>The Team</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 640, margin: '0 auto' }}>
            {[
              { name: 'Shahmeer Atif', roll: '23i-0711', role: 'Full-stack dev', emoji: '🖌️' },
              { name: 'Muhammad Umar', roll: '23i-0782', role: 'Full-stack dev', emoji: '⚡' },
            ].map(m => (
              <div key={m.roll} style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.85),rgba(255,255,255,0.6))', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.7)', borderRadius: 20, padding: '28px 24px', textAlign: 'center', boxShadow: '0 2px 16px rgba(31,27,92,0.08)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>{m.emoji}</div>
                <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 20, marginBottom: 4 }}>{m.name}</div>
                <div style={{ fontSize: 13, color: '#312E81', fontWeight: 600, marginBottom: 4 }}>{m.roll}</div>
                <div style={{ fontSize: 12, color: '#5A5275' }}>{m.role}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div style={{ marginBottom: 72 }}>
          <h2 style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 28, marginBottom: 8, textAlign: 'center' }}>What's inside</h2>
          <p style={{ color: '#5A5275', fontSize: 15, textAlign: 'center', marginBottom: 32 }}>Everything we built into inkblot</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {features.map(f => (
              <div key={f.title} style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.85),rgba(255,255,255,0.55))', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.7)', borderRadius: 16, padding: '20px 18px', boxShadow: '0 1px 8px rgba(31,27,92,0.06)' }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{f.icon}</div>
                <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 16, marginBottom: 6 }}>{f.title}</div>
                <div style={{ color: '#5A5275', fontSize: 13, lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tech stack */}
        <div style={{ marginBottom: 72 }}>
          <h2 style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 28, marginBottom: 24, textAlign: 'center' }}>Tech Stack</h2>
          <div style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.85),rgba(255,255,255,0.6))', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.7)', borderRadius: 20, padding: '8px 0', maxWidth: 560, margin: '0 auto', boxShadow: '0 2px 16px rgba(31,27,92,0.08)' }}>
            {stack.map((s, i) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 24px', borderBottom: i < stack.length - 1 ? '1px solid rgba(27,24,48,0.06)' : 'none' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#5A5275', textTransform: 'uppercase', letterSpacing: '0.1em', width: 80, flexShrink: 0 }}>{s.label}</span>
                <span style={{ fontSize: 14, color: '#1B1830', fontWeight: 500 }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Contact form */}
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 28, marginBottom: 8, textAlign: 'center' }}>Get in touch</h2>
          <p style={{ color: '#5A5275', fontSize: 15, textAlign: 'center', marginBottom: 32 }}>Bug report, feedback, or just saying hi — we'd love to hear from you.</p>

          <div style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.85),rgba(255,255,255,0.6))', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.7)', borderRadius: 22, padding: 28, boxShadow: '0 2px 16px rgba(31,27,92,0.08)', position: 'relative' }}>
            {/* tape strip */}
            <div style={{ position: 'absolute', top: -10, left: 28, width: 56, height: 18, background: 'rgba(252,211,77,0.85)', transform: 'rotate(-5deg)', borderRadius: 2, zIndex: 2 }} />

            {sent ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✉️</div>
                <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 22, marginBottom: 8 }}>Message sent!</div>
                <div style={{ color: '#5A5275', fontSize: 14 }}>Thanks for reaching out. We'll get back to you soon.</div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'Name', key: 'name', type: 'text', placeholder: 'Your name' },
                    { label: 'Email', key: 'email', type: 'email', placeholder: 'you@example.com' },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5A5275', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{f.label}</label>
                      <input
                        type={f.type}
                        value={form[f.key as keyof typeof form]}
                        onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(27,24,48,0.1)', borderRadius: 11, fontSize: 14, color: '#1B1830', outline: 'none', fontFamily: "'Inter',sans-serif", boxSizing: 'border-box' }}
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5A5275', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Message</label>
                  <textarea
                    value={form.message}
                    onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                    placeholder="What's on your mind?"
                    rows={4}
                    style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(27,24,48,0.1)', borderRadius: 11, fontSize: 14, color: '#1B1830', outline: 'none', fontFamily: "'Inter',sans-serif", resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>
                <button type="submit" disabled={sending || !form.name || !form.email || !form.message} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: sending || !form.name || !form.email || !form.message ? '#5A5275' : '#312E81', color: '#FBF6EC', border: 'none', borderRadius: 14, padding: '13px 0', fontFamily: "'Fredoka',sans-serif", fontWeight: 600, fontSize: 16, cursor: sending || !form.name || !form.email || !form.message ? 'not-allowed' : 'pointer', boxShadow: '0 5px 0 -1px #1F1B5C', marginTop: 4 }}>
                  {sending ? (
                    <><span style={{ width: 15, height: 15, borderRadius: '50%', border: '2px solid rgba(251,246,236,0.3)', borderTopColor: '#FBF6EC', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Sending…</>
                  ) : '📬 Send message'}
                </button>
              </form>
            )}
          </div>

          {/* Direct contact */}
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
            <a href="https://github.com/Shahmeer-Atif/WEB_Project" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#5A5275', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z"/></svg>
              GitHub
            </a>
            <span style={{ color: '#5A5275', fontSize: 13, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Icon d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6" size={15} />
              i230711@isb.nu.edu.pk
            </span>
          </div>
        </div>
      </main>

      <footer style={{ borderTop: '1px solid rgba(27,24,48,0.07)', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: '#5A5275', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: '#F59E0B' }} />© 2026 inkblot studios</div>
        <a href="/" style={{ color: '#5A5275', textDecoration: 'none' }}>← Back to login</a>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Caveat:wght@500;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        @media (max-width: 720px) {
          div[style*="grid-template-columns: repeat(3"] { grid-template-columns: 1fr !important; }
          div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
          main { padding: 40px 20px 60px !important; }
          header > div { padding: 0 16px !important; }
        }
      `}</style>
    </div>
  )
}