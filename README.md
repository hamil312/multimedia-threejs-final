# Blender Three.js Mongo — Juego 3D

Juego de plataformas 3D desarrollado con **React**, **Three.js**, **cannon-es** (física) y **MongoDB**. Los modelos se exportan desde Blender y se cargan dinámicamente por nivel. Incluye autenticación JWT opcional, multijugador básico con Socket.io y un compañero zorro que sigue al jugador.

---

## Funcionalidades

| Funcionalidad | Detalle |
|---|---|
| **5 niveles** | Escenarios únicos cargados desde MongoDB o JSON local. Cada nivel requiere 5 monedas (6 en niveles 4–5) para desbloquear la salida. |
| **Teletransporte entre niveles** | Al completar un nivel se limpia la escena y se carga el siguiente con el spawn point correcto. |
| **Sistema de físicas** | Colisiones con cannon-es: jugador (cilindro + semiesferas), enemigos, escenario. Suelo genérico desactivado en niveles 4–5 (pozos sin fondo). |
| **Enemigos** | **Esqueleto** (nivel 1): persigue al jugador, colisiona con paredes y otros esqueletos. **Fantasma** (niveles 2–5): vuela, atraviesa paredes, daña por proximidad. |
| **Compañero zorro** | Sigue al jugador con interpolación suave; se teletransporta si queda muy lejos. Animaciones por nombre. |
| **Partículas del portal** | Vórtice horizontal multicolor con 250 partículas en modo AdditiveBlending, persistente hasta cambiar de nivel. |
| **HUD accesible (WCAG)** | Menú circular con controles de audio, subtítulos/voz asistida, alto contraste, tamaño de texto, pistas de teclado. Sliders de volumen. |
| **Ajustes del personaje** | Movimiento WASD, salto (barra espaciadora), carrera (Shift), giro suave al correr. Animaciones idle/walking/running/jump/death/dance. |
| **Autenticación JWT** | Registro e inicio de sesión con tokens. Si el backend no responde, modo anónimo offline automático. |
| **Guardado en MongoDB** | Puntaje, monedas, tiempo y progreso por nivel se persisten vía API REST. |
| **Multijugador (Socket.io)** | Sincronización de posición/rotación entre jugadores en tiempo real. |
| **Audio ambiente** | Bucle ambiental con Web Audio API, activado al iniciar partida, con toggle en menú de accesibilidad. |

---

## Estructura del proyecto

```
Blender_Threejs_Mongo-main/
├─ backend/                  # API REST + Socket.io
│  ├─ app.js                 # Entry point (Express + Socket.io + MongoDB)
│  ├─ controllers/           # blockController, playerController, authController
│  ├─ models/                # Block, Player, Score, User (Mongoose)
│  ├─ routes/                # blockRoutes, playerRoutes, authRoutes
│  ├─ scripts/               # Utilidades (sync, seed, generate sources)
│  └─ data/                  # JSON de modelos y posiciones
│
├─ game-project/             # Frontend 3D (React + Vite + Three.js)
│  ├─ public/
│  │  ├─ data/               # toy_car_blocks.json (fallback local)
│  │  ├─ config/             # precisePhysicsModels.json
│  │  ├─ models/             # Modelos GLB (robot, enemies, zorro, escenario)
│  │  └─ sounds/             # Efectos de sonido
│  └─ src/
│     ├─ Experience/         # Núcleo 3D
│     │  ├─ World/           # Robot, Enemy, Ghost, Fox, Floor, LevelManager
│     │  ├─ Utils/           # Physics, PhysicsShapeFactory, Resources, Time
│     │  ├─ Camera/          # Tercera persona, visión cenital
│     │  └─ Renderer/        # Configuración de WebGL
│     ├─ controls/           # CircularMenu (HUD accesible)
│     ├─ loaders/            # ToyCarLoader (procesa bloques del nivel)
│     ├─ auth/               # authService, useAuth
│     └─ network/            # SocketManager
```

---

## Requisitos

- Node.js 18+ y npm
- MongoDB (local o Atlas)

---

## Variables de entorno

### Backend (`backend/.env`)

```env
MONGO_URI=mongodb://127.0.0.1:27017/threejs_blocks
PORT=3001
JWT_SECRET=tu_secreto_jwt
```

### Frontend (`game-project/.env.local`)

```env
VITE_API_URL=http://localhost:3001
VITE_ENEMIES_COUNT=1
VITE_BACKEND_URL=http://localhost:3001
```

---

## Instalación

### Backend

```bash
cd backend
npm install
```

### Frontend

```bash
cd game-project
npm install
```

---

## Ejecución en desarrollo

Usa dos terminales:

```bash
# Terminal 1: Backend
cd backend
node app.js
# → http://localhost:3001

# Terminal 2: Frontend
cd game-project
npm run dev
# → http://localhost:5173
```

---

## API REST

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/blocks?level=N` | Bloques de un nivel |
| `POST` | `/api/blocks` | Crear un bloque |
| `POST` | `/api/blocks/batch` | Insertar múltiples bloques |
| `GET` | `/api/blocks/ping` | Healthcheck |
| `POST` | `/api/auth/register` | Registro de usuario |
| `POST` | `/api/auth/login` | Inicio de sesión |
| `GET` | `/api/auth/me` | Perfil del usuario autenticado |
| `POST` | `/api/players/score` | Guardar puntaje y progreso |

---

## WebSocket (Socket.io)

Mismo puerto del backend. Eventos:

- `new-player` — Registra jugador
- `update-position` — Broadcast de posición/rotación
- `remove-player` — Notifica desconexión
- `players-update`, `existing-players` — Sincronización de estado

---

## Despliegue

Solo el frontend se despliega en **Vercel**:

1. Conecta el repositorio en [vercel.com](https://vercel.com)
2. Configura las variables de entorno en Vercel:
   - `VITE_API_URL` → URL del backend en producción
   - `VITE_BACKEND_URL` → misma URL
3. El backend se despliega por separado (Railway, Render, Fly.io, o servidor propio).

El frontend se despliega automáticamente al hacer push a la rama principal.

---

## Licencia

ISC

## Autor

Gustavo Willyn Sánchez Rodríguez — guswillsan@gmail.com
