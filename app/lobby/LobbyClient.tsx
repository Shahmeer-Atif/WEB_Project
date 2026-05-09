
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
  sparkle: 'M12 3v4M12 17v4M3 12h4M17 12h4m-13.4-6.4 2.8 2.8m7.2 7.2 2.8 2.8m0-12.8-2.8 2.8m-7.2 7.2-2.8 2.8',
  logout:  'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  dice:    'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z',
  arrow:   'M5 12h14m-6-7 7 7-7 7',
}

// ─── Top Nav ──────────────────────────────────────────────────────────────────
const TopNav = ({ user, onLogout, onFriendsOpen, pendingCount }: {
  user: JWTPayload; onLogout: () => void; onFriendsOpen: () => void; pendingCount: number
}) => (
  <header style={{
    position: 'sticky', top: 0, zIndex: 30,
    background: 'rgba(251,246,236,0.85)',
    backdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(27,24,48,0.07)',
    padding: '0 40px',
  }}>
    <div style={{
      maxWidth: 1400, margin: '0 auto',
      height: 60,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
    }}>
      {/* Wordmark */}
      <a href="/lobby" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: '#312E81',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: 'rotate(-6deg)', boxShadow: '0 4px 0 -1px #1F1B5C',
          position: 'relative', flexShrink: 0,
        }}>
          <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#FBF6EC', fontSize: 20 }}>i</span>
          <span style={{ position: 'absolute', top: -3, right: -3, width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} />
        </div>
        <div style={{ lineHeight: 1 }}>
          <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 20 }}>inkblot</div>
          <div style={{ fontFamily: "'Caveat', cursive", color: '#5A5275', fontSize: 11 }}>draw • guess • repeat</div>
        </div>
      </a>

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', gap: 2,
        background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)',
        borderRadius: 999, padding: '5px 6px',
        border: '1px solid rgba(255,255,255,0.7)',
      }}>
        {[
          { label: 'Home', href: '/lobby', active: true },
          ...(user.role === 'admin' ? [{ label: 'Admin', href: '/admin', active: false }] : []),
        ].map(l => (
          <a key={l.label} href={l.href} style={{
            padding: '6px 16px', fontSize: 13, fontWeight: 600,
            borderRadius: 999, textDecoration: 'none',
            background: l.active ? '#1B1830' : 'transparent',
            color: l.active ? '#FBF6EC' : '#2A2545',
            transition: 'background 0.15s',
          }}>{l.label}</a>
        ))}
      </nav>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {/* Coins */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(252,211,77,0.4)', border: '1px solid rgba(245,158,11,0.35)',
          borderRadius: 999, padding: '6px 14px',
        }}>
          <span style={{ fontSize: 14 }}>🪙</span>
          <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 15 }}>2,480</span>
        </div>

        {/* Friends */}
        <button onClick={onFriendsOpen} style={{
          position: 'relative', display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(27,24,48,0.12)',
          borderRadius: 999, padding: '6px 16px',
          fontSize: 13, fontWeight: 600, color: '#2A2545', cursor: 'pointer',
        }}>
          👥 Friends
          {pendingCount > 0 && (
            <span style={{
              position: 'absolute', top: -5, right: -5,
              width: 18, height: 18, borderRadius: '50%',
              background: '#EC4899', color: '#fff', fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{pendingCount}</span>
          )}
        </button>

        {/* User pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(27,24,48,0.12)',
          borderRadius: 999, padding: '5px 14px 5px 5px',
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', background: '#312E81', color: '#FBF6EC',
            fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {user.username?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1B1830' }}>@{user.username}</div>
            <div style={{ fontSize: 10, color: '#5A5275' }}>{user.role === 'admin' ? '👑 Admin' : 'Sketcher'}</div>
          </div>
        </div>

        {/* Logout */}
        <button onClick={onLogout} title="Log out" style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(27,24,48,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#5A5275',
        }}>
          <Icon path={ICONS.logout} size={15} />
        </button>
      </div>
    </div>
  </header>
)

