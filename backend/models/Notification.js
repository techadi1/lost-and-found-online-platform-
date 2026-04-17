import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['system', 'admin_message', 'approval_status'], default: 'system' },
  isRead: { type: Boolean, default: false },
  relatedItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' }
}, {
  timestamps: true
});

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
