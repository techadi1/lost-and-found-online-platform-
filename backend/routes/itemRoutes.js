import express from 'express';
import Item from '../models/Item.js';
import ClaimRecord from '../models/ClaimRecord.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'server/uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// @desc    Get all items
// @route   GET /api/items
router.get('/', async (req, res) => {
  try {
    const { userId, isAdmin } = req.query;
    let query = {};
    
    if (userId) {
      query = { 
        $or: [
          { userId: userId },
          { claimedBy: userId }
        ]
      };
    } else if (isAdmin !== 'true') {
      // For general users, only show approved items
      query.isApproved = true;
    }
    
    const items = await Item.find(query)
      .populate('userId', 'name email')
      .populate({
        path: 'claimRecords',
        populate: { path: 'claimantId', select: 'name' }
      })
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// @desc    Create a new item
// @route   POST /api/items
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const itemData = { ...req.body };
    
    // If an image was uploaded, store its URL
    if (req.file) {
      itemData.imageUrl = `/uploads/${req.file.filename}`;
    }
    
    const item = new Item(itemData);
    const newItem = await item.save();

    // Notify the user who reported it
    await Notification.create({
      userId: newItem.userId,
      title: 'Report Received',
      message: `Your ${newItem.status.toLowerCase()} item report for "${newItem.title}" has been received and is pending admin approval.`,
      type: 'approval_status',
      relatedItemId: newItem._id
    });

    // Notify all admins
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        title: `New ${newItem.status} Item Report`,
        message: `A user has reported a ${newItem.status.toLowerCase()} item: "${newItem.title}". Please review it.`,
        type: 'system',
        relatedItemId: newItem._id
      });
    }

    res.status(201).json(newItem);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Get single item
// @route   GET /api/items/:id
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (item) {
      res.json(item);
    } else {
      res.status(404).json({ message: 'Item not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update an item
// @route   PUT /api/items/:id
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (item) {
      if (req.file) {
        item.imageUrl = `/uploads/${req.file.filename}`;
      }
      item.title = req.body.title || item.title;
      item.description = req.body.description || item.description;
      item.category = req.body.category || item.category;
      item.location = req.body.location || item.location;
      item.status = req.body.status || item.status;
      item.contactInfo = req.body.contactInfo || item.contactInfo;
      item.imageUrl = req.body.imageUrl || item.imageUrl;
      item.date = req.body.date || item.date;
      if (req.body.isApproved !== undefined) {
        item.isApproved = req.body.isApproved;
      }

      const updatedItem = await item.save();
      res.json(updatedItem);
    } else {
      res.status(404).json({ message: 'Item not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Delete an item
// @route   DELETE /api/items/:id
router.delete('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (item) {
      await item.deleteOne();
      res.json({ message: 'Item removed successfully' });
    } else {
      res.status(404).json({ message: 'Item not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Claim an item
// @route   POST /api/items/:id/claim
router.post('/:id/claim', async (req, res) => {
  try {
    const { userId } = req.body;
    const item = await Item.findById(req.params.id);

    if (item) {
      if (item.status !== 'Found') {
        return res.status(400).json({ message: 'Only found items can be claimed' });
      }

      if (item.userId && item.userId.toString() === userId) {
        return res.status(400).json({ message: 'You cannot claim an item you reported as found' });
      }

      // Check if user has already claimed this item
      const existingClaim = await ClaimRecord.findOne({ itemId: item._id, claimantId: userId });
      if (existingClaim) {
        if (existingClaim.status.toLowerCase() === 'rejected') {
          return res.status(400).json({ message: 'Your previous claim for this item was rejected. Please contact support if you believe this is an error.' });
        }
        return res.status(400).json({ message: 'You have already made a claim, wait for admin verification' });
      }

      // In the new logic, we don't mark status as Claimed yet.
      // We just store the claim record.
      
      const claimRecord = new ClaimRecord({
        itemId: item._id,
        reporterId: item.userId,
        claimantId: userId,
        claimDate: new Date(),
        status: 'Pending',
        itemStatusAtClaim: item.status
      });
      const savedRecord = await claimRecord.save();

      item.claimRecords.push(savedRecord._id);
      await item.save();

      res.json({ message: 'Claim requested successfully', claimRecord: savedRecord });
    } else {
      res.status(404).json({ message: 'Item not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
