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

// ✅ Stripe webhook route must use express.raw BEFORE express.json
app.post('/api/orders/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook)

app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}))
app.use(express.json())

// ✅ Main API routes
app.use('/api/auth', authRoutes)
app.use('/api/gigs', gigRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/admin', adminRoutes)

// ✅ Socket.io setup
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    credentials: true
  },
})

// make io available to controllers
app.set('io', io)

io.on('connection', socket => {
  console.log('User connected:', socket.id)

  // simple message relay you already had
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
mongoose.connect(process.env.MONGO_URI).then(() => {
  server.listen(process.env.PORT, () => {
    console.log('Server running on port', process.env.PORT)
  })
}).catch(err => console.log(err))
