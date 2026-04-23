const express = require('express');
const asyncHandler = require('express-async-handler');
const Bill = require('../models/Bill');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// Helper: normalise name for deduplication
const normalize = (s) => (s || '').trim().toLowerCase();

// GET /api/credit/suggestions?q=raj
// Autocomplete for credit-customer names from this user's bills
router.get(
  '/suggestions',
  asyncHandler(async (req, res) => {
    const q = (req.query.q || '').trim();
    const match = { user: req.user._id, paymentMethod: 'credit' };
    if (q) match.customerName = { $regex: q, $options: 'i' };

    const rows = await Bill.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $toLower: { $trim: { input: '$customerName' } } },
          name: { $last: '$customerName' },
          phone: { $last: '$customerPhone' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1, name: 1 } },
      { $limit: 8 },
    ]);

    res.json(
      rows.map((r) => ({ name: r.name, phone: r.phone, count: r.count }))
    );
  })
);

// GET /api/credit/customers
// All unique credit customers with: total outstanding, total bills, nearest due
router.get(
  '/customers',
  asyncHandler(async (req, res) => {
    const rows = await Bill.aggregate([
      {
        $match: {
          user: req.user._id,
          paymentMethod: 'credit',
        },
      },
      {
        $group: {
          _id: { $toLower: { $trim: { input: '$customerName' } } },
          name: { $last: '$customerName' },
          phone: { $last: '$customerPhone' },
          totalBills: { $sum: 1 },
          outstanding: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'unpaid'] }, '$totalAmount', 0],
            },
          },
          paidAmount: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0],
            },
          },
          unpaidBills: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'unpaid'] }, 1, 0],
            },
          },
          nearestDue: {
            $min: {
              $cond: [
                { $eq: ['$paymentStatus', 'unpaid'] },
                '$creditDueDate',
                null,
              ],
            },
          },
          oldestBillDate: { $min: '$createdAt' },
        },
      },
      { $sort: { outstanding: -1, nearestDue: 1 } },
    ]);

    res.json(rows.map(({ _id, ...rest }) => rest));
  })
);

// GET /api/credit/customers/:name — all credit bills for a given customer
router.get(
  '/customers/:name',
  asyncHandler(async (req, res) => {
    const name = decodeURIComponent(req.params.name || '').trim();
    if (!name) {
      res.status(400);
      throw new Error('Customer name required');
    }
    const bills = await Bill.find({
      user: req.user._id,
      paymentMethod: 'credit',
      customerName: { $regex: `^${name}$`, $options: 'i' },
    }).sort({ createdAt: -1 });

    res.json(bills);
  })
);

// POST /api/credit/bills/:id/settle — mark credit bill as paid
router.post(
  '/bills/:id/settle',
  asyncHandler(async (req, res) => {
    const bill = await Bill.findOne({
      _id: req.params.id,
      user: req.user._id,
      paymentMethod: 'credit',
    });
    if (!bill) {
      res.status(404);
      throw new Error('Credit bill not found');
    }
    bill.paymentStatus = 'paid';
    bill.creditPaidAt = new Date();
    await bill.save();
    res.json(bill);
  })
);

// GET /api/credit/reminders — unpaid bills within their reminder window
router.get(
  '/reminders',
  asyncHandler(async (req, res) => {
    const now = new Date();
    const bills = await Bill.find({
      user: req.user._id,
      paymentMethod: 'credit',
      paymentStatus: 'unpaid',
      creditDueDate: { $ne: null },
    }).sort({ creditDueDate: 1 });

    const filtered = bills.filter((b) => {
      if (!b.creditDueDate) return false;
      const due = new Date(b.creditDueDate);
      const remindFrom = new Date(
        due.getTime() - (b.creditReminderDays || 0) * 24 * 60 * 60 * 1000
      );
      return now >= remindFrom;
    });

    res.json(
      filtered.map((b) => ({
        _id: b._id,
        billNumber: b.billNumber,
        customerName: b.customerName,
        customerPhone: b.customerPhone,
        totalAmount: b.totalAmount,
        creditDueDate: b.creditDueDate,
        daysRemaining: Math.ceil(
          (new Date(b.creditDueDate).getTime() - now.getTime()) /
            (24 * 60 * 60 * 1000)
        ),
        overdue: new Date(b.creditDueDate).getTime() < now.getTime(),
      }))
    );
  })
);

module.exports = router;
