import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';

// MongoDB Cloud configuration

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join("/tmp", "uploads");
if (!fs.existsSync(uploadsDir)) {
  try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch (e) { console.log("Uploads dir creation skipped or failed"); }
}


// Middleware
app.use(cors());
app.use(express.json());
app.use(async (req, res, next) => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is not defined");
    }
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    next();
  } catch (err) {
    console.error("Database middleware error:", err.message);
    res.status(500).json({ message: "Database connection failed", error: err.message });
  }
});


// Configure multer for file uploads with disk storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Serve static files from uploads directory
app.use('/api/uploads', express.static(uploadsDir));
app.use('/uploads', express.static(uploadsDir));

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Schemas
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
});

const itemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  status: { type: String, enum: ['lost', 'found'], default: 'lost' },
  location: { type: String, required: true },
  date: { type: Date, required: true },
  contactInfo: { type: String, required: true },
  imageUrl: { type: String },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isApproved: { type: Boolean, default: false },
  displayInDashboard: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const claimRecordSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true, index: true },
  claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  adminNotes: { type: String },
  collectionTime: { type: String },
  messages: [
    {
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      text: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  createdAt: { type: Date, default: Date.now, index: true }
});

const supportTicketSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  relatedItem: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['open', 'in-progress', 'closed'], default: 'open' },
  adminReply: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String },
  message: { type: String, required: true },
  type: { type: String, enum: ['info', 'success', 'warning', 'error', 'admin_message'], default: 'info' },
  relatedItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  isRead: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now, index: true }
});

const User = mongoose.model('User', userSchema);
const Item = mongoose.model('Item', itemSchema);
const ClaimRecord = mongoose.model('ClaimRecord', claimRecordSchema);
const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);
const Notification = mongoose.model('Notification', notificationSchema);

// JWT middleware
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({ name, email, password: hashedPassword, role });
    await user.save();
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ ...user.toObject(), password: undefined, token });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ ...user.toObject(), password: undefined, token });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

app.get('/api/items', async (req, res) => {
  try {
    const { status, category, userId, isAdmin, excludeImage, limit = 20, skip = 0 } = req.query;
    let query = {};
    
    if (isAdmin !== 'true') {
      const publicQuery = { isApproved: true };
      if (userId) {
        query = { $or: [publicQuery, { reportedBy: userId }] };
      } else {
        query = publicQuery;
      }
    }
    
    if (status) query.status = status.toLowerCase();
    if (category) query.category = category;

    // Use projection to exclude heavy image data if requested
    const projection = excludeImage === 'true' ? { imageUrl: 0 } : {};

    const items = await Item.find(query, projection)
      .populate('reportedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .lean();
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching items', error: error.message });
  }
});

app.get('/api/admin/stats', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const [itemStats, claimStats, ticketStats] = await Promise.all([
      Item.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      ClaimRecord.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      SupportTicket.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ])
    ]);

    const stats = {
      items: itemStats.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
      claims: claimStats.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
      tickets: ticketStats.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
      totalReports: await Item.countDocuments(),
      totalClaims: await ClaimRecord.countDocuments()
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats', error: error.message });
  }
});

app.post('/api/items', protect, upload.single('image'), async (req, res) => {
  try {
    const itemData = { ...req.body, reportedBy: req.user._id };
    
    // Handle file upload if present
    if (req.file) {
      itemData.imageUrl = '/uploads/' + req.file.filename;
    }
    
    const item = new Item(itemData);
    await item.save();
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: 'Error processing item report', error: error.message });
  }
});

app.put('/api/items/:id', protect, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    
    if (req.user.role !== 'admin' && item.reportedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this item' });
    }
    
    Object.assign(item, req.body);
    await item.save();
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Error updating item', error: error.message });
  }
});

app.delete('/api/items/:id', protect, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    
    if (req.user.role !== 'admin' && item.reportedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this item' });
    }
    
    await item.deleteOne();
    res.json({ message: 'Item removed' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting item', error: error.message });
  }
});

app.post('/api/items/:id/claim', protect, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    
    if (item.status && item.status.toLowerCase() !== 'found') {
      return res.status(400).json({ message: 'Only found items can be claimed' });
    }

    // Check if user has already claimed this item
    const existingClaim = await ClaimRecord.findOne({
      item: req.params.id,
      claimedBy: req.user._id,
      status: { $ne: 'rejected' } // Allow re-claiming only if previous claim was rejected? Or maybe not?
                                 // Usually, if it's pending or approved, you shouldn't re-claim.
    });

    if (existingClaim) {
      return res.status(400).json({ message: 'You have already made a claim, wait for admin verification' });
    }
    
    const claim = new ClaimRecord({
      item: req.params.id,
      claimedBy: req.user._id,
      status: 'pending'
    });
    await claim.save();

    // Create a notification for the reporter
    await new Notification({
      user: item.reportedBy,
      title: 'New Claim Request',
      message: `Someone has requested to claim: ${item.title}`,
      type: 'info',
      relatedItemId: item._id
    }).save();

    res.status(201).json(claim);
  } catch (error) {
    res.status(500).json({ message: 'Error creating claim', error: error.message });
  }
});

