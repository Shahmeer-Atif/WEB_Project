'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { JWTPayload } from '@/lib/jwt'
import { getSocket, disconnectSocket } from '@/lib/socket'

interface Props {
  roomId: string
  user: JWTPayload
}
interface Player {
  id: string
  userId: string
  username: string
  connected: boolean
}
interface ChatMessage {
  id: string
  userId: string
  username: string
  message: string
  type: 'normal' | 'system' | 'guessed' | 'correct'
}
interface DrawEvent {
  x: number
  y: number
  color: string
  size: number
  type: 'start' | 'draw' | 'end'
}
type GamePhase = 'waiting' | 'drawing' | 'reveal' | 'end'

const COLORS = [
  '#1B1830','#EC4899','#312E81','#F59E0B',
  '#10B981','#EF4444','#8B5CF6','#3B82F6',
  '#F97316','#84CC16','#06B6D4','#FFFFFF',
]
const BRUSH_SIZES = [4, 8, 14, 22]

const Icon = ({ d, size = 18, fill = 'none' }: { d: string; size?: number; fill?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const TimerRing = ({ value, max = 60 }: { value: number; max?: number }) => {
  const r = 26
  const c = 2 * Math.PI * r
  const offset = c - (value / max) * c
  const danger = value <= 10
  return (
    <div style={{ position: 'relative', width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg viewBox="0 0 64 64" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(27,24,48,0.1)" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none"
          stroke={danger ? '#EC4899' : '#F59E0B'} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.4s linear, stroke 0.3s' }}
        />
      </svg>
      <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 20, color: danger ? '#EC4899' : '#1B1830', transition: 'color 0.3s' }}>{value}</span>
    </div>
  )
}

const HiddenWord = ({ hint, wordLength, drawerName, isDrawer, word }: {
  hint: string; wordLength: number; drawerName: string; isDrawer: boolean; word: string
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: '#5A5275', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>
      {isDrawer ? `draw: ${word}` : `${drawerName} is drawing — guess!`}
    </div>
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
      {(isDrawer ? word : hint).split('').map((ch, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div style={{
            width: 28, height: 36, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 18,
            background: ch !== '_' ? 'rgba(245,158,11,0.2)' : 'transparent',
            border: ch !== '_' ? '1px solid rgba(245,158,11,0.5)' : 'none',
            color: '#1B1830', transition: 'background 0.3s',
          }}>
            {ch !== '_' ? ch.toUpperCase() : ''}
          </div>
          <div style={{ width: 24, height: 2, background: 'rgba(27,24,48,0.4)', borderRadius: 999 }} />
        </div>
      ))}
    </div>
    <span style={{ fontFamily: "'Caveat', cursive", color: '#5A5275', fontSize: 14, marginTop: 4 }}>{wordLength} letters</span>
  </div>
)

const Leaderboard = ({ players, scores, currentDrawerId, mySocketId }: {
  players: Player[]; scores: Record<string, number>; currentDrawerId: string; mySocketId: string
}) => {
  const sorted = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))
  return (
    <aside style={{
      background: 'linear-gradient(180deg, rgba(255,255,255,0.78), rgba(255,255,255,0.5))',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.65)',
      boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 8px 24px rgba(31,27,92,0.1)',
      borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Icon d="M3 19h18l-2-11-4 4-4-7-4 7-4-4z" size={16} />
        <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 16 }}>Leaderboard</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#5A5275' }}>{players.length} players</span>
      </div>
      {sorted.map((p, idx) => {
        const isMe = p.id === mySocketId
        const isDrawer = p.id === currentDrawerId
        return (
          <div key={p.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: 12,
            background: isMe ? 'rgba(245,158,11,0.15)' : idx === 0 ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)',
            border: isMe ? '1px solid rgba(245,158,11,0.4)' : '1px solid transparent',
            opacity: p.connected ? 1 : 0.4, transition: 'all 0.3s',
          }}>
            <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#5A5275', width: 20, textAlign: 'center', fontSize: 13 }}>{idx + 1}</span>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: '#312E81', color: '#FBF6EC',
                fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {p.username?.[0]?.toUpperCase() ?? '?'}
              </div>
              {isDrawer && (
                <div style={{
                  position: 'absolute', top: -4, right: -4, width: 16, height: 16,
                  borderRadius: '50%', background: '#F59E0B', color: '#1B1830',
                  fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid #FBF6EC',
                }}>✏️</div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1B1830', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                @{p.username}{isMe ? ' (you)' : ''}
              </div>
              {isDrawer && <div style={{ fontSize: 10, color: '#5A5275' }}>drawing</div>}
            </div>
            <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#312E81', fontSize: 14 }}>{scores[p.id] || 0}</span>
          </div>
        )
      })}
      {players.length === 0 && (
        <div style={{ textAlign: 'center', color: '#5A5275', padding: '16px 0', fontFamily: "'Caveat', cursive", fontSize: 16 }}>
          Waiting for players…
        </div>
      )}
    </aside>
  )
}

