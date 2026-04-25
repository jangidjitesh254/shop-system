const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    sku: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 0.001 },
    pricePerUnit: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const billSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    billNumber: { type: String, required: true }, // auto-generated, e.g., INV-000123
    customerName: { type: String, default: 'Walk-in Customer' },
    customerPhone: { type: String, default: '' },
    items: [billItemSchema],
    subtotal: { type: Number, required: true, min: 0 },
    taxPercent: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi', 'credit', 'other'],
      default: 'cash',
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'unpaid', 'partial'],
      default: 'paid',
    },
    // Credit / Udhaar fields — only populated when paymentMethod === 'credit'
    creditDueDate: { type: Date, default: null, index: true },
    creditReminderDays: { type: Number, default: 2 },
    creditPaidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

billSchema.index({ user: 1, billNumber: 1 }, { unique: true });
billSchema.index({ user: 1, paymentMethod: 1, paymentStatus: 1 });

module.exports = mongoose.model('Bill', billSchema);
