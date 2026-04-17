import mongoose from 'mongoose';

const supportTicketSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  relatedItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  status: { type: String, enum: ['Open', 'In Progress', 'Resolved'], default: 'Open' },
  adminReply: { type: String },
  adminRepliedAt: { type: Date }
}, {
  timestamps: true
});

const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);
export default SupportTicket;
