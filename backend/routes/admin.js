const express = require('express');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Bill = require('../models/Bill');
const Transaction = require('../models/Transaction');
const { protect, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(protect, requireAdmin);

// GET /api/admin/overview — platform-wide stats
router.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      totalShopkeepers,
      activeShopkeepers,
      totalProducts,
      totalBills,
      todayBills,
      monthBills,
      recentSignups,
    ] = await Promise.all([
      User.countDocuments({ role: 'owner' }),
      User.countDocuments({ role: 'owner', isActive: true }),
      Product.countDocuments({}),
      Bill.countDocuments({}),
      Bill.find({ createdAt: { $gte: todayStart } }).select('totalAmount'),
      Bill.find({ createdAt: { $gte: monthStart } }).select('totalAmount'),
      User.find({ role: 'owner' })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name email shopName createdAt isActive'),
    ]);

    const todayRevenue = todayBills.reduce(
      (s, b) => s + (b.totalAmount || 0),
      0
    );
    const monthRevenue = monthBills.reduce(
      (s, b) => s + (b.totalAmount || 0),
      0
    );

    // Top 5 shops by total revenue (this month)
    const topShops = await Bill.aggregate([
      { $match: { createdAt: { $gte: monthStart } } },
      {
        $group: {
          _id: '$user',
          revenue: { $sum: '$totalAmount' },
          billCount: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 1,
          revenue: 1,
          billCount: 1,
          name: '$user.name',
          shopName: '$user.shopName',
          email: '$user.email',
        },
      },
    ]);

    res.json({
      totalShopkeepers,
      activeShopkeepers,
      inactiveShopkeepers: totalShopkeepers - activeShopkeepers,
      totalProducts,
      totalBills,
      todayBillCount: todayBills.length,
      monthBillCount: monthBills.length,
      todayRevenue,
      monthRevenue,
      recentSignups,
      topShops,
    });
  })
);

// GET /api/admin/shopkeepers — list with stats
router.get(
  '/shopkeepers',
  asyncHandler(async (req, res) => {
    const { search } = req.query;
    const match = { role: 'owner' };
    if (search) {
      match.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { shopName: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(match)
      .sort({ createdAt: -1 })
      .select('-password')
      .lean();

    // Augment with counts
    const userIds = users.map((u) => u._id);
    const [billAgg, productAgg] = await Promise.all([
      Bill.aggregate([
        { $match: { user: { $in: userIds } } },
        {
          $group: {
            _id: '$user',
            billCount: { $sum: 1 },
            revenue: { $sum: '$totalAmount' },
            lastBillAt: { $max: '$createdAt' },
          },
        },
      ]),
      Product.aggregate([
        { $match: { user: { $in: userIds } } },
        { $group: { _id: '$user', productCount: { $sum: 1 } } },
      ]),
    ]);

    const billMap = new Map(billAgg.map((b) => [String(b._id), b]));
    const prodMap = new Map(productAgg.map((p) => [String(p._id), p]));

    const enriched = users.map((u) => {
      const b = billMap.get(String(u._id)) || {};
      const p = prodMap.get(String(u._id)) || {};
      return {
        ...u,
        billCount: b.billCount || 0,
        revenue: b.revenue || 0,
        lastBillAt: b.lastBillAt || null,
        productCount: p.productCount || 0,
      };
    });

    res.json(enriched);
  })
);

// GET /api/admin/shopkeepers/:id — detail + their data
router.get(
  '/shopkeepers/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error('Invalid id');
    }
    const user = await User.findById(id).select('-password');
    if (!user || user.role !== 'owner') {
      res.status(404);
      throw new Error('Shopkeeper not found');
    }

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      productCount,
      lowStockProducts,
      billCount,
      monthRevenueAgg,
      totalRevenueAgg,
      recentBills,
      creditOutstandingAgg,
    ] = await Promise.all([
      Product.countDocuments({ user: id }),
      Product.find({
        user: id,
        $expr: { $lte: ['$stock', '$lowStockAlert'] },
      })
        .limit(10)
        .select('name sku stock unit lowStockAlert'),
      Bill.countDocuments({ user: id }),
      Bill.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(id), createdAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Bill.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(id) } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Bill.find({ user: id })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('billNumber customerName totalAmount paymentMethod paymentStatus createdAt'),
      Bill.aggregate([
        {
          $match: {
            user: new mongoose.Types.ObjectId(id),
            paymentMethod: 'credit',
            paymentStatus: 'unpaid',
          },
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      user,
      stats: {
        productCount,
        billCount,
        totalRevenue: totalRevenueAgg[0]?.total || 0,
        monthRevenue: monthRevenueAgg[0]?.total || 0,
        creditOutstanding: creditOutstandingAgg[0]?.total || 0,
        creditUnpaidCount: creditOutstandingAgg[0]?.count || 0,
        lowStockCount: lowStockProducts.length,
      },
      lowStockProducts,
      recentBills,
    });
  })
);

// PATCH /api/admin/shopkeepers/:id — toggle active / update basic info
router.patch(
  '/shopkeepers/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error('Invalid id');
    }
    const allowed = ['isActive', 'name', 'shopName', 'shopAddress', 'phone'];
    const patch = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) patch[k] = req.body[k];
    }
    const user = await User.findOneAndUpdate(
      { _id: id, role: 'owner' },
      patch,
      { new: true, runValidators: true }
    ).select('-password');
    if (!user) {
      res.status(404);
      throw new Error('Shopkeeper not found');
    }
    res.json(user);
  })
);

// DELETE /api/admin/shopkeepers/:id — hard delete the user AND all their data
router.delete(
  '/shopkeepers/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error('Invalid id');
    }
    const user = await User.findOne({ _id: id, role: 'owner' });
    if (!user) {
      res.status(404);
      throw new Error('Shopkeeper not found');
    }
    await Promise.all([
      Product.deleteMany({ user: id }),
      Bill.deleteMany({ user: id }),
      Transaction.deleteMany({ user: id }),
    ]);
    await user.deleteOne();
    res.json({ message: 'Shopkeeper and all their data removed' });
  })
);

// GET /api/admin/shopkeepers/:id/bills — pagination-lite
router.get(
  '/shopkeepers/:id/bills',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const bills = await Bill.find({ user: id })
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json(bills);
  })
);

// GET /api/admin/shopkeepers/:id/products
router.get(
  '/shopkeepers/:id/products',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const products = await Product.find({ user: id }).sort({ createdAt: -1 });
    res.json(products);
  })
);

module.exports = router;
