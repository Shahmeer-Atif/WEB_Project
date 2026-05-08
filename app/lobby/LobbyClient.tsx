'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { JWTPayload } from '@/lib/jwt'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props {
  user: JWTPayload
}

interface RoomSettings {
  name: string
  maxPlayers: number
  rounds: number
  drawTime: number
  isPrivate: boolean
}

const WORD_OF_DAY = 'PARADOX'

// ─── Icon helper ──────────────────────────────────────────────────────────────
const Icon = ({ path, size = 18 }: { path: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
)

const ICONS = {
  bolt:    'M13 2 4 14h7l-1 8 9-12h-7l1-8Z',
  plus:    'M12 5v14M5 12h14',
  fire:    'M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 1-5 2 1 3 0 4-5Z',
  trophy:  'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM17 5h3v3a3 3 0 0 1-3 3M7 5H4v3a3 3 0 0 0 3 3',
  users:   'M16 11a3.5 3.5 0 1 0 0-7M22 20a6.5 6.5 0 0 0-5-6.3M9 8a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0ZM2.5 20a6.5 6.5 0 0 1 13 0',
  bell:    'M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 21a2 2 0 0 0 4 0',
  coin:    'M12 3a9 9 0 1 0 0 18A9 9 0 0 0 12 3ZM9 9h4a2 2 0 0 1 0 4H9m0 0h5a2 2 0 0 1 0 4H9m1-8v10',
  sparkle: 'M12 3v4M12 17v4M3 12h4M17 12h4m-13.4-6.4 2.8 2.8m7.2 7.2 2.8 2.8m0-12.8-2.8 2.8m-7.2 7.2-2.8 2.8',
  lock:    'M4 11h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V11ZM8 11V7a4 4 0 0 1 8 0v4',
  globe:   'M12 3a9 9 0 1 0 0 18A9 9 0 0 0 12 3ZM3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z',
  dice:    'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z',
  arrow:   'M5 12h14m-6-7 7 7-7 7',
  logout:  'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  shield:  'M12 2l8 4v6c0 5-3.3 9.3-8 11-4.7-1.7-8-6-8-11V6l8-4Z',
}

// ─── Wordmark ─────────────────────────────────────────────────────────────────
const Wordmark = () => (
  <a href="/lobby" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
    <div style={{
      width: 36, height: 36, borderRadius: 10, background: '#312E81',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transform: 'rotate(-6deg)', boxShadow: '0 5px 0 -2px #1F1B5C',
      position: 'relative', flexShrink: 0, transition: 'transform 0.2s',
    }}>
      <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#FBF6EC', fontSize: 20, lineHeight: 1 }}>i</span>
      <span style={{ position: 'absolute', top: -3, right: -3, width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} />
    </div>
    <div style={{ lineHeight: 1 }}>
      <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 20 }}>inkblot</div>
      <div style={{ fontFamily: "'Caveat', cursive", color: '#5A5275', fontSize: 12, marginTop: -1 }}>draw • guess • repeat</div>
    </div>
  </a>
)

