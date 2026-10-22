const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Student = require('../models/Student');
const Transaction = require('../models/Transaction');
const Setting = require('../models/Setting');
const { requireAdmin } = require('../middleware/auth');

// Protect all admin routes
router.use(requireAdmin);

// Helper to format transaction for client
function formatTx(tx) {
  return {
    id: tx.customId,
    _id: tx._id,
    createdAt: tx.createdAt,
    type: tx.type,
    amount: tx.amount,
    mode: tx.mode,
    date: tx.date,
    description: tx.description,
    student: tx.student,
    studentRollNumber: tx.studentRollNumber || '',
    whoGave: tx.whoGave,
    remark: tx.remark,
    receiptImage: tx.receiptImage,
    isVerified: tx.isVerified,
    isDeleted: tx.isDeleted,
    deletedAt: tx.deletedAt
  };
}

// ================= STUDENTS =================

// GET /api/students
router.get('/students', async (req, res) => {
  try {
    const students = await Student.find().sort({ name: 1 });
    res.json(students.map(s => ({
      id: s._id,
      rollNumber: s.rollNumber,
      name: s.name,
      phoneNumber: s.phoneNumber || '',
      initialPassword: s.initialPassword || '',
      createdAt: s.createdAt
    })));
  } catch (err) {
    console.error('Fetch students error:', err);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// POST /api/students
router.post('/students', async (req, res) => {
  try {
    const { rollNumber, name, phoneNumber, password } = req.body;
    const cleanPhone = (phoneNumber || '').trim();
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Student name is required' });
    }

    const cleanName = name.trim();
    // If no roll number provided, generate a fallback or clean it
    let cleanRoll = (rollNumber || '').toUpperCase().trim();
    if (!cleanRoll) {
      // Auto-assign roll format based on name or count
      const count = await Student.countDocuments();
      cleanRoll = `STU${String(count + 1).padStart(3, '0')}`;
    }

    const existingRoll = await Student.findOne({ rollNumber: cleanRoll });
    if (existingRoll) {
      return res.status(400).json({ error: `Roll number ${cleanRoll} is already registered` });
    }

    // Default password is rollNumber.toLowerCase() or custom
    const plainPass = (password && password.trim().length >= 4) ? password.trim() : `${cleanRoll.toLowerCase()}123`;
    const passwordHash = await bcrypt.hash(plainPass, 10);

    const student = new Student({
      rollNumber: cleanRoll,
      name: cleanName,
      phoneNumber: cleanPhone,
      passwordHash,
      initialPassword: plainPass
    });

    await student.save();
    res.status(201).json({
      success: true,
      student: {
        id: student._id,
        rollNumber: student.rollNumber,
        name: student.name,
        phoneNumber: student.phoneNumber || '',
        initialPassword: student.initialPassword
      }
    });
  } catch (err) {
    console.error('Create student error:', err);
    res.status(500).json({ error: 'Failed to add student' });
  }
});

// PUT /api/students/:id
router.put('/students/:id', async (req, res) => {
  try {
    const { name, rollNumber, password } = req.body;
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    if (name) student.name = name.trim();
    if (rollNumber) student.rollNumber = rollNumber.toUpperCase().trim();
    if (password && password.trim().length >= 4) {
      student.passwordHash = await bcrypt.hash(password.trim(), 10);
      student.initialPassword = password.trim();
    }

    await student.save();
    res.json({
      success: true,
      student: {
        id: student._id,
        rollNumber: student.rollNumber,
        name: student.name,
        initialPassword: student.initialPassword
      }
    });
  } catch (err) {
    console.error('Update student error:', err);
    res.status(500).json({ error: 'Failed to update student' });
  }
});

// DELETE /api/students/:id
router.delete('/students/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json({ success: true, message: 'Student removed successfully' });
  } catch (err) {
    console.error('Delete student error:', err);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

// ================= TRANSACTIONS =================

// GET /api/transactions
router.get('/transactions', async (req, res) => {
  try {
    const activeTx = await Transaction.find({ isDeleted: false }).sort({ createdAt: -1 });
    const binTx = await Transaction.find({ isDeleted: true }).sort({ deletedAt: -1 });
    res.json({
      transactions: activeTx.map(formatTx),
      recycleBin: binTx.map(formatTx)
    });
  } catch (err) {
    console.error('Fetch transactions error:', err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// POST /api/transactions
router.post('/transactions', async (req, res) => {
  try {
    const {
      id,
      type,
      amount,
      mode,
      date,
      description,
      student,
      whoGave,
      remark,
      receiptImage,
      isVerified
    } = req.body;

    if (!type || !amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Valid transaction type and amount are required' });
    }

    const customId = id || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    // Look up student roll number if matched
    let studentRoll = '';
    if (student && student.trim() && student.trim() !== 'General') {
      const foundStudent = await Student.findOne({
        $or: [
          { name: new RegExp(`^${student.trim()}$`, 'i') },
          { rollNumber: student.trim().toUpperCase() }
        ]
      });
      if (foundStudent) {
        studentRoll = foundStudent.rollNumber;
      }
    }

    const tx = new Transaction({
      customId,
      type,
      amount: Number(amount),
      mode: mode || 'gpay',
      date: date || new Date().toISOString().slice(0, 10),
      description: description || '',
      student: student || 'General',
      studentRollNumber: studentRoll,
      whoGave: whoGave || '',
      remark: remark || '',
      receiptImage: receiptImage || null,
      isVerified: !!isVerified,
      createdAt: Date.now()
    });

    await tx.save();
    res.status(201).json({ success: true, transaction: formatTx(tx) });
  } catch (err) {
    console.error('Create transaction error:', err);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// PUT /api/transactions/:id
router.put('/transactions/:id', async (req, res) => {
  try {
    const customId = req.params.id;
    const updateData = req.body;

    const tx = await Transaction.findOne({ customId });
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    if (updateData.type) tx.type = updateData.type;
    if (updateData.amount) tx.amount = Number(updateData.amount);
    if (updateData.mode) tx.mode = updateData.mode;
    if (updateData.date) tx.date = updateData.date;
    if (updateData.description !== undefined) tx.description = updateData.description;
    if (updateData.student !== undefined) {
      tx.student = updateData.student;
      if (tx.student && tx.student !== 'General') {
        const foundStudent = await Student.findOne({
          $or: [
            { name: new RegExp(`^${tx.student.trim()}$`, 'i') },
            { rollNumber: tx.student.trim().toUpperCase() }
          ]
        });
        if (foundStudent) tx.studentRollNumber = foundStudent.rollNumber;
      }
    }
    if (updateData.whoGave !== undefined) tx.whoGave = updateData.whoGave;
    if (updateData.remark !== undefined) tx.remark = updateData.remark;
    if (updateData.receiptImage !== undefined) tx.receiptImage = updateData.receiptImage;
    if (updateData.isVerified !== undefined) tx.isVerified = !!updateData.isVerified;

    await tx.save();
    res.json({ success: true, transaction: formatTx(tx) });
  } catch (err) {
    console.error('Update transaction error:', err);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// PATCH /api/transactions/:id/verify
router.patch('/transactions/:id/verify', async (req, res) => {
  try {
    const customId = req.params.id;
    const tx = await Transaction.findOne({ customId });
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    tx.isVerified = !tx.isVerified;
    await tx.save();
    res.json({ success: true, isVerified: tx.isVerified, transaction: formatTx(tx) });
  } catch (err) {
    console.error('Toggle verify error:', err);
    res.status(500).json({ error: 'Failed to toggle verification' });
  }
});

// DELETE /api/transactions/:id (Soft delete)
router.delete('/transactions/:id', async (req, res) => {
  try {
    const customId = req.params.id;
    const tx = await Transaction.findOne({ customId });
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    tx.isDeleted = true;
    tx.deletedAt = Date.now();
    await tx.save();

    res.json({ success: true, message: 'Moved to recycle bin', transaction: formatTx(tx) });
  } catch (err) {
    console.error('Soft delete error:', err);
    res.status(500).json({ error: 'Failed to move to recycle bin' });
  }
});

// POST /api/transactions/:id/restore
router.post('/transactions/:id/restore', async (req, res) => {
  try {
    const customId = req.params.id;
    const tx = await Transaction.findOne({ customId });
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    tx.isDeleted = false;
    tx.deletedAt = null;
    await tx.save();

    res.json({ success: true, message: 'Transaction restored', transaction: formatTx(tx) });
  } catch (err) {
    console.error('Restore transaction error:', err);
    res.status(500).json({ error: 'Failed to restore transaction' });
  }
});

// DELETE /api/transactions/:id/permanent
router.delete('/transactions/:id/permanent', async (req, res) => {
  try {
    const customId = req.params.id;
    const tx = await Transaction.findOneAndDelete({ customId });
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    res.json({ success: true, message: 'Permanently deleted' });
  } catch (err) {
    console.error('Permanent delete error:', err);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// DELETE /api/transactions/recycle-bin/empty
router.delete('/transactions/recycle-bin/empty', async (req, res) => {
  try {
    const result = await Transaction.deleteMany({ isDeleted: true });
    res.json({ success: true, message: 'Recycle bin emptied', count: result.deletedCount });
  } catch (err) {
    console.error('Empty recycle bin error:', err);
    res.status(500).json({ error: 'Failed to empty recycle bin' });
  }
});

// ================= SETTINGS =================

// GET /api/settings
router.get('/settings', async (req, res) => {
  try {
    const settings = await Setting.find({});
    const config = {};
    settings.forEach(s => {
      config[s.key] = s.value;
    });
    res.json(config);
  } catch (err) {
    console.error('Fetch settings error:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// POST /api/settings
router.post('/settings', async (req, res) => {
  try {
    const updates = req.body;
    for (const [key, val] of Object.entries(updates)) {
      await Setting.findOneAndUpdate(
        { key },
        { key, value: val, updatedAt: new Date() },
        { upsert: true, new: true }
      );
    }
    res.json({ success: true, message: 'Settings saved' });
  } catch (err) {
    console.error('Save settings error:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// ================= MIGRATION FROM LOCALSTORAGE / JSON =================

// POST /api/migrate
router.post('/migrate', async (req, res) => {
  try {
    const { transactions: importedTx, recycleBin: importedBin, students: importedStudents, perHeadBudget } = req.body;
    let studentAddedCount = 0;
    let txImportedCount = 0;

    // 1. Migrate Students
    if (Array.isArray(importedStudents)) {
      for (let i = 0; i < importedStudents.length; i++) {
        const item = importedStudents[i];
        let name = '';
        let roll = '';
        if (typeof item === 'string') {
          name = item.trim();
          roll = `STU${String(i + 1).padStart(3, '0')}`;
        } else if (item && typeof item === 'object') {
          name = (item.name || '').trim();
          roll = (item.rollNumber || `STU${String(i + 1).padStart(3, '0')}`).toUpperCase().trim();
        }

        if (name && name !== 'General') {
          const existing = await Student.findOne({
            $or: [{ name: new RegExp(`^${name}$`, 'i') }, { rollNumber: roll }]
          });
          if (!existing) {
            const defaultPass = `${roll.toLowerCase()}123`;
            const passwordHash = await bcrypt.hash(defaultPass, 10);
            await Student.create({
              name,
              rollNumber: roll,
              passwordHash,
              initialPassword: defaultPass
            });
            studentAddedCount++;
          }
        }
      }
    }

    // 2. Migrate Transactions
    const allImports = [];
    if (Array.isArray(importedTx)) {
      importedTx.forEach(t => allImports.push({ ...t, isDeleted: false }));
    }
    if (Array.isArray(importedBin)) {
      importedBin.forEach(t => allImports.push({ ...t, isDeleted: true }));
    }

    for (const t of allImports) {
      if (!t.amount || !t.type) continue;
      const customId = t.id || `tx_${t.createdAt || Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      
      const existing = await Transaction.findOne({ customId });
      if (!existing) {
        // Also ensure student exists if in income record
        if (t.type === 'income' && t.student && t.student !== 'General') {
          const existingStudent = await Student.findOne({ name: new RegExp(`^${t.student.trim()}$`, 'i') });
          if (!existingStudent) {
            const count = await Student.countDocuments();
            const roll = `STU${String(count + 1).padStart(3, '0')}`;
            const defaultPass = `${roll.toLowerCase()}123`;
            const passwordHash = await bcrypt.hash(defaultPass, 10);
            await Student.create({
              name: t.student.trim(),
              rollNumber: roll,
              passwordHash,
              initialPassword: defaultPass
            });
            studentAddedCount++;
          }
        }

        await Transaction.create({
          customId,
          type: t.type,
          amount: Number(t.amount),
          mode: t.mode || 'gpay',
          date: t.date || '01-01-26',
          description: t.description || '',
          student: t.student || 'General',
          whoGave: t.whoGave || '',
          remark: t.remark || '',
          receiptImage: t.receiptImage || null,
          isVerified: !!t.isVerified,
          isDeleted: !!t.isDeleted,
          deletedAt: t.deletedAt || (t.isDeleted ? Date.now() : null),
          createdAt: t.createdAt || Date.now()
        });
        txImportedCount++;
      }
    }

    // 3. Save perHeadBudget if present
    if (perHeadBudget !== undefined && !isNaN(Number(perHeadBudget))) {
      await Setting.findOneAndUpdate(
        { key: 'perHeadBudget' },
        { key: 'perHeadBudget', value: Number(perHeadBudget) },
        { upsert: true }
      );
    }

    res.json({
      success: true,
      message: `Migration completed: ${txImportedCount} transactions and ${studentAddedCount} new students imported to MongoDB Atlas.`,
      txImportedCount,
      studentAddedCount
    });
  } catch (err) {
    console.error('Migration error:', err);
    res.status(500).json({ error: 'Migration failed: ' + err.message });
  }
});

// POST /api/reset-database
router.post('/reset-database', async (req, res) => {
  try {
    await Transaction.deleteMany({});
    await Student.deleteMany({});
    await Setting.deleteMany({});
    res.json({ success: true, message: 'All transactions, students, and settings wiped successfully.' });
  } catch (err) {
    console.error('Factory reset error:', err);
    res.status(500).json({ error: 'Failed to reset database' });
  }
});

module.exports = router;
