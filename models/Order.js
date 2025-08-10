import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    gigId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Gig',  required: true },

    price: { type: Number, required: true },

    status: {
      type: String,
      enum: ['active', 'delivered', 'completed', 'cancelled'],
      default: 'active'
    },

    // Payment tracking
    paymentIntentId:   { type: String },
    checkoutSessionId: { type: String },

    // Optional workflow fields
    started:   { type: Boolean, default: false },
    startedAt: { type: Date },
    progress:  { type: Number, default: 0 },

    // Optional cancellation/refund tracking
    cancelledAt: { type: Date },
    refunded:    { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Optional but recommended indexes
orderSchema.index({ buyerId: 1, createdAt: -1 });
orderSchema.index({ sellerId: 1, createdAt: -1 });
orderSchema.index({ gigId: 1, createdAt: -1 });
orderSchema.index({ checkoutSessionId: 1 }, { unique: true, sparse: true });
orderSchema.index({ paymentIntentId: 1 }, { unique: true, sparse: true });

export default mongoose.model('Order', orderSchema);
