const mongoose = require('mongoose');

const AMCSchema = new mongoose.Schema({
  equipment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipment',
    required: true
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  cost: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Active', 'Expired', 'Renewal Due'],
    default: 'Active'
  },
  contractDocument: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AMC', AMCSchema);
