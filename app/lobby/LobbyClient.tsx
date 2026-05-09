'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { JWTPayload } from '@/lib/jwt'
import FriendsPanel from '@/components/FriendsPanel'

interface Props { user: JWTPayload }
interface RoomSettings {
  name: string; maxPlayers: number; rounds: number; drawTime: number; isPrivate: boolean
}

const WORD_OF_DAY = 'PARADOX'
const WORD_HINT = 'A statement that contradicts itself'

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
  sparkle: 'M12 3v4M12 17v4M3 12h4M17 12h4m-13.4-6.4 2.8 2.8m7.2 7.2 2.8 2.8m0-12.8-2.8 2.8m-7.2 7.2-2.8 2.8',
  logout:  'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  dice:    'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z',
  arrow:   'M5 12h14m-6-7 7 7-7 7',
  lock:    'M4 11h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V11ZM8 11V7a4 4 0 0 1 8 0v4',
  globe:   'M12 3a9 9 0 1 0 0 18A9 9 0 0 0 12 3ZM3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z',
}

// ─── Top Nav ──────────────────────────────────────────────────────────────────
const TopNav = ({ user, onLogout, onFriendsOpen, pendingCount }: {
  user: JWTPayload; onLogout: () => void; onFriendsOpen: () => void; pendingCount: number
}) => (
  <header style={{
    position: 'relative', zIndex: 30,
    maxWidth: 1280, margin: '0 auto',
    padding: '16px 32px 0',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  }}>
    {/* Wordmark */}
    <a href="/lobby" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10, background: '#312E81',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: 'rotate(-6deg)', boxShadow: '0 4px 0 -1px #1F1B5C',
        position: 'relative', flexShrink: 0,
      }}>
        <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#FBF6EC', fontSize: 18 }}>i</span>
        <span style={{ position: 'absolute', top: -3, right: -3, width: 9, height: 9, borderRadius: '50%', background: '#F59E0B' }} />
      </div>
      <div style={{ lineHeight: 1 }}>
        <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 18 }}>inkblot</div>
        <div style={{ fontFamily: "'Caveat', cursive", color: '#5A5275', fontSize: 11 }}>draw • guess • repeat</div>
      </div>
    </a>

    {/* Nav links */}
    <nav style={{
      display: 'flex', alignItems: 'center', gap: 2,
      background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)',
      borderRadius: 999, padding: '5px 6px',
      border: '1px solid rgba(255,255,255,0.6)',
    }}>
      {[
        { label: 'Home', href: '/lobby', active: true },
        { label: 'Play', href: '#' },
        ...(user.role === 'admin' ? [{ label: 'Admin', href: '/admin' }] : []),
      ].map(l => (
        <a key={l.label} href={l.href} style={{
          padding: '5px 12px', fontSize: 12, fontWeight: 600,
          borderRadius: 999, textDecoration: 'none',
          background: l.active ? '#1B1830' : 'transparent',
          color: l.active ? '#FBF6EC' : '#2A2545',
        }}>{l.label}</a>
      ))}
    </nav>

    {/* Right side */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      {/* Coins */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: 'rgba(252,211,77,0.4)', border: '1px solid rgba(245,158,11,0.3)',
        borderRadius: 999, padding: '5px 10px',
      }}>
        <span style={{ fontSize: 13 }}>🪙</span>
        <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 13 }}>2,480</span>
      </div>

      {/* Friends */}
      <button onClick={onFriendsOpen} style={{
        position: 'relative', display: 'flex', alignItems: 'center', gap: 5,
        background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(27,24,48,0.1)',
        borderRadius: 999, padding: '5px 12px',
        fontSize: 12, fontWeight: 600, color: '#2A2545', cursor: 'pointer',
      }}>
        👥 Friends
        {pendingCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            width: 16, height: 16, borderRadius: '50%',
            background: '#EC4899', color: '#fff', fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{pendingCount}</span>
        )}
      </button>

      {/* User pill */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(27,24,48,0.1)',
        borderRadius: 999, padding: '4px 10px 4px 4px',
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%', background: '#312E81', color: '#FBF6EC',
          fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {user.username?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#1B1830' }}>@{user.username}</div>
          <div style={{ fontSize: 9, color: '#5A5275' }}>{user.role === 'admin' ? '👑 Admin' : 'Sketcher'}</div>
        </div>
      </div>

      {/* Logout */}
      <button onClick={onLogout} title="Log out" style={{
        width: 30, height: 30, borderRadius: '50%',
        background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(27,24,48,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: '#5A5275',
      }}>
        <Icon path={ICONS.logout} size={14} />
      </button>
    </div>
  </header>
)

// ─── Quick Play Card ──────────────────────────────────────────────────────────
const QuickPlayCard = ({ onQuickPlay, searching }: { onQuickPlay: () => void; searching: boolean }) => (
  <div style={{
    background: 'linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.55))',
    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.65)',
    boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 20px 40px -12px rgba(31,27,92,0.18)',
    borderRadius: 20, padding: '22px 24px',
    position: 'relative', overflow: 'hidden', flex: 1,
  }}>
    {/* Tape */}
    <div style={{ position: 'absolute', top: -7, left: 32, width: 56, height: 18, background: 'rgba(252,211,77,0.85)', transform: 'rotate(-5deg)', borderRadius: 2, zIndex: 20 }} />
    {/* Blob */}
    <svg viewBox="0 0 200 200" style={{ position: 'absolute', right: -40, bottom: -40, width: 220, height: 220, opacity: 0.12, pointerEvents: 'none' }}>
      <path d="M100 10c25 5 60 0 70 30s-10 50 0 80-30 60-60 60-70-10-80-40 10-50-10-80 50-55 80-50z" fill="#312E81" />
    </svg>

    <div style={{ position: 'relative' }}>
      <div style={{ fontFamily: "'Caveat', cursive", color: '#F59E0B', fontSize: 18, lineHeight: 1, marginBottom: 2 }}>jump straight in →</div>
      <h2 style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 26, margin: '0 0 4px' }}>Quick Play</h2>
      <p style={{ color: '#5A5275', fontSize: 13, margin: '0 0 18px', lineHeight: 1.5 }}>
        Drop into the next open room instantly.
      </p>

      {/* Main row: pulse button + stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <button onClick={onQuickPlay} style={{
          position: 'relative', width: 110, height: 110,
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
        }}>
          <span style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'rgba(245,158,11,0.3)',
            animation: 'pulseRing 2s cubic-bezier(.3,.6,.4,1) infinite',
          }} />
          <span style={{
            position: 'absolute', inset: '8px', borderRadius: '50%', background: '#312E81',
            boxShadow: '0 8px 0 -2px #1F1B5C',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: '#FBF6EC',
          }}>
            <Icon path={ICONS.bolt} size={22} />
            <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 17, lineHeight: 1, marginTop: 2 }}>
              {searching ? 'Stop' : 'Play'}
            </span>
            <span style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.65, marginTop: 1 }}>
              {searching ? 'finding…' : 'tap me'}
            </span>
          </span>
        </button>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[
            { icon: '🟢', label: '184 rooms open' },
            { icon: '⚡', label: '< 5s matchmaking' },
            { icon: '🎯', label: '8 players · 5 rounds' },
          ].map(s => (
            <div key={s.label} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.6)', borderRadius: 10,
              padding: '7px 10px', border: '1px solid rgba(255,255,255,0.7)',
              fontSize: 12, fontWeight: 500, color: '#2A2545',
            }}>
              <span>{s.icon}</span>{s.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
)

// ─── Create Room Card ─────────────────────────────────────────────────────────
const CustomRoomCard = ({ onCreateRoom }: { onCreateRoom: (s: RoomSettings) => void }) => {
  const [settings, setSettings] = useState<RoomSettings>({
    name: 'my sketchbook', maxPlayers: 8, rounds: 5, drawTime: 60, isPrivate: false,
  })
  const [creating, setCreating] = useState(false)

  const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick} style={{
      padding: '5px 11px', borderRadius: 999, fontSize: 12, fontWeight: 600,
      border: active ? '1px solid #1B1830' : '1px solid rgba(27,24,48,0.12)',
      background: active ? '#1B1830' : 'rgba(255,255,255,0.7)',
      color: active ? '#FBF6EC' : '#5A5275',
      cursor: 'pointer', transition: 'all 0.15s',
      boxShadow: active ? '0 2px 0 -1px #000' : 'none',
    }}>{children}</button>
  )

  const handleCreate = async () => {
    setCreating(true)
    await onCreateRoom(settings)
    setCreating(false)
  }

  return (
    <div style={{
      background: 'linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.55))',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.65)',
      boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 20px 40px -12px rgba(31,27,92,0.18)',
      borderRadius: 20, padding: '22px 24px', flex: 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: "'Caveat', cursive", color: '#EC4899', fontSize: 18, lineHeight: 1, marginBottom: 2 }}>your rules —</div>
          <h2 style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 26, margin: 0 }}>Create Room</h2>
        </div>
        <button
          onClick={() => setSettings(s => ({ ...s, name: ['maple\'s atelier', 'sketchy biz', 'doodle zone', 'art attack'][Math.floor(Math.random() * 4)] }))}
          title="Random name" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5A5275', padding: 4 }}
        >
          <Icon path={ICONS.dice} size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Room name */}
        <input
          value={settings.name}
          onChange={e => setSettings(s => ({ ...s, name: e.target.value }))}
          placeholder="Room name"
          style={{
            width: '100%', background: 'rgba(255,255,255,0.8)',
            border: '1px solid rgba(27,24,48,0.1)', borderRadius: 10,
            padding: '8px 12px', fontSize: 13, color: '#1B1830',
            outline: 'none', fontFamily: "'Inter', sans-serif", boxSizing: 'border-box',
          }}
        />

        {/* Players + Rounds on same row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#5A5275', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Players</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {[4, 6, 8, 12].map(n => <Chip key={n} active={settings.maxPlayers === n} onClick={() => setSettings(s => ({ ...s, maxPlayers: n }))}>{n}</Chip>)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#5A5275', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Rounds</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {[3, 5, 8, 10].map(n => <Chip key={n} active={settings.rounds === n} onClick={() => setSettings(s => ({ ...s, rounds: n }))}>{n}</Chip>)}
            </div>
          </div>
        </div>

        {/* Draw time slider */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#5A5275', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Draw time</div>
            <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 14 }}>{settings.drawTime}s</span>
          </div>
          <input
            type="range" min={30} max={120} step={10} value={settings.drawTime}
            onChange={e => setSettings(s => ({ ...s, drawTime: Number(e.target.value) }))}
            style={{ width: '100%', accentColor: '#312E81' }}
          />
        </div>

        {/* Privacy toggle */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: 3, background: 'rgba(27,24,48,0.05)', borderRadius: 12, position: 'relative' }}>
          <div style={{
            position: 'absolute', top: 3, bottom: 3,
            width: 'calc(50% - 5px)',
            left: !settings.isPrivate ? 3 : 'calc(50% + 2px)',
            background: '#fff', borderRadius: 9,
            boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
            transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)',
          }} />
          {[{ label: '🌐 Public', value: false }, { label: '🔒 Private', value: true }].map(opt => (
            <button key={String(opt.value)} onClick={() => setSettings(s => ({ ...s, isPrivate: opt.value }))} style={{
              position: 'relative', zIndex: 1, padding: '7px 0',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 13,
              color: settings.isPrivate === opt.value ? '#312E81' : '#5A5275',
              transition: 'color 0.2s',
            }}>{opt.label}</button>
          ))}
        </div>

        {/* Create button */}
        <button onClick={handleCreate} disabled={creating} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          background: creating ? '#5A5275' : '#312E81',
          color: '#FBF6EC', border: 'none', cursor: creating ? 'not-allowed' : 'pointer',
          fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 16,
          padding: '12px 0', borderRadius: 14,
          boxShadow: creating ? 'none' : '0 5px 0 -1px #1F1B5C',
          transition: 'background 0.2s',
        }}>
          <Icon path={ICONS.plus} size={16} />
          {creating ? 'Opening…' : 'Open the room'}
          {!creating && <Icon path={ICONS.arrow} size={16} />}
        </button>
      </div>
    </div>
  )
}

