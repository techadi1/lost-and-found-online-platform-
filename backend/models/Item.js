import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  location: { type: String, required: true },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ['Lost', 'Found', 'Claimed'], required: true },
  contactInfo: { type: String, required: true },
  imageUrl: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  claimedAt: { type: Date },
  claimRecords: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ClaimRecord' }],
  isApproved: { type: Boolean, default: false },
  displayInDashboard: { type: Boolean, default: true }
}, {
  timestamps: true
});

const Item = mongoose.model('Item', itemSchema);

export default Item;
