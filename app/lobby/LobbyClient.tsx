'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { JWTPayload } from '@/lib/jwt'
import FriendsPanel from '@/components/FriendsPanel'
import { disconnectSocket } from '@/lib/socket' // Added this import

interface Props { user: JWTPayload }
interface RoomSettings {
  name: string; maxPlayers: number; rounds: number; drawTime: number; isPrivate: boolean; password: string
}

const WORD_OF_DAY = 'PARADOX'
const WORD_HINT = 'A statement that contradicts itself'

const Icon = ({ path, size = 18 }: { path: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
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
  key:     'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4',
  door:    'M3 12l9-9 9 9M5 10v10a1 1 0 0 0 1 1h3m10-11v10a1 1 0 0 0-1 1h-3m-6 0a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1m6 0h-6',
}

const TopNav = ({ user, onLogout, onFriendsOpen, pendingCount }: {
  user: JWTPayload; onLogout: () => void; onFriendsOpen: () => void; pendingCount: number
}) => (
  <header className="lobby-header" style={{ width: '100%', padding: '0 32px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', flexShrink: 0, borderBottom: '1px solid rgba(27,24,48,0.06)', background: 'rgba(251,246,236,0.85)', backdropFilter: 'blur(12px)' }}>
    <a href="/lobby" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', flexShrink: 0, zIndex: 2 }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: '#312E81', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-6deg)', boxShadow: '0 4px 0 -1px #1F1B5C', position: 'relative' }}>
        <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#FBF6EC', fontSize: 17 }}>i</span>
        <span style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, borderRadius: '50%', background: '#F59E0B' }} />
      </div>
      <div style={{ lineHeight: 1 }}>
        <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 17 }}>inkblot</div>
        <div style={{ fontFamily: "'Caveat', cursive", color: '#5A5275', fontSize: 10 }}>draw • guess • repeat</div>
      </div>
    </a>
    <nav className="lobby-nav" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 2, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(16px)', borderRadius: 999, padding: '4px 6px', border: '1px solid rgba(255,255,255,0.7)', boxShadow: '0 2px 12px rgba(31,27,92,0.08)' }}>
      {[{ label: 'Home', href: '/lobby', active: true }, ...(user.role === 'admin' ? [{ label: 'Admin', href: '/admin', active: false }] : [])].map(l => (
        <a key={l.label} href={l.href} style={{ padding: '5px 16px', fontSize: 13, fontWeight: 600, borderRadius: 999, textDecoration: 'none', background: l.active ? '#1B1830' : 'transparent', color: l.active ? '#FBF6EC' : '#2A2545' }}>{l.label}</a>
      ))}
    </nav>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, zIndex: 2 }}>
      <button onClick={onFriendsOpen} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(27,24,48,0.1)', borderRadius: 999, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#2A2545', cursor: 'pointer' }}>
        👥 <span className="hide-on-mobile">Friends</span>
        {pendingCount > 0 && <span style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', background: '#EC4899', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{pendingCount}</span>}
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(27,24,48,0.1)', borderRadius: 999, padding: '3px 10px 3px 3px' }}>
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#312E81', color: '#FBF6EC', fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{user.username?.[0]?.toUpperCase() ?? '?'}</div>
        <div className="hide-on-mobile" style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#1B1830' }}>@{user.username}</div>
          <div style={{ fontSize: 9, color: '#5A5275' }}>{user.role === 'admin' ? '👑 Admin' : 'Sketcher'}</div>
        </div>
      </div>
      <button onClick={onLogout} title="Log out" style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(27,24,48,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#5A5275' }}>
        <Icon path={ICONS.logout} size={14} />
      </button>
    </div>
  </header>
)

const QuickPlayCard = ({ onQuickPlay, searching, onJoin }: { onQuickPlay: () => void; searching: boolean; onJoin: (id: string, pw: string) => Promise<void> }) => {
  const [roomId, setRoomId] = useState('')
  const [password, setPassword] = useState('')
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(false)

  const handleJoin = async () => {
    if (!roomId.trim()) return
    setJoinError('')
    setJoining(true)
    try {
      await onJoin(roomId.trim(), password)
    } catch (e: any) {
      setJoinError(e.message || 'Could not join room. Check the ID and password.')
    } finally {
      setJoining(false)
    }
  }

  return (
    <div style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.84), rgba(255,255,255,0.58))', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.65)', boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 20px 40px -12px rgba(31,27,92,0.16)', borderRadius: 20, padding: '24px 28px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', height: '100%' }}>
      <div style={{ position: 'absolute', top: -7, left: 36, width: 60, height: 18, background: 'rgba(252,211,77,0.85)', transform: 'rotate(-5deg)', borderRadius: 2, zIndex: 20 }} />
      <svg viewBox="0 0 200 200" style={{ position: 'absolute', right: -60, bottom: -60, width: 280, height: 280, opacity: 0.1, pointerEvents: 'none' }}>
        <path d="M100 10c25 5 60 0 70 30s-10 50 0 80-30 60-60 60-70-10-80-40 10-50-10-80 50-55 80-50z" fill="#312E81" />
      </svg>
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <div style={{ fontFamily: "'Caveat', cursive", color: '#F59E0B', fontSize: 20, lineHeight: 1, marginBottom: 2 }}>jump straight in →</div>
        <h2 style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 30, margin: '0 0 4px' }}>Quick Play</h2>
        <p style={{ color: '#5A5275', fontSize: 13, margin: 0, lineHeight: 1.5 }}>Drop into the next open room instantly. No setup needed.</p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <button onClick={onQuickPlay} style={{ position: 'relative', width: 160, height: 160, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(245,158,11,0.28)', animation: 'pulseRing 2s cubic-bezier(.3,.6,.4,1) infinite' }} />
          <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(245,158,11,0.15)', animation: 'pulseRing 2s cubic-bezier(.3,.6,.4,1) infinite', animationDelay: '0.6s' }} />
          <span style={{ position: 'absolute', inset: '12px', borderRadius: '50%', background: '#312E81', boxShadow: '0 10px 0 -2px #1F1B5C', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#FBF6EC' }}>
            <Icon path={ICONS.bolt} size={32} />
            <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 24, lineHeight: 1, marginTop: 4 }}>{searching ? 'Stop' : 'Play'}</span>
            <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.6, marginTop: 2 }}>{searching ? 'finding…' : 'tap me'}</span>
          </span>
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
        {[{ icon: '🟢', label: '184 rooms', sub: 'open now' }, { icon: '⚡', label: '< 5 sec', sub: 'wait time' }, { icon: '🎯', label: '8 players', sub: '5 rounds' }].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 12, padding: '10px 8px', border: '1px solid rgba(255,255,255,0.8)', textAlign: 'center' }}>
            <div style={{ fontSize: 18, marginBottom: 2 }}>{s.icon}</div>
            <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 14 }}>{s.label}</div>
            <div style={{ fontSize: 10, color: '#5A5275' }}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(27,24,48,0.08)' }} />
          <span style={{ fontFamily: "'Caveat', cursive", color: '#5A5275', fontSize: 16 }}>or join a specific room</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(27,24,48,0.08)' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#5A5275' }}><Icon path={ICONS.door} size={15} /></div>
              <input value={roomId} onChange={e => { setRoomId(e.target.value); setJoinError('') }} placeholder="Room ID" onKeyDown={e => e.key === 'Enter' && handleJoin()} style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 10, paddingBottom: 10, background: 'rgba(255,255,255,0.8)', border: `1px solid ${joinError ? 'rgba(236,72,153,0.5)' : 'rgba(27,24,48,0.1)'}`, borderRadius: 12, fontSize: 13, color: '#1B1830', outline: 'none', fontFamily: "'Inter', sans-serif", boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#5A5275' }}><Icon path={ICONS.key} size={15} /></div>
              <input value={password} onChange={e => { setPassword(e.target.value); setJoinError('') }} type="password" placeholder="Password" onKeyDown={e => e.key === 'Enter' && handleJoin()} style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 10, paddingBottom: 10, background: 'rgba(255,255,255,0.8)', border: `1px solid ${joinError ? 'rgba(236,72,153,0.5)' : 'rgba(27,24,48,0.1)'}`, borderRadius: 12, fontSize: 13, color: '#1B1830', outline: 'none', fontFamily: "'Inter', sans-serif", boxSizing: 'border-box' }} />
            </div>
          </div>
          {joinError && <div style={{ fontSize: 12, color: '#EC4899', fontWeight: 500, paddingLeft: 4 }}>{joinError}</div>}
          <button onClick={handleJoin} disabled={!roomId.trim() || joining} style={{ width: '100%', padding: '11px 0', background: roomId.trim() && !joining ? 'rgba(49,46,129,0.1)' : 'rgba(27,24,48,0.04)', border: `1px solid ${roomId.trim() && !joining ? 'rgba(49,46,129,0.25)' : 'rgba(27,24,48,0.08)'}`, borderRadius: 12, cursor: roomId.trim() && !joining ? 'pointer' : 'not-allowed', fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 15, color: roomId.trim() && !joining ? '#312E81' : '#5A5275', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Icon path={ICONS.door} size={16} />
            {joining ? 'Checking…' : 'Join this room'}
          </button>
        </div>
      </div>
    </div>
  )
}

