const express = require('express');
const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const Bill = require('../models/Bill');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// Compute revenue + cost basis for a set of bills using current product costPrice.
// Returns { revenue, cost, profit, profitPct }.
const computeProfitForBills = async (userId, bills) => {
  const revenue = bills.reduce((s, b) => s + (b.totalAmount || 0), 0);

  // Gather product IDs referenced in these bills
  const productIds = new Set();
  bills.forEach((b) =>
    b.items?.forEach((i) => {
      if (i.product) productIds.add(String(i.product));
    })
  );

  // Fetch their current cost prices
  const products = await Product.find({
    _id: { $in: Array.from(productIds) },
    user: userId,
  }).select('_id costPrice');
  const costMap = new Map(products.map((p) => [String(p._id), p.costPrice || 0]));

  // Cost basis = sum of (costPrice * quantity) across all items
  let cost = 0;
  bills.forEach((b) => {
    b.items?.forEach((i) => {
      const cp = costMap.get(String(i.product)) || 0;
      cost += cp * (i.quantity || 0);
    });
  });

  const profit = revenue - cost;
  const profitPct = revenue > 0 ? (profit / revenue) * 100 : 0;
  return { revenue, cost, profit, profitPct };
};

// GET /api/dashboard/stats
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [products, lowStockProducts, todayBills, monthBills] = await Promise.all([
      Product.find({ user: userId }),
      Product.find({ user: userId, $expr: { $lte: ['$stock', '$lowStockAlert'] } }),
      Bill.find({ user: userId, createdAt: { $gte: todayStart } }),
      Bill.find({ user: userId, createdAt: { $gte: monthStart } }),
    ]);

    const totalProducts = products.length;
    const totalStockValue = products.reduce(
      (s, p) => s + p.stock * p.costPrice,
      0
    );
    const totalSellingValue = products.reduce(
      (s, p) => s + p.stock * p.sellingPrice,
      0
    );
    const todayRevenue = todayBills.reduce((s, b) => s + b.totalAmount, 0);
    const monthRevenue = monthBills.reduce((s, b) => s + b.totalAmount, 0);

    // Stock-in totals (import transactions)
    const [todayStockInAgg, monthStockInAgg] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            user: userId,
            type: 'import',
            createdAt: { $gte: todayStart },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' },
            count: { $sum: 1 },
          },
        },
      ]),
      Transaction.aggregate([
        {
          $match: {
            user: userId,
            type: 'import',
            createdAt: { $gte: monthStart },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const todayStockIn = todayStockInAgg[0]?.total || 0;
    const todayStockInCount = todayStockInAgg[0]?.count || 0;
    const monthStockIn = monthStockInAgg[0]?.total || 0;
    const monthStockInCount = monthStockInAgg[0]?.count || 0;

    // Profit (today / month) based on current product costPrice
    const todayProfitStats = await computeProfitForBills(userId, todayBills);
    const monthProfitStats = await computeProfitForBills(userId, monthBills);

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
      // Stock-in
      todayStockIn,
      todayStockInCount,
      monthStockIn,
      monthStockInCount,
      // Profit
      todayProfit: todayProfitStats.profit,
      todayProfitPct: todayProfitStats.profitPct,
      todayCost: todayProfitStats.cost,
      monthProfit: monthProfitStats.profit,
      monthProfitPct: monthProfitStats.profitPct,
      monthCost: monthProfitStats.cost,
      recentBills,
      salesByDay,
    });
  })
);

module.exports = router;
