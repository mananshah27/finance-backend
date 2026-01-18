const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');

// Register User
router.post('/register', async (req, res) => {
  try {
    const { name, lastName, mobileNo, email, password } = req.body;

    // Validation
    if (!name || !lastName || !mobileNo || !email || !password) {
      return res.status(400).json({
        message: 'Please fill all required fields'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { mobileNo }] 
    });

    if (existingUser) {
      return res.status(409).json({
        message: 'User with this email or mobile number already exists'
      });
    }

    // Create new user
    const user = new User({
      name,
      lastName,
      mobileNo,
      email,
      password
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        mobileNo: user.mobileNo
      },
      token
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      message: 'Error registering user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Login User
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        message: 'Please provide email and password'
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        mobileNo: user.mobileNo
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Error logging in',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get User Profile
router.get('/profile', auth, async (req, res) => {
  try {
    res.json({
      message: 'Profile loaded successfully',
      user: req.user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      message: 'Error fetching profile'
    });
  }
});

// Update User Profile
router.put('/profile', auth, async (req, res) => {
  try {
    const updates = {};
    const allowedUpdates = ['name', 'lastName', 'email', 'mobileNo'];
    
    // Filter allowed updates
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Check if email or mobile is being changed and if it already exists
    if (updates.email && updates.email !== req.user.email) {
      const existingUser = await User.findOne({ email: updates.email });
      if (existingUser) {
        return res.status(409).json({
          message: 'Email already exists'
        });
      }
    }

    if (updates.mobileNo && updates.mobileNo !== req.user.mobileNo) {
      const existingUser = await User.findOne({ mobileNo: updates.mobileNo });
      if (existingUser) {
        return res.status(409).json({
          message: 'Mobile number already exists'
        });
      }
    }

    // Update user
    Object.keys(updates).forEach(key => {
      req.user[key] = updates[key];
    });

    await req.user.save();

    res.json({
      message: 'Profile updated successfully',
      user: req.user
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      message: 'Error updating profile'
    });
  }
});

// Delete User Profile
router.delete('/profile', auth, async (req, res) => {
  try {
    await req.user.remove();
    res.json({
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete profile error:', error);
    res.status(500).json({
      message: 'Error deleting user'
    });
  }
});

module.exports = router;