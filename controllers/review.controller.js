import Review from '../models/Review.js'

// ✅ Create a new review

export const createReview = async (req, res) => {
  try {
    const existing = await Review.findOne({
      gigId: req.body.gigId,
      userId: req.user.id,
      isDeleted: false   // ✅ Only block if user has an active review
    })

    if (existing) return res.status(400).json('You already reviewed this gig')

    const review = new Review({
      ...req.body,
      userId: req.user.id
    })

    await review.save()
    res.status(201).json(review)
  } catch (err) {
    res.status(500).json(err.message)
  }
}


// ✅ Get all reviews for a gig
export const getReviewsByGig = async (req, res) => {
  try {
const reviews = await Review.find({
  gigId: req.params.gigId,
  isDeleted: { $ne: true }
})
      .populate('userId', 'username')
    res.status(200).json(reviews)
  } catch (err) {
    res.status(500).json(err.message)
  }
}

// ✅ Delete review by ID (only by the user who posted it)
export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId)
    if (!review) return res.status(404).json('Review not found')

    if (
  review.userId.toString() !== req.user.id &&
  !req.user.isAdmin
) {
  return res.status(403).json('Unauthorized')
}


review.isDeleted = true
await review.save()
    res.json('Review deleted')
  } catch (err) {
    res.status(500).json(err.message)
  }
}
