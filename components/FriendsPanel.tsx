'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Friend {
  _id: string
  username: string
  gamesPlayed?: number
  lastSeen?: string
}
interface PendingReceived extends Friend {
  friendshipId: string
}
interface SearchUser extends Friend {
  status: 'none' | 'pending_sent' | 'pending_received' | 'friends'
}
interface GameInvite {
  _id: string
  senderUsername: string
  roomId: string
  roomName: string
  createdAt: string
  expiresAt: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  myUserId: string
}

const Icon = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

type Tab = 'friends' | 'requests' | 'invites' | 'search'

export default function FriendsPanel({ isOpen, onClose, myUserId }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('friends')
  const [friends, setFriends] = useState<Friend[]>([])
  const [pendingReceived, setPendingReceived] = useState<PendingReceived[]>([])
  const [pendingSent, setPendingSent] = useState<Friend[]>([])
  const [invites, setInvites] = useState<GameInvite[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const fetchFriends = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/friends')
      const data = await res.json()
      setFriends(data.friends || [])
      setPendingReceived(data.pendingReceived || [])
      setPendingSent(data.pendingSent || [])
    } catch {}
    setLoading(false)
  }

  const fetchInvites = async () => {
    try {
      const res = await fetch('/api/invites')
      const data = await res.json()
      setInvites(data.invites || [])
    } catch {}
  }

  useEffect(() => {
    if (!isOpen) return
    fetchFriends()
    fetchInvites()
    // Poll invites every 5s while panel is open
    const interval = setInterval(fetchInvites, 5000)
    return () => clearInterval(interval)
  }, [isOpen])

  // Debounced search
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current)
    if (searchQuery.length < 2) { setSearchResults([]); return }
    searchRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`)
        const data = await res.json()
        setSearchResults(data.users || [])
      } catch {}
      setSearching(false)
    }, 350)
  }, [searchQuery])

  const sendFriendRequest = async (receiverId: string) => {
    const res = await fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiverId }),
    })
    const data = await res.json()
    showToast(data.message)
    if (res.ok) setSearchResults(prev => prev.map(u => u._id === receiverId ? { ...u, status: 'pending_sent' as const } : u))
  }

  const handleFriendRequest = async (friendshipId: string, action: 'accept' | 'reject') => {
    const res = await fetch(`/api/friends/${friendshipId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const data = await res.json()
    showToast(data.message)
    if (res.ok) fetchFriends()
  }

  const removeFriend = async (friendId: string) => {
    await fetch(`/api/friends/${friendId}`, { method: 'DELETE' })
    setFriends(prev => prev.filter(f => f._id !== friendId))
    showToast('Friend removed')
  }

  const handleInvite = async (inviteId: string, action: 'accepted' | 'declined') => {
    const res = await fetch('/api/invites', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteId, action }),
    })
    const data = await res.json()
    setInvites(prev => prev.filter(i => i._id !== inviteId))
    if (action === 'accepted' && data.roomId) {
      onClose()
      router.push(`/room/${data.roomId}`)
    } else {
      showToast('Invite declined')
    }
  }

  const timeAgo = (dateStr?: string) => {
    if (!dateStr) return 'never'
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  const timeLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now()
    if (diff <= 0) return 'expired'
    const mins = Math.ceil(diff / 60000)
    return `${mins}m left`
  }

  const statusButton = (user: SearchUser) => {
    if (user.status === 'friends') return (
      <span style={{ fontSize: 11, color: '#10B981', fontWeight: 700, padding: '4px 8px', background: 'rgba(16,185,129,0.1)', borderRadius: 999 }}>✓ Friends</span>
    )
    if (user.status === 'pending_sent') return (
      <span style={{ fontSize: 11, color: '#5A5275', fontWeight: 700, padding: '4px 8px', background: 'rgba(27,24,48,0.08)', borderRadius: 999 }}>Pending…</span>
    )
    if (user.status === 'pending_received') return (
      <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 700, padding: '4px 8px', background: 'rgba(245,158,11,0.1)', borderRadius: 999 }}>Accept them!</span>
    )
    return (
      <button onClick={() => sendFriendRequest(user._id)} style={{
        background: '#312E81', color: '#FBF6EC', border: 'none',
        borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600,
        cursor: 'pointer', boxShadow: '0 3px 0 -1px #1F1B5C',
      }}>+ Add</button>
    )
  }

  const totalNotifications = pendingReceived.length + invites.length

  if (!isOpen) return null

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 40,
        background: 'rgba(27,24,48,0.25)', backdropFilter: 'blur(2px)',
      }} />

      <div style={{
        position: 'fixed', right: 20, top: 70, zIndex: 50,
        width: 370, maxHeight: 'calc(100vh - 100px)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.97), rgba(255,255,255,0.9))',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.7)',
        boxShadow: '0 24px 64px rgba(31,27,92,0.2)',
        borderRadius: 20, display: 'flex', flexDirection: 'column',
        overflow: 'hidden', fontFamily: "'Inter', sans-serif",
      }}>
        {/* Header */}
        <div style={{ padding: '18px 20px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontFamily: "'Caveat', cursive", color: '#F59E0B', fontSize: 18, lineHeight: 1 }}>your people —</div>
              <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 22 }}>Friends</div>
            </div>
            <button onClick={onClose} style={{
              width: 30, height: 30, borderRadius: '50%', border: 'none',
              background: 'rgba(27,24,48,0.08)', cursor: 'pointer', color: '#5A5275',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon d="M18 6 6 18M6 6l12 12" size={13} />
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 2, padding: 3, background: 'rgba(27,24,48,0.05)', borderRadius: 12, marginBottom: 14 }}>
            {([
              { id: 'friends',  label: `Friends${friends.length > 0 ? ` (${friends.length})` : ''}` },
              { id: 'requests', label: `Requests${pendingReceived.length > 0 ? ` (${pendingReceived.length})` : ''}` },
              { id: 'invites',  label: `Invites${invites.length > 0 ? ` (${invites.length})` : ''}` },
              { id: 'search',   label: '+ Find' },
            ] as { id: Tab; label: string }[]).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, padding: '6px 2px', borderRadius: 9, border: 'none', cursor: 'pointer',
                background: tab === t.id ? '#fff' : 'transparent',
                color: tab === t.id ? '#312E81' : '#5A5275',
                fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 12,
                boxShadow: tab === t.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s', position: 'relative',
              }}>
                {t.label}
                {(t.id === 'requests' && pendingReceived.length > 0) && (
                  <span style={{ position: 'absolute', top: 1, right: 3, width: 7, height: 7, borderRadius: '50%', background: '#EC4899' }} />
                )}
                {(t.id === 'invites' && invites.length > 0) && (
                  <span style={{ position: 'absolute', top: 1, right: 3, width: 7, height: 7, borderRadius: '50%', background: '#10B981' }} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>

          {/* ── Friends ── */}
          {tab === 'friends' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '32px 0', fontFamily: "'Caveat', cursive", color: '#5A5275', fontSize: 18 }}>Loading…</div>
              ) : friends.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>👥</div>
                  <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 18, marginBottom: 4 }}>No friends yet</div>
                  <div style={{ color: '#5A5275', fontSize: 13, marginBottom: 12 }}>Search for players to add them</div>
                  <button onClick={() => setTab('search')} style={{
                    background: '#312E81', color: '#FBF6EC', border: 'none',
                    borderRadius: 10, padding: '8px 20px',
                    fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 14, cursor: 'pointer',
                  }}>Find Friends</button>
                </div>
              ) : friends.map(f => (
                <div key={f._id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.8)',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', background: '#312E81',
                    color: '#FBF6EC', fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 15,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>{f.username?.[0]?.toUpperCase() ?? '?'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: '#1B1830', fontSize: 13 }}>@{f.username}</div>
                    <div style={{ fontSize: 11, color: '#5A5275' }}>{f.gamesPlayed ?? 0} games · seen {timeAgo(f.lastSeen)}</div>
                  </div>
                  <button onClick={() => removeFriend(f._id)} title="Remove" style={{
                    width: 26, height: 26, borderRadius: '50%', border: 'none',
                    background: 'rgba(236,72,153,0.08)', color: '#EC4899',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
                  }}>✕</button>
                </div>
              ))}
            </div>
          )}

          {/* ── Requests ── */}
          {tab === 'requests' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pendingReceived.length > 0 && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#5A5275', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Incoming ({pendingReceived.length})</div>
                  {pendingReceived.map(p => (
                    <div key={p._id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 12,
                      background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', background: '#F59E0B',
                        color: '#1B1830', fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 15,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>{p.username?.[0]?.toUpperCase() ?? '?'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#1B1830', fontSize: 13 }}>@{p.username}</div>
                        <div style={{ fontSize: 11, color: '#5A5275' }}>wants to be friends</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => handleFriendRequest(p.friendshipId, 'accept')} style={{
                          background: '#312E81', color: '#FBF6EC', border: 'none',
                          borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 600,
                          cursor: 'pointer', boxShadow: '0 2px 0 -1px #1F1B5C',
                        }}>✓</button>
                        <button onClick={() => handleFriendRequest(p.friendshipId, 'reject')} style={{
                          background: 'rgba(27,24,48,0.08)', color: '#5A5275', border: 'none',
                          borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        }}>✕</button>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {pendingSent.length > 0 && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#5A5275', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 8 }}>Sent ({pendingSent.length})</div>
                  {pendingSent.map(p => (
                    <div key={p._id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 12,
                      background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(27,24,48,0.08)',
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', background: '#5A5275',
                        color: '#FBF6EC', fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 15,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>{p.username?.[0]?.toUpperCase() ?? '?'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#1B1830', fontSize: 13 }}>@{p.username}</div>
                        <div style={{ fontSize: 11, color: '#5A5275' }}>request pending…</div>
                      </div>
                      <span style={{ fontSize: 16 }}>⏳</span>
                    </div>
                  ))}
                </>
              )}

              {pendingReceived.length === 0 && pendingSent.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 0', fontFamily: "'Caveat', cursive", color: '#5A5275', fontSize: 18 }}>No pending requests</div>
              )}
            </div>
          )}

          {/* ── Invites ── */}
          {tab === 'invites' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 11, color: '#5A5275' }}>Updates every 5 seconds</span>
                <button onClick={fetchInvites} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#312E81', fontSize: 12, fontWeight: 600, padding: '2px 6px' }}>
                  ↻ Refresh
                </button>
              </div>
              {invites.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🎮</div>
                  <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 18, marginBottom: 4 }}>No invites</div>
                  <div style={{ color: '#5A5275', fontSize: 13 }}>When friends invite you to a room, it'll show up here</div>
                </div>
              ) : invites.map(inv => (
                <div key={inv._id} style={{
                  borderRadius: 14, overflow: 'hidden',
                  border: '1px solid rgba(16,185,129,0.25)',
                  background: 'rgba(16,185,129,0.04)',
                }}>
                  <div style={{ padding: '12px 14px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', background: '#10B981',
                        color: '#fff', fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 14,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>{inv.senderUsername?.[0]?.toUpperCase() ?? '?'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#1B1830', fontSize: 13 }}>
                          <strong>@{inv.senderUsername}</strong> invited you!
                        </div>
                        <div style={{ fontSize: 11, color: '#5A5275' }}>
                          Room: <span style={{ fontFamily: "'Caveat', cursive", fontSize: 14, color: '#1B1830' }}>{inv.roomName}</span>
                        </div>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: '#5A5275',
                        background: 'rgba(27,24,48,0.06)', padding: '2px 7px', borderRadius: 999,
                      }}>{timeLeft(inv.expiresAt)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => handleInvite(inv._id, 'accepted')} style={{
                        flex: 1, padding: '8px 0',
                        background: '#10B981', color: '#fff', border: 'none',
                        borderRadius: 10, fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 14,
                        cursor: 'pointer', boxShadow: '0 3px 0 -1px #059669',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}>
                        🎮 Join Room
                      </button>
                      <button onClick={() => handleInvite(inv._id, 'declined')} style={{
                        padding: '8px 14px',
                        background: 'rgba(27,24,48,0.07)', color: '#5A5275', border: 'none',
                        borderRadius: 10, fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 14,
                        cursor: 'pointer',
                      }}>✕</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Search ── */}
          {tab === 'search' && (
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(27,24,48,0.1)',
                borderRadius: 12, padding: '8px 14px', marginBottom: 12,
              }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#5A5275" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z" />
                </svg>
                <input
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by username…" autoFocus
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: '#1B1830', fontFamily: "'Inter', sans-serif" }}
                />
                {searching && (
                  <span style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(49,46,129,0.2)', borderTopColor: '#312E81', animation: 'spin 0.7s linear infinite', display: 'inline-block', flexShrink: 0 }} />
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {searchQuery.length < 2 && (
                  <div style={{ textAlign: 'center', padding: '24px 0', fontFamily: "'Caveat', cursive", color: '#5A5275', fontSize: 16 }}>Type at least 2 characters</div>
                )}
                {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px 0', fontFamily: "'Caveat', cursive", color: '#5A5275', fontSize: 16 }}>No players found</div>
                )}
                {searchResults.map(u => (
                  <div key={u._id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 12,
                    background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.8)',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', background: '#312E81',
                      color: '#FBF6EC', fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 15,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>{u.username?.[0]?.toUpperCase() ?? '?'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: '#1B1830', fontSize: 13 }}>@{u.username}</div>
                      <div style={{ fontSize: 11, color: '#5A5275' }}>{u.gamesPlayed ?? 0} games played</div>
                    </div>
                    {statusButton(u)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
            background: '#1B1830', color: '#FBF6EC', borderRadius: 999,
            padding: '7px 16px', fontSize: 13, fontWeight: 500,
            whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            animation: 'fadeIn 0.2s ease',
          }}>{toast}</div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
      `}</style>
    </>
  )
}