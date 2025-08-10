import express from 'express'
import { verifyToken } from '../middleware/verifyToken.js'
import { verifyAdmin } from '../middleware/verifyAdmin.js'

import User from '../models/User.js'
import Gig from '../models/Gig.js'
import Review from '../models/Review.js'

const router = express.Router()

// Get all users
router.get('/users', verifyToken, verifyAdmin, async (req, res) => {
  const users = await User.find().select('-password')
  res.json(users)
})

// Get all gigs
router.get('/gigs', verifyToken, verifyAdmin, async (req, res) => {
  const gigs = await Gig.find()
  res.json(gigs)
})

// Get all reviews
router.get('/reviews', verifyToken, verifyAdmin, async (req, res) => {
  const reviews = await Review.find().populate('gigId', 'title')
  res.json(reviews)
})

// Delete user
router.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
  await User.findByIdAndDelete(req.params.id)
  res.json('User deleted')
})

// Delete gig
router.delete('/gigs/:id', verifyToken, verifyAdmin, async (req, res) => {
  await Gig.findByIdAndDelete(req.params.id)
  res.json('Gig deleted')
})

// Delete review
router.delete('/reviews/:id', verifyToken, verifyAdmin, async (req, res) => {
  await Review.findByIdAndDelete(req.params.id)
  res.json('Review deleted')
})

export default router
