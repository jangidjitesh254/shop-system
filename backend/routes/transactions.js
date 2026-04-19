const express = require('express');
const asyncHandler = require('express-async-handler');
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET /api/transactions
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { type, from, to, productId } = req.query;
    const query = { user: req.user._id };
    if (type) query.type = type;
    if (productId) query.product = productId;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }
    const txs = await Transaction.find(query)
      .populate('product', 'name sku unit')
      .sort({ createdAt: -1 });
    res.json(txs);
  })
);

// POST /api/transactions
// Used for IMPORT (purchase / stock-in). For sales, use /api/bills which creates exports.
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { type, productId, quantity, pricePerUnit, party, note } = req.body;

    if (!['import', 'export'].includes(type)) {
      res.status(400);
      throw new Error('Type must be import or export');
    }

    const product = await Product.findOne({ _id: productId, user: req.user._id });
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    const qty = Number(quantity);
    const price = Number(pricePerUnit);
    if (!qty || qty < 1) {
      res.status(400);
      throw new Error('Invalid quantity');
    }

    if (type === 'export' && product.stock < qty) {
      res.status(400);
      throw new Error(`Insufficient stock. Available: ${product.stock}`);
    }

    // Update stock
    product.stock += type === 'import' ? qty : -qty;
    await product.save();

    const tx = await Transaction.create({
      user: req.user._id,
      type,
      product: product._id,
      productName: product.name,
      quantity: qty,
      pricePerUnit: price,
      totalAmount: qty * price,
      party: party || '',
      note: note || '',
    });

    res.status(201).json(tx);
  })
);

module.exports = router;
