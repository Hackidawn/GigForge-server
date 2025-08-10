import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema({
  gigId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gig',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  comment: {
    type: String,
    required: true
  },
  isDeleted: {
    type: Boolean,
    default: false   // ✅ This enables soft delete
  }
}, { timestamps: true })

export default mongoose.model('Review', reviewSchema)
