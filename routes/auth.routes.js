import express from 'express'
import {
  register,
  login,
  resetPassword,
  updateProfile,
  changePassword
} from '../controllers/auth.controller.js'
import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

router.post('/register', register)
router.post('/login', login)
router.post('/reset-password', resetPassword)

// ✅ Authenticated routes
router.patch('/update-profile', verifyToken, updateProfile)
router.patch('/change-password', verifyToken, changePassword)

export default router
