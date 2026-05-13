'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { JWTPayload } from '@/lib/jwt'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props {
  user: JWTPayload
}

interface IUser {
  _id: string
  username: string
  email: string
  role: 'admin' | 'user'
  isActive: boolean
  gamesPlayed: number
  totalScore: number
  createdAt: string
  lastSeen: string
}

type FilterType = 'All' | 'Active' | 'Suspended'
type ActiveSection = 'overview' | 'users' | 'words' | 'wordofday' | 'rooms'

// ─── Icon helper ──────────────────────────────────────────────────────────────
const Icon = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const ICONS = {
  users:   'M16 11a3.5 3.5 0 1 0 0-7M22 20a6.5 6.5 0 0 0-5-6.3M9 8a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0ZM2.5 20a6.5 6.5 0 0 1 13 0',
  shield:  'M12 2l8 4v6c0 5-3.3 9.3-8 11-4.7-1.7-8-6-8-11V6l8-4Z',
  chart:   'M3 3v18h18M7 16l4-4 4 4 4-4',
  words:   'M4 6h16M4 12h10M4 18h6',
  rooms:   'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  logout:  'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  search:  'M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z',
  check:   'M4 12l5 5L20 6',
  x:       'M18 6 6 18M6 6l12 12',
  edit:    'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4Z',
  trash:   'M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6',
  plus:    'M12 5v14M5 12h14',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0 1 14.8-3.5L23 10M1 14l4.7 4.5A9 9 0 0 0 20.5 15',
  crown:   'M3 19h18l-2-11-4 4-4-7-4 7-4-4z',
  bolt:    'M13 2 4 14h7l-1 8 9-12h-7l1-8Z',
  ink:     'M9 3H5a2 2 0 0 0-2 2v4M9 3h6M9 3v18m0 0h6m-6 0H5a2 2 0 0 1-2-2v-4m12-12h4a2 2 0 0 1 2 2v4m0 0v6m0-6H9',
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────
const Toggle = ({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled?: boolean }) => (
  <button
    onClick={onChange}
    disabled={disabled}
    style={{
      width: 40, height: 22, borderRadius: 999,
      background: on ? '#10B981' : 'rgba(27,24,48,0.15)',
      border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
      position: 'relative', transition: 'background 0.25s', flexShrink: 0,
      opacity: disabled ? 0.5 : 1,
    }}
  >
    <span style={{
      position: 'absolute', top: 3,
      left: on ? 21 : 3,
      width: 16, height: 16, borderRadius: '50%',
      background: '#fff', transition: 'left 0.25s',
      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    }} />
  </button>
)

// ─── Role Badge ───────────────────────────────────────────────────────────────
const RoleBadge = ({ role }: { role: 'admin' | 'user' }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
    background: role === 'admin' ? 'rgba(49,46,129,0.1)' : 'rgba(27,24,48,0.07)',
    color: role === 'admin' ? '#312E81' : '#5A5275',
    border: `1px solid ${role === 'admin' ? 'rgba(49,46,129,0.2)' : 'rgba(27,24,48,0.1)'}`,
  }}>
    {role === 'admin' ? '👑' : '👤'} {role}
  </span>
)

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon, color, sub }: {
  label: string; value: string | number; icon: string; color: string; sub?: string
}) => (
  <div style={{
    background: 'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6))',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.7)',
    boxShadow: '0 2px 12px rgba(31,27,92,0.08)',
    borderRadius: 16, padding: '20px 24px',
    display: 'flex', alignItems: 'center', gap: 16,
  }}>
    <div style={{
      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
      background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: `0 4px 12px ${color}50`,
    }}>
      <Icon d={icon} size={20} />
    </div>
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#5A5275', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 26, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#5A5275', marginTop: 2 }}>{sub}</div>}
    </div>
  </div>
)

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const Sidebar = ({ active, setActive, user, onLogout }: {
  active: ActiveSection; setActive: (s: ActiveSection) => void; user: JWTPayload; onLogout: () => void
}) => {
  const navItems: { id: ActiveSection; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview',       icon: ICONS.chart  },
    { id: 'users',    label: 'User Management',icon: ICONS.users  },
    { id: 'words',    label: 'Word Bank',       icon: ICONS.words  },
    { id: 'wordofday', label: 'Word of the Day', icon: ICONS.ink   },
    { id: 'rooms',    label: 'Active Rooms',    icon: ICONS.rooms  },
  ]

  return (
    <aside style={{
      background: 'linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,255,255,0.6))',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.65)',
      boxShadow: '0 2px 24px rgba(31,27,92,0.1)',
      borderRadius: 20, padding: 20,
      display: 'flex', flexDirection: 'column', gap: 4,
      position: 'sticky', top: 20, alignSelf: 'flex-start',
    }}>
      {/* Logo */}
      <a href="/lobby" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 16 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: '#312E81',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: 'rotate(-6deg)', boxShadow: '0 4px 0 -1px #1F1B5C', flexShrink: 0,
        }}>
          <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#FBF6EC', fontSize: 18 }}>i</span>
        </div>
        <div>
          <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 18 }}>inkblot</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#EC4899', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Admin Panel</div>
        </div>
      </a>

      {/* Admin user pill */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'rgba(49,46,129,0.06)', borderRadius: 12, padding: '10px 12px', marginBottom: 12,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', background: '#312E81',
          color: '#FBF6EC', fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {user.username[0].toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1B1830', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{user.username}</div>
          <div style={{ fontSize: 10, color: '#5A5275' }}>👑 Administrator</div>
        </div>
      </div>

      {/* Nav items */}
      {navItems.map(item => (
        <button key={item.id} onClick={() => setActive(item.id)} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
          background: active === item.id ? '#312E81' : 'transparent',
          color: active === item.id ? '#FBF6EC' : '#5A5275',
          fontWeight: 600, fontSize: 14, textAlign: 'left',
          transition: 'all 0.15s',
        }}>
          <Icon d={item.icon} size={16} />
          {item.label}
        </button>
      ))}

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(27,24,48,0.08)', margin: '8px 0' }} />

      {/* Back to lobby + logout */}
      <a href="/lobby" style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', borderRadius: 12,
        color: '#5A5275', fontWeight: 600, fontSize: 14, textDecoration: 'none',
        transition: 'background 0.15s',
      }}>
        <Icon d={ICONS.rooms} size={16} /> Back to lobby
      </a>
      <button onClick={onLogout} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
        background: 'transparent', color: '#EC4899', fontWeight: 600, fontSize: 14, textAlign: 'left',
        transition: 'background 0.15s',
      }}>
        <Icon d={ICONS.logout} size={16} /> Log out
      </button>
    </aside>
  )
}

