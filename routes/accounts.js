const express = require('express');
const router = express.Router();
const Account = require('../models/Account');
const auth = require('../middleware/auth');

// Create Account
router.post('/', auth, async (req, res) => {
  try {
    const { name, type, balance = 0 } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        message: 'Name and type are required'
      });
    }

    const account = new Account({
      name,
      type,
      balance: parseFloat(balance) || 0,
      userId: req.user._id
    });

    await account.save();

    res.status(201).json({
      message: 'Account created successfully',
      account
    });

  } catch (error) {
    console.error('Create account error:', error);
    res.status(500).json({
      message: 'Error creating account'
    });
  }
});

// Get All Accounts for User
router.get('/', auth, async (req, res) => {
  try {
    const accounts = await Account.find({ userId: req.user._id })
      .sort({ createdAt: -1 });

    res.json({
      message: 'Accounts loaded successfully',
      accounts
    });

  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({
      message: 'Error fetching accounts'
    });
  }
});

// Get Single Account
router.get('/:id', auth, async (req, res) => {
  try {
    const account = await Account.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!account) {
      return res.status(404).json({
        message: 'Account not found'
      });
    }

    res.json({
      message: 'Account loaded successfully',
      account
    });

  } catch (error) {
    console.error('Get account error:', error);
    res.status(500).json({
      message: 'Error fetching account'
    });
  }
});

// Update Account
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, type, balance } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (type) updates.type = type;
    if (balance !== undefined) updates.balance = parseFloat(balance);

    const account = await Account.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id
      },
      updates,
      { new: true, runValidators: true }
    );

    if (!account) {
      return res.status(404).json({
        message: 'Account not found'
      });
    }

    res.json({
      message: 'Account updated successfully',
      account
    });

  } catch (error) {
    console.error('Update account error:', error);
    res.status(500).json({
      message: 'Error updating account'
    });
  }
});

// Delete Account
router.delete('/:id', auth, async (req, res) => {
  try {
    const account = await Account.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!account) {
      return res.status(404).json({
        message: 'Account not found'
      });
    }

    res.json({
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      message: 'Error deleting account'
    });
  }
});

module.exports = router;