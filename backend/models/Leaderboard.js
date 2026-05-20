const mongoose = require('mongoose')

const leaderboardSchema = new mongoose.Schema({
    playerId: { type: String, required: true, unique: true },
    playerName: { type: String, default: 'Anónimo' },
    bestTime: { type: Number, required: true },  // Tiempo en segundos
    totalScore: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    completedAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
})

// Índice para ordenar por tiempo ascendente
leaderboardSchema.index({ bestTime: 1 })

module.exports = mongoose.model('Leaderboard', leaderboardSchema)