const ChatPanel = ({ messages, onSend, disabled, phase }: {
  messages: ChatMessage[]; onSend: (msg: string) => void; disabled: boolean; phase: GamePhase
}) => {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    const msg = input.trim()
    if (!msg) return
    onSend(msg)
    setInput('')
  }
  const msgColor = (type: ChatMessage['type']) => {
    if (type === 'correct') return '#10B981'
    if (type === 'system') return '#312E81'
    if (type === 'guessed') return '#5A5275'
    return '#2A2545'
  }
  return (
    <div style={{
      background: 'linear-gradient(180deg, rgba(255,255,255,0.78), rgba(255,255,255,0.5))',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.65)',
      boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 8px 24px rgba(31,27,92,0.1)',
      borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1,
    }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(27,24,48,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" size={15} />
        <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 15 }}>
          {disabled ? 'Guesses' : 'Chat & Guesses'}
        </span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#5A5275', padding: '20px 0', fontFamily: "'Caveat', cursive", fontSize: 16 }}>
            {phase === 'waiting' ? 'Waiting for the game to start…' : 'Type your guess below!'}
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} style={{
            fontSize: 13, lineHeight: 1.5, color: msgColor(m.type),
            background: m.type === 'correct' ? 'rgba(16,185,129,0.08)' : m.type === 'system' ? 'rgba(49,46,129,0.06)' : 'transparent',
            borderRadius: m.type !== 'normal' ? 8 : 0,
            padding: m.type !== 'normal' ? '4px 8px' : '0',
            fontStyle: m.type === 'guessed' ? 'italic' : 'normal',
          }}>
            {m.type !== 'system' && <strong style={{ color: '#1B1830', marginRight: 4 }}>@{m.username}</strong>}
            {m.message}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} style={{ padding: '10px 12px', borderTop: '1px solid rgba(27,24,48,0.06)', display: 'flex', gap: 8 }}>
        <input
          value={input} onChange={e => setInput(e.target.value)} disabled={disabled}
          placeholder={disabled ? "You're drawing!" : phase === 'waiting' ? 'Waiting…' : 'Type your guess…'}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(27,24,48,0.1)',
            borderRadius: 10, padding: '8px 12px', fontSize: 13, color: '#1B1830',
            outline: 'none', fontFamily: "'Inter', sans-serif", opacity: disabled ? 0.5 : 1,
          }}
        />
        <button type="submit" disabled={disabled || !input.trim()} style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: disabled || !input.trim() ? 'rgba(27,24,48,0.1)' : '#312E81',
          border: 'none', cursor: disabled || !input.trim() ? 'not-allowed' : 'pointer',
          color: disabled || !input.trim() ? '#5A5275' : '#FBF6EC',
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s',
        }}>
          <Icon d="m22 2-20 9 9 3 3 9 8-21Z" size={15} />
        </button>
      </form>
    </div>
  )
}

