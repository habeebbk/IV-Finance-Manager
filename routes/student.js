const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Transaction = require('../models/Transaction');
const Setting = require('../models/Setting');
const { requireStudent } = require('../middleware/auth');

router.use(requireStudent);

// GET /api/student/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const studentUser = req.session.user;
    let student = null;
    if (studentUser.id) student = await Student.findById(studentUser.id);
    if (!student && studentUser.rollNumber) student = await Student.findOne({ rollNumber: studentUser.rollNumber });
    if (!student) {
      return res.status(404).json({ error: 'Student record not found' });
    }

    // Get perHeadBudget and fee breakdown from settings
    const budgetSetting = await Setting.findOne({ key: 'perHeadBudget' });
    const packageSetting = await Setting.findOne({ key: 'packageFee' });
    const trainSetting = await Setting.findOne({ key: 'trainTicketFee' });

    const perHeadBudget = budgetSetting && !isNaN(Number(budgetSetting.value)) ? Number(budgetSetting.value) : 15000;
    const packageFee = packageSetting && !isNaN(Number(packageSetting.value)) ? Number(packageSetting.value) : 12500;
    const trainTicketFee = trainSetting && !isNaN(Number(trainSetting.value)) ? Number(trainSetting.value) : 2500;

    // Find student's income payments
    const payments = await Transaction.find({
      type: 'income',
      isDeleted: false,
      $or: [
        { studentRollNumber: student.rollNumber },
        { student: new RegExp(`^${student.name.trim()}$`, 'i') }
      ]
    }).sort({ createdAt: -1 });

    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const verifiedPaid = payments.filter(p => p.isVerified).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const remainingBalance = perHeadBudget > 0 ? Math.max(0, perHeadBudget - totalPaid) : 0;
    const progressPercent = perHeadBudget > 0 ? Math.min(100, (totalPaid / perHeadBudget) * 100).toFixed(1) : 0;

    res.json({
      student: {
        id: student._id,
        rollNumber: student.rollNumber,
        name: student.name
      },
      financialSummary: {
        totalPaid,
        verifiedPaid,
        perHeadBudget,
        packageFee,
        trainTicketFee,
        remainingBalance,
        progressPercent: Number(progressPercent),
        isBudgetMet: perHeadBudget > 0 && totalPaid >= perHeadBudget
      },
      payments: payments.map(p => ({
        id: p.customId,
        date: p.date,
        amount: p.amount,
        mode: p.mode,
        description: p.description,
        remark: p.remark,
        receiptImage: p.receiptImage,
        isVerified: p.isVerified,
        createdAt: p.createdAt
      }))
    });
  } catch (err) {
    console.error('Student dashboard error:', err);
    res.status(500).json({ error: 'Failed to retrieve student dashboard' });
  }
});

module.exports = router;
