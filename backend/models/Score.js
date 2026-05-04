const mongoose = require('mongoose')

const scoreSchema = new mongoose.Schema({
    playerId: { type: String, required: true },

    defaultCoins: { type: Number, default: 0 },
    finalPrizeCoins: { type: Number, default: 0 },

    totalScore: { type: Number, default: 0 },
    level: { type: Number, required: true },

    time: { type: Number, default: 0 }, 

    createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Score', scoreSchema)