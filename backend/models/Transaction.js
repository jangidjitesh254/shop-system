const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['import', 'export'], required: true },
    // 'import' = stock-in (purchases from supplier)
    // 'export' = stock-out (sales / outgoing)
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true }, // snapshot
    quantity: { type: Number, required: true, min: 0.001 },
    pricePerUnit: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    party: { type: String, default: '' }, // supplier or customer name
    note: { type: String, default: '' },
    bill: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill' }, // linked bill for exports
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