const CustomRoomCard = ({ onCreateRoom }: { onCreateRoom: (s: RoomSettings) => void }) => {
  const [settings, setSettings] = useState<RoomSettings>({ name: 'my sketchbook', maxPlayers: 8, rounds: 5, drawTime: 60, isPrivate: false, password: '' })
  const [creating, setCreating] = useState(false)
  const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick} style={{ padding: '5px 11px', borderRadius: 999, fontSize: 12, fontWeight: 600, border: active ? '1px solid #1B1830' : '1px solid rgba(27,24,48,0.12)', background: active ? '#1B1830' : 'rgba(255,255,255,0.7)', color: active ? '#FBF6EC' : '#5A5275', cursor: 'pointer', boxShadow: active ? '0 2px 0 -1px #000' : 'none' }}>{children}</button>
  )
  return (
    <div style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.84), rgba(255,255,255,0.58))', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.65)', boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 20px 40px -12px rgba(31,27,92,0.16)', borderRadius: 20, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: "'Caveat', cursive", color: '#EC4899', fontSize: 18, lineHeight: 1, marginBottom: 2 }}>your rules —</div>
          <h2 style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 26, margin: 0 }}>Create Room</h2>
        </div>
        <button onClick={() => setSettings(s => ({ ...s, name: ['maple\'s atelier', 'sketchy biz', 'doodle zone', 'art attack'][Math.floor(Math.random() * 4)] }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5A5275', padding: 4 }}>
          <Icon path={ICONS.dice} size={16} />
        </button>
      </div>
      <input value={settings.name} onChange={e => setSettings(s => ({ ...s, name: e.target.value }))} placeholder="Room name" style={{ width: '100%', background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(27,24,48,0.1)', borderRadius: 10, padding: '8px 12px', fontSize: 13, color: '#1B1830', outline: 'none', fontFamily: "'Inter', sans-serif", boxSizing: 'border-box' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#5A5275', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Players</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{[4, 6, 8, 12].map(n => <Chip key={n} active={settings.maxPlayers === n} onClick={() => setSettings(s => ({ ...s, maxPlayers: n }))}>{n}</Chip>)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#5A5275', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Rounds</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{[3, 5, 8, 10].map(n => <Chip key={n} active={settings.rounds === n} onClick={() => setSettings(s => ({ ...s, rounds: n }))}>{n}</Chip>)}</div>
        </div>
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#5A5275', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Draw time</div>
          <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 14 }}>{settings.drawTime}s</span>
        </div>
        <input type="range" min={30} max={120} step={10} value={settings.drawTime} onChange={e => setSettings(s => ({ ...s, drawTime: Number(e.target.value) }))} style={{ width: '100%', accentColor: '#312E81' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: 3, background: 'rgba(27,24,48,0.05)', borderRadius: 12, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 3, bottom: 3, width: 'calc(50% - 5px)', left: !settings.isPrivate ? 3 : 'calc(50% + 2px)', background: '#fff', borderRadius: 9, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)' }} />
        {[{ label: '🌐 Public', value: false }, { label: '🔒 Private', value: true }].map(opt => (
          <button key={String(opt.value)} onClick={() => setSettings(s => ({ ...s, isPrivate: opt.value, password: '' }))} style={{ position: 'relative', zIndex: 1, padding: '7px 0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 13, color: settings.isPrivate === opt.value ? '#312E81' : '#5A5275' }}>{opt.label}</button>
        ))}
      </div>
      {settings.isPrivate && (
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#5A5275' }}><Icon path={ICONS.key} size={14} /></div>
          <input value={settings.password} onChange={e => setSettings(s => ({ ...s, password: e.target.value }))} type="password" placeholder="Set room password" style={{ width: '100%', paddingLeft: 30, paddingRight: 12, paddingTop: 9, paddingBottom: 9, background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(27,24,48,0.1)', borderRadius: 10, fontSize: 13, color: '#1B1830', outline: 'none', fontFamily: "'Inter', sans-serif", boxSizing: 'border-box' }} />
        </div>
      )}
      <button onClick={async () => { setCreating(true); await onCreateRoom(settings); setCreating(false) }} disabled={creating} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: creating ? '#5A5275' : '#312E81', color: '#FBF6EC', border: 'none', cursor: creating ? 'not-allowed' : 'pointer', fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 16, padding: '12px 0', borderRadius: 14, boxShadow: creating ? 'none' : '0 5px 0 -1px #1F1B5C', marginTop: 2 }}>
        <Icon path={ICONS.plus} size={16} />
        {creating ? 'Opening…' : 'Open the room'}
        {!creating && <Icon path={ICONS.arrow} size={16} />}
      </button>
    </div>
  )
}

const WordOfDayCard = () => {
  const [revealed, setRevealed] = useState(false)
  const [letters, setLetters] = useState<boolean[]>(Array(WORD_OF_DAY.length).fill(false))
  const reveal = () => {
    if (revealed) return; setRevealed(true)
    WORD_OF_DAY.split('').forEach((_, i) => { setTimeout(() => setLetters(l => l.map((v, idx) => idx === i ? true : v)), i * 110) })
  }
  return (
    <div style={{ background: 'linear-gradient(135deg, #312E81 0%, #1e1b4b 100%)', borderRadius: 20, padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden', flex: 1 }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '6px 6px', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(245,158,11,0.2)', filter: 'blur(24px)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <Icon path={ICONS.sparkle} size={12} />
          <span style={{ fontFamily: "'Caveat', cursive", color: 'rgba(252,211,77,0.9)', fontSize: 16 }}>word of the day</span>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(251,246,236,0.5)', marginBottom: 14 }}>{WORD_HINT}</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
          {WORD_OF_DAY.split('').map((ch, i) => (
            <div key={i} style={{ width: 34, height: 40, borderRadius: 8, background: letters[i] ? 'rgba(245,158,11,0.22)' : 'rgba(255,255,255,0.07)', border: `1px solid ${letters[i] ? 'rgba(245,158,11,0.45)' : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 18, color: '#FBF6EC', transition: 'all 0.3s', opacity: letters[i] ? 1 : 0.3 }}>
              {letters[i] ? ch : '?'}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {['7 letters', 'noun', 'resets 14h'].map(t => <span key={t} style={{ background: 'rgba(255,255,255,0.09)', color: 'rgba(251,246,236,0.6)', fontSize: 10, padding: '3px 8px', borderRadius: 999 }}>{t}</span>)}
        </div>
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ background: 'rgba(245,158,11,0.18)', color: 'rgba(252,211,77,0.95)', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>+500 ink bonus</span>
        <button onClick={reveal} disabled={revealed} style={{ background: revealed ? 'rgba(255,255,255,0.08)' : 'rgba(245,158,11,0.9)', color: revealed ? 'rgba(255,255,255,0.45)' : '#1B1830', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: revealed ? 'default' : 'pointer', fontFamily: "'Fredoka', sans-serif", boxShadow: revealed ? 'none' : '0 3px 0 -1px rgba(160,100,0,0.6)' }}>
          {revealed ? '✓ Revealed!' : '👁 Reveal'}
        </button>
      </div>
    </div>
  )
}

export default function LobbyClient({ user }: Props) {
  const router = useRouter()
  const [searching, setSearching] = useState(false)
  const [friendsOpen, setFriendsOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    // 1. THIS IS THE FIX FOR THE "JOIN AND LEAVE" MULTIPLAYER BUG
    // When the lobby loads, we strictly kill any old socket connection 
    // left over from the game room so a fresh one is created next time!
    disconnectSocket()
    
    // Fetch friend requests + game invites for badge count
    const fetchNotifications = async () => {
      try {
        const [friendsRes, invitesRes] = await Promise.all([
          fetch('/api/friends'),
          fetch('/api/invites'),
        ])
        const friends = await friendsRes.json()
        const invites = await invitesRes.json()
        setPendingCount((friends.pendingReceived?.length || 0) + (invites.invites?.length || 0))
      } catch {}
    }
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 20000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/'); router.refresh()
  }

  const handleQuickPlay = async () => {
    if (searching) { setSearching(false); return }
    setSearching(true)
    try {
      const res = await fetch('/api/rooms')
      const data = await res.json()
      router.push(`/room/${data.roomId}`)
    } catch { setSearching(false) }
  }

  const handleJoin = async (roomId: string, password: string) => {
    try {
      const res = await fetch(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const data = await res.json()
        // Bubble error back up — QuickPlayCard shows it inline
        throw new Error(data.message || 'Could not join room')
      }
      router.push(`/room/${roomId}`)
    } catch (err: any) {
      throw err
    }
  }

  const handleCreateRoom = async (settings: RoomSettings) => {
    const res = await fetch('/api/rooms', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    const data = await res.json()
    router.push(`/room/${data.roomId}`)
  }

  return (
    <div className="lobby-root" style={{ height: '100vh', overflow: 'hidden', backgroundColor: '#FBF6EC', backgroundImage: `radial-gradient(rgba(27,24,48,0.032) 1px, transparent 1px), radial-gradient(rgba(27,24,48,0.022) 1px, transparent 1px)`, backgroundSize: '3px 3px, 7px 7px', backgroundPosition: '0 0, 1px 1px', fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>
      <TopNav user={user} onLogout={handleLogout} onFriendsOpen={() => setFriendsOpen(true)} pendingCount={pendingCount} />
      <main style={{ flex: 1, minHeight: 0, padding: '14px 32px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontFamily: "'Caveat', cursive", color: '#F59E0B', fontSize: 18, lineHeight: 1, marginBottom: 1 }}>welcome back, {user.username} —</div>
          <h1 style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 'clamp(1.5rem, 2.5vw, 2.2rem)', margin: 0, lineHeight: 1.1 }}>your sketchbook is open.</h1>
        </div>
        
        {/* Added class for mobile targeting to fix Word of the Day cutoff */}
        <div className="main-grid" style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr auto', gap: 14 }}>
          <div className="quick-play-wrapper" style={{ gridRow: 'span 2', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <QuickPlayCard onQuickPlay={handleQuickPlay} searching={searching} onJoin={async (id, pw) => {
              try { await handleJoin(id, pw) } catch (e: any) {
                throw e
              }
            }} />
          </div>
          <CustomRoomCard onCreateRoom={handleCreateRoom} />
          <WordOfDayCard />
        </div>
      </main>
      
      <footer style={{ flexShrink: 0, padding: '10px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: '#5A5275', borderTop: '1px solid rgba(27,24,48,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: '#F59E0B' }} />© 2026 inkblot studios</div>
        <div style={{ display: 'flex', gap: 14 }}>{['Privacy', 'Rules', 'Discord', ...(user.role === 'admin' ? ['Admin'] : []), 'v0.3.1'].map(l => <a key={l} href={l === 'Admin' ? '/admin' : '#'} style={{ color: '#5A5275', textDecoration: 'none' }}>{l}</a>)}</div>
      </footer>
      <FriendsPanel isOpen={friendsOpen} onClose={() => setFriendsOpen(false)} myUserId={user.userId} />
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Caveat:wght@500;700&display=swap');
        @keyframes pulseRing { 0% { transform: scale(.92); opacity: .5; } 70% { transform: scale(1.35); opacity: 0; } 100% { transform: scale(1.35); opacity: 0; } }
        * { box-sizing: border-box; }
        input[type=range] { cursor: pointer; }
        
        @media (max-width: 720px) {
          /* Allows the Word of Day to not get cut off by letting the root container grow and scroll */
          .lobby-root { 
            height: auto !important; 
            min-height: 100vh !important; 
            overflow-y: auto !important; 
            display: flex !important;
          }
          
          /* Stacks everything strictly from top to bottom */
          .main-grid { 
            display: flex !important; 
            flex-direction: column !important; 
            overflow: visible !important; 
          }
          .quick-play-wrapper { 
            grid-row: auto !important; 
            height: auto !important; 
          }
          
          /* Keeps the header looking exactly as it should on mobile without overlapping */
          .hide-on-mobile { display: none !important; }
          .lobby-header { 
            height: auto !important; 
            flex-wrap: wrap !important; 
            padding: 12px 16px !important; 
            justify-content: center !important; 
            gap: 12px !important; 
          }
          .lobby-nav { 
            position: static !important; 
            transform: none !important; 
            order: 3 !important; 
            width: 100% !important; 
            justify-content: center !important; 
          }
          
          main { padding: 12px 16px !important; overflow: visible !important; }
          footer { padding: 10px 16px !important; }
        }
      `}</style>
    </div>
  )
}