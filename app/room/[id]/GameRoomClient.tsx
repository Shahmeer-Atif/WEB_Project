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
  const r = 24; const c = 2 * Math.PI * r; const offset = c - (value / max) * c; const danger = value <= 10
  return (
    <div style={{ position: 'relative', width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg viewBox="0 0 56 56" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(27,24,48,0.1)" strokeWidth="5" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={danger ? '#EC4899' : '#F59E0B'} strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.4s linear, stroke 0.3s' }} />
      </svg>
      <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 17, color: danger ? '#EC4899' : '#1B1830' }}>{value}</span>
    </div>
  )
}

// ─── Hidden Word ──────────────────────────────────────────────────────────────
const HiddenWord = ({ hint, wordLength, drawerName, isDrawer, word }: { hint: string; wordLength: number; drawerName: string; isDrawer: boolean; word: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0, flex: 1 }}>
    <div style={{ fontSize: 10, fontWeight: 700, color: '#5A5275', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4, textAlign: 'center' }}>
      {isDrawer ? `✏️ your word to draw` : `🎯 ${drawerName} is drawing — guess!`}
    </div>
    <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', flexWrap: 'wrap', justifyContent: 'center' }}>
      {(isDrawer ? word : hint).split('').map((ch, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{ width: 24, height: 30, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 16, background: ch !== '_' ? 'rgba(245,158,11,0.2)' : 'transparent', border: ch !== '_' ? '1px solid rgba(245,158,11,0.5)' : 'none', color: '#1B1830', transition: 'background 0.3s' }}>
            {ch !== '_' ? ch.toUpperCase() : ''}
          </div>
          <div style={{ width: 20, height: 2, background: 'rgba(27,24,48,0.35)', borderRadius: 999 }} />
        </div>
      ))}
    </div>
    <span style={{ fontFamily: "'Caveat', cursive", color: '#5A5275', fontSize: 12, marginTop: 2 }}>{wordLength} letters</span>
  </div>
)

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
    setToast(data.message)
    setTimeout(() => setToast(''), 2500)
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(27,24,48,0.5)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70, width: 'min(360px, 92vw)', background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.7)', boxShadow: '0 24px 64px rgba(31,27,92,0.25)', borderRadius: 20, overflow: 'hidden', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(27,24,48,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ fontFamily: "'Caveat', cursive", color: '#F59E0B', fontSize: 17, lineHeight: 1 }}>bring your crew —</div>
              <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 20 }}>Invite Friends</div>
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'rgba(27,24,48,0.08)', cursor: 'pointer', color: '#5A5275', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon d="M18 6 6 18M6 6l12 12" size={12} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(49,46,129,0.06)', borderRadius: 8, padding: '7px 10px' }}>
            <span style={{ fontSize: 11, color: '#5A5275' }}>Room ID:</span>
            <span style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, color: '#312E81', fontSize: 15 }}>{roomId}</span>
            <button onClick={() => { navigator.clipboard?.writeText(window.location.href); setToast('Link copied! 📋'); setTimeout(() => setToast(''), 2000) }} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#312E81', fontSize: 11, fontWeight: 600 }}>Copy link</button>
          </div>
        </div>
        <div style={{ padding: '12px 16px', maxHeight: 280, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px 0', fontFamily: "'Caveat', cursive", color: '#5A5275', fontSize: 18 }}>Loading…</div>
          ) : friends.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
              <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 15, marginBottom: 4 }}>No friends to invite yet</div>
              <div style={{ color: '#5A5275', fontSize: 12 }}>Add friends from the lobby first</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {friends.map(f => (
                <div key={f._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(27,24,48,0.06)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#312E81', color: '#FBF6EC', fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{f.username?.[0]?.toUpperCase() ?? '?'}</div>
                  <span style={{ flex: 1, fontWeight: 600, color: '#1B1830', fontSize: 13 }}>@{f.username}</span>
                  <button onClick={() => !sent[f._id] && sendInvite(f._id)} disabled={sent[f._id]} style={{ background: sent[f._id] ? 'rgba(16,185,129,0.1)' : '#312E81', color: sent[f._id] ? '#10B981' : '#FBF6EC', border: sent[f._id] ? '1px solid rgba(16,185,129,0.3)' : 'none', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: sent[f._id] ? 'default' : 'pointer', boxShadow: sent[f._id] ? 'none' : '0 3px 0 -1px #1F1B5C' }}>
                    {sent[f._id] ? '✓ Sent!' : '🎮 Invite'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {toast && <div style={{ padding: '10px 16px', background: '#1B1830', color: '#FBF6EC', textAlign: 'center', fontSize: 13, fontWeight: 500 }}>{toast}</div>}
      </div>
    </>
  )
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
const Leaderboard = ({ players, scores, currentDrawerId, mySocketId, friendIds, myUserId }: { players: Player[]; scores: Record<string, number>; currentDrawerId: string; mySocketId: string; friendIds: Set<string>; myUserId: string }) => {
  const sorted = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))
  return (
    <aside style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.85),rgba(255,255,255,0.6))', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.65)', boxShadow: '0 2px 16px rgba(31,27,92,0.08)', borderRadius: 14, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexShrink: 0 }}>
        <Icon d="M3 19h18l-2-11-4 4-4-7-4 7-4-4z" size={14} />
        <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 14 }}>Scores</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#5A5275' }}>{players.length}p</span>
      </div>
      {sorted.map((p, idx) => {
        const isMe = p.id === mySocketId
        const isDrawer = p.id === currentDrawerId
        return (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 8px', borderRadius: 10, background: isMe ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.5)', border: isMe ? '1px solid rgba(245,158,11,0.3)' : '1px solid transparent', opacity: p.connected ? 1 : 0.4 }}>
            <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#5A5275', width: 14, textAlign: 'center', fontSize: 10, flexShrink: 0 }}>{idx + 1}</span>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#312E81', color: '#FBF6EC', fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p.username?.[0]?.toUpperCase() ?? '?'}</div>
              {isDrawer && <div style={{ position: 'absolute', top: -3, right: -3, width: 11, height: 11, borderRadius: '50%', background: '#F59E0B', fontSize: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #FBF6EC' }}>✏</div>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#1B1830', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {isMe ? 'you' : `@${p.username}`}
              </div>
              {isDrawer && <div style={{ fontSize: 9, color: '#F59E0B', fontWeight: 600 }}>drawing</div>}
            </div>
            <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#312E81', fontSize: 12, flexShrink: 0 }}>{scores[p.id] || 0}</span>
            {!isMe && !friendIds.has(p.userId) && (
              <AddFriendButton userId={p.userId} username={p.username} />
            )}
          </div>
        )
      })}
      {players.length === 0 && <div style={{ textAlign: 'center', color: '#5A5275', padding: '12px 0', fontFamily: "'Caveat', cursive", fontSize: 15 }}>Waiting…</div>}
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
    <div style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.85),rgba(255,255,255,0.6))', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.65)', boxShadow: '0 2px 16px rgba(31,27,92,0.08)', borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(27,24,48,0.06)', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <Icon d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" size={14} />
        <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 14 }}>{disabled ? 'Guesses' : 'Chat & Guesses'}</span>
        {disabled && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#5A5275', background: 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: 999 }}>you're drawing</span>}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5, minHeight: 0 }}>
        {messages.length === 0 && <div style={{ textAlign: 'center', color: '#5A5275', padding: '16px 0', fontFamily: "'Caveat', cursive", fontSize: 15 }}>{phase === 'waiting' ? 'Waiting for game…' : 'Type your guess!'}</div>}
        {messages.map(m => (
          <div key={m.id} style={{ fontSize: 12, lineHeight: 1.5, color: msgColor(m.type), background: m.type === 'correct' ? 'rgba(16,185,129,0.08)' : m.type === 'system' ? 'rgba(49,46,129,0.06)' : 'transparent', borderRadius: m.type !== 'normal' ? 8 : 0, padding: m.type !== 'normal' ? '4px 7px' : '0', fontStyle: m.type === 'guessed' ? 'italic' : 'normal' }}>
            {m.type !== 'system' && <strong style={{ color: '#1B1830', marginRight: 3 }}>@{m.username}</strong>}
            {m.message}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} style={{ padding: '8px 10px', borderTop: '1px solid rgba(27,24,48,0.06)', display: 'flex', gap: 7, flexShrink: 0 }}>
        <input value={input} onChange={e => setInput(e.target.value)} disabled={disabled} placeholder={disabled ? "You're drawing!" : phase === 'waiting' ? 'Waiting…' : 'Type your guess…'} style={{ flex: 1, background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(27,24,48,0.1)', borderRadius: 9, padding: '7px 10px', fontSize: 12, color: '#1B1830', outline: 'none', fontFamily: "'Inter', sans-serif", opacity: disabled ? 0.5 : 1, minWidth: 0 }} />
        <button type="submit" disabled={disabled || !input.trim()} style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: disabled || !input.trim() ? 'rgba(27,24,48,0.08)' : '#312E81', border: 'none', cursor: disabled || !input.trim() ? 'not-allowed' : 'pointer', color: disabled || !input.trim() ? '#5A5275' : '#FBF6EC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon d="m22 2-20 9 9 3 3 9 8-21Z" size={13} />
        </button>
      </form>
    </div>
  )
}

// ─── Draw Toolbar ─────────────────────────────────────────────────────────────
const DrawToolbar = ({ color, setColor, brushSize, setBrushSize, onUndo, onClear, tool, setTool }: { color: string; setColor: (c: string) => void; brushSize: number; setBrushSize: (s: number) => void; onUndo: () => void; onClear: () => void; tool: 'brush' | 'eraser'; setTool: (t: 'brush' | 'eraser') => void }) => (
  <div style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.7)', borderRadius: 12, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
    {/* Tools */}
    <div style={{ display: 'flex', gap: 4 }}>
      {[{ id: 'brush', icon: 'M9 15c-1.8 0-3 1.2-3 3 0 1-1 2-3 2 1.5 2 4 3 6 3 3 0 5-2 5-5 0-1.8-1.2-3-3-3Zm5-3 7-7a2.1 2.1 0 0 1 3 3l-7 7-3-3Z' }, { id: 'eraser', icon: 'M20 20H7L3 16l13-13 5 5-2 2M6 20l7-7' }].map(t => (
        <button key={t.id} onClick={() => setTool(t.id as any)} style={{ width: 32, height: 32, borderRadius: 8, background: tool === t.id ? '#312E81' : 'rgba(27,24,48,0.06)', border: 'none', color: tool === t.id ? '#FBF6EC' : '#5A5275', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon d={t.icon} size={14} />
        </button>
      ))}
    </div>
    <div style={{ width: 1, height: 24, background: 'rgba(27,24,48,0.1)', flexShrink: 0 }} />
    {/* Colors */}
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 160 }}>
      {COLORS.map(c => <button key={c} onClick={() => { setColor(c); setTool('brush') }} style={{ width: 20, height: 20, borderRadius: '50%', background: c, border: `2px solid ${color === c ? '#312E81' : c === '#FFFFFF' ? 'rgba(27,24,48,0.2)' : 'transparent'}`, cursor: 'pointer', padding: 0, transform: color === c ? 'scale(1.25)' : 'scale(1)', transition: 'transform 0.1s' }} />)}
    </div>
    <div style={{ width: 1, height: 24, background: 'rgba(27,24,48,0.1)', flexShrink: 0 }} />
    {/* Sizes */}
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {BRUSH_SIZES.map(s => <button key={s} onClick={() => setBrushSize(s)} style={{ width: s + 6, height: s + 6, minWidth: 14, minHeight: 14, borderRadius: '50%', background: brushSize === s ? '#312E81' : '#1B1830', border: 'none', cursor: 'pointer', opacity: brushSize === s ? 1 : 0.2 }} />)}
    </div>
    <div style={{ width: 1, height: 24, background: 'rgba(27,24,48,0.1)', flexShrink: 0 }} />
    {/* Actions */}
    <div style={{ display: 'flex', gap: 4 }}>
      <button onClick={onUndo} title="Undo" style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(27,24,48,0.06)', border: 'none', color: '#5A5275', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon d="M3 7v6h6M21 17a8 8 0 0 0-15-4l-3 3" size={14} />
      </button>
      <button onClick={onClear} title="Clear" style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(236,72,153,0.08)', border: 'none', color: '#EC4899', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" size={14} />
      </button>
    </div>
  </div>
)

// ─── Drawing Canvas ───────────────────────────────────────────────────────────
const DrawingCanvas = ({ isDrawer, onDraw, onClear, onUndo, externalDraw, externalClear, externalSync }: { isDrawer: boolean; onDraw: (e: DrawEvent) => void; onClear: () => void; onUndo: (img: string) => void; externalDraw: DrawEvent | null; externalClear: number; externalSync: string | null }) => {
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

  const stopDrawing = () => { if (!isDrawer) return; isDrawingRef.current = false; onDraw({ x: 0, y: 0, color, size: brushSize, type: 'end' }) }

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, flex: 1 }}>
      {isDrawer && <DrawToolbar color={color} setColor={setColor} brushSize={brushSize} setBrushSize={setBrushSize} tool={tool} setTool={setTool} onUndo={handleUndo} onClear={handleClear} />}
      <div style={{ position: 'relative', background: '#FFFFFF', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 20px rgba(31,27,92,0.1)', border: isDrawer ? '2px solid rgba(49,46,129,0.25)' : '2px solid rgba(27,24,48,0.06)', flex: 1 }}>
        <canvas ref={canvasRef} width={800} height={500} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} style={{ display: 'block', width: '100%', height: '100%', cursor: !isDrawer ? 'default' : tool === 'eraser' ? 'cell' : 'crosshair', touchAction: 'none', objectFit: 'contain' }} />
        {!isDrawer && <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', borderRadius: 8, padding: '3px 9px', fontSize: 11, color: '#5A5275', fontWeight: 600 }}>👁 spectating</div>}
      </div>
    </div>
  )
}

// ─── Overlays ─────────────────────────────────────────────────────────────────
const RevealOverlay = ({ word }: { word: string }) => (
  <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(27,24,48,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ background: '#FBF6EC', borderRadius: 20, padding: '32px 40px', textAlign: 'center', maxWidth: 340, boxShadow: '0 20px 60px rgba(31,27,92,0.3)' }}>
      <div style={{ fontSize: 44, marginBottom: 10 }}>🎨</div>
      <div style={{ fontFamily: "'Caveat', cursive", color: '#5A5275', fontSize: 18, marginBottom: 4 }}>the word was</div>
      <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#312E81', fontSize: 36, marginBottom: 16 }}>{word}</div>
      <div style={{ fontFamily: "'Caveat', cursive", color: '#F59E0B', fontSize: 16 }}>next round starting…</div>
    </div>
  </div>
)

