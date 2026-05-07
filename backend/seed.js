require('dotenv').config()
const mongoose = require('mongoose')
const Block = require('./models/Block')

const positions = [
    { x: -8, y: 0.5, z: 23 },
    { x: 0, y: 1.5, z: 0 },
    { x: 0, y: 15, z: 0 },
    { x: 1, y: 1.5, z: 42 },
    { x: 1, y: 1.5, z: 42 },
]

async function seedDatabase() {
    try {
        await mongoose.connect(process.env.MONGO_URI)

        await Block.deleteMany() // (opcional) limpia la colección
        await Block.insertMany(positions)

        console.log('📦 Datos insertados correctamente en MongoDB')
        process.exit()
    } catch (err) {
        console.error('❌ Error al insertar datos:', err)
        process.exit(1)
    }
}

seedDatabase()
