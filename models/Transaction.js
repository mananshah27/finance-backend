const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: 0.01
  },
  type: {
    type: String,
    required: [true, 'Transaction type is required'],
    enum: ['income', 'expense']
  },
  description: {
    type: String,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
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

// Single pre('save') middleware
transactionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (this.isNew) {
    this.createdAt = this.updatedAt;
  }
  next();
});

// Index for faster queries
transactionSchema.index({ userId: 1, accountId: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);