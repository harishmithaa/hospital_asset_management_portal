const mongoose = require('mongoose');

const CalibrationSchema = new mongoose.Schema({
  equipment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipment',
    required: true
  },
  calibrationDate: {
    type: Date,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  engineer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    default: null
  },
  certificateUpload: {
    type: String,
    default: ''
  },
  result: {
    type: String,
    enum: ['Pass', 'Fail'],
    default: 'Pass'
  },
  observations: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Overdue', 'Cancelled'],
    default: 'Pending'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Calibration', CalibrationSchema);
