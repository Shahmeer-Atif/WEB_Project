'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { JWTPayload } from '@/lib/jwt'
import { getSocket, disconnectSocket } from '@/lib/socket'
import AddFriendButton from '@/components/AddFriendButton'

interface Props { roomId: string; user: JWTPayload }
interface Player { id: string; userId: string; username: string; connected: boolean }
interface ChatMessage { id: string; userId: string; username: string; message: string; type: 'normal' | 'system' | 'guessed' | 'correct' }
interface DrawEvent { x: number; y: number; color: string; size: number; type: 'start' | 'draw' | 'end' }
type GamePhase = 'waiting' | 'drawing' | 'reveal' | 'end'
interface Friend { _id: string; username: string }

const COLORS = ['#1B1830','#EC4899','#312E81','#F59E0B','#10B981','#EF4444','#8B5CF6','#3B82F6','#F97316','#84CC16','#06B6D4','#FFFFFF']
const BRUSH_SIZES = [4, 8, 14, 22]

const Icon = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

// ─── Timer Ring ───────────────────────────────────────────────────────────────
const TimerRing = ({ value, max = 60 }: { value: number; max?: number }) => {
  const r = 20; const c = 2 * Math.PI * r; const offset = c - (value / max) * c; const danger = value <= 10
  return (
    <div style={{ position: 'relative', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg viewBox="0 0 48 48" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(27,24,48,0.1)" strokeWidth="4" />
        <circle cx="24" cy="24" r={r} fill="none" stroke={danger ? '#EC4899' : '#F59E0B'} strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.4s linear, stroke 0.3s' }} />
      </svg>
      <span style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, fontSize: 14, color: danger ? '#EC4899' : '#1B1830' }}>{value}</span>
    </div>
  )
}

