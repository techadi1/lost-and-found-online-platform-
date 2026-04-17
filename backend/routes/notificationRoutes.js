import express from 'express';
import Notification from '../models/Notification.js';

const router = express.Router();

// @desc    Get all notifications for a user
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'UserId is required' });
    
    const notifications = await Notification.find({ userId })
      .populate('relatedItemId', 'title')
      .sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create a new notification
router.post('/', async (req, res) => {
  try {
    const notification = new Notification(req.body);
    const savedNotification = await notification.save();
    res.status(201).json(savedNotification);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (notification) {
      notification.isRead = true;
      await notification.save();
      res.json({ message: 'Notification marked as read' });
    } else {
      res.status(404).json({ message: 'Notification not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
