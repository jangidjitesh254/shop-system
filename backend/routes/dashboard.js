const express = require('express');
const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const Bill = require('../models/Bill');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET /api/dashboard/stats
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const [products, lowStockProducts, todayBills, monthBills] = await Promise.all([
      Product.find({ user: userId }),
      Product.find({ user: userId, $expr: { $lte: ['$stock', '$lowStockAlert'] } }),
      Bill.find({
        user: userId,
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
      Bill.find({
        user: userId,
        createdAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      }),
    ]);

    const totalProducts = products.length;
    const totalStockValue = products.reduce((s, p) => s + p.stock * p.costPrice, 0);
    const totalSellingValue = products.reduce((s, p) => s + p.stock * p.sellingPrice, 0);
    const todayRevenue = todayBills.reduce((s, b) => s + b.totalAmount, 0);
    const monthRevenue = monthBills.reduce((s, b) => s + b.totalAmount, 0);

    // Recent bills (last 5)
    const recentBills = await Bill.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5);

    // Sales over last 7 days for chart
    const salesByDay = [];
    for (let i = 6; i >= 0; i--) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - i);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const dayBills = await Bill.find({
        user: userId,
        createdAt: { $gte: start, $lt: end },
      });
      salesByDay.push({
        date: start.toISOString().slice(0, 10),
        total: dayBills.reduce((s, b) => s + b.totalAmount, 0),
        count: dayBills.length,
      });
    }

    res.json({
      totalProducts,
      lowStockCount: lowStockProducts.length,
      lowStockProducts: lowStockProducts.slice(0, 5),
      totalStockValue,
      totalSellingValue,
      todayRevenue,
      todayBillCount: todayBills.length,
      monthRevenue,
      monthBillCount: monthBills.length,
      recentBills,
      salesByDay,
    });
  })
);

module.exports = router;
