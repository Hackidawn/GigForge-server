import mongoose from 'mongoose'

const gigSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: String,
  description: String,
  price: Number,
  category: String,
  deliveryTime: String,
  images: [String],
}, { timestamps: true })

export default mongoose.model('Gig', gigSchema)
