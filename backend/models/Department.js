const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a department name'],
    unique: true,
    trim: true
  },
  head: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  engineerAssigned: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  totalEquipment: {
    type: Number,
    default: 0
  },
  workingEquipment: {
    type: Number,
    default: 0
  },
  maintenanceEquipment: {
    type: Number,
    default: 0
  },
  contact: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Department', DepartmentSchema);