// ─── Overview Section ─────────────────────────────────────────────────────────
const OverviewSection = ({ users }: { users: IUser[] }) => {
  const total = users.length
  const active = users.filter(u => u.isActive).length
  const admins = users.filter(u => u.role === 'admin').length
  const totalGames = users.reduce((sum, u) => sum + u.gamesPlayed, 0)

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "'Caveat', cursive", color: '#F59E0B', fontSize: 22, lineHeight: 1, marginBottom: 4 }}>good to see you —</div>
        <h1 style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 36, margin: 0 }}>Dashboard Overview</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard label="Total Users"    value={total}      icon={ICONS.users}  color="#312E81" sub="registered accounts" />
        <StatCard label="Active"         value={active}     icon={ICONS.check}  color="#10B981" sub={`${total - active} suspended`} />
        <StatCard label="Admins"         value={admins}     icon={ICONS.crown}  color="#F59E0B" sub="with full access" />
        <StatCard label="Games Played"   value={totalGames} icon={ICONS.bolt}   color="#EC4899" sub="across all users" />
      </div>

      {/* Recent users table preview */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6))',
        backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.7)',
        borderRadius: 20, padding: 24,
        boxShadow: '0 2px 12px rgba(31,27,92,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 20, margin: 0 }}>Recently Joined</h2>
          <span style={{ fontSize: 12, color: '#5A5275' }}>last 5 users</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {users.slice(0, 5).map(u => (
            <div key={u._id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', borderRadius: 12,
              background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.8)',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', background: '#312E81',
                color: '#FBF6EC', fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 15,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>{u.username[0].toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#1B1830', fontSize: 14 }}>@{u.username}</div>
                <div style={{ fontSize: 12, color: '#5A5275' }}>{u.email}</div>
              </div>
              <RoleBadge role={u.role} />
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: u.isActive ? '#10B981' : '#5A5275',
              }} />
            </div>
          ))}
          {users.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 0', fontFamily: "'Caveat', cursive", color: '#5A5275', fontSize: 18 }}>
              No users yet — share the link!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Users Section ────────────────────────────────────────────────────────────
const UsersSection = ({ users, onUpdate, onDelete, currentUserId }: {
  users: IUser[]
  onUpdate: (userId: string, updates: { role?: 'admin' | 'user'; isActive?: boolean }) => Promise<void>
  onDelete: (userId: string) => Promise<void>
  currentUserId: string
}) => {
  const [filter, setFilter] = useState<FilterType>('All')
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const filtered = users.filter(u => {
    const matchesFilter = filter === 'All' || (filter === 'Active' ? u.isActive : !u.isActive)
    const matchesSearch = !search ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const handleUpdate = async (userId: string, updates: { role?: 'admin' | 'user'; isActive?: boolean }) => {
    setUpdating(userId)
    await onUpdate(userId, updates)
    setUpdating(null)
  }

  const handleDelete = async (userId: string) => {
    const u = users.find(x => x._id === userId)
    if (!u) return
    if (!window.confirm(`Delete @${u.username}? This cannot be undone.`)) return
    setDeleting(userId)
    await onDelete(userId)
    setDeleting(null)
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "'Caveat', cursive", color: '#F59E0B', fontSize: 20, lineHeight: 1, marginBottom: 4 }}>manage accounts —</div>
        <h1 style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 32, margin: 0 }}>User Management</h1>
      </div>

      <div style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6))',
        backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.7)',
        borderRadius: 20, padding: 24,
        boxShadow: '0 2px 12px rgba(31,27,92,0.08)',
      }}>
        {/* Filters + search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#5A5275' }}>
              <Icon d={ICONS.search} size={15} />
            </div>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by username or email…"
              style={{
                width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9,
                background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(27,24,48,0.1)',
                borderRadius: 10, fontSize: 13, color: '#1B1830', outline: 'none',
                fontFamily: "'Inter', sans-serif", boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 4, background: 'rgba(27,24,48,0.05)', borderRadius: 10, padding: 4 }}>
            {(['All', 'Active', 'Suspended'] as FilterType[]).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: filter === f ? '#1B1830' : 'transparent',
                color: filter === f ? '#FBF6EC' : '#5A5275',
                fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
              }}>{f}</button>
            ))}
          </div>

          <span style={{ fontSize: 12, color: '#5A5275' }}>{filtered.length} of {users.length} users</span>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(27,24,48,0.08)' }}>
                {['User', 'Role', 'Status', 'Games', 'Joined', 'Last seen', ''].map(h => (
                  <th key={h} style={{
                    padding: '8px 12px', textAlign: 'left',
                    fontSize: 11, fontWeight: 700, color: '#5A5275',
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const isMe = u._id === currentUserId
                const isLoading = updating === u._id
                const isDeleting = deleting === u._id
                return (
                  <tr key={u._id} style={{
                    borderBottom: '1px solid rgba(27,24,48,0.05)',
                    background: isMe ? 'rgba(245,158,11,0.05)' : 'transparent',
                    opacity: isLoading || isDeleting ? 0.6 : 1,
                    transition: 'opacity 0.2s',
                  }}>
                    {/* User */}
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: 8, background: '#312E81',
                          color: '#FBF6EC', fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: 14,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>{u.username[0].toUpperCase()}</div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#1B1830', fontSize: 13 }}>
                            @{u.username}{isMe ? ' (you)' : ''}
                          </div>
                          <div style={{ fontSize: 11, color: '#5A5275' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role selector */}
                    <td style={{ padding: '12px' }}>
                      <select
                        value={u.role}
                        disabled={isMe || isLoading}
                        onChange={e => handleUpdate(u._id, { role: e.target.value as 'admin' | 'user' })}
                        style={{
                          background: 'transparent', border: 'none', cursor: isMe ? 'not-allowed' : 'pointer',
                          fontSize: 12, fontWeight: 700, color: u.role === 'admin' ? '#312E81' : '#5A5275',
                          outline: 'none', opacity: isMe ? 0.5 : 1,
                        }}
                      >
                        <option value="user">👤 user</option>
                        <option value="admin">👑 admin</option>
                      </select>
                    </td>

                    {/* Active toggle */}
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Toggle
                          on={u.isActive}
                          onChange={() => handleUpdate(u._id, { isActive: !u.isActive })}
                          disabled={isMe || isLoading}
                        />
                        <span style={{ fontSize: 12, fontWeight: 600, color: u.isActive ? '#10B981' : '#5A5275' }}>
                          {u.isActive ? 'active' : 'suspended'}
                        </span>
                      </div>
                    </td>

                    {/* Games */}
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 15 }}>
                        {u.gamesPlayed}
                      </span>
                    </td>

                    {/* Joined */}
                    <td style={{ padding: '12px', fontSize: 12, color: '#5A5275' }}>
                      {formatDate(u.createdAt)}
                    </td>

                    {/* Last seen */}
                    <td style={{ padding: '12px', fontSize: 12, color: '#5A5275' }}>
                      {formatDate(u.lastSeen)}
                    </td>

                    {/* Loading indicator */}
                    <td style={{ padding: '12px' }}>
                      {isLoading && (
                        <span style={{
                          width: 14, height: 14, borderRadius: '50%',
                          border: '2px solid rgba(49,46,129,0.2)',
                          borderTopColor: '#312E81',
                          animation: 'spin 0.7s linear infinite',
                          display: 'inline-block',
                        }} />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', fontFamily: "'Caveat', cursive", color: '#5A5275', fontSize: 20 }}>
              No users match your search
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Word Bank Section ────────────────────────────────────────────────────────
const initialWords = {
  Easy:   ['cat', 'tree', 'sun', 'book', 'apple', 'car', 'house', 'star', 'fish', 'hat'],
  Medium: ['volcano', 'submarine', 'penguin', 'astronaut', 'dragon', 'spaghetti', 'tornado'],
  Hard:   ['paradox', 'metaphor', 'accordion', 'silhouette', 'existentialism'],
  Custom: ['haunted toaster', 'rocket cat', 'disco banana'],
}

type WordCategory = keyof typeof initialWords

const WordBankSection = () => {
  const [bank, setBank] = useState(initialWords)
  const [tab, setTab] = useState<WordCategory>('Easy')
  const [draft, setDraft] = useState('')

  const addWord = (e: React.FormEvent) => {
    e.preventDefault()
    const w = draft.trim().toLowerCase()
    if (!w || bank[tab].includes(w)) return
    setBank(b => ({ ...b, [tab]: [w, ...b[tab]] }))
    setDraft('')
  }

  const removeWord = (w: string) => setBank(b => ({ ...b, [tab]: b[tab].filter(x => x !== w) }))

  const tabColors: Record<WordCategory, string> = {
    Easy: '#10B981', Medium: '#F59E0B', Hard: '#312E81', Custom: '#EC4899',
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "'Caveat', cursive", color: '#F59E0B', fontSize: 20, lineHeight: 1, marginBottom: 4 }}>manage vocabulary —</div>
        <h1 style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 32, margin: 0 }}>Word Bank</h1>
      </div>

      <div style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6))',
        backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.7)',
        borderRadius: 20, padding: 24,
        boxShadow: '0 2px 12px rgba(31,27,92,0.08)',
      }}>
        {/* Category tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {(Object.keys(bank) as WordCategory[]).map(k => (
            <button key={k} onClick={() => setTab(k)} style={{
              textAlign: 'left', padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
              border: tab === k ? `2px solid #1B1830` : '2px solid transparent',
              background: tab === k ? '#fff' : 'rgba(255,255,255,0.5)',
              boxShadow: tab === k ? '0 4px 0 -1px rgba(27,24,48,0.15)' : 'none',
              transition: 'all 0.15s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 16 }}>{k}</span>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: tabColors[k], flexShrink: 0 }} />
              </div>
              <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 24 }}>{bank[k].length}</div>
              <div style={{ fontSize: 11, color: '#5A5275' }}>words</div>
            </button>
          ))}
        </div>

        {/* Add word */}
        <form onSubmit={addWord} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder={`Add a ${tab.toLowerCase()} word…`}
            style={{
              flex: 1, background: 'rgba(255,255,255,0.8)',
              border: '1px solid rgba(27,24,48,0.1)', borderRadius: 10,
              padding: '10px 14px', fontSize: 14, color: '#1B1830',
              outline: 'none', fontFamily: "'Inter', sans-serif",
            }}
          />
          <button type="submit" style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#1B1830', color: '#FBF6EC', border: 'none',
            borderRadius: 10, padding: '10px 18px', cursor: 'pointer',
            fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 14,
            boxShadow: '0 3px 0 -1px #000',
          }}>
            <Icon d={ICONS.plus} size={14} /> Add
          </button>
        </form>

        {/* Word chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
          {bank[tab].map(w => (
            <span key={w} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(27,24,48,0.1)',
              borderRadius: 999, paddingLeft: 12, paddingRight: 6, paddingTop: 6, paddingBottom: 6,
              fontSize: 13, fontWeight: 600, color: '#1B1830',
            }}>
              {w}
              <button onClick={() => removeWord(w)} style={{
                width: 18, height: 18, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: 'rgba(27,24,48,0.08)', color: '#5A5275',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, transition: 'all 0.15s', padding: 0,
              }}>✕</button>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Word of the Day Section ──────────────────────────────────────────────────
const WordOfDaySection = () => {
  const [word, setWord] = useState('')
  const [hint, setHint] = useState('')
  const [bonus, setBonus] = useState(500)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState<{ word: string; hint: string; bonusPoints: number; date: string }[]>([])
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetch('/api/admin/wordofday').then(r => r.json()).then(d => setHistory(d.words || [])).catch(() => {})
  }, [])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!word.trim()) return
    setSaving(true)
    const res = await fetch('/api/admin/wordofday', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: word.trim(), hint: hint.trim(), bonusPoints: bonus, date }),
    })
    const data = await res.json()
    setSaving(false)
    if (res.ok) {
      showToast('Word of the day saved!')
      setHistory(prev => {
        const filtered = prev.filter(w => w.date !== date)
        return [{ word: word.trim(), hint: hint.trim(), bonusPoints: bonus, date }, ...filtered].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7)
      })
    } else {
      showToast(data.message || 'Save failed')
    }
  }

  const handleDelete = async (d: string) => {
    await fetch('/api/admin/wordofday', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: d }) })
    setHistory(prev => prev.filter(w => w.date !== d))
    showToast('Deleted')
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "'Caveat', cursive", color: '#F59E0B', fontSize: 20, lineHeight: 1, marginBottom: 4 }}>daily challenge —</div>
        <h1 style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 32, margin: 0 }}>Word of the Day</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Set form */}
        <div style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,255,255,0.6))', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.7)', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(31,27,92,0.08)' }}>
          <h2 style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 20, marginTop: 0, marginBottom: 18 }}>Set Word</h2>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5A5275', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(27,24,48,0.1)', borderRadius: 10, fontSize: 13, color: '#1B1830', outline: 'none', fontFamily: "'Inter',sans-serif", boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5A5275', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Word</label>
              <input value={word} onChange={e => setWord(e.target.value)} placeholder="e.g. paradox" style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(27,24,48,0.1)', borderRadius: 10, fontSize: 13, color: '#1B1830', outline: 'none', fontFamily: "'Inter',sans-serif", boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5A5275', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Hint shown in lobby</label>
              <input value={hint} onChange={e => setHint(e.target.value)} placeholder="e.g. A statement that contradicts itself" style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(27,24,48,0.1)', borderRadius: 10, fontSize: 13, color: '#1B1830', outline: 'none', fontFamily: "'Inter',sans-serif", boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5A5275', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>
                Bonus Points <span style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 15, color: '#1B1830' }}>{bonus}</span>
              </label>
              <input type="range" min={100} max={2000} step={100} value={bonus} onChange={e => setBonus(Number(e.target.value))} style={{ width: '100%', accentColor: '#F59E0B' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#5A5275' }}><span>100</span><span>2000</span></div>
            </div>
            <button type="submit" disabled={saving || !word.trim()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: saving || !word.trim() ? '#5A5275' : '#312E81', color: '#FBF6EC', border: 'none', borderRadius: 12, padding: '11px 0', fontFamily: "'Fredoka',sans-serif", fontWeight: 600, fontSize: 15, cursor: saving || !word.trim() ? 'not-allowed' : 'pointer', boxShadow: saving || !word.trim() ? 'none' : '0 4px 0 -1px #1F1B5C', marginTop: 4 }}>
              {saving ? 'Saving…' : '✓ Save Word of the Day'}
            </button>
          </form>
          {toast && (
            <div style={{ marginTop: 12, padding: '8px 14px', background: '#1B1830', color: '#FBF6EC', borderRadius: 10, fontSize: 13, textAlign: 'center', fontWeight: 500 }}>{toast}</div>
          )}
        </div>

        {/* History */}
        <div style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,255,255,0.6))', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.7)', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(31,27,92,0.08)' }}>
          <h2 style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 20, marginTop: 0, marginBottom: 18 }}>Recent Words</h2>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', fontFamily: "'Caveat',cursive", color: '#5A5275', fontSize: 18 }}>No words set yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {history.map(w => {
                const isToday = w.date === new Date().toISOString().slice(0, 10)
                return (
                  <div key={w.date} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: isToday ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.6)', border: `1px solid ${isToday ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.8)'}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 16, textTransform: 'uppercase' }}>{w.word}</span>
                        {isToday && <span style={{ fontSize: 10, fontWeight: 700, background: '#F59E0B', color: '#1B1830', padding: '1px 7px', borderRadius: 999 }}>TODAY</span>}
                      </div>
                      <div style={{ fontSize: 11, color: '#5A5275' }}>{w.date} · +{w.bonusPoints} pts · {w.hint || 'no hint'}</div>
                    </div>
                    <button onClick={() => handleDelete(w.date)} style={{ width: 26, height: 26, borderRadius: 8, border: 'none', background: 'rgba(236,72,153,0.1)', color: '#EC4899', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon d={ICONS.trash} size={12} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ marginTop: 16, padding: 14, background: 'rgba(49,46,129,0.06)', borderRadius: 12, fontSize: 12, color: '#5A5275', lineHeight: 1.6 }}>
            <strong style={{ color: '#312E81' }}>How it works:</strong> When any player guesses today's word in any game room, they automatically receive the bonus points on top of their round score. The socket server checks the word every hour.
          </div>
        </div>
      </div>
    </div>
  )
}


