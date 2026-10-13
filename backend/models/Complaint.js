const mongoose = require('mongoose');

const ComplaintSchema = new mongoose.Schema({
  complaintId: {
    type: String,
    unique: true
  },
  equipment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipment',
    required: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  raisedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  issueDescription: {
    type: String,
    required: [true, 'Please add an issue description'],
    trim: true
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  imageUpload: {
    type: String,
    default: ''
  },
  additionalNotes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['Open', 'Assigned', 'Accepted', 'In Progress', 'Waiting for Parts', 'Completed', 'Closed', 'Cancelled'],
    default: 'Open'
  },
  assignedEngineer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  updates: [
    {
      status: { type: String, required: true },
      note: { type: String, trim: true },
      timestamp: { type: Date, default: Date.now },
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }
  ]
}, {
  timestamps: true
});

// Auto-generate sequential Complaint ID (e.g., CP-2026-00001)
ComplaintSchema.pre('save', async function(next) {
  if (!this.isNew) {
    return next();
  }

  const year = new Date().getFullYear();
  const prefix = `CP-${year}-`;
  
  try {
    const lastComplaint = await this.constructor.findOne({
      complaintId: new RegExp(`^${prefix}`)
    }).sort({ complaintId: -1 });

    let count = 0;
    if (lastComplaint && lastComplaint.complaintId) {
      const parts = lastComplaint.complaintId.split('-');
      const sequence = parseInt(parts[2], 10);
      if (!isNaN(sequence)) {
        count = sequence;
      }
    }

    const nextSeq = String(count + 1).padStart(5, '0');
    this.complaintId = `${prefix}${nextSeq}`;
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Complaint', ComplaintSchema);
