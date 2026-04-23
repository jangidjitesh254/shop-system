const User = require('../models/User');

/**
 * On server startup, auto-promote the user whose email matches
 * process.env.ADMIN_EMAIL to role 'admin'. Creates nothing — you must
 * have registered that email first.
 */
async function bootstrapAdmin() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (!email) return;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log(
        `[bootstrapAdmin] ADMIN_EMAIL=${email} is set but no user with that email exists yet. Register first.`
      );
      return;
    }
    if (user.role === 'admin') return;
    user.role = 'admin';
    await user.save();
    console.log(`[bootstrapAdmin] Promoted ${email} to admin`);
  } catch (err) {
    console.warn('[bootstrapAdmin] failed:', err.message);
  }
}

module.exports = bootstrapAdmin;
