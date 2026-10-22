const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  customId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  mode: {
    type: String,
    enum: ['gpay', 'cash'],
    default: 'gpay'
  },
  date: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  student: {
    type: String,
    default: 'General',
    index: true
  },
  studentRollNumber: {
    type: String,
    default: '',
    uppercase: true,
    trim: true,
    index: true
  },
  whoGave: {
    type: String,
    default: ''
  },
  remark: {
    type: String,
    default: ''
  },
  receiptImage: {
    type: String,
    default: null
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Number,
    default: null
  },
  createdAt: {
    type: Number,
    default: () => Date.now(),
    index: true
  }
});

module.exports = mongoose.model('Transaction', transactionSchema);