// ─── Top Nav ──────────────────────────────────────────────────────────────────
const TopNav = ({ user, onLogout }: { user: JWTPayload; onLogout: () => void }) => (
  <header style={{
    position: 'relative', zIndex: 30,
    maxWidth: 1280, margin: '0 auto',
    padding: '20px 40px 0',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  }}>
    <Wordmark />
    <nav style={{
      display: 'flex', alignItems: 'center', gap: 2,
      background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)',
      borderRadius: 999, padding: '6px 8px',
      border: '1px solid rgba(255,255,255,0.6)',
    }}>
      {[
        { label: 'Home', href: '/lobby', active: true },
        { label: 'Play', href: '#' },
        ...(user.role === 'admin' ? [{ label: 'Admin', href: '/admin' }] : []),
      ].map(l => (
        <a key={l.label} href={l.href} style={{
          padding: '6px 14px', fontSize: 13, fontWeight: 600,
          borderRadius: 999, textDecoration: 'none', transition: 'background 0.15s',
          background: l.active ? '#1B1830' : 'transparent',
          color: l.active ? '#FBF6EC' : '#2A2545',
        }}>
          {l.label}
        </a>
      ))}
    </nav>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {/* Coins */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(252,211,77,0.4)', border: '1px solid rgba(245,158,11,0.3)',
        borderRadius: 999, padding: '6px 12px',
      }}>
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" /><path d="M9 9h4a2 2 0 0 1 0 4H9m0 0h5a2 2 0 0 1 0 4H9m1-8v10" />
        </svg>
        <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 14 }}>2,480</span>
      </div>
      {/* User pill */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(27,24,48,0.1)',
        borderRadius: 999, padding: '4px 12px 4px 4px',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: '#312E81', color: '#FBF6EC',
          fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 13,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {user.username[0].toUpperCase()}
        </div>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1B1830' }}>@{user.username}</div>
          <div style={{ fontSize: 10, color: '#5A5275' }}>
            {user.role === 'admin' ? '👑 Admin' : 'Lvl 1 · Sketcher'}
          </div>
        </div>
      </div>
      {/* Logout */}
      <button onClick={onLogout} title="Log out" style={{
        width: 34, height: 34, borderRadius: '50%',
        background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(27,24,48,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: '#5A5275',
      }}>
        <Icon path={ICONS.logout} size={15} />
      </button>
    </div>
  </header>
)

// ─── Quick Play Card ──────────────────────────────────────────────────────────
const QuickPlayCard = ({ onQuickPlay, searching }: { onQuickPlay: () => void; searching: boolean }) => (
  <div style={{
    background: 'linear-gradient(180deg, rgba(255,255,255,0.78), rgba(255,255,255,0.5))',
    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.65)',
    boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 30px 60px -20px rgba(31,27,92,0.22)',
    borderRadius: 24, padding: '28px 32px',
    position: 'relative', overflow: 'hidden',
  }}>
    {/* Tape */}
    <div style={{ position: 'absolute', top: -8, left: 40, width: 64, height: 20, background: 'rgba(252,211,77,0.8)', transform: 'rotate(-6deg)', borderRadius: 2, zIndex: 20 }} />
    {/* Decorative blob */}
    <svg viewBox="0 0 200 200" style={{ position: 'absolute', right: -48, bottom: -48, width: 280, height: 280, opacity: 0.15, pointerEvents: 'none' }}>
      <path d="M100 10c25 5 60 0 70 30s-10 50 0 80-30 60-60 60-70-10-80-40 10-50-10-80 50-55 80-50z" fill="#312E81" />
    </svg>

    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
      <div>
        <div style={{ fontFamily: "'Caveat', cursive", color: '#F59E0B', fontSize: 22, lineHeight: 1, marginBottom: 2 }}>jump straight in →</div>
        <h2 style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 32, margin: 0 }}>Quick Play</h2>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(16,185,129,0.12)', color: '#10B981',
        borderRadius: 999, padding: '6px 12px', fontSize: 12, fontWeight: 600,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', animation: 'pulse 2s infinite' }} />
        184 rooms · &lt;5s wait
      </div>
    </div>

    <p style={{ color: '#2A2545', fontSize: 15, marginBottom: 28, maxWidth: 440, lineHeight: 1.6 }}>
      We'll drop you into the next available room. 60-second rounds, 8 players, random words.{' '}
      <span style={{ fontFamily: "'Caveat', cursive", color: '#1B1830', fontSize: 18 }}>no thinking required.</span>
    </p>

    <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
      {/* Big pulse button */}
      <button onClick={onQuickPlay} style={{
        position: 'relative', width: 144, height: 144,
        background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
      }}>
        <span style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: 'rgba(245,158,11,0.35)',
          animation: 'pulseRing 2s cubic-bezier(.3,.6,.4,1) infinite',
        }} />
        <span style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: 'rgba(245,158,11,0.25)',
          animation: 'pulseRing 2s cubic-bezier(.3,.6,.4,1) infinite',
          animationDelay: '0.7s',
        }} />
        <span style={{
          position: 'absolute', inset: '10px',
          borderRadius: '50%', background: '#312E81',
          boxShadow: '0 10px 0 -2px #1F1B5C',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          color: '#FBF6EC', transition: 'transform 0.15s',
        }}>
          <Icon path={ICONS.bolt} size={26} />
          <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 20, lineHeight: 1, marginTop: 2 }}>
            {searching ? 'Stop' : 'Play'}
          </span>
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.7, marginTop: 2 }}>
            {searching ? 'searching…' : 'tap to start'}
          </span>
        </span>
      </button>

      {/* Stats */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 180 }}>
        {[
          { label: 'Avg. round', value: '1m 12s' },
          { label: 'Top streak today', value: '@huxley · 9 wins' },
          { label: 'Your rank', value: '#142 (climbing ↑)' },
        ].map(s => (
          <div key={s.label} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(255,255,255,0.5)', borderRadius: 12,
            padding: '10px 14px', border: '1px solid rgba(255,255,255,0.6)',
          }}>
            <span style={{ fontSize: 13, color: '#5A5275' }}>{s.label}</span>
            <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 600, color: '#1B1830', fontSize: 14 }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
)

