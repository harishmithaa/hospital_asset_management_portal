const mongoose = require('mongoose');

const AssetTransferSchema = new mongoose.Schema({
  equipment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipment',
    required: true
  },
  previousDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  newDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  transferDate: {
    type: Date,
    default: Date.now
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  currentLocation: {
    building: { type: String, trim: true },
    roomNumber: { type: String, trim: true }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AssetTransfer', AssetTransferSchema);
