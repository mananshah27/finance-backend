const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Account name is required'],
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Account type is required'],
    enum: ['savings', 'current', 'credit', 'cash', 'investment', 'loan', 'other']
  },
  balance: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// NO MIDDLEWARE - Let Mongoose handle timestamps automatically
// Comment out or remove all pre-save middleware

module.exports = mongoose.model('Account', accountSchema);