// ─── Active Rooms Section ─────────────────────────────────────────────────────
const RoomsSection = () => (
  <div>
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontFamily: "'Caveat', cursive", color: '#F59E0B', fontSize: 20, lineHeight: 1, marginBottom: 4 }}>live right now —</div>
      <h1 style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 32, margin: 0 }}>Active Rooms</h1>
    </div>
    <div style={{
      background: 'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6))',
      backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.7)',
      borderRadius: 20, padding: '40px 24px', textAlign: 'center',
      boxShadow: '0 2px 12px rgba(31,27,92,0.08)',
    }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🚧</div>
      <div style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: '#1B1830', fontSize: 22, marginBottom: 8 }}>Coming soon</div>
      <div style={{ color: '#5A5275', fontSize: 14 }}>Live room monitoring will show active games, player counts, and allow force-ending rooms.</div>
    </div>
  </div>
)

// ─── Main Admin Client ────────────────────────────────────────────────────────
export default function AdminClient({ user }: Props) {
  const router = useRouter()
  const [active, setActive] = useState<ActiveSection>('overview')
  const [users, setUsers] = useState<IUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/users')
      if (!res.ok) throw new Error('Failed to fetch users')
      const data = await res.json()
      setUsers(data.users)
    } catch {
      setError('Could not load users. Is MongoDB connected?')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleUpdateUser = async (userId: string, updates: { role?: 'admin' | 'user'; isActive?: boolean }) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...updates }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.message || 'Update failed')
        return
      }
      const data = await res.json()
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, ...data.user } : u))
    } catch {
      alert('Network error. Please try again.')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        alert(data.message || 'Delete failed')
        return
      }
      setUsers(prev => prev.filter(u => u._id !== userId))
    } catch {
      alert('Network error. Please try again.')
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  const renderSection = () => {
    if (loading) return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, flexDirection: 'column', gap: 12 }}>
        <span style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '3px solid rgba(49,46,129,0.15)', borderTopColor: '#312E81',
          animation: 'spin 0.7s linear infinite', display: 'inline-block',
        }} />
        <span style={{ color: '#5A5275', fontFamily: "'Caveat', cursive", fontSize: 18 }}>Loading data…</span>
      </div>
    )

    if (error) return (
      <div style={{ background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.2)', borderRadius: 16, padding: 24, color: '#9D174D' }}>
        <strong>Error:</strong> {error}
        <button onClick={fetchUsers} style={{ marginLeft: 12, background: 'none', border: 'none', color: '#312E81', cursor: 'pointer', fontWeight: 600 }}>
          Try again
        </button>
      </div>
    )

    switch (active) {
      case 'overview': return <OverviewSection users={users} />
      case 'users':    return <UsersSection users={users} onUpdate={handleUpdateUser} onDelete={handleDeleteUser} currentUserId={user.userId} />
      case 'words':    return <WordBankSection />
      case 'wordofday': return <WordOfDaySection />
      case 'rooms':    return <RoomsSection />
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FBF6EC',
      backgroundImage: `radial-gradient(rgba(27,24,48,0.035) 1px, transparent 1px), radial-gradient(rgba(27,24,48,0.025) 1px, transparent 1px)`,
      backgroundSize: '3px 3px, 7px 7px',
      backgroundPosition: '0 0, 1px 1px',
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: 24,
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24 }}>
        <Sidebar active={active} setActive={setActive} user={user} onLogout={handleLogout} />
        <main>{renderSection()}</main>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Caveat:wght@500;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        select option { background: #fff; color: #1B1830; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: rgba(27,24,48,0.15); border-radius: 6px; }
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 240px"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}