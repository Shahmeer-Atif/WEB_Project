const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')

const app = express()
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'], credentials: false },
  allowUpgrades: true,
  transports: ['websocket', 'polling'],
})

const rooms = new Map()

// ── Word of the Day cache ─────────────────────────────────────────────────────
let wordOfDay = { word: '', bonusPoints: 500 }
let wodLastFetched = 0

async function fetchWordOfDay() {
  const now = Date.now()
  if (now - wodLastFetched < 60 * 60 * 1000 && wordOfDay.word) return // cache 1hr
  try {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/wordofday`)
    if (res.ok) {
      const data = await res.json()
      wordOfDay = { word: data.word.toLowerCase(), bonusPoints: data.bonusPoints || 500 }
      wodLastFetched = now
      console.log(`[WOD] Word of the day: ${wordOfDay.word}`)
    }
  } catch (e) {
    console.log('[WOD] Could not fetch word of day:', e.message)
  }
}

// Fetch on startup
fetchWordOfDay()

function getActivePlayers(room) {
  return room.players.filter(p => p.connected)
}

function broadcastRoomState(roomId) {
  const room = rooms.get(roomId)
  if (!room) return
  io.to(roomId).emit('room:state', {
    players: room.players,
    currentDrawer: room.currentDrawer,
    round: room.round,
    totalRounds: room.totalRounds,
    phase: room.phase,
    timeLeft: room.timeLeft,
  })
}

function pickWord() {
  const words = [
    'astronaut','volcano','penguin','submarine','spaghetti','tornado','dragon',
    'rainbow','elephant','guitar','waterfall','butterfly','skateboard','telescope',
    'jellyfish','parachute','crocodile','lighthouse','umbrella','snowflake',
    'fireworks','saxophone','spaceship','treasure','cactus','helicopter','mermaid',
    'compass','thunderstorm','dinosaur','pirate','castle','wizard','robot',
  ]
  return words[Math.floor(Math.random() * words.length)]
}

function startTurn(roomId) {
  const room = rooms.get(roomId)
  if (!room) return

  const active = getActivePlayers(room)
  if (active.length < 2) {
    room.phase = 'waiting'
    broadcastRoomState(roomId)
    io.to(roomId).emit('chat:message', { userId: 'system', username: 'system', message: 'Need at least 2 players to start!', type: 'system' })
    return
  }

  // Make sure currentDrawer is still active — if not, pick first active player
  if (!active.find(p => p.id === room.currentDrawer)) {
    room.currentDrawer = active[0].id
  }

  room.phase = 'drawing'
  room.guessedPlayers = new Set()
  room.timeLeft = room.drawTime
  room.currentWord = pickWord()
  room.strokeHistory = []
  room.canvasSnapshot = null  // reset snapshot on new turn

  // Send word privately to drawer
  const drawerSocket = io.sockets.sockets.get(room.currentDrawer)
  if (drawerSocket) {
    drawerSocket.emit('round:word', { word: room.currentWord })
  }

  io.to(roomId).emit('round:start', {
    drawerId: room.currentDrawer,
    wordLength: room.currentWord.length,
    hint: '_'.repeat(room.currentWord.length),
    timeLeft: room.timeLeft,
    round: room.round,
    totalRounds: room.totalRounds,
  })

  broadcastRoomState(roomId)

  clearInterval(room.timerInterval)
  room.timerInterval = setInterval(() => {
    room.timeLeft -= 1
    io.to(roomId).emit('timer:tick', { timeLeft: room.timeLeft })
    if (room.timeLeft <= 0) {
      clearInterval(room.timerInterval)
      endTurn(roomId)
    }
  }, 1000)
}

function endTurn(roomId) {
  const room = rooms.get(roomId)
  if (!room) return

  clearInterval(room.timerInterval)
  room.phase = 'reveal'

  io.to(roomId).emit('round:end', {
    word: room.currentWord,
    scores: Object.fromEntries(room.scores),
  })

  setTimeout(() => {
    const room = rooms.get(roomId)
    if (!room) return

    const active = getActivePlayers(room)
    if (active.length < 2) {
      room.phase = 'waiting'
      broadcastRoomState(roomId)
      return
    }

    // Advance to next drawer in rotation
    const currentIdx = active.findIndex(p => p.id === room.currentDrawer)
    const nextIdx = (currentIdx + 1) % active.length
    room.currentDrawer = active[nextIdx].id

    // Track turns in this round
    room.turnsThisRound = (room.turnsThisRound || 0) + 1

    // After everyone draws once, advance round
    if (room.turnsThisRound >= active.length) {
      room.turnsThisRound = 0
      room.round += 1
    }

    if (room.round > room.totalRounds) {
      endGame(roomId)
    } else {
      startTurn(roomId)
    }
  }, 4000)
}

function endGame(roomId) {
  const room = rooms.get(roomId)
  if (!room) return
  clearInterval(room.timerInterval)
  room.phase = 'end'
  const finalScores = room.players
    .map(p => ({ id: p.id, username: p.username, score: room.scores.get(p.id) || 0 }))
    .sort((a, b) => b.score - a.score)
  io.to(roomId).emit('game:end', { finalScores })
  rooms.delete(roomId)
}

io.on('connection', (socket) => {
  console.log(`[SOCKET] Connected: ${socket.id}`)

  socket.on('room:join', ({ roomId, username, userId }) => {
    socket.join(roomId)

    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        players: [], currentDrawer: null, currentWord: '',
        guessedPlayers: new Set(), round: 1, totalRounds: 5,
        drawTime: 60, timeLeft: 60, phase: 'waiting',
        scores: new Map(), timerInterval: null,
        turnsThisRound: 0, strokeHistory: [],
      })
    }

    const room = rooms.get(roomId)
    const existing = room.players.find(p => p.userId === userId)

    if (existing) {
      // Reconnect: update socket id, keep score
      const oldScore = room.scores.get(existing.id) || 0
      room.scores.delete(existing.id)
      existing.id = socket.id
      existing.connected = true
      room.scores.set(socket.id, oldScore)
    } else {
      room.players.push({ id: socket.id, userId, username, connected: true })
      room.scores.set(socket.id, 0)
    }

    io.to(roomId).emit('scores:update', { scores: Object.fromEntries(room.scores) })
    broadcastRoomState(roomId)

    // ── Late joiner mid-game catch-up ─────────────────────────────────────────
    if (room.phase === 'drawing') {
      const isCurrentDrawer = socket.id === room.currentDrawer

      socket.emit('round:start', {
        drawerId: room.currentDrawer,
        wordLength: room.currentWord.length,
        hint: '_'.repeat(room.currentWord.length),
        timeLeft: room.timeLeft,
        round: room.round,
        totalRounds: room.totalRounds,
      })

      // If this socket IS the drawer, send them their word
      if (isCurrentDrawer) {
        socket.emit('round:word', { word: room.currentWord })
      }

      // If we have a canvas snapshot, send it immediately
      if (room.canvasSnapshot) {
        socket.emit('draw:sync', { imageData: room.canvasSnapshot })
      } else if (room.strokeHistory && room.strokeHistory.length > 0) {
        // No snapshot — replay all strokes sequentially with small delay
        let delay = 50
        room.strokeHistory.forEach(group => {
          if (!group || group.length === 0) return
          group.forEach((stroke, i) => {
            setTimeout(() => {
              socket.emit('draw:stroke', stroke)
            }, delay)
            delay += 2 // 2ms between strokes — fast but ordered
          })
          delay += 10 // small gap between stroke groups
        })
      }
    }

    // Auto-start with 2+ players
    if (getActivePlayers(room).length >= 2 && room.phase === 'waiting') {
      room.currentDrawer = getActivePlayers(room)[0].id
      room.turnsThisRound = 0
      setTimeout(() => startTurn(roomId), 2000)
    }
  })

  socket.on('draw:stroke', ({ roomId, x, y, color, size, type }) => {
    const room = rooms.get(roomId)
    if (!room || room.currentDrawer !== socket.id) return
    if (type === 'start') room.strokeHistory.push([])
    const lastGroup = room.strokeHistory[room.strokeHistory.length - 1]
    if (lastGroup) lastGroup.push({ x, y, color, size, type })
    socket.to(roomId).emit('draw:stroke', { x, y, color, size, type })
  })

  // Undo: drawer sends canvas snapshot, we broadcast to others
  socket.on('draw:undo', ({ roomId, imageData }) => {
    const room = rooms.get(roomId)
    if (!room || room.currentDrawer !== socket.id) return
    room.strokeHistory.pop()
    room.canvasSnapshot = imageData  // store for late joiners
    socket.to(roomId).emit('draw:sync', { imageData })
  })

  // Drawer periodically sends canvas snapshot for late joiners
  socket.on('draw:snapshot', ({ roomId, imageData }) => {
    const room = rooms.get(roomId)
    if (!room || room.currentDrawer !== socket.id) return
    room.canvasSnapshot = imageData
  })

  socket.on('draw:clear', ({ roomId }) => {
    const room = rooms.get(roomId)
    if (!room || room.currentDrawer !== socket.id) return
    room.strokeHistory = []
    room.canvasSnapshot = null  // cleared canvas = no snapshot needed
    socket.to(roomId).emit('draw:clear')
  })

  socket.on('chat:message', ({ roomId, message, userId, username }) => {
    const room = rooms.get(roomId)
    if (!room) return

    const clean = message.trim().toLowerCase()
    const isDrawer = room.currentDrawer === socket.id
    const alreadyGuessed = room.guessedPlayers?.has(socket.id)

    if (isDrawer) return

    if (room.phase === 'drawing' && !alreadyGuessed && clean === room.currentWord.toLowerCase()) {
      room.guessedPlayers.add(socket.id)
      const points = Math.max(50, room.timeLeft * 5)
      room.scores.set(socket.id, (room.scores.get(socket.id) || 0) + points)
      room.scores.set(room.currentDrawer, (room.scores.get(room.currentDrawer) || 0) + 30)

      // Check word of the day bonus
      const isWod = wordOfDay.word && room.currentWord.toLowerCase() === wordOfDay.word
      const wodBonus = isWod ? wordOfDay.bonusPoints : 0
      if (wodBonus > 0) {
        room.scores.set(socket.id, (room.scores.get(socket.id) || 0) + wodBonus)
      }

      socket.emit('guess:correct', { points, word: room.currentWord, wodBonus })
      const guessMsg = isWod
        ? `${username} guessed the word! 🎉 (+${wodBonus} Word of the Day bonus! 🌟)`
        : `${username} guessed the word! 🎉`
      socket.to(roomId).emit('chat:message', { userId, username, message: guessMsg, type: 'system' })
      io.to(roomId).emit('scores:update', { scores: Object.fromEntries(room.scores) })
      if (isWod) {
        io.to(roomId).emit('wod:guessed', { username, bonusPoints: wodBonus })
      }

      const nonDrawers = getActivePlayers(room).filter(p => p.id !== room.currentDrawer)
      if (room.guessedPlayers.size >= nonDrawers.length) {
        clearInterval(room.timerInterval)
        endTurn(roomId)
      }
    } else {
      io.to(roomId).emit('chat:message', { userId, username, message, type: alreadyGuessed ? 'guessed' : 'normal' })
    }
  })

  socket.on('disconnect', () => {
    console.log(`[SOCKET] Disconnected: ${socket.id}`)
    rooms.forEach((room, roomId) => {
      const player = room.players.find(p => p.id === socket.id)
      if (!player) return

      player.connected = false
      broadcastRoomState(roomId)

      if (room.currentDrawer === socket.id && room.phase === 'drawing') {
        clearInterval(room.timerInterval)
        const active = getActivePlayers(room)
        if (active.length >= 2) {
          const nextIdx = (active.findIndex(p => p.id === socket.id) + 1) % active.length
          room.currentDrawer = active[Math.max(0, nextIdx - 1) % active.length]?.id || active[0].id
          setTimeout(() => startTurn(roomId), 1500)
        } else {
          room.phase = 'waiting'
          broadcastRoomState(roomId)
        }
      }

      if (getActivePlayers(room).length === 0) {
        clearInterval(room.timerInterval)
        rooms.delete(roomId)
      }
    })
  })
})

app.get('/health', (req, res) => res.json({ status: 'ok', rooms: rooms.size }))

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`[SOCKET SERVER] Running on port ${PORT}`)
})