const mongoose = require('mongoose');

const DisposalRecordSchema = new mongoose.Schema({
  equipment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipment',
    required: true
  },
  disposalDate: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  disposalMethod: {
    type: String,
    required: true,
    trim: true
  },
  scrapValue: {
    type: Number,
    default: 0
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  disposalCertificate: {
    type: String,
    default: ''
  },
  remarks: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DisposalRecord', DisposalRecordSchema);
