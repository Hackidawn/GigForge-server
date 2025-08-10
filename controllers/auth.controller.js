import User from '../models/User.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

// ✅ Register user
export const register = async (req, res) => {
  try {
    const hashed = await bcrypt.hash(req.body.password, 10)
    const user = new User({ ...req.body, password: hashed })
    await user.save()
    res.status(201).json('User created')
  } catch (err) {
    res.status(500).json(err.message)
  }
}

// ✅ Login user
export const login = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email })
    if (!user) return res.status(404).json('User not found')

    const isCorrect = await bcrypt.compare(req.body.password, user.password)
    if (!isCorrect) return res.status(400).json('Wrong password')

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET)

    res.status(200).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,     // ✅ included email
        role: user.role,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt
      }
    })
    console.log('Logged in user:', user)

  } catch (err) {
    res.status(500).json(err.message)
  }
}

// ✅ Reset password using username
export const resetPassword = async (req, res) => {
  const { username, newPassword } = req.body

  try {
    const user = await User.findOne({ username })
    if (!user) return res.status(404).json('User not found')

    const hashed = await bcrypt.hash(newPassword, 10)
    user.password = hashed
    await user.save()

    res.status(200).json('Password reset successfully')
  } catch (err) {
    res.status(500).json(err.message)
  }
}

// ✅ Update username or email
export const updateProfile = async (req, res) => {
  const { username, email } = req.body

  try {
    const user = await User.findById(req.user.id)
    if (!user) return res.status(404).json('User not found')

    if (username) user.username = username
    if (email) user.email = email

    await user.save()
    res.json({
      message: 'Profile updated',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt
      }
    })
  } catch (err) {
    res.status(500).json(err.message)
  }
}

// ✅ Change password (requires current password)
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body

  try {
    const user = await User.findById(req.user.id)
    if (!user) return res.status(404).json('User not found')

    const isMatch = await bcrypt.compare(currentPassword, user.password)
    if (!isMatch) return res.status(400).json('Incorrect current password')

    user.password = await bcrypt.hash(newPassword, 10)
    await user.save()

    res.json('Password updated successfully')
  } catch (err) {
    res.status(500).json(err.message)
  }
}
