const Player = require('../models/Player')
const Score = require('../models/Score')

// Guardar o actualizar puntaje del jugador
exports.saveScore = async (req, res) => {
    try {
        const { playerId, defaultCoins, finalPrizeCoins, totalScore, level, bestTime } = req.body

        console.log('📥 Datos recibidos en backend:', req.body)

        // ================================
        // 1. GUARDAR HISTORIAL (Score)
        // ================================
        const newScore = new Score({
            playerId,
            defaultCoins: defaultCoins || 0,
            finalPrizeCoins: finalPrizeCoins || 0,
            totalScore: totalScore || 0,
            level: level || 1,
            time: bestTime || 0 // aquí usamos el tiempo de la partida
        })

        await newScore.save()

        // ================================
        // 2. ACTUALIZAR PLAYER (ACUMULADO)
        // ================================
        let player = await Player.findOne({ playerId })

        if (!player) {
            player = new Player({
                playerId,
                defaultCoins: defaultCoins || 0,
                finalPrizeCoins: finalPrizeCoins || 0,
                totalScore: totalScore || 0,
                bestTime: bestTime || 0,
                levelscores: []
            })
        } else {
            player.defaultCoins = (player.defaultCoins || 0) + (defaultCoins || 0)
            player.finalPrizeCoins = (player.finalPrizeCoins || 0) + (finalPrizeCoins || 0)

            player.totalScore = player.defaultCoins + player.finalPrizeCoins

            // mejor tiempo (mínimo)
            if (bestTime && (!player.bestTime || bestTime < player.bestTime)) {
                player.bestTime = bestTime
            }
        }

        // asegurar array
        if (!player.levelscores) {
            player.levelscores = []
        }

        // guardar progreso por nivel
        if (level) {
            player.levelscores.push({
                level,
                coinsCollected: defaultCoins || 0
            })
        }

        player.lastUpdated = new Date()

        await player.save()

        console.log('✅ Player actualizado:', player)
        console.log('📊 Score guardado:', newScore)

        res.json({
            message: 'Partida y estadísticas guardadas correctamente',
            player,
            score: newScore
        })

    } catch (error) {
        console.error('❌ ERROR REAL BACKEND:', error)

        res.status(500).json({
            message: 'Error al guardar puntaje',
            error: error.message
        })
    }
}