// ─── Word of the Day Banner ───────────────────────────────────────────────────
const WordOfDayBanner = () => {
  const [revealed, setRevealed] = useState(false)
  const [letterReveal, setLetterReveal] = useState<boolean[]>(Array(WORD_OF_DAY.length).fill(false))

  const revealAll = () => {
    if (revealed) return
    setRevealed(true)
    WORD_OF_DAY.split('').forEach((_, i) => {
      setTimeout(() => setLetterReveal(r => r.map((v, idx) => idx === i ? true : v)), i * 120)
    })
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #312E81 0%, #1e1b4b 100%)',
      borderRadius: 18, padding: '18px 28px',
      display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Subtle dot pattern */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.06, backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '6px 6px', pointerEvents: 'none' }} />
      {/* Glow */}
      <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(245,158,11,0.2)', filter: 'blur(30px)', pointerEvents: 'none' }} />

      {/* Left: label + hint */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <Icon path={ICONS.sparkle} size={13} />
          <span style={{ fontFamily: "'Caveat', cursive", color: 'rgba(252,211,77,0.9)', fontSize: 16 }}>word of the day</span>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(251,246,236,0.55)', maxWidth: 180 }}>{WORD_HINT}</div>
      </div>

      {/* Center: letter tiles */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', flex: 1, justifyContent: 'center' }}>
        {WORD_OF_DAY.split('').map((ch, i) => (
          <div key={i} style={{
            width: 36, height: 42, borderRadius: 8,
            background: letterReveal[i] ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.07)',
            border: `1px solid ${letterReveal[i] ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.12)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 20, color: '#FBF6EC',
            transition: 'all 0.3s', opacity: letterReveal[i] ? 1 : 0.35,
          }}>
            {letterReveal[i] ? ch : '?'}
          </div>
        ))}
      </div>

      {/* Right: CTA + bonus */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ background: 'rgba(245,158,11,0.2)', color: 'rgba(252,211,77,0.9)', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999 }}>
            +500 ink bonus
          </span>
          <span style={{ fontSize: 11, color: 'rgba(251,246,236,0.45)' }}>resets in 14h</span>
        </div>
        <button
          onClick={revealAll}
          disabled={revealed}
          style={{
            background: revealed ? 'rgba(255,255,255,0.1)' : 'rgba(245,158,11,0.9)',
            color: revealed ? 'rgba(255,255,255,0.5)' : '#1B1830',
            border: 'none', borderRadius: 10,
            padding: '8px 16px', fontSize: 13, fontWeight: 700,
            cursor: revealed ? 'default' : 'pointer',
            fontFamily: "'Fredoka', sans-serif",
            transition: 'all 0.2s',
            boxShadow: revealed ? 'none' : '0 3px 0 -1px rgba(180,120,0,0.8)',
          }}
        >
          {revealed ? '✓ Revealed!' : '👁 Reveal word'}
        </button>
      </div>
    </div>
  )
}

// ─── Main Lobby ───────────────────────────────────────────────────────────────
export default function LobbyClient({ user }: Props) {
  const router = useRouter()
  const [searching, setSearching] = useState(false)
  const [friendsOpen, setFriendsOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    fetch('/api/friends')
      .then(r => r.json())
      .then(d => setPendingCount(d.pendingReceived?.length || 0))
      .catch(() => {})
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  const handleQuickPlay = async () => {
    if (searching) { setSearching(false); return }
    setSearching(true)
    try {
      const res = await fetch('/api/rooms')
      const data = await res.json()
      router.push(`/room/${data.roomId}`)
    } catch {
      setSearching(false)
    }
  }

  const handleCreateRoom = async (settings: RoomSettings) => {
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    const data = await res.json()
    router.push(`/room/${data.roomId}`)
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FBF6EC',
      backgroundImage: `radial-gradient(rgba(27,24,48,0.035) 1px, transparent 1px), radial-gradient(rgba(27,24,48,0.025) 1px, transparent 1px)`,
      backgroundSize: '3px 3px, 7px 7px',
      backgroundPosition: '0 0, 1px 1px',
      fontFamily: "'Inter', system-ui, sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>
      <TopNav user={user} onLogout={handleLogout} onFriendsOpen={() => setFriendsOpen(true)} pendingCount={pendingCount} />

      <main style={{
        flex: 1,
        maxWidth: 1280, margin: '0 auto', width: '100%',
        padding: '20px 32px 24px',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        {/* Page heading — compact */}
        <div>
          <div style={{ fontFamily: "'Caveat', cursive", color: '#F59E0B', fontSize: 20, lineHeight: 1, marginBottom: 2 }}>
            welcome back, {user.username} —
          </div>
          <h1 style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', margin: 0, lineHeight: 1.1 }}>
            your sketchbook is open.
          </h1>
        </div>

        {/* Main row: Quick Play + Create Room side by side */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'stretch' }} className="cards-row">
          <QuickPlayCard onQuickPlay={handleQuickPlay} searching={searching} />
          <CustomRoomCard onCreateRoom={handleCreateRoom} />
        </div>

        {/* Word of the Day — full width banner */}
        <WordOfDayBanner />
      </main>

      {/* Footer */}
      <footer style={{
        maxWidth: 1280, margin: '0 auto', width: '100%',
        padding: '14px 32px',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        fontSize: 12, color: '#5A5275',
        borderTop: '1px solid rgba(27,24,48,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#F59E0B' }} />
          © 2026 inkblot studios
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {['Privacy', 'Rules', 'Discord', ...(user.role === 'admin' ? ['Admin'] : []), 'v0.3.1'].map(l => (
            <a key={l} href={l === 'Admin' ? '/admin' : '#'} style={{ color: '#5A5275', textDecoration: 'none' }}>{l}</a>
          ))}
        </div>
      </footer>

      <FriendsPanel isOpen={friendsOpen} onClose={() => setFriendsOpen(false)} myUserId={user.userId} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Caveat:wght@500;700&display=swap');
        @keyframes pulseRing { 0% { transform: scale(.95); opacity: .55; } 70% { transform: scale(1.4); opacity: 0; } 100% { transform: scale(1.4); opacity: 0; } }
        * { box-sizing: border-box; }
        input[type=range] { cursor: pointer; }

        @media (max-width: 700px) {
          .cards-row { flex-direction: column !important; }
          main { padding: 16px 16px 20px !important; }
          header { padding: 14px 16px 0 !important; }
          footer { padding: 12px 16px !important; }
        }
      `}</style>
    </div>
  )
}