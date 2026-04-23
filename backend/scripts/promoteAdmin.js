// Usage: node scripts/promoteAdmin.js <email>
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

(async () => {
  const email = (process.argv[2] || '').trim().toLowerCase();
  if (!email) {
    console.error('Usage: node scripts/promoteAdmin.js <email>');
    process.exit(1);
  }
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI missing in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne({ email });
  if (!user) {
    console.error(`No user with email ${email}`);
    process.exit(2);
  }

  user.role = 'admin';
  await user.save();
  console.log(`✓ ${email} is now an admin`);
  await mongoose.disconnect();
})();
