import express from 'express';
import SupportTicket from '../models/SupportTicket.js';

const router = express.Router();

// @desc    Create a new support ticket
router.post('/', async (req, res) => {
  try {
    const { userId, subject, message, relatedItemId } = req.body;
    const newTicket = new SupportTicket({
      userId,
      subject,
      message,
      relatedItemId
    });
    const savedTicket = await newTicket.save();
    res.status(201).json(savedTicket);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Get user's support tickets
router.get('/user/:userId', async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ userId: req.params.userId })
      .populate('relatedItemId', 'title')
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get all support tickets (Admin only)
router.get('/', async (req, res) => {
  try {
    const tickets = await SupportTicket.find()
      .populate('userId', 'name email')
      .populate('relatedItemId', 'title')
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update support ticket status and reply (Admin only)
router.put('/:id', async (req, res) => {
  try {
    const { status, adminReply } = req.body;
    const ticket = await SupportTicket.findById(req.params.id);
    
    if (ticket) {
      if (status) ticket.status = status;
      if (adminReply) {
        ticket.adminReply = adminReply;
        ticket.adminRepliedAt = new Date();
      }
      
      const updatedTicket = await ticket.save();
      res.json(updatedTicket);
    } else {
      res.status(404).json({ message: 'Support ticket not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete a support ticket (Admin only)
router.delete('/:id', async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (ticket) {
      await ticket.deleteOne();
      res.json({ message: 'Support ticket removed successfully' });
    } else {
      res.status(404).json({ message: 'Support ticket not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

