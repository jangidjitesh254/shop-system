const express = require('express');
const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET /api/products - list with optional search, category, lowStock filter
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { search, category, lowStock } = req.query;
    const query = { user: req.user._id };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }
    if (category && category !== 'all') query.category = category;

    let products = await Product.find(query).sort({ createdAt: -1 });
    if (lowStock === 'true') {
      products = products.filter((p) => p.stock <= p.lowStockAlert);
    }
    res.json(products);
  })
);

// GET /api/products/categories
router.get(
  '/categories',
  asyncHandler(async (req, res) => {
    const cats = await Product.distinct('category', { user: req.user._id });
    res.json(cats);
  })
);

// GET /api/products/barcode/:code - look up a product by its barcode
// Must be registered before the /:id route so Express doesn't treat "barcode" as an id
router.get(
  '/barcode/:code',
  asyncHandler(async (req, res) => {
    const code = (req.params.code || '').trim();
    if (!code) {
      res.status(400);
      throw new Error('Barcode required');
    }
    const product = await Product.findOne({ user: req.user._id, barcode: code });
    if (!product) {
      res.status(404);
      throw new Error('No product with that barcode');
    }
    res.json(product);
  })
);

// GET /api/products/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const product = await Product.findOne({ _id: req.params.id, user: req.user._id });
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }
    res.json(product);
  })
);

// POST /api/products
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = { ...req.body, user: req.user._id };
    const product = await Product.create(data);
    res.status(201).json(product);
  })
);

// PUT /api/products/:id
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }
    res.json(product);
  })
);

// DELETE /api/products/:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }
    res.json({ message: 'Product deleted' });
  })
);

module.exports = router;