const DrawToolbar = ({ color, setColor, brushSize, setBrushSize, onUndo, onClear, tool, setTool }: {
  color: string; setColor: (c: string) => void
  brushSize: number; setBrushSize: (s: number) => void
  onUndo: () => void; onClear: () => void
  tool: 'brush' | 'eraser'; setTool: (t: 'brush' | 'eraser') => void
}) => (
  <div style={{
    background: 'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))',
    backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.65)',
    boxShadow: '0 2px 12px rgba(31,27,92,0.1)', borderRadius: 16, padding: '12px 16px',
    display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
  }}>
    <div style={{ display: 'flex', gap: 6 }}>
      {[
        { id: 'brush', icon: 'M9 15c-1.8 0-3 1.2-3 3 0 1-1 2-3 2 1.5 2 4 3 6 3 3 0 5-2 5-5 0-1.8-1.2-3-3-3Zm5-3 7-7a2.1 2.1 0 0 1 3 3l-7 7-3-3Z', label: 'Brush' },
        { id: 'eraser', icon: 'M20 20H7L3 16l13-13 5 5-2 2M6 20l7-7', label: 'Eraser' },
      ].map(t => (
        <button key={t.id} onClick={() => setTool(t.id as 'brush' | 'eraser')} title={t.label} style={{
          width: 36, height: 36, borderRadius: 10,
          background: tool === t.id ? '#312E81' : 'rgba(255,255,255,0.7)',
          border: tool === t.id ? '1px solid #312E81' : '1px solid rgba(27,24,48,0.1)',
          color: tool === t.id ? '#FBF6EC' : '#5A5275',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
        }}>
          <Icon d={t.icon} size={16} />
        </button>
      ))}
    </div>
    <div style={{ width: 1, height: 28, background: 'rgba(27,24,48,0.1)' }} />
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', maxWidth: 180 }}>
      {COLORS.map(c => (
        <button key={c} onClick={() => { setColor(c); setTool('brush') }} style={{
          width: 22, height: 22, borderRadius: '50%', background: c,
          border: `2px solid ${color === c ? '#312E81' : c === '#FFFFFF' ? 'rgba(27,24,48,0.2)' : 'transparent'}`,
          cursor: 'pointer', padding: 0,
          boxShadow: color === c ? '0 0 0 2px rgba(49,46,129,0.3)' : 'none',
          transition: 'transform 0.1s, box-shadow 0.1s',
          transform: color === c ? 'scale(1.2)' : 'scale(1)',
        }} />
      ))}
    </div>
    <div style={{ width: 1, height: 28, background: 'rgba(27,24,48,0.1)' }} />
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {BRUSH_SIZES.map(s => (
        <button key={s} onClick={() => setBrushSize(s)} style={{
          width: s + 8, height: s + 8, minWidth: 16, minHeight: 16, borderRadius: '50%',
          background: brushSize === s ? '#312E81' : '#1B1830', border: 'none', cursor: 'pointer',
          opacity: brushSize === s ? 1 : 0.25, transition: 'all 0.15s',
        }} />
      ))}
    </div>
    <div style={{ width: 1, height: 28, background: 'rgba(27,24,48,0.1)' }} />
    <div style={{ display: 'flex', gap: 6 }}>
      <button onClick={onUndo} title="Undo" style={{
        width: 36, height: 36, borderRadius: 10,
        background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(27,24,48,0.1)',
        color: '#5A5275', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon d="M3 7v6h6M21 17a8 8 0 0 0-15-4l-3 3" size={16} />
      </button>
      <button onClick={onClear} title="Clear canvas" style={{
        width: 36, height: 36, borderRadius: 10,
        background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(27,24,48,0.1)',
        color: '#EC4899', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" size={16} />
      </button>
    </div>
  </div>
)

// ─── Canvas Component ─────────────────────────────────────────────────────────
const DrawingCanvas = ({ isDrawer, onDraw, onClear, onUndo, externalDraw, externalClear, externalSync }: {
  isDrawer: boolean
  onDraw: (e: DrawEvent) => void
  onClear: () => void
  onUndo: (imageData: string) => void  // sends snapshot to socket
  externalDraw: DrawEvent | null
  externalClear: number
  externalSync: string | null          // base64 canvas snapshot from undo
}) => {
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
    ctx.strokeStyle = col
    ctx.lineWidth = size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }, [])

  // Handle incoming draw strokes from drawer
  useEffect(() => {
    if (!externalDraw || isDrawer) return
    const ctx = getCtx()
    if (!ctx) return
    if (externalDraw.type === 'end') return
    if (externalDraw.type === 'start') {
      lastPosRef.current = { x: externalDraw.x, y: externalDraw.y }
      return
    }
    drawSegment(ctx, lastPosRef.current.x, lastPosRef.current.y, externalDraw.x, externalDraw.y, externalDraw.color, externalDraw.size, externalDraw.color === 'eraser')
    lastPosRef.current = { x: externalDraw.x, y: externalDraw.y }
  }, [externalDraw, isDrawer, drawSegment])

  // Handle clear from drawer
  useEffect(() => {
    if (!externalClear) return
    const ctx = getCtx()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.globalCompositeOperation = 'source-over'
  }, [externalClear])

  // Handle undo sync from drawer — restore canvas from base64 snapshot
  useEffect(() => {
    if (!externalSync || isDrawer) return
    const ctx = getCtx()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    const img = new Image()
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.globalCompositeOperation = 'source-over'
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    }
    img.src = externalSync
  }, [externalSync, isDrawer])

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer) return
    e.preventDefault()
    const ctx = getCtx()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    snapshotsRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
    if (snapshotsRef.current.length > 30) snapshotsRef.current.shift()
    isDrawingRef.current = true
    const pos = getPos(e)
    lastPosRef.current = pos
    onDraw({ ...pos, color: tool === 'eraser' ? 'eraser' : color, size: brushSize, type: 'start' })
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer || !isDrawingRef.current) return
    e.preventDefault()
    const ctx = getCtx()
    if (!ctx) return
    const pos = getPos(e)
    drawSegment(ctx, lastPosRef.current.x, lastPosRef.current.y, pos.x, pos.y, color, brushSize, tool === 'eraser')
    onDraw({ ...pos, color: tool === 'eraser' ? 'eraser' : color, size: brushSize, type: 'draw' })
    lastPosRef.current = pos
  }

  const stopDrawing = () => {
    if (!isDrawer) return
    isDrawingRef.current = false
    onDraw({ x: 0, y: 0, color, size: brushSize, type: 'end' })
  }

  const handleUndo = () => {
    const ctx = getCtx()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    const snapshot = snapshotsRef.current.pop()
    if (snapshot) {
      ctx.putImageData(snapshot, 0, 0)
      // Send canvas snapshot to all other players
      const imageData = canvas.toDataURL('image/png')
      onUndo(imageData)
    }
  }

  const handleClear = () => {
    const ctx = getCtx()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    snapshotsRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.globalCompositeOperation = 'source-over'
    onClear()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {isDrawer && (
        <DrawToolbar
          color={color} setColor={setColor}
          brushSize={brushSize} setBrushSize={setBrushSize}
          tool={tool} setTool={setTool}
          onUndo={handleUndo} onClear={handleClear}
        />
      )}
      <div style={{
        position: 'relative', background: '#FFFFFF', borderRadius: 16, overflow: 'hidden',
        boxShadow: '0 2px 24px rgba(31,27,92,0.12)',
        border: isDrawer ? '2px solid rgba(49,46,129,0.3)' : '2px solid rgba(27,24,48,0.08)',
      }}>
        <canvas
          ref={canvasRef} width={800} height={500}
          onMouseDown={startDrawing} onMouseMove={draw}
          onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
          onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
          style={{
            display: 'block', width: '100%', height: 'auto',
            cursor: !isDrawer ? 'default' : tool === 'eraser' ? 'cell' : 'crosshair',
            touchAction: 'none',
          }}
        />
        {!isDrawer && (
          <div style={{
            position: 'absolute', bottom: 12, right: 12,
            background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)',
            borderRadius: 8, padding: '4px 10px', fontSize: 11, color: '#5A5275', fontWeight: 600,
          }}>
            👁 spectating
          </div>
        )}
      </div>
    </div>
  )
}

