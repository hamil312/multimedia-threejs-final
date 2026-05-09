const jwt  = require('jsonwebtoken')
const User = require('../models/User')

// ── Helper: genera JWT firmado ──────────────────────────────────────────────
const signToken = (user) => jwt.sign(
  { id: user._id, username: user.username, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
)

// ── POST /api/auth/register ─────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios' })
    }

    // Verificar duplicados con mensaje específico
    const existingUser  = await User.findOne({ username })
    const existingEmail = await User.findOne({ email })

    if (existingUser)  return res.status(409).json({ message: 'El nombre de usuario ya existe' })
    if (existingEmail) return res.status(409).json({ message: 'El correo ya está registrado' })

    const user  = await User.create({ username, email, password })
    const token = signToken(user)

    res.status(201).json({
      message: 'Registro exitoso',
      token,
      user: { id: user._id, username: user.username, email: user.email }
    })
  } catch (err) {
    // Validaciones de Mongoose (minlength, match regex, etc.)
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map(e => e.message).join(', ')
      return res.status(400).json({ message: msg })
    }
    console.error('❌ register error:', err)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
}

// ── POST /api/auth/login ────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Correo y contraseña son obligatorios' })
    }

    // select('+password') porque el campo tiene select:false en el schema
    const user = await User.findOne({ email }).select('+password')

    if (!user || !(await user.comparePassword(password))) {
      // Mismo mensaje para no revelar si el email existe o no (seguridad)
      return res.status(401).json({ message: 'Credenciales incorrectas' })
    }

    const token = signToken(user)

    res.json({
      message: 'Inicio de sesión exitoso',
      token,
      user: { id: user._id, username: user.username, email: user.email }
    })
  } catch (err) {
    console.error('❌ login error:', err)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
}

// ── GET /api/auth/me  (requiere verifyToken) ────────────────────────────────
// Devuelve los datos del usuario autenticado a partir del token.
// El frontend puede llamar esto al recargar para validar si el token sigue activo.
exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' })

    res.json({
      user: { id: user._id, username: user.username, email: user.email }
    })
  } catch (err) {
    console.error('❌ me error:', err)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
}