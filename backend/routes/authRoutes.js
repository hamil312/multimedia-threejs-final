const express        = require('express')
const router         = express.Router()
const authController = require('../controllers/authController')
const { verifyToken } = require('../middleware/authMiddleware')

// Rutas públicas
router.post('/register', authController.register)
router.post('/login',    authController.login)

// Ruta protegida — el cliente la llama al recargar para re-validar el token
router.get('/me', verifyToken, authController.me)

module.exports = router