// ─── Custom Room Card ─────────────────────────────────────────────────────────
const CustomRoomCard = ({ onCreateRoom }: { onCreateRoom: (s: RoomSettings) => void }) => {
  const [settings, setSettings] = useState<RoomSettings>({
    name: "my sketchbook",
    maxPlayers: 8,
    rounds: 5,
    drawTime: 60,
    isPrivate: false,
  })
  const [creating, setCreating] = useState(false)

  const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick} style={{
      padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
      border: active ? '1px solid #1B1830' : '1px solid rgba(27,24,48,0.1)',
      background: active ? '#1B1830' : 'rgba(255,255,255,0.6)',
      color: active ? '#FBF6EC' : '#5A5275',
      cursor: 'pointer', boxShadow: active ? '0 3px 0 -1px #000' : 'none',
      transition: 'all 0.15s',
    }}>{children}</button>
  )

  const handleCreate = async () => {
    setCreating(true)
    await onCreateRoom(settings)
    setCreating(false)
  }

  return (
    <div style={{
      background: 'linear-gradient(180deg, rgba(255,255,255,0.78), rgba(255,255,255,0.5))',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.65)',
      boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 30px 60px -20px rgba(31,27,92,0.22)',
      borderRadius: 24, padding: '28px 32px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "'Caveat', cursive", color: '#EC4899', fontSize: 20, lineHeight: 1, marginBottom: 2 }}>build your own —</div>
          <h2 style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 24, margin: 0 }}>Create Custom Room</h2>
        </div>
        <button
          onClick={() => setSettings(s => ({ ...s, name: ['maple\'s atelier', 'sketchy business', 'doodle zone', 'art attack'][Math.floor(Math.random() * 4)] }))}
          title="Randomize name"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5A5275', padding: 6 }}
        >
          <Icon path={ICONS.dice} size={18} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Room name */}
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5A5275', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Room name</label>
          <input
            value={settings.name}
            onChange={e => setSettings(s => ({ ...s, name: e.target.value }))}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.8)',
              border: '1px solid rgba(27,24,48,0.1)', borderRadius: 12,
              padding: '10px 14px', fontSize: 14, color: '#1B1830',
              outline: 'none', fontFamily: "'Inter', sans-serif",
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Players + Rounds */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5A5275', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Players</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[4, 6, 8, 12].map(n => <Chip key={n} active={settings.maxPlayers === n} onClick={() => setSettings(s => ({ ...s, maxPlayers: n }))}>{n}</Chip>)}
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5A5275', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Rounds</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[3, 5, 8, 10].map(n => <Chip key={n} active={settings.rounds === n} onClick={() => setSettings(s => ({ ...s, rounds: n }))}>{n}</Chip>)}
            </div>
          </div>
        </div>

        {/* Draw time slider */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: '#5A5275', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
            <span>Draw time</span>
            <span style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 16, color: '#1B1830', textTransform: 'none', letterSpacing: 0 }}>{settings.drawTime}s</span>
          </label>
          <input
            type="range" min={30} max={120} step={10} value={settings.drawTime}
            onChange={e => setSettings(s => ({ ...s, drawTime: Number(e.target.value) }))}
            style={{ width: '100%', accentColor: '#312E81' }}
          />
        </div>

        {/* Privacy toggle */}
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5A5275', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Privacy</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: 4, background: 'rgba(27,24,48,0.05)', borderRadius: 14, position: 'relative' }}>
            <div style={{
              position: 'absolute', top: 4, bottom: 4,
              width: 'calc(50% - 6px)',
              left: !settings.isPrivate ? 4 : 'calc(50% + 2px)',
              background: '#fff', borderRadius: 10,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)',
            }} />
            {[
              { label: '🌐 Public', value: false },
              { label: '🔒 Private', value: true },
            ].map(opt => (
              <button key={String(opt.value)} onClick={() => setSettings(s => ({ ...s, isPrivate: opt.value }))} style={{
                position: 'relative', zIndex: 1, padding: '8px 0',
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 14,
                color: settings.isPrivate === opt.value ? '#312E81' : '#5A5275',
                transition: 'color 0.2s',
              }}>{opt.label}</button>
            ))}
          </div>
        </div>

        {/* Create button */}
        <button
          onClick={handleCreate}
          disabled={creating}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: creating ? '#5A5275' : '#312E81',
            color: '#FBF6EC', border: 'none', cursor: creating ? 'not-allowed' : 'pointer',
            fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 17,
            padding: '14px 0', borderRadius: 16,
            boxShadow: creating ? 'none' : '0 6px 0 -1px #1F1B5C',
            transition: 'background 0.2s',
            marginTop: 4,
          }}
        >
          <Icon path={ICONS.plus} size={18} />
          {creating ? 'Opening room…' : 'Open the room'}
          {!creating && <Icon path={ICONS.arrow} size={18} />}
        </button>
      </div>
    </div>
  )
}

