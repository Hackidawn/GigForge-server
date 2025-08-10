import Gig from '../models/Gig.js'

export const createGig = async (req, res) => {
  try {
    const imageUrl = req.file?.path || ''

    const gig = new Gig({
      ...req.body,
      userId: req.user.id,
      images: [imageUrl], // Store as array
    })

    await gig.save()
    res.status(201).json(gig)
  } catch (err) {
    res.status(500).json(err.message)
  }
}

export const getGigs = async (req, res) => {
  try {
    const gigs = await Gig.find()
    res.status(200).json(gigs)
  } catch (err) {
    res.status(500).json(err.message)
  }
}

// ✅ NEW: Get a single gig by ID
export const getGigById = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id)
    if (!gig) return res.status(404).json('Gig not found')
    res.status(200).json(gig)
  } catch (err) {
    res.status(500).json(err.message)
  }
}

// ✅ DELETE a gig by its creator
export const deleteGig = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.gigId)
    if (!gig) return res.status(404).json('Gig not found')

    // Ensure only the creator can delete it
    if (gig.userId.toString() !== req.user.id) {
      return res.status(403).json('Unauthorized')
    }

    await gig.deleteOne()
    res.json('Gig deleted')
  } catch (err) {
    res.status(500).json(err.message)
  }
}

export const updateGig = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.gigId)
    if (!gig) return res.status(404).json('Gig not found')

    if (gig.userId.toString() !== req.user.id)
      return res.status(403).json('Unauthorized')

    gig.title = req.body.title || gig.title
    gig.description = req.body.description || gig.description
    gig.price = req.body.price || gig.price

    await gig.save()
    res.json(gig)
  } catch (err) {
    res.status(500).json(err.message)
  }
}