const GameEndOverlay = ({ scores, players, onLeave }: { scores: Record<string, number>; players: Player[]; onLeave: () => void }) => {
  const sorted = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))
  const medals = ['🥇', '🥈', '🥉']
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(27,24,48,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#FBF6EC', borderRadius: 20, padding: '32px 36px', textAlign: 'center', width: '100%', maxWidth: 360, boxShadow: '0 20px 60px rgba(31,27,92,0.3)' }}>
        <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 32, marginBottom: 6 }}>Game Over!</div>
        <div style={{ fontFamily: "'Caveat', cursive", color: '#F59E0B', fontSize: 20, marginBottom: 20 }}>final scores</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {sorted.slice(0, 5).map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderRadius: 12, background: i === 0 ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.7)' }}>
              <span style={{ fontSize: 20 }}>{medals[i] || `${i + 1}.`}</span>
              <span style={{ flex: 1, fontWeight: 600, color: '#1B1830', textAlign: 'left', fontSize: 14 }}>@{p.username}</span>
              <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#312E81', fontSize: 17 }}>{scores[p.id] || 0}</span>
            </div>
          ))}
        </div>
        <button onClick={onLeave} style={{ background: '#312E81', color: '#FBF6EC', border: 'none', fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 16, padding: '11px 28px', borderRadius: 12, cursor: 'pointer', boxShadow: '0 5px 0 -1px #1F1B5C' }}>Back to lobby</button>
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
  const isDrawer = socketId === currentDrawerId

  // Fetch friend IDs so we don't show Add Friend button for existing friends
  useEffect(() => {
    fetch('/api/friends')
      .then(r => r.json())
      .then(d => {
        const ids = new Set<string>((d.friends || []).map((f: { _id: string }) => f._id))
        setFriendIds(ids)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const socket = getSocket()
    socket.connect()
    socket.on('connect', () => {
      setSocketId(socket.id || '')
      socket.emit('room:join', { roomId, username: user.username, userId: user.userId })
      socket.emit('user:online', user.userId)
    })
    socket.on('room:state', ({ players, currentDrawer, round, totalRounds, phase, timeLeft }) => { setPlayers(players); setCurrentDrawerId(currentDrawer || ''); setRound(round); setTotalRounds(totalRounds); setPhase(phase); setTimeLeft(timeLeft) })
    socket.on('round:start', ({ drawerId, wordLength, hint, timeLeft, round, wordForDrawer }) => { setCurrentDrawerId(drawerId); setWordLength(wordLength); setHint(hint); setTimeLeft(timeLeft); setRound(round); setPhase('drawing'); setMyWord(wordForDrawer || ''); setRevealWord(''); setMessages([]); setExternalClear(v => v + 1) })
    socket.on('round:word', ({ word }) => setMyWord(word))
    socket.on('round:end', ({ word, scores }) => { setRevealWord(word); setScores(scores); setPhase('reveal'); setMyWord('') })
    socket.on('game:end', ({ finalScores }) => { const m: Record<string, number> = {}; finalScores.forEach((s: any) => { m[s.id] = s.score }); setScores(m); setPhase('end') })
    socket.on('timer:tick', ({ timeLeft }) => setTimeLeft(timeLeft))
    socket.on('scores:update', ({ scores }) => setScores(scores))
    socket.on('draw:stroke', (e: DrawEvent) => setExternalDraw({ ...e }))
    socket.on('draw:clear', () => setExternalClear(v => v + 1))
    socket.on('draw:sync', ({ imageData }: { imageData: string }) => setExternalSync(imageData))
    socket.on('chat:message', ({ userId, username, message, type }) => { setMessages(prev => [...prev, { id: Date.now() + Math.random().toString(), userId, username, message, type }]) })
    socket.on('guess:correct', ({ points, word }) => { setMessages(prev => [...prev, { id: Date.now().toString(), userId: user.userId, username: user.username, message: `✓ Guessed "${word}" — +${points} pts`, type: 'correct' }]) })
    return () => { ['connect','room:state','round:start','round:word','round:end','game:end','timer:tick','scores:update','draw:stroke','draw:clear','draw:sync','chat:message','guess:correct'].forEach(e => socket.off(e)); disconnectSocket() }
  }, [roomId, user])

  // Fetch room name
  useEffect(() => {
    fetch(`/api/rooms/${roomId}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: '' }) })
      .then(r => r.json()).then(d => { if (d.roomName && d.roomName !== roomId) setRoomName(d.roomName) }).catch(() => {})
  }, [roomId])

  const handleDraw = useCallback((e: DrawEvent) => { getSocket().emit('draw:stroke', { roomId, ...e }) }, [roomId])
  const handleClear = useCallback(() => { getSocket().emit('draw:clear', { roomId }) }, [roomId])
  const handleUndo = useCallback((imageData: string) => { getSocket().emit('draw:undo', { roomId, imageData }) }, [roomId])
  const handleSendMessage = (message: string) => { getSocket().emit('chat:message', { roomId, message, userId: user.userId, username: user.username }) }
  const handleLeave = () => { disconnectSocket(); router.push('/lobby') }

  const drawerName = players.find(p => p.id === currentDrawerId)?.username || '?'

  return (
    <div style={{ height: '100vh', backgroundColor: '#FBF6EC', backgroundImage: `radial-gradient(rgba(27,24,48,0.03) 1px,transparent 1px)`, backgroundSize: '4px 4px', fontFamily: "'Inter',system-ui,sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Top bar ── */}
      <header style={{ flexShrink: 0, padding: '8px 14px' }}>
        <div style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,255,255,0.7))', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.7)', borderRadius: 14, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 2px 12px rgba(31,27,92,0.08)' }}>

          {/* Logo */}
          <a href="/lobby" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', flexShrink: 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: '#312E81', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-6deg)', flexShrink: 0 }}>
              <span style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, color: '#FBF6EC', fontSize: 15 }}>i</span>
            </div>
            <span style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 16 }}>inkblot</span>
          </a>

          <div style={{ width: 1, height: 24, background: 'rgba(27,24,48,0.1)', flexShrink: 0 }} />

          {/* Round + Room info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#5A5275', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Round</div>
              <div style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 16, lineHeight: 1 }}>{round}<span style={{ color: '#5A5275', fontSize: 12, fontWeight: 400 }}>/{totalRounds}</span></div>
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#5A5275', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Room</div>
              <div style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 600, color: '#1B1830', fontSize: 13, lineHeight: 1 }}>
                {roomName || roomId}
              </div>
              {roomName && <div style={{ fontSize: 9, color: '#5A5275' }}>{roomId}</div>}
            </div>
          </div>

          <div style={{ width: 1, height: 24, background: 'rgba(27,24,48,0.1)', flexShrink: 0 }} />

          {/* Center — word */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' }}>
            {phase === 'drawing' && <HiddenWord hint={hint} wordLength={wordLength} drawerName={drawerName} isDrawer={isDrawer} word={myWord} />}
            {phase === 'waiting' && <div style={{ fontFamily: "'Caveat',cursive", color: '#5A5275', fontSize: 18 }}>waiting for players…</div>}
            {phase === 'reveal' && <div style={{ fontFamily: "'Caveat',cursive", color: '#F59E0B', fontSize: 18 }}>round over!</div>}
          </div>

          <div style={{ width: 1, height: 24, background: 'rgba(27,24,48,0.1)', flexShrink: 0 }} />

          {/* Right — timer + invite + leave */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {phase === 'drawing' && <TimerRing value={timeLeft} max={60} />}
            <button onClick={() => setShowInvite(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 9, padding: '6px 11px', fontSize: 12, fontWeight: 600, color: '#059669', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              👥 Invite
            </button>
            <button onClick={handleLeave} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(27,24,48,0.1)', borderRadius: 9, padding: '6px 11px', fontSize: 12, fontWeight: 600, color: '#5A5275', cursor: 'pointer' }}>
              <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" size={13} />
              Leave
            </button>
          </div>
        </div>
      </header>

      {/* ── Main area ── */}
      <main className="game-main" style={{ flex: 1, padding: '0 14px 12px', display: 'grid', gridTemplateColumns: '180px 1fr 200px', gap: 10, minHeight: 0 }}>
        <Leaderboard players={players} scores={scores} currentDrawerId={currentDrawerId} mySocketId={socketId} friendIds={friendIds} myUserId={user.userId} />
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <DrawingCanvas isDrawer={isDrawer} onDraw={handleDraw} onClear={handleClear} onUndo={handleUndo} externalDraw={externalDraw} externalClear={externalClear} externalSync={externalSync} />
          {phase === 'reveal' && <RevealOverlay word={revealWord} />}
          {phase === 'end' && <GameEndOverlay scores={scores} players={players} onLeave={handleLeave} />}
        </div>
        <ChatPanel messages={messages} onSend={handleSendMessage} disabled={isDrawer} phase={phase} />
      </main>

      {showInvite && <InviteModal roomId={roomId} roomName={roomName || roomId} onClose={() => setShowInvite(false)} />}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Caveat:wght@500;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: rgba(27,24,48,0.12); border-radius: 5px; }

        @media (max-width: 768px) {
          .game-main {
            grid-template-columns: 1fr !important;
            grid-template-rows: auto 1fr 240px !important;
            overflow-y: auto !important;
          }
          header { padding: 6px 10px !important; }
          header > div { flex-wrap: wrap !important; gap: 8px !important; }
        }
      `}</style>
    </div>
  )
}