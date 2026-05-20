const express = require('express')
const playerController = require('../controllers/playerController')

const router = express.Router()

router.post('/score', playerController.saveScore)
// router.get('/score/:playerId', playerController.getScore)
router.get('/leaderboard', playerController.getLeaderboard)  
router.get('/rank/:playerId', playerController.getPlayerRank)

module.exports = router