// ─── Quick Play Card ──────────────────────────────────────────────────────────
const QuickPlayCard = ({ onQuickPlay, searching }: { onQuickPlay: () => void; searching: boolean }) => (
  <div style={{
    background: 'linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.55))',
    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.65)',
    boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 24px 48px -12px rgba(31,27,92,0.18)',
    borderRadius: 24, padding: '32px 36px',
    position: 'relative', overflow: 'hidden',
    flex: '1 1 0',
  }}>
    {/* Tape */}
    <div style={{ position: 'absolute', top: -8, left: 40, width: 64, height: 20, background: 'rgba(252,211,77,0.9)', transform: 'rotate(-5deg)', borderRadius: 2, zIndex: 20 }} />
    {/* Blob */}
    <svg viewBox="0 0 200 200" style={{ position: 'absolute', right: -60, bottom: -60, width: 280, height: 280, opacity: 0.1, pointerEvents: 'none' }}>
      <path d="M100 10c25 5 60 0 70 30s-10 50 0 80-30 60-60 60-70-10-80-40 10-50-10-80 50-55 80-50z" fill="#312E81" />
    </svg>

    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontFamily: "'Caveat', cursive", color: '#F59E0B', fontSize: 20, lineHeight: 1, marginBottom: 4 }}>jump straight in →</div>
      <h2 style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 34, margin: '0 0 8px' }}>Quick Play</h2>
      <p style={{ color: '#5A5275', fontSize: 14, margin: '0 0 28px', lineHeight: 1.5 }}>
        Drop into the next open room instantly. No setup needed.
      </p>

      {/* Big button + stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 28, flex: 1 }}>
        {/* Pulse button — bigger */}
        <button onClick={onQuickPlay} style={{
          position: 'relative', width: 160, height: 160,
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
        }}>
          <span style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'rgba(245,158,11,0.3)',
            animation: 'pulseRing 2s cubic-bezier(.3,.6,.4,1) infinite',
          }} />
          <span style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'rgba(245,158,11,0.15)',
            animation: 'pulseRing 2s cubic-bezier(.3,.6,.4,1) infinite',
            animationDelay: '0.5s',
          }} />
          <span style={{
            position: 'absolute', inset: '14px', borderRadius: '50%', background: '#312E81',
            boxShadow: '0 10px 0 -2px #1F1B5C',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: '#FBF6EC',
          }}>
            <Icon path={ICONS.bolt} size={30} />
            <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 24, lineHeight: 1, marginTop: 4 }}>
              {searching ? 'Stop' : 'Play'}
            </span>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.6, marginTop: 2 }}>
              {searching ? 'finding…' : 'tap me'}
            </span>
          </span>
        </button>

        {/* Stats */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { icon: '🟢', label: '184 rooms open' },
            { icon: '⚡', label: '< 5s matchmaking' },
            { icon: '🎯', label: '8 players · 5 rounds' },
            { icon: '🎨', label: 'Random words, pure chaos' },
          ].map(s => (
            <div key={s.label} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(255,255,255,0.65)', borderRadius: 12,
              padding: '10px 14px', border: '1px solid rgba(255,255,255,0.8)',
              fontSize: 13, fontWeight: 500, color: '#2A2545',
            }}>
              <span style={{ fontSize: 16 }}>{s.icon}</span>{s.label}
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
      padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
      border: active ? '1px solid #1B1830' : '1px solid rgba(27,24,48,0.12)',
      background: active ? '#1B1830' : 'rgba(255,255,255,0.7)',
      color: active ? '#FBF6EC' : '#5A5275',
      cursor: 'pointer', transition: 'all 0.15s',
      boxShadow: active ? '0 3px 0 -1px #000' : 'none',
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
      boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 24px 48px -12px rgba(31,27,92,0.18)',
      borderRadius: 24, padding: '32px 36px',
      flex: '1 1 0', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "'Caveat', cursive", color: '#EC4899', fontSize: 20, lineHeight: 1, marginBottom: 4 }}>your rules —</div>
          <h2 style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 34, margin: 0 }}>Create Room</h2>
        </div>
        <button
          onClick={() => setSettings(s => ({ ...s, name: ['maple\'s atelier', 'sketchy biz', 'doodle zone', 'art attack'][Math.floor(Math.random() * 4)] }))}
          title="Random name" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5A5275', padding: 4, marginTop: 4 }}
        >
          <Icon path={ICONS.dice} size={18} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
        {/* Room name */}
        <input
          value={settings.name}
          onChange={e => setSettings(s => ({ ...s, name: e.target.value }))}
          placeholder="Room name"
          style={{
            width: '100%', background: 'rgba(255,255,255,0.8)',
            border: '1px solid rgba(27,24,48,0.1)', borderRadius: 12,
            padding: '11px 14px', fontSize: 14, color: '#1B1830',
            outline: 'none', fontFamily: "'Inter', sans-serif", boxSizing: 'border-box',
          }}
        />

        {/* Players + Rounds */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#5A5275', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Players</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[4, 6, 8, 12].map(n => <Chip key={n} active={settings.maxPlayers === n} onClick={() => setSettings(s => ({ ...s, maxPlayers: n }))}>{n}</Chip>)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#5A5275', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Rounds</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[3, 5, 8, 10].map(n => <Chip key={n} active={settings.rounds === n} onClick={() => setSettings(s => ({ ...s, rounds: n }))}>{n}</Chip>)}
            </div>
          </div>
        </div>

        {/* Draw time */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#5A5275', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Draw time</div>
            <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 16 }}>{settings.drawTime}s</span>
          </div>
          <input
            type="range" min={30} max={120} step={10} value={settings.drawTime}
            onChange={e => setSettings(s => ({ ...s, drawTime: Number(e.target.value) }))}
            style={{ width: '100%', accentColor: '#312E81' }}
          />
        </div>

        {/* Privacy */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: 4, background: 'rgba(27,24,48,0.05)', borderRadius: 14, position: 'relative' }}>
          <div style={{
            position: 'absolute', top: 4, bottom: 4,
            width: 'calc(50% - 6px)',
            left: !settings.isPrivate ? 4 : 'calc(50% + 2px)',
            background: '#fff', borderRadius: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)',
          }} />
          {[{ label: '🌐 Public', value: false }, { label: '🔒 Private', value: true }].map(opt => (
            <button key={String(opt.value)} onClick={() => setSettings(s => ({ ...s, isPrivate: opt.value }))} style={{
              position: 'relative', zIndex: 1, padding: '9px 0',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 14,
              color: settings.isPrivate === opt.value ? '#312E81' : '#5A5275',
              transition: 'color 0.2s',
            }}>{opt.label}</button>
          ))}
        </div>

        {/* Create */}
        <button onClick={handleCreate} disabled={creating} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: creating ? '#5A5275' : '#312E81',
          color: '#FBF6EC', border: 'none', cursor: creating ? 'not-allowed' : 'pointer',
          fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 18,
          padding: '14px 0', borderRadius: 16,
          boxShadow: creating ? 'none' : '0 6px 0 -1px #1F1B5C',
          transition: 'background 0.2s', marginTop: 'auto',
        }}>
          <Icon path={ICONS.plus} size={18} />
          {creating ? 'Opening…' : 'Open the room'}
          {!creating && <Icon path={ICONS.arrow} size={18} />}
        </button>
      </div>
    </div>
  )
}

