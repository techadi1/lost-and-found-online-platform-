import express from 'express';
import ClaimRecord from '../models/ClaimRecord.js';
import Item from '../models/Item.js';
import Notification from '../models/Notification.js';

const router = express.Router();

// @desc    Get all claim records (Admin only)
router.get('/', async (req, res) => {
  try {
    const claims = await ClaimRecord.find()
      .populate('itemId', 'title imageUrl')
      .populate('reporterId', 'name email')
      .populate('claimantId', 'name email')
      .populate('messages.sender', 'name role')
      .sort({ createdAt: -1 });
    res.json(claims);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update claim record status (Admin only)
router.put('/:id', async (req, res) => {
  try {
    const claim = await ClaimRecord.findById(req.params.id);
    if (claim) {
      const oldStatus = claim.status;
      const newStatus = req.body.status || claim.status;
      
      claim.status = newStatus;
      claim.adminNotes = req.body.adminNotes || claim.adminNotes;
      claim.collectionTime = req.body.collectionTime || claim.collectionTime;
      const updatedClaim = await claim.save();

      // IF status changed to APPROVED
      if (newStatus === 'Approved' && oldStatus !== 'Approved') {
        const item = await Item.findById(claim.itemId);
        if (item) {
          item.status = 'Claimed';
          item.claimedBy = claim.claimantId;
          item.claimedAt = new Date();
          item.displayInDashboard = false; // Remove from user panel
          await item.save();

          // Notify the claimant
          await Notification.create({
            userId: claim.claimantId,
            title: 'Claim Approved',
            message: `Congratulations! Your claim for "${item.title}" has been approved. Please collect it from the Lost and Found desk.`,
            type: 'approval_status',
            relatedItemId: item._id
          });

          // Notify the original reporter (the person who lost or found it)
          await Notification.create({
            userId: claim.reporterId,
            title: 'Item Claim Finalized',
            message: `The item "${item.title}" you reported has been successfully claimed and the process is complete.`,
            type: 'system',
            relatedItemId: item._id
          });
        }
      } 
      // IF status changed to REJECTED
      else if (newStatus === 'Rejected') {
        const item = await Item.findById(claim.itemId);
        if (item) {
          // If we are rejecting a previously approved claim, restore item
          if (oldStatus === 'Approved') {
            item.status = claim.itemStatusAtClaim || 'Lost';
            item.claimedBy = undefined;
            item.claimedAt = undefined;
            item.displayInDashboard = true;
          }
          // Always remove this claim from item's records so the button works again for this user if needed or others
          item.claimRecords = item.claimRecords.filter(id => id.toString() !== claim._id.toString());
          await item.save();

          // Notify the claimant about rejection
          await Notification.create({
            userId: claim.claimantId,
            title: 'Claim Rejected',
            message: `Regrettably, your claim for "${item.title}" was not approved by the admin. Please contact the help desk for more information if needed.`,
            type: 'approval_status',
            relatedItemId: item._id
          });
        }
      }
      
      res.json(updatedClaim);
    } else {
      res.status(404).json({ message: 'Claim record not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete/Remove a claim record (Admin Power)
router.delete('/:id', async (req, res) => {
  try {
    const claim = await ClaimRecord.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: 'Claim record not found' });

    const item = await Item.findById(claim.itemId);
    if (item) {
      // Remove this claim from item's records
      item.claimRecords = item.claimRecords.filter(id => id.toString() !== claim._id.toString());
      
      // If this was the approved claim, restore the item
      if (claim.status === 'Approved') {
        item.status = claim.itemStatusAtClaim || 'Lost';
        item.claimedBy = undefined;
        item.claimedAt = undefined;
        item.displayInDashboard = true;
      }
      await item.save();
    }

    await claim.deleteOne();
    res.json({ message: 'Claim removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Add message to claim verification (Admin/User)
router.post('/:id/messages', async (req, res) => {
  try {
    const claim = await ClaimRecord.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: 'Claim record not found' });

    const newMessage = {
      sender: req.user?._id || req.body.senderId, // Support both auth middleware and direct pass
      text: req.body.text,
      timestamp: new Date()
    };

    claim.messages.push(newMessage);
    await claim.save();
    
    const updatedClaim = await ClaimRecord.findById(claim._id).populate('messages.sender', 'name role');
    res.json(updatedClaim);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
