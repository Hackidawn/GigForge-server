import express from 'express'
import { verifyToken } from '../middleware/verifyToken.js'
import {
  createReview,
  getReviewsByGig,
  deleteReview   // ✅ include here
} from '../controllers/review.controller.js'

const router = express.Router()

router.post('/', verifyToken, createReview)
router.get('/:gigId', getReviewsByGig)
router.delete('/:reviewId', verifyToken, deleteReview)

export default router