const RevealOverlay = ({ word }: { word: string }) => (
  <div style={{
    position: 'absolute', inset: 0, zIndex: 50,
    background: 'rgba(27,24,48,0.75)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <div style={{ background: '#FBF6EC', borderRadius: 24, padding: '40px 48px', textAlign: 'center', maxWidth: 400, boxShadow: '0 24px 64px rgba(31,27,92,0.3)' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🎨</div>
      <div style={{ fontFamily: "'Caveat', cursive", color: '#5A5275', fontSize: 20, marginBottom: 4 }}>the word was</div>
      <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#312E81', fontSize: 40, marginBottom: 20 }}>{word}</div>
      <div style={{ fontFamily: "'Caveat', cursive", color: '#F59E0B', fontSize: 18 }}>next round starting…</div>
    </div>
  </div>
)

const GameEndOverlay = ({ scores, players, onLeave }: { scores: Record<string, number>; players: Player[]; onLeave: () => void }) => {
  const sorted = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))
  const medals = ['🥇', '🥈', '🥉']
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50,
      background: 'rgba(27,24,48,0.8)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ background: '#FBF6EC', borderRadius: 24, padding: '40px 48px', textAlign: 'center', minWidth: 360, boxShadow: '0 24px 64px rgba(31,27,92,0.3)' }}>
        <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 36, marginBottom: 8 }}>Game Over!</div>
        <div style={{ fontFamily: "'Caveat', cursive", color: '#F59E0B', fontSize: 22, marginBottom: 24 }}>final scores</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {sorted.slice(0, 5).map((p, i) => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 12,
              background: i === 0 ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.6)',
            }}>
              <span style={{ fontSize: 22 }}>{medals[i] || `${i + 1}.`}</span>
              <span style={{ flex: 1, fontWeight: 600, color: '#1B1830', textAlign: 'left' }}>@{p.username}</span>
              <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#312E81', fontSize: 18 }}>{scores[p.id] || 0}</span>
            </div>
          ))}
        </div>
        <button onClick={onLeave} style={{
          background: '#312E81', color: '#FBF6EC', border: 'none',
          fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 17,
          padding: '12px 32px', borderRadius: 14, cursor: 'pointer', boxShadow: '0 6px 0 -1px #1F1B5C',
        }}>
          Back to lobby
        </button>
      </div>
    </div>
  )
}

