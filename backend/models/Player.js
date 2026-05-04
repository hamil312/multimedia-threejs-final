const mongoose = require('mongoose')

const playerSchema = new mongoose.Schema({
    playerId: { type: String, required: true, unique: true }, // ID único del jugador
    defaultCoins: { type: Number, default: 0 },     // Monedas tipo "default"
    finalPrizeCoins: { type: Number, default: 0 },   // Monedas tipo "finalPrize"
    totalScore: { type: Number, default: 0 },        // Puntuación total
    levelscores: [{                                   // Puntos por nivel
        level: Number,
        coinsCollected: Number,
        timestamp: { type: Date, default: Date.now }
    }],
    bestTime: { type: Number, default: null },       // Mejor tiempo en segundos
    totalGameTime: { type: Number, default: 0 },     // Tiempo total jugado
    lastUpdated: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Player', playerSchema)