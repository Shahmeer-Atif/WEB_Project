const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')

const app = express()
const httpServer = createServer(app)

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://web-project-seven-orpin.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean)

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true)
      callback(new Error(`CORS blocked: ${origin}`))
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

// ── In-memory game state (Redis would replace this in production) ────────────
// Structure: { [roomId]: { players, currentDrawer, word, round, scores, timer } }
const rooms = new Map()

// ── Helper: broadcast updated room state to all players in a room ────────────
function broadcastRoomState(roomId) {
  const room = rooms.get(roomId)
  if (!room) return
  io.to(roomId).emit('room:state', {
    players: room.players,
    currentDrawer: room.currentDrawer,
    round: room.round,
    totalRounds: room.totalRounds,
    phase: room.phase, // 'waiting' | 'drawing' | 'reveal' | 'end'
    timeLeft: room.timeLeft,
  })
}

// ── Helper: pick next drawer ─────────────────────────────────────────────────
function getNextDrawer(room) {
  const activePlayers = room.players.filter((p) => p.connected)
  const currentIdx = activePlayers.findIndex((p) => p.id === room.currentDrawer)
  const nextIdx = (currentIdx + 1) % activePlayers.length
  return activePlayers[nextIdx]?.id || activePlayers[0]?.id
}

// ── Helper: start a drawing round ───────────────────────────────────────────
function startRound(roomId) {
  const room = rooms.get(roomId)
  if (!room) return

  room.phase = 'drawing'
  room.guessedPlayers = new Set()
  room.timeLeft = room.drawTime

  // Pick a word (in real app this pulls from DB word bank)
  const words = ['astronaut', 'volcano', 'penguin', 'submarine', 'spaghetti', 'tornado', 'dragon']
  room.currentWord = words[Math.floor(Math.random() * words.length)]

  // Tell the drawer what the word is (privately)
  io.to(room.currentDrawer).emit('round:word', { word: room.currentWord })

  // Tell everyone else the word length and hint
  io.to(roomId).emit('round:start', {
    drawerId: room.currentDrawer,
    wordLength: room.currentWord.length,
    hint: '_'.repeat(room.currentWord.length),
    timeLeft: room.timeLeft,
    round: room.round,
  })

  // Countdown timer
  room.timerInterval = setInterval(() => {
    room.timeLeft -= 1
    io.to(roomId).emit('timer:tick', { timeLeft: room.timeLeft })

    if (room.timeLeft <= 0) {
      clearInterval(room.timerInterval)
      endRound(roomId)
    }
  }, 1000)
}

// ── Helper: end a round ──────────────────────────────────────────────────────
function endRound(roomId) {
  const room = rooms.get(roomId)
  if (!room) return

  clearInterval(room.timerInterval)
  room.phase = 'reveal'

  io.to(roomId).emit('round:end', {
    word: room.currentWord,
    scores: room.scores,
  })

  // Wait 4 seconds then start next round or end game
  setTimeout(() => {
    if (room.round >= room.totalRounds) {
      endGame(roomId)
    } else {
      room.round += 1
      room.currentDrawer = getNextDrawer(room)
      startRound(roomId)
    }
  }, 4000)
}

// ── Helper: end the game ─────────────────────────────────────────────────────
function endGame(roomId) {
  const room = rooms.get(roomId)
  if (!room) return

  room.phase = 'end'
  const sortedScores = [...room.scores.entries()]
    .map(([id, score]) => {
      const player = room.players.find((p) => p.id === id)
      return { id, username: player?.username, score }
    })
    .sort((a, b) => b.score - a.score)

  io.to(roomId).emit('game:end', { finalScores: sortedScores })
  rooms.delete(roomId)
}

