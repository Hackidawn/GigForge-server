import express from 'express'
import { verifyToken } from '../middleware/verifyToken.js'
import Message from '../models/Message.js'

const router = express.Router()

// Get chat between two users
router.get('/:userId', verifyToken, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { senderId: req.user.id, receiverId: req.params.userId },
        { senderId: req.params.userId, receiverId: req.user.id },
      ]
    }).sort('createdAt')

    res.status(200).json(messages)
  } catch (err) {
    res.status(500).json(err.message)
  }
})

export default router
