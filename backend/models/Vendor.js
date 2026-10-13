const mongoose = require('mongoose');

const VendorSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: [true, 'Please add a company name'],
    trim: true,
    unique: true
  },
  contactPerson: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  gstNumber: {
    type: String,
    trim: true
  },
  specialization: {
    type: String,
    trim: true
  },
  contractStart: {
    type: Date
  },
  contractEnd: {
    type: Date
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 5
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Vendor', VendorSchema);