app.get('/api/claims', protect, async (req, res) => {
  try {
    const claims = await ClaimRecord.find()
      .populate({
        path: 'item',
        populate: { path: 'reportedBy', select: 'name email' }
      })
      .populate('claimedBy', 'name email')
      .populate('messages.sender', 'name role')
      .sort({ createdAt: -1 })
      .lean();

    // Map fields to match what frontend expects
    const mappedClaims = claims.map(claim => {
      const plainClaim = claim.toPlainObject ? claim.toPlainObject() : JSON.parse(JSON.stringify(claim));
      return {
        ...plainClaim,
        itemId: plainClaim.item,
        claimantId: plainClaim.claimedBy,
        reporterId: plainClaim.item?.reportedBy,
        claimDate: plainClaim.createdAt // Alias for frontend
      };
    });

    res.json(mappedClaims);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching claims', error: error.message });
  }
});

app.put('/api/claims/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const claim = await ClaimRecord.findById(req.params.id).populate('item');
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    
    const oldStatus = claim.status;
    Object.assign(claim, req.body);
    await claim.save();

    // Notify user if status changed or admin replied
    if (req.body.status || req.body.adminReply || req.body.collectionTime) {
      await new Notification({
        user: claim.claimedBy,
        title: `Update on Claim: ${claim.item?.title || 'Item'}`,
        message: `Status: ${claim.status}. ${claim.adminReply || ''}. ${claim.collectionTime ? 'Collection Slot: ' + claim.collectionTime : ''}`,
        type: claim.status === 'approved' ? 'success' : 'info',
        relatedItemId: claim.item?._id
      }).save();
    }

    res.json(claim);
  } catch (error) {
    res.status(500).json({ message: 'Error updating claim', error: error.message });
  }
});

app.post('/api/claims/:id/messages', protect, async (req, res) => {
  try {
    const claim = await ClaimRecord.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: 'Claim not found' });

    const newMessage = {
      sender: req.user._id,
      text: req.body.text
    };

    claim.messages.push(newMessage);
    await claim.save();

    // Notify the other party
    const isSenderAdmin = req.user.role === 'admin';
    const recipientId = isSenderAdmin ? claim.claimedBy : claim.reportedBy; 
    // Actually, if user sent, we don't necessarily need to notify admin unless we have an admin dashboard notification system.
    
    if (isSenderAdmin) {
      await new Notification({
        user: claim.claimedBy,
        title: 'New message from Admin',
        message: `Admin asked a question about your claim on: ${claim.item?.title || 'Item'}`,
        type: 'info',
        relatedItemId: claim.item
      }).save();
    }

    res.status(201).json(claim);
  } catch (error) {
    res.status(500).json({ message: 'Error sending message', error: error.message });
  }
});

app.delete('/api/claims/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    await ClaimRecord.findByIdAndDelete(req.params.id);
    res.json({ message: 'Claim removed' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating item', error: error.message });
  }
});

app.get('/api/tickets', protect, async (req, res) => {
  try {
    const tickets = await SupportTicket.find()
      .populate('user', 'name email')
      .populate('relatedItem', 'title')
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tickets', error: error.message });
  }
});

app.post('/api/tickets', protect, async (req, res) => {
  try {
    const ticket = new SupportTicket({
      ...req.body,
      user: req.user._id
    });
    await ticket.save();
    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ message: 'Error creating item', error: error.message });
  }
});

app.put('/api/tickets/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    
    Object.assign(ticket, req.body);
    await ticket.save();
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: 'Error creating item', error: error.message });
  }
});

app.delete('/api/tickets/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    await SupportTicket.findByIdAndDelete(req.params.id);
    res.json({ message: 'Ticket removed' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating item', error: error.message });
  }
});

// Support endpoint aliases (for frontend compatibility)
app.get('/api/support', protect, async (req, res) => {
  try {
    const tickets = await SupportTicket.find()
      .populate('user', 'name email')
      .populate('relatedItem', 'title')
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: 'Error creating item', error: error.message });
  }
});

app.get('/api/support/user/:userId', protect, async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ user: req.params.userId })
      .populate('user', 'name email')
      .populate('relatedItem', 'title')
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: 'Error creating item', error: error.message });
  }
});

app.post('/api/support', protect, async (req, res) => {
  try {
    const ticket = new SupportTicket({
      ...req.body,
      user: req.user._id
    });
    await ticket.save();
    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ message: 'Error creating item', error: error.message });
  }
});

app.put('/api/support/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    
    Object.assign(ticket, req.body);
    await ticket.save();
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: 'Error creating item', error: error.message });
  }
});

app.delete('/api/support/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    await SupportTicket.findByIdAndDelete(req.params.id);
    res.json({ message: 'Ticket removed' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating item', error: error.message });
  }
});

app.get('/api/notifications', protect, async (req, res) => {
  try {
    const { userId } = req.query;
    const query = userId ? { user: userId } : { user: req.user._id };
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
});

app.post('/api/notifications', protect, async (req, res) => {
  try {
    const notificationData = {
      ...req.body,
      user: req.body.userId || req.body.user || req.user._id
    };
    const notification = new Notification(notificationData);
    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Error creating notification', error: error.message });
  }
});

app.put('/api/notifications/:id', protect, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    
    if (notification.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    Object.assign(notification, req.body);
    await notification.save();
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Error creating item', error: error.message });
  }
});

app.put('/api/notifications/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    
    if (notification.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    notification.isRead = true;
    await notification.save();
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Error creating item', error: error.message });
  }
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!', timestamp: new Date().toISOString() });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global variable to cache the database connection status
let isConnected = false;

const connect = async () => {
  if (!isConnected) {
    try {
      await connectDB();
      isConnected = true;
      console.log('Connected to MongoDB');
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }
};

// Connect to database before handling requests
connect().catch(err => console.error("Initial connection error:", err));

// Vercel serverless export
export default app;
export { connectDB };
