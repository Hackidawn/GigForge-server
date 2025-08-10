import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import http from 'http'
import { Server } from 'socket.io'

import authRoutes from './routes/auth.routes.js'
import gigRoutes from './routes/gig.routes.js'
import orderRoutes from './routes/order.routes.js'
import messageRoutes from './routes/message.routes.js'
import reviewRoutes from './routes/review.routes.js'
import adminRoutes from './routes/admin.routes.js'

import { handleStripeWebhook } from './controllers/order.controller.js'
import Message from './models/Message.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Build an allowlist for CORS: main client URL + optional comma-separated previews + localhost
const allowedOrigins = [
  process.env.CLIENT_URL,
  ...(process.env.CLIENT_URLS ? process.env.CLIENT_URLS.split(',') : []),
  'http://localhost:5173'
].filter(Boolean)

// ✅ Stripe webhook MUST be before express.json (raw body)
app.post('/api/orders/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook)

// REST CORS
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    return cb(new Error(`CORS blocked for origin: ${origin}`))
  },
  credentials: true
}))

// JSON parser for normal routes
app.use(express.json())

// ✅ Friendly base page + health route
app.get('/', (req, res) => {
  res.status(200).send('✅ GigForge API is running. Try GET /api/health')
})
app.get('/api/health', (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || 'unknown' })
})

// ✅ Main API routes
app.use('/api/auth', authRoutes)
app.use('/api/gigs', gigRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/admin', adminRoutes)

// ✅ Socket.io setup with matching CORS
const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: allowedOrigins, credentials: true },
})

app.set('io', io)

io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  socket.on('send_message', async ({ senderId, receiverId, content }) => {
    const msg = new Message({ senderId, receiverId, content })
    await msg.save()
    io.emit(`message_${receiverId}`, msg)
  })

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
  })
})

// ✅ Connect DB and start server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    server.listen(PORT, () => {
      console.log('Server running on port', PORT)
    })
  })
  .catch(err => console.error('Mongo connection error:', err))
