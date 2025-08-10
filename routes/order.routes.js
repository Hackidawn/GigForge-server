// /routes/order.routes.js
import express from 'express'
import {
  getOrders,
  getOrderById,
  checkout,
  completeOrder,
  cancelOrder,
  completeOrderById,
  cancelOrderById,
  handleStripeWebhook,
  startWork,
  updateProgress,
  confirmSession
} from '../controllers/order.controller.js'

import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

// NOTE: webhook is registered in index.js with express.raw

// ✅ Get orders (dashboard)
router.get('/', verifyToken, getOrders)

// ✅ Get single order
router.get('/:orderId', verifyToken, getOrderById)

// ✅ Stripe Checkout session for a gig
router.post('/checkout/:gigId', verifyToken, checkout)

// ✅ Post-success fallback if webhook didn’t create the order
router.get('/confirm-session', verifyToken, confirmSession)

// ✅ Complete/cancel by gigId (legacy)
router.patch('/complete/:gigId', verifyToken, completeOrder)
router.patch('/cancel/:gigId', verifyToken, cancelOrder)

// ✅ Complete/cancel by orderId (newer)
router.patch('/complete-by-id/:orderId', verifyToken, completeOrderById)
router.patch('/cancel-by-id/:orderId', verifyToken, cancelOrderById)

// ✅ Work tracking
router.patch('/start-work/:orderId', verifyToken, startWork)
router.patch('/update-progress/:orderId', verifyToken, updateProgress)

export default router
