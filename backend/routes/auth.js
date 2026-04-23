const express = require('express');
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const publicUser = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  shopName: u.shopName,
  shopAddress: u.shopAddress,
  phone: u.phone,
  role: u.role || 'owner',
  isActive: u.isActive !== false,
  token: generateToken(u._id),
});

// POST /api/auth/register
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { name, email, password, shopName, shopAddress, phone } = req.body;
    if (!name || !email || !password || !shopName) {
      res.status(400);
      throw new Error('Name, email, password and shop name are required');
    }
    const exists = await User.findOne({ email });
    if (exists) {
      res.status(400);
      throw new Error('User already exists');
    }
    const user = await User.create({
      name,
      email,
      password,
      shopName,
      shopAddress,
      phone,
      role: 'owner',
    });
    user.lastLoginAt = new Date();
    await user.save();
    res.status(201).json(publicUser(user));
  })
);

// POST /api/auth/login
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      res.status(401);
      throw new Error('Invalid email or password');
    }
    if (user.isActive === false) {
      res.status(403);
      throw new Error('Your account has been disabled. Contact the admin.');
    }
    user.lastLoginAt = new Date();
    await user.save();
    res.json(publicUser(user));
  })
);

// GET /api/auth/me
router.get(
  '/me',
  protect,
  asyncHandler(async (req, res) => {
    res.json(req.user);
  })
);

module.exports = router;
