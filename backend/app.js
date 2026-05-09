require('dotenv').config()
const express    = require('express')
const mongoose   = require('mongoose')
const cors       = require('cors')
const http       = require('http')
const socketio   = require('socket.io')
const blockRoutes = require('./routes/blockRoutes')
const authRoutes  = require('./routes/authRoutes')     

const app  = express()
const port = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// ── Rutas ──────────────────────────────────────────────────────────────────
app.use('/api/blocks', blockRoutes)
app.use('/api/auth',   authRoutes)   // /api/auth/register, /login, /me

// Ruta de puntos del jugador

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'API del juego activa' })
})

// ── MongoDB ────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.error('❌ Error MongoDB:', err))

// ── Socket.io (multijugador, sin cambios) ─────────────────────────────────
const server = http.createServer(app)
const io     = socketio(server, { cors: { origin: '*' } })

let players = {}

io.on('connection', (socket) => {
  console.log(`🟢 Usuario conectado: ${socket.id}`)

  socket.on('new-player', (data) => {
    players[socket.id] = {
      id:       socket.id,
      position: data.position || { x: 0, y: 0, z: 0 },
      rotation: data.rotation || 0,
      color:    data.color    || '#ffffff'
    }
    socket.broadcast.emit('spawn-player', { id: socket.id, ...players[socket.id] })
    socket.emit('players-update', players)
    const others = Object.entries(players)
      .filter(([id]) => id !== socket.id)
      .map(([id, info]) => ({ id, ...info }))
    socket.emit('existing-players', others)
  })

  socket.on('update-position', ({ position, rotation }) => {
    if (players[socket.id]) {
      players[socket.id].position = position
      players[socket.id].rotation = rotation
      socket.broadcast.emit('update-player', { id: socket.id, position, rotation })
    }
  })

  socket.on('disconnect', () => {
    console.log(`🔴 Desconectado: ${socket.id}`)
    delete players[socket.id]
    io.emit('remove-player', socket.id)
    io.emit('players-update', players)
  })
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => console.log(`✅ Servidor en puerto ${PORT}`))