// ─── Word of the Day ──────────────────────────────────────────────────────────
const WordOfDay = () => {
  const [revealed, setRevealed] = useState<boolean[]>(Array(WORD_OF_DAY.length).fill(false))

  useEffect(() => {
    WORD_OF_DAY.split('').forEach((_, i) => {
      setTimeout(() => setRevealed(r => r.map((v, idx) => idx <= i ? true : v)), 300 + i * 180)
    })
  }, [])

  return (
    <div style={{
      background: '#312E81', borderRadius: 24, padding: '24px 28px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.08, backgroundImage: 'radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '5px 5px', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: -24, right: -24, width: 112, height: 112, borderRadius: '50%', background: 'rgba(245,158,11,0.25)', filter: 'blur(20px)' }} />

      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Icon path={ICONS.sparkle} size={16} />
          <span style={{ fontFamily: "'Caveat', cursive", color: 'rgba(252,211,77,0.9)', fontSize: 20 }}>word of the day</span>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {WORD_OF_DAY.split('').map((ch, i) => (
            <div key={i} style={{
              width: 40, height: 48, borderRadius: 8,
              background: revealed[i] ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${revealed[i] ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Fredoka', sans-serif", fontWeight: 700,
              fontSize: 22, color: '#FBF6EC',
              transition: 'background 0.4s, border 0.4s, opacity 0.4s',
              opacity: revealed[i] ? 1 : 0.3,
            }}>{ch}</div>
          ))}
        </div>

        <p style={{ color: 'rgba(251,246,236,0.7)', fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>
          Guess this in any room today and earn{' '}
          <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: 'rgba(252,211,77,0.9)' }}>+500 ink</span>
          {' '}on top of the round bonus.
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['7 letters', 'noun', 'resets in 14h 22m'].map(t => (
            <span key={t} style={{ background: 'rgba(255,255,255,0.1)', color: '#FBF6EC', fontSize: 11, padding: '4px 10px', borderRadius: 999 }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Streak Card ──────────────────────────────────────────────────────────────
const StreakCard = () => (
  <div style={{
    background: '#F4ECDA', border: '1px solid rgba(27,24,48,0.1)',
    borderRadius: 24, padding: '24px 28px', position: 'relative', overflow: 'hidden',
  }}>
    <div style={{ position: 'absolute', top: -16, right: -16, opacity: 0.15, color: '#F59E0B' }}>
      <Icon path={ICONS.fire} size={100} />
    </div>
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Icon path={ICONS.fire} size={16} />
        <h3 style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 18, margin: 0 }}>Daily streak</h3>
      </div>
      <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 52, lineHeight: 1, marginBottom: 4 }}>12</div>
      <div style={{ fontSize: 13, color: '#5A5275', marginBottom: 16 }}>days in a row</div>
      <div style={{ display: 'flex', gap: 4 }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i} style={{
            flex: 1, height: 32, borderRadius: 8,
            background: i < 5 ? '#F59E0B' : 'rgba(255,255,255,0.6)',
            border: i >= 5 ? '1px solid rgba(27,24,48,0.1)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700,
            color: i < 5 ? '#1B1830' : '#5A5275',
          }}>{d}</div>
        ))}
      </div>
      <p style={{ fontSize: 12, color: '#5A5275', marginTop: 10, marginBottom: 0 }}>Play 1 round today to extend.</p>
    </div>
  </div>
)

