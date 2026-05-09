const jwt = require('jsonwebtoken')

/**
 * verifyToken — middleware que protege rutas que requieren JWT.
 *
 * Espera el header:  Authorization: Bearer <token>
 * Si el token es válido, añade req.user = { id, username, email }
 * y pasa al siguiente middleware.
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization']

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token no proporcionado' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded   // { id, username, email, iat, exp }
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado. Inicia sesión nuevamente.' })
    }
    return res.status(401).json({ message: 'Token inválido' })
  }
}

module.exports = { verifyToken }