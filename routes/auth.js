const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Student = require('../models/Student');
const { requireAuth } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { role, username, rollNumber, password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Admin login
    if (role === 'admin' || (!role && username)) {
      const uname = (username || '').toLowerCase().trim();
      if (!uname) {
        return res.status(400).json({ error: 'Admin username is required' });
      }

      const admin = await User.findOne({ username: uname });
      if (!admin) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      const match = await bcrypt.compare(password, admin.passwordHash);
      if (!match) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      req.session.user = {
        id: admin._id,
        role: 'admin',
        username: admin.username,
        name: 'Administrator'
      };

      return res.json({
        success: true,
        user: req.session.user,
        redirectTo: '/index.html'
      });
    }

    // Student login
    const roll = (rollNumber || username || '').toUpperCase().trim();
    if (!roll) {
      return res.status(400).json({ error: 'Roll number is required' });
    }

    const student = await Student.findOne({ rollNumber: roll });
    if (!student) {
      return res.status(401).json({ error: 'Invalid roll number or password' });
    }

    const match = await bcrypt.compare(password, student.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid roll number or password' });
    }

    req.session.user = {
      id: student._id,
      role: 'student',
      rollNumber: student.rollNumber,
      name: student.name
    };

    return res.json({
      success: true,
      user: req.session.user,
      redirectTo: '/student.html'
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.json({ authenticated: false, user: null });
  }
  res.json({
    authenticated: true,
    user: req.session.user
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// POST /api/auth/change-password
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters long' });
    }

    const user = req.session.user;
    if (user.role === 'admin') {
      const admin = await User.findById(user.id);
      if (!admin) return res.status(404).json({ error: 'Admin not found' });

      if (currentPassword) {
        const match = await bcrypt.compare(currentPassword, admin.passwordHash);
        if (!match) return res.status(401).json({ error: 'Current password is incorrect' });
      }

      admin.passwordHash = await bcrypt.hash(newPassword, 10);
      await admin.save();
      return res.json({ success: true, message: 'Admin password updated successfully' });
    } else if (user.role === 'student') {
      const student = await Student.findById(user.id);
      if (!student) return res.status(404).json({ error: 'Student not found' });

      if (currentPassword) {
        const match = await bcrypt.compare(currentPassword, student.passwordHash);
        if (!match) return res.status(401).json({ error: 'Current password is incorrect' });
      }

      student.passwordHash = await bcrypt.hash(newPassword, 10);
      student.initialPassword = ''; // cleared once updated
      await student.save();
      return res.json({ success: true, message: 'Password updated successfully' });
    }

    res.status(400).json({ error: 'Invalid user session' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

module.exports = router;
