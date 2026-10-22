const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  rollNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    default: ''
  },
  passwordHash: {
    type: String,
    required: true
  },
  // Initial password / Secret code for student login
  initialPassword: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

studentSchema.index({ name: 1 });

module.exports = mongoose.model('Student', studentSchema);
