require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const bootstrapAdmin = require('./utils/bootstrapAdmin');

const app = express();

// Connect DB, then bootstrap admin if configured
(async () => {
  await connectDB();
  await bootstrapAdmin();
})();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => res.json({ message: 'Shop System API is running' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/bills', require('./routes/bills'));
app.use('/api/credit', require('./routes/credit'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/admin', require('./routes/admin'));

// Error handlers
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () =>
  console.log(`✓ Server running on 0.0.0.0:${PORT} (${process.env.NODE_ENV || 'development'})`)
);