// ─── Main Game Room ───────────────────────────────────────────────────────────
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
  const lastEmitRef = useRef(0)
  const isDrawer = socketId === currentDrawerId

  useEffect(() => {
    const socket = getSocket()
    socket.connect()

    socket.on('connect', () => {
      setSocketId(socket.id || '')
      socket.emit('room:join', { roomId, username: user.username, userId: user.userId })
    })

    socket.on('room:state', ({ players, currentDrawer, round, totalRounds, phase, timeLeft }) => {
      setPlayers(players)
      setCurrentDrawerId(currentDrawer || '')
      setRound(round)
      setTotalRounds(totalRounds)
      setPhase(phase)
      setTimeLeft(timeLeft)
    })

    socket.on('round:start', ({ drawerId, wordLength, hint, timeLeft, round, wordForDrawer }) => {
  setCurrentDrawerId(drawerId)
  setWordLength(wordLength)
  setHint(hint)
  setTimeLeft(timeLeft)
  setRound(round)
  setPhase('drawing')
  setMyWord(wordForDrawer || '')  // ← set word immediately if drawer
  setRevealWord('')
  setMessages([])
  setExternalClear(v => v + 1)
})

    socket.on('round:word', ({ word }) => setMyWord(word))

    socket.on('round:end', ({ word, scores }) => {
      setRevealWord(word)
      setScores(scores)
      setPhase('reveal')
      setMyWord('')
    })

    socket.on('game:end', ({ finalScores }) => {
      const scoreMap: Record<string, number> = {}
      finalScores.forEach((s: { id: string; score: number }) => { scoreMap[s.id] = s.score })
      setScores(scoreMap)
      setPhase('end')
    })

    socket.on('timer:tick', ({ timeLeft }) => setTimeLeft(timeLeft))
    socket.on('scores:update', ({ scores }) => setScores(scores))
    socket.on('draw:stroke', (event: DrawEvent) => setExternalDraw({ ...event }))
    socket.on('draw:clear', () => setExternalClear(v => v + 1))
    socket.on('draw:sync', ({ imageData }: { imageData: string }) => setExternalSync(imageData))

    socket.on('chat:message', ({ userId, username, message, type }) => {
      setMessages(prev => [...prev, { id: Date.now() + Math.random().toString(), userId, username, message, type }])
    })

    socket.on('guess:correct', ({ points, word }) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(), userId: user.userId, username: user.username,
        message: `✓ You guessed it! "${word}" — +${points} pts`, type: 'correct',
      }])
    })

    return () => {
      socket.off('connect')
      socket.off('room:state')
      socket.off('round:start')
      socket.off('round:word')
      socket.off('round:end')
      socket.off('game:end')
      socket.off('timer:tick')
      socket.off('scores:update')
      socket.off('draw:stroke')
      socket.off('draw:clear')
      socket.off('draw:sync')
      socket.off('chat:message')
      socket.off('guess:correct')
      disconnectSocket()
    }
  }, [roomId, user])

  const handleDraw = useCallback((event: DrawEvent) => {
    lastEmitRef.current = Date.now()
    getSocket().emit('draw:stroke', { roomId, ...event })
  }, [roomId])

  const handleClear = useCallback(() => {
    getSocket().emit('draw:clear', { roomId })
  }, [roomId])

  // Undo: send canvas snapshot to socket server → broadcast to other players
  const handleUndo = useCallback((imageData: string) => {
    getSocket().emit('draw:undo', { roomId, imageData })
  }, [roomId])

  const handleSendMessage = (message: string) => {
    getSocket().emit('chat:message', { roomId, message, userId: user.userId, username: user.username })
  }

  const handleLeave = () => {
    disconnectSocket()
    router.push('/lobby')
  }

  const drawerName = players.find(p => p.id === currentDrawerId)?.username || '?'

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#FBF6EC',
      backgroundImage: `radial-gradient(rgba(27,24,48,0.035) 1px, transparent 1px), radial-gradient(rgba(27,24,48,0.025) 1px, transparent 1px)`,
      backgroundSize: '3px 3px, 7px 7px', backgroundPosition: '0 0, 1px 1px',
      fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', flexDirection: 'column',
    }}>
      <header style={{ flexShrink: 0, padding: '12px 20px' }}>
        <div style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.78), rgba(255,255,255,0.5))',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.65)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 4px 16px rgba(31,27,92,0.1)',
          borderRadius: 16, padding: '10px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <a href="/lobby" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#312E81', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-6deg)', flexShrink: 0 }}>
                <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#FBF6EC', fontSize: 16 }}>i</span>
              </div>
              <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 18 }}>inkblot</span>
            </a>
            <div style={{ borderLeft: '1px solid rgba(27,24,48,0.1)', paddingLeft: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#5A5275', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Round</div>
              <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 15 }}>
                {round} <span style={{ color: '#5A5275', fontWeight: 400 }}>/ {totalRounds}</span>
              </div>
            </div>
            <div style={{ borderLeft: '1px solid rgba(27,24,48,0.1)', paddingLeft: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#5A5275', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Room</div>
              <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 600, color: '#1B1830', fontSize: 13 }}>{roomId}</div>
            </div>
          </div>

          {phase === 'drawing' && (
            <HiddenWord hint={hint} wordLength={wordLength} drawerName={drawerName} isDrawer={isDrawer} word={myWord} />
          )}
          {phase === 'waiting' && (
            <div style={{ fontFamily: "'Caveat', cursive", color: '#5A5275', fontSize: 20 }}>waiting for players…</div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {phase === 'drawing' && <TimerRing value={timeLeft} max={60} />}
            <button onClick={handleLeave} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(27,24,48,0.1)',
              borderRadius: 10, padding: '7px 12px', fontSize: 13, fontWeight: 600,
              color: '#5A5275', cursor: 'pointer', transition: 'color 0.15s',
            }}>
              <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" size={15} />
              Leave
            </button>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, padding: '0 20px 20px', display: 'grid', gridTemplateColumns: '200px 1fr 220px', gap: 12, minHeight: 0 }}>
        <Leaderboard players={players} scores={scores} currentDrawerId={currentDrawerId} mySocketId={socketId} />

        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <DrawingCanvas
            isDrawer={isDrawer}
            onDraw={handleDraw}
            onClear={handleClear}
            onUndo={handleUndo}
            externalDraw={externalDraw}
            externalClear={externalClear}
            externalSync={externalSync}
          />
          {phase === 'reveal' && <RevealOverlay word={revealWord} />}
          {phase === 'end' && <GameEndOverlay scores={scores} players={players} onLeave={handleLeave} />}
        </div>

        <ChatPanel messages={messages} onSend={handleSendMessage} disabled={isDrawer} phase={phase} />
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Caveat:wght@500;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: rgba(27,24,48,0.15); border-radius: 6px; }
      `}</style>
    </div>
  )
}