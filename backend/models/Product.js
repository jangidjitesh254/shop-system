const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true }, // unique within a user
    barcode: { type: String, default: '', trim: true, index: true }, // EAN/UPC barcode
    category: { type: String, default: 'General', trim: true },
    unit: { type: String, default: 'pcs' }, // pcs, kg, l, etc.
    costPrice: { type: Number, required: true, min: 0 }, // price you bought at
    sellingPrice: { type: Number, required: true, min: 0 }, // price you sell at
    stock: { type: Number, default: 0, min: 0 },
    lowStockAlert: { type: Number, default: 5 },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

// SKU must be unique per user (a shop)
productSchema.index({ user: 1, sku: 1 }, { unique: true });
// Barcode lookup index — partial so multiple products can have empty barcode
productSchema.index(
  { user: 1, barcode: 1 },
  { unique: true, partialFilterExpression: { barcode: { $type: 'string', $ne: '' } } }
);

module.exports = mongoose.model('Product', productSchema);