// ─── Activity Feed ────────────────────────────────────────────────────────────
const ActivityCard = () => {
  const items = [
    { who: '@huxley', verb: 'guessed', what: 'astronaut', pts: '+200', t: '2m' },
    { who: '@buns',   verb: 'drew',    what: 'volcano',   pts: '+80',  t: '7m' },
    { who: '@nori',   verb: 'won',     what: 'Round 5',   pts: '+450', t: '12m' },
    { who: 'you',     verb: 'unlocked',what: 'Ink Saint', pts: 'badge',t: '1h'  },
  ]
  return (
    <div style={{
      background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.7)', borderRadius: 24, padding: '24px 28px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 18, margin: 0 }}>Activity</h3>
        <a href="#" style={{ fontSize: 12, fontWeight: 600, color: '#312E81', textDecoration: 'none' }}>view all</a>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((a, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }} />
            <span style={{ flex: 1, color: '#2A2545' }}>
              <strong style={{ color: '#1B1830' }}>{a.who}</strong> {a.verb} <span style={{ fontFamily: "'Caveat', cursive", fontSize: 16, color: '#1B1830' }}>{a.what}</span>
            </span>
            <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 600, color: '#10B981', fontSize: 12 }}>{a.pts}</span>
            <span style={{ fontSize: 11, color: '#5A5275', minWidth: 24, textAlign: 'right' }}>{a.t}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Main Lobby Client ────────────────────────────────────────────────────────
export default function LobbyClient({ user }: Props) {
  const router = useRouter()
  const [searching, setSearching] = useState(false)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  const handleQuickPlay = () => {
    setSearching(s => !s)
    if (!searching) {
      // Simulate finding a room — in real app this calls Socket.IO
      setTimeout(() => {
        router.push('/room/quick-' + Math.random().toString(36).slice(2, 8))
      }, 1500)
    }
  }

  const handleCreateRoom = async (settings: RoomSettings) => {
    // TODO: POST /api/rooms to create room in DB, then redirect
    const roomId = 'room-' + Math.random().toString(36).slice(2, 8)
    router.push(`/room/${roomId}`)
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
    }}>
      <TopNav user={user} onLogout={handleLogout} />

      <main style={{
        maxWidth: 1280, margin: '0 auto',
        padding: '32px 40px 48px',
      }}>
        {/* Page heading */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: "'Caveat', cursive", color: '#F59E0B', fontSize: 24, lineHeight: 1, marginBottom: 4 }}>
            welcome back, {user.username} —
          </div>
          <h1 style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 'clamp(2rem, 4vw, 3.5rem)', margin: 0, lineHeight: 1.1 }}>
            your sketchbook is open.
          </h1>
        </div>

        {/* Two-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <QuickPlayCard onQuickPlay={handleQuickPlay} searching={searching} />
            <CustomRoomCard onCreateRoom={handleCreateRoom} />
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <WordOfDay />
            <StreakCard />
            <ActivityCard />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        maxWidth: 1280, margin: '0 auto',
        padding: '20px 40px',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        fontSize: 13, color: '#5A5275',
        borderTop: '1px solid rgba(27,24,48,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B' }} />
          © 2026 inkblot studios — handcrafted with tea
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          {['Privacy', 'Rules', 'Discord', ...(user.role === 'admin' ? ['Admin'] : []), 'v0.3.1'].map(l => (
            <a key={l} href={l === 'Admin' ? '/admin' : '#'} style={{ color: '#5A5275', textDecoration: 'none' }}>{l}</a>
          ))}
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Caveat:wght@500;700&display=swap');
        @keyframes pulseRing { 0% { transform: scale(.95); opacity: .55; } 70% { transform: scale(1.4); opacity: 0; } 100% { transform: scale(1.4); opacity: 0; } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        * { box-sizing: border-box; }
        input[type=range] { cursor: pointer; }
        @media (max-width: 900px) {
          main > div:last-child { grid-template-columns: 1fr !important; }
          main { padding: 24px 20px 40px !important; }
          header { padding: 16px 20px 0 !important; }
          footer { padding: 16px 20px !important; }
        }
      `}</style>
    </div>
  )
}