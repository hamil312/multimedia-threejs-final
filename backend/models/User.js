const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')

const userSchema = new mongoose.Schema({
  username: {
    type:     String,
    required: [true, 'El nombre de usuario es obligatorio'],
    unique:   true,
    trim:     true,
    minlength: [3, 'Mínimo 3 caracteres'],
    maxlength: [24, 'Máximo 24 caracteres']
  },
  email: {
    type:     String,
    required: [true, 'El correo es obligatorio'],
    unique:   true,
    lowercase: true,
    trim:     true,
    match:    [/^\S+@\S+\.\S+$/, 'Correo inválido']
  },
  password: {
    type:     String,
    required: [true, 'La contraseña es obligatoria'],
    minlength: [6, 'Mínimo 6 caracteres'],
    select:   false   // nunca se devuelve en queries por defecto
  },
  createdAt: {
    type:    Date,
    default: Date.now
  }
})

// Hash antes de guardar
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  const salt  = await bcrypt.genSalt(12)
  this.password = await bcrypt.hash(this.password, salt)
  next()
})

// Comparar contraseña ingresada con el hash
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password)
}

module.exports = mongoose.model('User', userSchema)