// ─── Word Display Bar ─────────────────────────────────────────────────────────
const WordBar = ({ hint, wordLength, drawerName, isDrawer, word, phase }: { hint: string; wordLength: number; drawerName: string; isDrawer: boolean; word: string; phase: GamePhase }) => {
  if (phase === 'waiting') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 16px', background: 'rgba(27,24,48,0.04)', borderTop: '1px solid rgba(27,24,48,0.06)' }}>
      <span style={{ fontFamily: "'Caveat',cursive", color: '#5A5275', fontSize: 16 }}>waiting for players to join…</span>
    </div>
  )
  if (phase === 'reveal' || phase === 'end') return null

  return (
    <div style={{ padding: '8px 16px', background: isDrawer ? 'rgba(245,158,11,0.08)' : 'rgba(49,46,129,0.04)', borderTop: '1px solid rgba(27,24,48,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: isDrawer ? '#B45309' : '#5A5275', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
        {isDrawer ? '✏️ Your word to draw' : `🎯 ${drawerName} is drawing — guess it!`}
      </div>
      <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end', flexWrap: 'wrap', justifyContent: 'center' }}>
        {(isDrawer ? word : hint).split('').map((ch, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ width: 22, height: 28, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Fredoka',sans-serif", fontWeight: 700, fontSize: 15, background: ch !== '_' ? (isDrawer ? 'rgba(245,158,11,0.25)' : 'rgba(49,46,129,0.1)') : 'transparent', border: ch !== '_' ? `1px solid ${isDrawer ? 'rgba(245,158,11,0.5)' : 'rgba(49,46,129,0.3)'}` : 'none', color: '#1B1830' }}>
              {ch !== '_' ? ch.toUpperCase() : ''}
            </div>
            <div style={{ width: 18, height: 2, background: 'rgba(27,24,48,0.3)', borderRadius: 999 }} />
          </div>
        ))}
      </div>
      <span style={{ fontFamily: "'Caveat',cursive", color: '#5A5275', fontSize: 12 }}>{wordLength} letters</span>
    </div>
  )
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────
const InviteModal = ({ roomId, roomName, onClose }: { roomId: string; roomName: string; onClose: () => void }) => {
  const [friends, setFriends] = useState<Friend[]>([])
  const [loading, setLoading] = useState(true)
  const [sent, setSent] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetch('/api/friends').then(r => r.json()).then(d => { setFriends(d.friends || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const sendInvite = async (friendId: string) => {
    setSent(s => ({ ...s, [friendId]: true }))
    const res = await fetch('/api/invites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ receiverId: friendId, roomId, roomName }) })
    const data = await res.json()
    setToast(data.message); setTimeout(() => setToast(''), 2500)
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(27,24,48,0.5)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70, width: 'min(340px,92vw)', background: 'rgba(255,255,255,0.98)', border: '1px solid rgba(255,255,255,0.7)', boxShadow: '0 24px 64px rgba(31,27,92,0.25)', borderRadius: 20, overflow: 'hidden', fontFamily: "'Inter',sans-serif" }}>
        <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid rgba(27,24,48,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <div style={{ fontFamily: "'Caveat',cursive", color: '#F59E0B', fontSize: 16 }}>bring your crew —</div>
              <div style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 20 }}>Invite Friends</div>
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'rgba(27,24,48,0.08)', cursor: 'pointer', color: '#5A5275', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon d="M18 6 6 18M6 6l12 12" size={12} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(49,46,129,0.06)', borderRadius: 8, padding: '6px 10px' }}>
            <span style={{ fontSize: 11, color: '#5A5275' }}>Room ID:</span>
            <span style={{ fontFamily: "'Caveat',cursive", fontWeight: 700, color: '#312E81', fontSize: 14, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{roomId}</span>
            <button onClick={() => { navigator.clipboard?.writeText(window.location.href); setToast('Link copied! 📋'); setTimeout(() => setToast(''), 2000) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#312E81', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>Copy</button>
          </div>
        </div>
        <div style={{ padding: '10px 14px', maxHeight: 260, overflowY: 'auto' }}>
          {loading ? <div style={{ textAlign: 'center', padding: '20px 0', fontFamily: "'Caveat',cursive", color: '#5A5275', fontSize: 16 }}>Loading…</div>
          : friends.length === 0 ? <div style={{ textAlign: 'center', padding: '20px 0' }}><div style={{ fontSize: 32, marginBottom: 6 }}>👥</div><div style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 15 }}>No friends to invite</div></div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>{friends.map(f => (
            <div key={f._id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 11, background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(27,24,48,0.06)' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#312E81', color: '#FBF6EC', fontFamily: "'Fredoka',sans-serif", fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{f.username?.[0]?.toUpperCase() ?? '?'}</div>
              <span style={{ flex: 1, fontWeight: 600, color: '#1B1830', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{f.username}</span>
              <button onClick={() => !sent[f._id] && sendInvite(f._id)} disabled={sent[f._id]} style={{ background: sent[f._id] ? 'rgba(16,185,129,0.1)' : '#312E81', color: sent[f._id] ? '#10B981' : '#FBF6EC', border: sent[f._id] ? '1px solid rgba(16,185,129,0.3)' : 'none', borderRadius: 8, padding: '5px 11px', fontSize: 12, fontWeight: 600, cursor: sent[f._id] ? 'default' : 'pointer', flexShrink: 0 }}>
                {sent[f._id] ? '✓ Sent!' : '🎮 Invite'}
              </button>
            </div>
          ))}</div>}
        </div>
        {toast && <div style={{ padding: '9px 14px', background: '#1B1830', color: '#FBF6EC', textAlign: 'center', fontSize: 13, fontWeight: 500 }}>{toast}</div>}
      </div>
    </>
  )
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
const Leaderboard = ({ players, scores, currentDrawerId, mySocketId, friendIds }: { players: Player[]; scores: Record<string, number>; currentDrawerId: string; mySocketId: string; friendIds: Set<string> }) => {
  const sorted = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))
  return (
    <aside style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.65)', borderRadius: 12, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 5, overflowY: 'auto', overflowX: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2, flexShrink: 0 }}>
        <Icon d="M3 19h18l-2-11-4 4-4-7-4 7-4-4z" size={13} />
        <span style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 13 }}>Scores</span>
        <span style={{ marginLeft: 'auto', fontSize: 9, color: '#5A5275' }}>{players.length}p</span>
      </div>
      {sorted.map((p, idx) => {
        const isMe = p.id === mySocketId
        const isDrawer = p.id === currentDrawerId
        const showAddFriend = !isMe && !friendIds.has(p.userId)
        return (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 6px', borderRadius: 9, background: isMe ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.6)', border: isMe ? '1px solid rgba(245,158,11,0.3)' : '1px solid transparent', opacity: p.connected ? 1 : 0.4, minWidth: 0 }}>
            <span style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, color: '#5A5275', width: 13, textAlign: 'center', fontSize: 10, flexShrink: 0 }}>{idx + 1}</span>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#312E81', color: '#FBF6EC', fontFamily: "'Fredoka',sans-serif", fontWeight: 700, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p.username?.[0]?.toUpperCase() ?? '?'}</div>
              {isDrawer && <div style={{ position: 'absolute', top: -3, right: -3, width: 10, height: 10, borderRadius: '50%', background: '#F59E0B', fontSize: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #FBF6EC' }}>✏</div>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#1B1830', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{isMe ? 'you' : `@${p.username}`}</div>
              {isDrawer && <div style={{ fontSize: 8, color: '#F59E0B', fontWeight: 600 }}>drawing</div>}
            </div>
            <span style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, color: '#312E81', fontSize: 11, flexShrink: 0 }}>{scores[p.id] || 0}</span>
            {showAddFriend && <AddFriendButton userId={p.userId} username={p.username} />}
          </div>
        )
      })}
      {players.length === 0 && <div style={{ textAlign: 'center', color: '#5A5275', padding: '10px 0', fontFamily: "'Caveat',cursive", fontSize: 14 }}>Waiting…</div>}
    </aside>
  )
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────
const ChatPanel = ({ messages, onSend, disabled, phase }: { messages: ChatMessage[]; onSend: (msg: string) => void; disabled: boolean; phase: GamePhase }) => {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  const handleSend = (e: React.FormEvent) => { e.preventDefault(); const msg = input.trim(); if (!msg) return; onSend(msg); setInput('') }
  const msgColor = (type: ChatMessage['type']) => type === 'correct' ? '#10B981' : type === 'system' ? '#312E81' : type === 'guessed' ? '#5A5275' : '#2A2545'
  return (
    <div style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.65)', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(27,24,48,0.06)', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <Icon d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" size={13} />
        <span style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 13 }}>{disabled ? 'Guesses' : 'Chat & Guesses'}</span>
        {disabled && <span style={{ marginLeft: 'auto', fontSize: 9, color: '#B45309', background: 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: 999, fontWeight: 700 }}>YOU'RE DRAWING</span>}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4, minHeight: 0 }}>
        {messages.length === 0 && <div style={{ textAlign: 'center', color: '#5A5275', padding: '14px 0', fontFamily: "'Caveat',cursive", fontSize: 14 }}>{phase === 'waiting' ? 'Waiting for game…' : disabled ? 'Others are guessing your drawing!' : 'Type your guess!'}</div>}
        {messages.map(m => (
          <div key={m.id} style={{ fontSize: 12, lineHeight: 1.4, color: msgColor(m.type), background: m.type === 'correct' ? 'rgba(16,185,129,0.08)' : m.type === 'system' ? 'rgba(49,46,129,0.06)' : 'transparent', borderRadius: m.type !== 'normal' ? 7 : 0, padding: m.type !== 'normal' ? '3px 7px' : '0', fontStyle: m.type === 'guessed' ? 'italic' : 'normal' }}>
            {m.type !== 'system' && <strong style={{ color: '#1B1830', marginRight: 3 }}>@{m.username}</strong>}
            {m.message}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} style={{ padding: '7px 8px', borderTop: '1px solid rgba(27,24,48,0.06)', display: 'flex', gap: 6, flexShrink: 0 }}>
        <input value={input} onChange={e => setInput(e.target.value)} disabled={disabled} placeholder={disabled ? "You're drawing — others are guessing!" : phase === 'waiting' ? 'Waiting…' : 'Type your guess…'} style={{ flex: 1, background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(27,24,48,0.1)', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: '#1B1830', outline: 'none', fontFamily: "'Inter',sans-serif", opacity: disabled ? 0.6 : 1, minWidth: 0 }} />
        <button type="submit" disabled={disabled || !input.trim()} style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: disabled || !input.trim() ? 'rgba(27,24,48,0.08)' : '#312E81', border: 'none', cursor: disabled || !input.trim() ? 'not-allowed' : 'pointer', color: disabled || !input.trim() ? '#5A5275' : '#FBF6EC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon d="m22 2-20 9 9 3 3 9 8-21Z" size={13} />
        </button>
      </form>
    </div>
  )
}

// ─── Draw Toolbar ─────────────────────────────────────────────────────────────
const DrawToolbar = ({ color, setColor, brushSize, setBrushSize, onUndo, onClear, tool, setTool }: { color: string; setColor: (c: string) => void; brushSize: number; setBrushSize: (s: number) => void; onUndo: () => void; onClear: () => void; tool: 'brush' | 'eraser'; setTool: (t: 'brush' | 'eraser') => void }) => (
  <div style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(255,255,255,0.7)', borderRadius: 10, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
    <div style={{ display: 'flex', gap: 4 }}>
      {[{ id: 'brush', icon: 'M9 15c-1.8 0-3 1.2-3 3 0 1-1 2-3 2 1.5 2 4 3 6 3 3 0 5-2 5-5 0-1.8-1.2-3-3-3Zm5-3 7-7a2.1 2.1 0 0 1 3 3l-7 7-3-3Z' }, { id: 'eraser', icon: 'M20 20H7L3 16l13-13 5 5-2 2M6 20l7-7' }].map(t => (
        <button key={t.id} onClick={() => setTool(t.id as any)} style={{ width: 30, height: 30, borderRadius: 7, background: tool === t.id ? '#312E81' : 'rgba(27,24,48,0.06)', border: 'none', color: tool === t.id ? '#FBF6EC' : '#5A5275', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon d={t.icon} size={13} />
        </button>
      ))}
    </div>
    <div style={{ width: 1, height: 20, background: 'rgba(27,24,48,0.1)', flexShrink: 0 }} />
    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', maxWidth: 150 }}>
      {COLORS.map(c => <button key={c} onClick={() => { setColor(c); setTool('brush') }} style={{ width: 18, height: 18, borderRadius: '50%', background: c, border: `2px solid ${color === c ? '#312E81' : c === '#FFFFFF' ? 'rgba(27,24,48,0.2)' : 'transparent'}`, cursor: 'pointer', padding: 0, transform: color === c ? 'scale(1.2)' : 'scale(1)', transition: 'transform 0.1s' }} />)}
    </div>
    <div style={{ width: 1, height: 20, background: 'rgba(27,24,48,0.1)', flexShrink: 0 }} />
    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
      {BRUSH_SIZES.map(s => <button key={s} onClick={() => setBrushSize(s)} style={{ width: s + 5, height: s + 5, minWidth: 13, minHeight: 13, borderRadius: '50%', background: brushSize === s ? '#312E81' : '#1B1830', border: 'none', cursor: 'pointer', opacity: brushSize === s ? 1 : 0.2 }} />)}
    </div>
    <div style={{ width: 1, height: 20, background: 'rgba(27,24,48,0.1)', flexShrink: 0 }} />
    <div style={{ display: 'flex', gap: 4 }}>
      <button onClick={onUndo} style={{ width: 30, height: 30, borderRadius: 7, background: 'rgba(27,24,48,0.06)', border: 'none', color: '#5A5275', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Undo"><Icon d="M3 7v6h6M21 17a8 8 0 0 0-15-4l-3 3" size={13} /></button>
      <button onClick={onClear} style={{ width: 30, height: 30, borderRadius: 7, background: 'rgba(236,72,153,0.08)', border: 'none', color: '#EC4899', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Clear"><Icon d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" size={13} /></button>
    </div>
  </div>
)

// ─── Drawing Canvas ───────────────────────────────────────────────────────────
const DrawingCanvas = ({ isDrawer, onDraw, onClear, onUndo, onSnapshot, externalDraw, externalClear, externalSync }: { isDrawer: boolean; onDraw: (e: DrawEvent) => void; onClear: () => void; onUndo: (img: string) => void; onSnapshot: (img: string) => void; externalDraw: DrawEvent | null; externalClear: number; externalSync: string | null }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef({ x: 0, y: 0 })
  const snapshotsRef = useRef<ImageData[]>([])
  const [color, setColor] = useState('#1B1830')
  const [brushSize, setBrushSize] = useState(8)
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush')
  const getCtx = () => canvasRef.current?.getContext('2d') ?? null

  const drawSegment = useCallback((ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, col: string, size: number, eraser: boolean) => {
    ctx.globalCompositeOperation = eraser ? 'destination-out' : 'source-over'
    ctx.strokeStyle = col; ctx.lineWidth = size; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
  }, [])

  useEffect(() => {
    if (!externalDraw || isDrawer) return
    const ctx = getCtx(); if (!ctx) return
    if (externalDraw.type === 'end') return
    if (externalDraw.type === 'start') { lastPosRef.current = { x: externalDraw.x, y: externalDraw.y }; return }
    drawSegment(ctx, lastPosRef.current.x, lastPosRef.current.y, externalDraw.x, externalDraw.y, externalDraw.color, externalDraw.size, externalDraw.color === 'eraser')
    lastPosRef.current = { x: externalDraw.x, y: externalDraw.y }
  }, [externalDraw, isDrawer, drawSegment])

  useEffect(() => {
    if (!externalClear) return
    const ctx = getCtx(); const canvas = canvasRef.current; if (!ctx || !canvas) return
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.globalCompositeOperation = 'source-over'
  }, [externalClear])

  useEffect(() => {
    if (!externalSync || isDrawer) return
    const ctx = getCtx(); const canvas = canvasRef.current; if (!ctx || !canvas) return
    const img = new Image()
    img.onload = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(img, 0, 0, canvas.width, canvas.height) }
    img.src = externalSync
  }, [externalSync, isDrawer])

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!; const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width; const scaleY = canvas.height / rect.height
    if ('touches' in e) return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer) return; e.preventDefault()
    const ctx = getCtx(); const canvas = canvasRef.current; if (!ctx || !canvas) return
    snapshotsRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
    if (snapshotsRef.current.length > 30) snapshotsRef.current.shift()
    isDrawingRef.current = true; const pos = getPos(e); lastPosRef.current = pos
    onDraw({ ...pos, color: tool === 'eraser' ? 'eraser' : color, size: brushSize, type: 'start' })
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer || !isDrawingRef.current) return; e.preventDefault()
    const ctx = getCtx(); if (!ctx) return; const pos = getPos(e)
    drawSegment(ctx, lastPosRef.current.x, lastPosRef.current.y, pos.x, pos.y, color, brushSize, tool === 'eraser')
    onDraw({ ...pos, color: tool === 'eraser' ? 'eraser' : color, size: brushSize, type: 'draw' })
    lastPosRef.current = pos
  }

  const stopDrawing = () => {
    if (!isDrawer) return; isDrawingRef.current = false
    onDraw({ x: 0, y: 0, color, size: brushSize, type: 'end' })
    const canvas = canvasRef.current; if (canvas) onSnapshot(canvas.toDataURL('image/png'))
  }

  const handleUndo = () => {
    const ctx = getCtx(); const canvas = canvasRef.current; if (!ctx || !canvas) return
    const snap = snapshotsRef.current.pop()
    if (snap) { ctx.putImageData(snap, 0, 0); onUndo(canvas.toDataURL('image/png')) }
  }

  const handleClear = () => {
    const ctx = getCtx(); const canvas = canvasRef.current; if (!ctx || !canvas) return
    snapshotsRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.globalCompositeOperation = 'source-over'; onClear()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minHeight: 0 }}>
      {isDrawer && <DrawToolbar color={color} setColor={setColor} brushSize={brushSize} setBrushSize={setBrushSize} tool={tool} setTool={setTool} onUndo={handleUndo} onClear={handleClear} />}
      <div style={{ position: 'relative', background: '#FFFFFF', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 16px rgba(31,27,92,0.1)', border: isDrawer ? '2px solid rgba(49,46,129,0.2)' : '2px solid rgba(27,24,48,0.06)', flex: 1 }}>
        <canvas ref={canvasRef} width={800} height={500} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} style={{ display: 'block', width: '100%', height: '100%', cursor: !isDrawer ? 'default' : tool === 'eraser' ? 'cell' : 'crosshair', touchAction: 'none' }} />
        {!isDrawer && <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', borderRadius: 7, padding: '3px 8px', fontSize: 10, color: '#5A5275', fontWeight: 600 }}>👁 spectating</div>}
      </div>
    </div>
  )
}

// ─── Overlays ─────────────────────────────────────────────────────────────────
const RevealOverlay = ({ word }: { word: string }) => (
  <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(27,24,48,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
    <div style={{ background: '#FBF6EC', borderRadius: 18, padding: '28px 32px', textAlign: 'center', maxWidth: 320, width: '100%', boxShadow: '0 20px 60px rgba(31,27,92,0.3)' }}>
      <div style={{ fontSize: 40, marginBottom: 8 }}>🎨</div>
      <div style={{ fontFamily: "'Caveat',cursive", color: '#5A5275', fontSize: 17, marginBottom: 3 }}>the word was</div>
      <div style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, color: '#312E81', fontSize: 32, marginBottom: 12 }}>{word}</div>
      <div style={{ fontFamily: "'Caveat',cursive", color: '#F59E0B', fontSize: 15 }}>next round starting…</div>
    </div>
  </div>
)

const GameEndOverlay = ({ scores, players, onLeave }: { scores: Record<string, number>; players: Player[]; onLeave: () => void }) => {
  const sorted = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))
  const medals = ['🥇', '🥈', '🥉']
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(27,24,48,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#FBF6EC', borderRadius: 18, padding: '28px 28px', textAlign: 'center', width: '100%', maxWidth: 340, boxShadow: '0 20px 60px rgba(31,27,92,0.3)' }}>
        <div style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 28, marginBottom: 4 }}>Game Over!</div>
        <div style={{ fontFamily: "'Caveat',cursive", color: '#F59E0B', fontSize: 18, marginBottom: 18 }}>final scores</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 20 }}>
          {sorted.slice(0, 5).map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', borderRadius: 10, background: i === 0 ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.7)' }}>
              <span style={{ fontSize: 18 }}>{medals[i] || `${i + 1}.`}</span>
              <span style={{ flex: 1, fontWeight: 600, color: '#1B1830', textAlign: 'left', fontSize: 13 }}>@{p.username}</span>
              <span style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, color: '#312E81', fontSize: 16 }}>{scores[p.id] || 0}</span>
            </div>
          ))}
        </div>
        <button onClick={onLeave} style={{ background: '#312E81', color: '#FBF6EC', border: 'none', fontFamily: "'Fredoka',sans-serif", fontWeight: 600, fontSize: 15, padding: '10px 24px', borderRadius: 11, cursor: 'pointer', boxShadow: '0 4px 0 -1px #1F1B5C' }}>Back to lobby</button>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function GameRoomClient({ roomId, user }: Props) {
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([])
  const [scores, setScores] = useState<Record<string, number>>({})
  const [currentDrawerId, setCurrentDrawerId] = useState('')
  const [phase, setPhase] = useState<GamePhase>('waiting')
  const [round, setRound] = useState(1)
  const [totalRounds, setTotalRounds] = useState(5)
  const [timeLeft, setTimeLeft] = useState(60)
  const [hint, setHint] = useState('')
  const [wordLength, setWordLength] = useState(0)
  const [myWord, setMyWord] = useState('')
  const [revealWord, setRevealWord] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [socketId, setSocketId] = useState('')
  const [externalDraw, setExternalDraw] = useState<DrawEvent | null>(null)
  const [externalClear, setExternalClear] = useState(0)
  const [externalSync, setExternalSync] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set())
  const [roomSettings, setRoomSettings] = useState<{ totalRounds: number; drawTime: number } | null>(null)
  const isDrawer = socketId === currentDrawerId

  // Fetch friends list
  useEffect(() => {
    fetch('/api/friends').then(r => r.json()).then(d => {
      setFriendIds(new Set((d.friends || []).map((f: { _id: string }) => f._id)))
    }).catch(() => {})
  }, [])

  // Step 1: fetch room settings first (totalRounds, drawTime)
  useEffect(() => {
    fetch(`/api/rooms/${roomId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: '' }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.roomName && d.roomName !== roomId) setRoomName(d.roomName)
        setRoomSettings({ totalRounds: d.rounds || 5, drawTime: d.drawTime || 60 })
      })
      .catch(() => setRoomSettings({ totalRounds: 5, drawTime: 60 }))
  }, [roomId])

  // Step 2: connect socket AFTER room settings are loaded so we pass correct values
  useEffect(() => {
    if (!roomSettings) return

    const socket = getSocket()
    socket.connect()

    socket.on('connect', () => {
      setSocketId(socket.id || '')
      socket.emit('room:join', {
        roomId,
        username: user.username,
        userId: user.userId,
        totalRounds: roomSettings.totalRounds,
        drawTime: roomSettings.drawTime,
      })
      socket.emit('user:online', user.userId)
    })

    socket.on('room:state', ({ players, currentDrawer, round, totalRounds, phase, timeLeft }) => {
      setPlayers(players); setCurrentDrawerId(currentDrawer || ''); setRound(round)
      setTotalRounds(totalRounds); setPhase(phase); setTimeLeft(timeLeft)
    })

    socket.on('round:start', ({ drawerId, wordLength, hint, timeLeft, round, wordForDrawer, totalRounds }) => {
      setCurrentDrawerId(drawerId); setWordLength(wordLength); setHint(hint)
      setTimeLeft(timeLeft); setRound(round); setPhase('drawing')
      // wordForDrawer is only sent when you ARE the drawer
      // Always update myWord — empty string for guessers, actual word for drawer
      setMyWord(wordForDrawer || '')
      setRevealWord(''); setMessages([]); setExternalClear(v => v + 1)
      if (totalRounds) setTotalRounds(totalRounds)
    })

    // Backup: server also sends round:word separately for the drawer
    socket.on('round:word', ({ word }) => {
      setMyWord(word)
    })

    socket.on('round:end', ({ word, scores }) => { setRevealWord(word); setScores(scores); setPhase('reveal'); setMyWord('') })
    socket.on('game:end', ({ finalScores }) => { const m: Record<string, number> = {}; finalScores.forEach((s: any) => { m[s.id] = s.score }); setScores(m); setPhase('end') })
    socket.on('timer:tick', ({ timeLeft }) => setTimeLeft(timeLeft))
    socket.on('scores:update', ({ scores }) => setScores(scores))
    socket.on('draw:stroke', (e: DrawEvent) => setExternalDraw({ ...e }))
    socket.on('draw:clear', () => setExternalClear(v => v + 1))
    socket.on('draw:sync', ({ imageData }: { imageData: string }) => setExternalSync(imageData))
    socket.on('chat:message', ({ userId, username, message, type }) => {
      setMessages(prev => [...prev, { id: Date.now() + Math.random().toString(), userId, username, message, type }])
    })
    socket.on('guess:correct', ({ points, word }) => {
      setMessages(prev => [...prev, { id: Date.now().toString(), userId: user.userId, username: user.username, message: `✓ Guessed "${word}" — +${points} pts`, type: 'correct' }])
    })

    return () => {
      ['connect','room:state','round:start','round:word','round:end','game:end','timer:tick','scores:update','draw:stroke','draw:clear','draw:sync','chat:message','guess:correct'].forEach(e => socket.off(e))
      disconnectSocket()
    }
  }, [roomId, user, roomSettings])

  const handleDraw = useCallback((e: DrawEvent) => { getSocket().emit('draw:stroke', { roomId, ...e }) }, [roomId])
  const handleClear = useCallback(() => { getSocket().emit('draw:clear', { roomId }) }, [roomId])
  const handleUndo = useCallback((imageData: string) => { getSocket().emit('draw:undo', { roomId, imageData }) }, [roomId])
  const handleSnapshot = useCallback((imageData: string) => { getSocket().emit('draw:snapshot', { roomId, imageData }) }, [roomId])
  const handleSendMessage = (message: string) => { getSocket().emit('chat:message', { roomId, message, userId: user.userId, username: user.username }) }
  const handleLeave = () => { disconnectSocket(); router.push('/lobby') }
  const drawerName = players.find(p => p.id === currentDrawerId)?.username || '?'

  return (
    <div style={{ height: '100svh', backgroundColor: '#FBF6EC', backgroundImage: `radial-gradient(rgba(27,24,48,0.03) 1px,transparent 1px)`, backgroundSize: '4px 4px', fontFamily: "'Inter',system-ui,sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Compact header ── */}
      <header style={{ flexShrink: 0, padding: '6px 10px' }}>
        <div style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.7)', borderRadius: 12, padding: '7px 12px', boxShadow: '0 2px 10px rgba(31,27,92,0.07)' }}>

          {/* Row 1: logo | round/room | timer | invite | leave */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <a href="/lobby" style={{ display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none', flexShrink: 0 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: '#312E81', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-6deg)', flexShrink: 0 }}>
                <span style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, color: '#FBF6EC', fontSize: 14 }}>i</span>
              </div>
              <span style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 15, display: 'none' }} className="desktop-only">inkblot</span>
            </a>

            <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 8px', background: 'rgba(27,24,48,0.05)', borderRadius: 7 }}>
              <span style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 13 }}>{round}</span>
              <span style={{ color: '#5A5275', fontSize: 11 }}>/{totalRounds}</span>
              <span style={{ color: 'rgba(27,24,48,0.2)', fontSize: 11, margin: '0 2px' }}>·</span>
              <span style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 600, color: '#1B1830', fontSize: 12, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{roomName || roomId}</span>
            </div>

            <div style={{ flex: 1 }} />

            {phase === 'drawing' && <TimerRing value={timeLeft} max={60} />}

            <button onClick={() => setShowInvite(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 600, color: '#059669', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
              👥 <span className="desktop-only" style={{ display: 'none' }}>Invite</span>
            </button>

            <button onClick={handleLeave} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(27,24,48,0.1)', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 600, color: '#5A5275', cursor: 'pointer', flexShrink: 0 }}>
              <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" size={12} />
              <span className="desktop-only" style={{ display: 'none' }}>Leave</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Word bar — always visible, full width ── */}
      <WordBar hint={hint} wordLength={wordLength} drawerName={drawerName} isDrawer={isDrawer} word={myWord} phase={phase} />

      {/* ── Main game grid ── */}
      <main style={{ flex: 1, padding: '8px 10px 10px', display: 'grid', gridTemplateColumns: '160px 1fr 190px', gridTemplateRows: '1fr', gap: 8, minHeight: 0 }} className="game-main">
        <Leaderboard players={players} scores={scores} currentDrawerId={currentDrawerId} mySocketId={socketId} friendIds={friendIds} />
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <DrawingCanvas isDrawer={isDrawer} onDraw={handleDraw} onClear={handleClear} onUndo={handleUndo} onSnapshot={handleSnapshot} externalDraw={externalDraw} externalClear={externalClear} externalSync={externalSync} />
          {phase === 'reveal' && <RevealOverlay word={revealWord} />}
          {phase === 'end' && <GameEndOverlay scores={scores} players={players} onLeave={handleLeave} />}
        </div>
        <ChatPanel messages={messages} onSend={handleSendMessage} disabled={isDrawer} phase={phase} />
      </main>

      {showInvite && <InviteModal roomId={roomId} roomName={roomName || roomId} onClose={() => setShowInvite(false)} />}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Caveat:wght@500;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(27,24,48,0.12); border-radius: 4px; }

        /* Desktop: show text labels */
        @media (min-width: 769px) {
          .desktop-only { display: inline !important; }
          header > div > div > a span { display: inline !important; }
          header button span { display: inline !important; }
        }

        /* Mobile: stack layout */
        @media (max-width: 768px) {
          .game-main {
            grid-template-columns: 1fr !important;
            grid-template-rows: auto 1fr auto !important;
            overflow-y: auto !important;
            gap: 8px !important;
          }
          .game-main > aside {
            max-height: 140px !important;
            overflow-y: auto !important;
          }
          .game-main > div:nth-child(2) {
            min-height: 220px !important;
          }
          .game-main > div:last-child {
            min-height: 200px !important;
            max-height: 240px !important;
          }
          header { padding: 5px 8px !important; }
          main { padding: 6px 8px 8px !important; }
        }
      `}</style>
    </div>
    //change
  )
}