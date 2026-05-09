'use client'

import { useState } from 'react'

interface Props {
  userId: string
  username: string
}

export default function AddFriendButton({ userId, username }: Props) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const send = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (status !== 'idle') return
    setStatus('sending')
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: userId }),
      })
      setStatus(res.ok ? 'sent' : 'error')
    } catch {
      setStatus('error')
    }
  }

  const label = status === 'sending' ? '…' : status === 'sent' ? '✓ Sent!' : status === 'error' ? 'Already sent' : '+ Friend'
  const bg = status === 'sent' ? '#10B981' : status === 'error' ? '#5A5275' : '#312E81'

  return (
    <button onClick={send} title={`Add @${username} as friend`} style={{
      background: bg, color: '#FBF6EC', border: 'none',
      borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600,
      cursor: status === 'idle' ? 'pointer' : 'default',
      transition: 'background 0.2s', whiteSpace: 'nowrap',
      fontFamily: "'Inter', sans-serif",
    }}>
      {label}
    </button>
  )
}