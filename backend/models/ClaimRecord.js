import mongoose from 'mongoose';

const claimRecordSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  claimantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  claimDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  itemStatusAtClaim: { type: String },
  adminNotes: { type: String }
}, {
  timestamps: true
});

const ClaimRecord = mongoose.model('ClaimRecord', claimRecordSchema);
export default ClaimRecord;
