import express from 'express'
import {
  createGig,
  getGigs,
  getGigById,
  deleteGig,
  updateGig,            // ✅ add this
} from '../controllers/gig.controller.js'
import { verifyToken } from '../middleware/verifyToken.js'
import upload from '../middleware/upload.js'

const router = express.Router()

// ✅ POST: Create a gig with image upload
router.post('/', verifyToken, upload.single('image'), createGig)

// ✅ GET: All gigs
router.get('/', getGigs)

// ✅ GET: Single gig by ID
router.get('/:id', getGigById)

// ✅ PUT: Update gig
router.put('/:gigId', verifyToken, updateGig) 

// ✅ DELETE: Remove a gig
router.delete('/:gigId', verifyToken, deleteGig)

export default router