// ─── Word of the Day — half width ─────────────────────────────────────────────
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
      borderRadius: 24, padding: '28px 32px',
      position: 'relative', overflow: 'hidden',
      width: '50%',
    }}>
      {/* Dot pattern */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.06, backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '6px 6px', pointerEvents: 'none' }} />
      {/* Glow */}
      <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(245,158,11,0.2)', filter: 'blur(40px)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Icon path={ICONS.sparkle} size={14} />
          <span style={{ fontFamily: "'Caveat', cursive", color: 'rgba(252,211,77,0.9)', fontSize: 20 }}>word of the day</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(251,246,236,0.4)' }}>resets in 14h 22m</span>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(251,246,236,0.5)', margin: '0 0 20px' }}>{WORD_HINT}</p>

        {/* Letter tiles */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {WORD_OF_DAY.split('').map((ch, i) => (
            <div key={i} style={{
              flex: 1, height: 52, borderRadius: 10,
              background: letterReveal[i] ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.07)',
              border: `1.5px solid ${letterReveal[i] ? 'rgba(245,158,11,0.6)' : 'rgba(255,255,255,0.12)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 22, color: '#FBF6EC',
              transition: 'all 0.3s',
              opacity: letterReveal[i] ? 1 : 0.3,
              transform: letterReveal[i] ? 'translateY(0) scale(1)' : 'translateY(4px) scale(0.95)',
            }}>
              {letterReveal[i] ? ch : '?'}
            </div>
          ))}
        </div>

        {/* Footer row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ background: 'rgba(245,158,11,0.2)', color: 'rgba(252,211,77,0.95)', fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999 }}>
            +500 ink bonus if you guess it today
          </span>
          <button
            onClick={revealAll}
            disabled={revealed}
            style={{
              background: revealed ? 'rgba(255,255,255,0.08)' : 'rgba(245,158,11,0.95)',
              color: revealed ? 'rgba(255,255,255,0.4)' : '#1B1830',
              border: 'none', borderRadius: 10,
              padding: '9px 20px', fontSize: 14, fontWeight: 700,
              cursor: revealed ? 'default' : 'pointer',
              fontFamily: "'Fredoka', sans-serif",
              boxShadow: revealed ? 'none' : '0 4px 0 -1px rgba(160,100,0,0.6)',
              transition: 'all 0.2s',
            }}
          >
            {revealed ? '✓ Revealed!' : '👁 Reveal word'}
          </button>
        </div>
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
      minHeight: '100vh', backgroundColor: '#FBF6EC',
      backgroundImage: `radial-gradient(rgba(27,24,48,0.035) 1px, transparent 1px), radial-gradient(rgba(27,24,48,0.025) 1px, transparent 1px)`,
      backgroundSize: '3px 3px, 7px 7px', backgroundPosition: '0 0, 1px 1px',
      fontFamily: "'Inter', system-ui, sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>
      <TopNav user={user} onLogout={handleLogout} onFriendsOpen={() => setFriendsOpen(true)} pendingCount={pendingCount} />

      <main style={{
        flex: 1, maxWidth: 1400, margin: '0 auto', width: '100%',
        padding: '24px 40px 28px',
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        {/* Heading */}
        <div>
          <div style={{ fontFamily: "'Caveat', cursive", color: '#F59E0B', fontSize: 22, lineHeight: 1, marginBottom: 4 }}>
            welcome back, {user.username} —
          </div>
          <h1 style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', margin: 0, lineHeight: 1.1 }}>
            your sketchbook is open.
          </h1>
        </div>

        {/* Quick Play + Create Room side by side */}
        <div style={{ display: 'flex', gap: 24, alignItems: 'stretch' }} className="cards-row">
          <QuickPlayCard onQuickPlay={handleQuickPlay} searching={searching} />
          <CustomRoomCard onCreateRoom={handleCreateRoom} />
        </div>

        {/* Bottom row: Word of Day (half) + spacer */}
        <div style={{ display: 'flex', gap: 24 }} className="bottom-row">
          <WordOfDayBanner />
          {/* Right half: subtle placeholder or could add recent games etc */}
          <div style={{
            flex: 1, borderRadius: 24,
            background: 'rgba(255,255,255,0.35)',
            border: '1px dashed rgba(27,24,48,0.12)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: 24, gap: 8,
          }}>
            <div style={{ fontSize: 36 }}>🎮</div>
            <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 18 }}>No recent games</div>
            <div style={{ fontFamily: "'Caveat', cursive", color: '#5A5275', fontSize: 16 }}>jump in and start drawing!</div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        maxWidth: 1400, margin: '0 auto', width: '100%',
        padding: '14px 40px',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        fontSize: 12, color: '#5A5275',
        borderTop: '1px solid rgba(27,24,48,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#F59E0B' }} />
          © 2026 inkblot studios — handcrafted with tea
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
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
        @media (max-width: 768px) {
          .cards-row { flex-direction: column !important; }
          .bottom-row { flex-direction: column !important; }
          .bottom-row > div:first-child { width: 100% !important; }
          main { padding: 20px 16px 24px !important; }
          header > div { padding: 0 16px !important; }
        }
      `}</style>
    </div>
  )
}