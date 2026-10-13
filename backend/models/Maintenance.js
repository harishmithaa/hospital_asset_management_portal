const mongoose = require('mongoose');

const MaintenanceSchema = new mongoose.Schema({
  equipment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipment',
    required: true
  },
  type: {
    type: String,
    enum: ['Preventive', 'Corrective', 'Emergency', 'Routine'],
    required: true
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  completedDate: {
    type: Date,
    default: null
  },
  cost: {
    type: Number,
    default: 0
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
  // Linked complaint (for corrective maintenance)
  complaint: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint',
    default: null
  },
  workDescription: {
    type: String,
    trim: true,
    default: ''
  },
  partsReplaced: {
    type: String,
    trim: true,
    default: ''
  },
  remarks: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['Scheduled', 'In Progress', 'Completed', 'Overdue', 'Cancelled'],
    default: 'Scheduled'
  },
  reportPath: {
    type: String,
    default: ''
  },
  nextServiceDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Maintenance', MaintenanceSchema);
