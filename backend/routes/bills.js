const express = require('express');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Bill = require('../models/Bill');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// Generate next bill number for this user
const nextBillNumber = async (userId) => {
  const last = await Bill.findOne({ user: userId }).sort({ createdAt: -1 });
  let n = 1;
  if (last && last.billNumber) {
    const match = last.billNumber.match(/(\d+)$/);
    if (match) n = parseInt(match[1], 10) + 1;
  }
  return `INV-${String(n).padStart(6, '0')}`;
};

// GET /api/bills
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { from, to, search } = req.query;
    const query = { user: req.user._id };
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }
    if (search) {
      query.$or = [
        { billNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
      ];
    }
    const bills = await Bill.find(query).sort({ createdAt: -1 });
    res.json(bills);
  })
);

// GET /api/bills/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const bill = await Bill.findOne({ _id: req.params.id, user: req.user._id });
    if (!bill) {
      res.status(404);
      throw new Error('Bill not found');
    }
    res.json(bill);
  })
);

// POST /api/bills
// Body: { customerName, customerPhone, items: [{productId, quantity}], taxPercent, discount, paymentMethod }
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const {
      customerName,
      customerPhone,
      items,
      taxPercent = 0,
      discount = 0,
      paymentMethod = 'cash',
      paymentStatus: paymentStatusIn,
      creditDays,
      creditReminderDays,
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400);
      throw new Error('At least one item is required');
    }

    // Credit purchases require a real customer name
    if (paymentMethod === 'credit') {
      const trimmed = (customerName || '').trim();
      if (!trimmed || /^walk[- ]?in/i.test(trimmed)) {
        res.status(400);
        throw new Error('Customer name is required for credit (udhaar) sales');
      }
    }

    // Fetch all products and validate stock
    const productIds = items.map((i) => i.productId);
    const products = await Product.find({
      _id: { $in: productIds },
      user: req.user._id,
    });
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    const billItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        res.status(404);
        throw new Error(`Product not found: ${item.productId}`);
      }
      const qty = Number(item.quantity);
      if (!qty || qty < 1) {
        res.status(400);
        throw new Error(`Invalid quantity for ${product.name}`);
      }
      if (product.stock < qty) {
        res.status(400);
        throw new Error(
          `Insufficient stock for ${product.name}. Available: ${product.stock}`
        );
      }
      const price = item.pricePerUnit != null ? Number(item.pricePerUnit) : product.sellingPrice;
      const lineSubtotal = qty * price;
      subtotal += lineSubtotal;
      billItems.push({
        product: product._id,
        name: product.name,
        sku: product.sku,
        quantity: qty,
        pricePerUnit: price,
        subtotal: lineSubtotal,
      });
    }

    const taxAmount = (subtotal * Number(taxPercent)) / 100;
    const totalAmount = subtotal + taxAmount - Number(discount);

    const billNumber = await nextBillNumber(req.user._id);

    // Compute credit fields if applicable
    const isCredit = paymentMethod === 'credit';
    const days = Math.max(1, Number(creditDays) || 7);
    const remind = Math.max(0, Number(creditReminderDays) || 2);
    const dueDate = isCredit
      ? new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      : null;

    const paymentStatus = isCredit ? 'unpaid' : paymentStatusIn || 'paid';

    const bill = await Bill.create({
      user: req.user._id,
      billNumber,
      customerName: customerName || 'Walk-in Customer',
      customerPhone: customerPhone || '',
      items: billItems,
      subtotal,
      taxPercent: Number(taxPercent),
      taxAmount,
      discount: Number(discount),
      totalAmount,
      paymentMethod,
      paymentStatus,
      creditDueDate: dueDate,
      creditReminderDays: isCredit ? remind : 2,
      creditPaidAt: null,
    });

    // Decrement stock and create export transactions
    for (const item of billItems) {
      const product = productMap.get(item.product.toString());
      product.stock -= item.quantity;
      await product.save();

      await Transaction.create({
        user: req.user._id,
        type: 'export',
        product: product._id,
        productName: product.name,
        quantity: item.quantity,
        pricePerUnit: item.pricePerUnit,
        totalAmount: item.subtotal,
        party: bill.customerName,
        bill: bill._id,
      });
    }

    res.status(201).json(bill);
  })
);

// DELETE /api/bills/:id - delete bill and restore stock
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const bill = await Bill.findOne({ _id: req.params.id, user: req.user._id });
    if (!bill) {
      res.status(404);
      throw new Error('Bill not found');
    }
    // Restore stock
    for (const item of bill.items) {
      await Product.findOneAndUpdate(
        { _id: item.product, user: req.user._id },
        { $inc: { stock: item.quantity } }
      );
    }
    await Transaction.deleteMany({ bill: bill._id });
    await bill.deleteOne();
    res.json({ message: 'Bill deleted and stock restored' });
  })
);

module.exports = router;
