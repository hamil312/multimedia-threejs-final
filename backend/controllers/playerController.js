const Player = require('../models/Player')
const Score = require('../models/Score')
const Leaderboard = require('../models/Leaderboard')

// Guardar o actualizar puntaje del jugador
exports.saveScore = async (req, res) => {
    try {
        const { playerId, username, defaultCoins, finalPrizeCoins, totalScore, level, bestTime, gameCompleted } = req.body

        console.log('📥 Datos recibidos en backend:', req.body)
        console.log(`🎮 Juego completado: ${gameCompleted ? 'SÍ' : 'NO'} | Total Score: ${totalScore}`)

        // ================================
        // 1. GUARDAR HISTORIAL (Score)
        // ================================
        const newScore = new Score({
            playerId,
            defaultCoins: defaultCoins || 0,
            finalPrizeCoins: finalPrizeCoins || 0,
            totalScore: totalScore || 0,
            level: level || 1,
            time: bestTime || 0
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

        // ================================
        // 3. GUARDAR EN LEADERBOARD SOLO SI COMPLETÓ EL JUEGO
        // ================================
        let leaderboardEntry = null

        if (gameCompleted === true && totalScore === 27) {
            leaderboardEntry = await Leaderboard.findOneAndUpdate(
                { playerId },
                {
                    playerId,
                    playerName: username || `Player_${playerId.substring(0, 8)}`,
                    bestTime: bestTime || 999999,
                    totalScore: totalScore,
                    level: 5,  // Solo se guarda cuando completa el juego (nivel 5)
                    completedAt: new Date(),
                    updatedAt: new Date()
                },
                { upsert: true, new: true }
            )

            console.log(`🏆 ¡LEADERBOARD ACTUALIZADO! ${playerId} completó el juego en ${bestTime}s`)
        } else if (gameCompleted === true && totalScore !== 27) {
            console.log(`⚠️ Juego completado pero totalScore (${totalScore}) ≠ 27. No se guarda en leaderboard.`)
        } else {
            console.log(`⚠️ El jugador murió o no completó el juego. Solo se guarda historial en Score/Player.`)
        }

        res.json({
            message: 'Partida y estadísticas guardadas correctamente',
            player,
            score: newScore,
            leaderboardEntry,
            gameCompleted,
            totalScore
        })

    } catch (error) {
        console.error('❌ ERROR REAL BACKEND:', error)

        res.status(500).json({
            message: 'Error al guardar puntaje',
            error: error.message
        })
    }
}

// ✅ Obtener leaderboard ordenado por tiempo
exports.getLeaderboard = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20

        const leaderboard = await Leaderboard.find()
            .sort({ bestTime: 1 })  // Ordenar de menor a mayor (mejor tiempo primero)
            .limit(limit)
            .select('playerId playerName bestTime totalScore level completedAt')

        res.json({
            message: 'Leaderboard obtenido',
            count: leaderboard.length,
            leaderboard: leaderboard.map((entry, index) => ({
                rank: index + 1,
                playerId: entry.playerId,
                playerName: entry.playerName,
                bestTime: entry.bestTime,
                totalScore: entry.totalScore,
                level: entry.level,
                completedAt: entry.completedAt
            }))
        })
    } catch (error) {
        console.error('❌ Error al obtener leaderboard:', error)
        res.status(500).json({ message: 'Error al obtener leaderboard', error: error.message })
    }
}

// ✅ Obtener ranking de un jugador específico
exports.getPlayerRank = async (req, res) => {
    try {
        const { playerId } = req.params

        const player = await Leaderboard.findOne({ playerId })

        if (!player) {
            return res.status(404).json({ message: 'Jugador no encontrado en leaderboard' })
        }

        // Contar cuántos jugadores tienen mejor tiempo
        const betterCount = await Leaderboard.countDocuments({
            bestTime: { $lt: player.bestTime }
        })

        res.json({
            rank: betterCount + 1,
            playerId: player.playerId,
            playerName: player.playerName,
            bestTime: player.bestTime,
            totalScore: player.totalScore,
            level: player.level
        })
    } catch (error) {
        console.error('❌ Error al obtener ranking:', error)
        res.status(500).json({ message: 'Error al obtener ranking', error: error.message })
    }
}

// Obtener puntaje de un jugador
exports.getScore = async (req, res) => {
    try {
        const { playerId } = req.params

        const player = await Player.findOne({ playerId })

        if (!player) {
            return res.status(404).json({ message: 'Jugador no encontrado' })
        }

        res.json({
            message: 'Puntaje obtenido',
            player
        })
    } catch (error) {
        console.error('❌ Error al obtener puntaje:', error)
        res.status(500).json({ message: 'Error al obtener puntaje', error: error.message })
    }
}