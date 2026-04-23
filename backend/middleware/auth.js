const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        res.status(401);
        throw new Error('User no longer exists');
      }
      if (req.user.isActive === false) {
        res.status(403);
        throw new Error('Account disabled');
      }
      return next();
    } catch (err) {
      res.status(res.statusCode === 200 ? 401 : res.statusCode);
      throw new Error(err.message || 'Not authorized, token invalid');
    }
  }
  res.status(401);
  throw new Error('Not authorized, no token');
});

const requireAdmin = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Admin access required');
  }
  next();
});

module.exports = { protect, requireAdmin };
