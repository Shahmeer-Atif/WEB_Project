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

  if (status === 'sent') return (
    <span style={{ fontSize: 9, fontWeight: 700, color: '#10B981', whiteSpace: 'nowrap' }}>✓ Added</span>
  )

  if (status === 'error') return (
    <span style={{ fontSize: 9, fontWeight: 700, color: '#5A5275', whiteSpace: 'nowrap' }}>sent</span>
  )

  return (
    <button
      onClick={send}
      disabled={status === 'sending'}
      title={`Add @${username}`}
      style={{
        background: 'rgba(49,46,129,0.1)',
        color: '#312E81',
        border: '1px solid rgba(49,46,129,0.2)',
        borderRadius: 6,
        padding: '2px 6px',
        fontSize: 9,
        fontWeight: 700,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        lineHeight: 1.4,
        flexShrink: 0,
      }}
    >
      {status === 'sending' ? '…' : '+ Add'}
    </button>
  )
}