// ── Socket connection handler ────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[SOCKET] Connected: ${socket.id}`)

  // ── Join room ──────────────────────────────────────────────────────────────
  socket.on('room:join', ({ roomId, username, userId }) => {
    socket.join(roomId)

    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        players: [],
        currentDrawer: null,
        currentWord: '',
        guessedPlayers: new Set(),
        round: 1,
        totalRounds: 5,
        drawTime: 60,
        timeLeft: 60,
        phase: 'waiting',
        scores: new Map(),
        timerInterval: null,
      })
    }

    const room = rooms.get(roomId)
    const existingPlayer = room.players.find((p) => p.userId === userId)

    if (existingPlayer) {
      existingPlayer.id = socket.id
      existingPlayer.connected = true
    } else {
      room.players.push({ id: socket.id, userId, username, connected: true })
      room.scores.set(socket.id, 0)
    }

    broadcastRoomState(roomId)

    // Auto-start when 2+ players join and game is waiting
    if (room.players.length >= 2 && room.phase === 'waiting') {
      room.currentDrawer = room.players[0].id
      setTimeout(() => startRound(roomId), 1500)
    }
  })

  // ── Drawing broadcast ─────────────────────────────────────────────────────
  // Only the current drawer can emit draw events
  socket.on('draw:stroke', ({ roomId, x, y, color, size, type }) => {
    const room = rooms.get(roomId)
    if (!room || room.currentDrawer !== socket.id) return
    // Broadcast to everyone EXCEPT the sender
    socket.to(roomId).emit('draw:stroke', { x, y, color, size, type })
  })

  // ── Clear canvas ──────────────────────────────────────────────────────────
  socket.on('draw:clear', ({ roomId }) => {
    const room = rooms.get(roomId)
    if (!room || room.currentDrawer !== socket.id) return
    socket.to(roomId).emit('draw:clear')
  })

  // ── Chat message / guess ──────────────────────────────────────────────────
  socket.on('chat:message', ({ roomId, message, userId, username }) => {
    const room = rooms.get(roomId)
    if (!room) return

    const cleanMessage = message.trim().toLowerCase()
    const isDrawer = room.currentDrawer === socket.id
    const alreadyGuessed = room.guessedPlayers?.has(socket.id)

    // Drawers can't guess their own word
    if (isDrawer) return

    // Check if it's a correct guess
    if (
      room.phase === 'drawing' &&
      !alreadyGuessed &&
      cleanMessage === room.currentWord.toLowerCase()
    ) {
      // ── First-guess fairness: mark as guessed ──────────────────────────────
      // In production this is Redis SETNX — here we use a Set which is
      // effectively atomic within a single Node.js event loop
      room.guessedPlayers.add(socket.id)

      // Award points based on time remaining
      const points = Math.max(50, room.timeLeft * 5)
      const currentScore = room.scores.get(socket.id) || 0
      room.scores.set(socket.id, currentScore + points)

      // Also give drawer points
      const drawerScore = room.scores.get(room.currentDrawer) || 0
      room.scores.set(room.currentDrawer, drawerScore + 30)

      // Tell guesser privately
      socket.emit('guess:correct', { points, word: room.currentWord })

      // Tell everyone else (don't reveal the word)
      socket.to(roomId).emit('chat:message', {
        userId,
        username,
        message: `${username} guessed the word! 🎉`,
        type: 'system',
      })

      io.to(roomId).emit('scores:update', {
        scores: Object.fromEntries(room.scores),
      })

      // If everyone guessed, end round early
      const nonDrawers = room.players.filter(
        (p) => p.id !== room.currentDrawer && p.connected
      )
      if (room.guessedPlayers.size >= nonDrawers.length) {
        clearInterval(room.timerInterval)
        endRound(roomId)
      }
    } else {
      // Normal chat message — broadcast to room
      io.to(roomId).emit('chat:message', {
        userId,
        username,
        message,
        type: alreadyGuessed ? 'guessed' : 'normal',
      })
    }
  })

  // ── Disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[SOCKET] Disconnected: ${socket.id}`)
    rooms.forEach((room, roomId) => {
      const player = room.players.find((p) => p.id === socket.id)
      if (player) {
        player.connected = false
        broadcastRoomState(roomId)

        // If drawer disconnected, end the round
        if (room.currentDrawer === socket.id && room.phase === 'drawing') {
          clearInterval(room.timerInterval)
          endRound(roomId)
        }

        // Clean up empty rooms
        const activePlayers = room.players.filter((p) => p.connected)
        if (activePlayers.length === 0) {
          clearInterval(room.timerInterval)
          rooms.delete(roomId)
        }
      }
    })
  })
})

// ── Health check endpoint (Railway uses this) ────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size })
})

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`[SOCKET SERVER] Running on port ${PORT}`)
})