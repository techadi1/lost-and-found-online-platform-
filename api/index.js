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
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  adminNotes: { type: String },
  createdAt: { type: Date, default: Date.now }
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
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
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
    res.status(500).json({ message: 'Error creating item', error: error.message });
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
    res.status(500).json({ message: 'Error creating item', error: error.message });
  }
});

app.get('/api/items', async (req, res) => {
  try {
    const { isAdmin, userId } = req.query;
    let query = {};
    
    if (userId) {
      query.reportedBy = userId;
    }
    
    // Only show approved items to non-admin users
    if (isAdmin !== 'true') {
      query.isApproved = true;
    }
    
    const items = await Item.find(query).populate('reportedBy', 'name email').sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error creating item', error: error.message });
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
    res.status(500).json({ message: 'Error creating item', error: error.message });
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
    res.status(500).json({ message: 'Error creating item', error: error.message });
  }
});

app.post('/api/items/:id/claim', protect, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    
    // Only allow claims on found items
    if (item.status !== 'found') {
      return res.status(400).json({ message: 'Only found items can be claimed' });
    }
    
    // Allow multiple claims - remove the existing claim check
    const claim = new ClaimRecord({
      item: req.params.id,
      claimedBy: req.user._id,
      status: 'pending'
    });
    await claim.save();
    res.status(201).json(claim);
  } catch (error) {
    res.status(500).json({ message: 'Error creating item', error: error.message });
  }
});

app.get('/api/claims', protect, async (req, res) => {
  try {
    const claims = await ClaimRecord.find()
      .populate('item', 'title description')
      .populate('claimedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(claims);
  } catch (error) {
    res.status(500).json({ message: 'Error creating item', error: error.message });
  }
});

app.put('/api/claims/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const claim = await ClaimRecord.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    
    Object.assign(claim, req.body);
    await claim.save();
    res.json(claim);
  } catch (error) {
    res.status(500).json({ message: 'Error creating item', error: error.message });
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
    res.status(500).json({ message: 'Error creating item', error: error.message });
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
      .sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error creating item', error: error.message });
  }
});

app.post('/api/notifications', protect, async (req, res) => {
  try {
    const notification = new Notification({
      ...req.body,
      user: req.user._id
    });
    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Error creating item', error: error.message });
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
