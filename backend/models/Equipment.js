const mongoose = require('mongoose');

const EquipmentSchema = new mongoose.Schema({
  equipmentId: {
    type: String,
    unique: true
  },
  name: {
    type: String,
    required: [true, 'Please add equipment name'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Please add category'],
    trim: true
  },
  manufacturer: {
    type: String,
    trim: true
  },
  modelNumber: {
    type: String,
    trim: true
  },
  serialNumber: {
    type: String,
    trim: true
  },
  purchaseDate: {
    type: Date
  },
  installationDate: {
    type: Date
  },
  purchaseCost: {
    type: Number,
    default: 0
  },
  usefulLife: {
    type: Number // in years
  },
  warrantyStart: {
    type: Date
  },
  warrantyEnd: {
    type: Date
  },
  amcStart: {
    type: Date
  },
  amcEnd: {
    type: Date
  },
  supplierVendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    default: null
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Please select a department']
  },
  roomNumber: {
    type: String,
    trim: true
  },
  building: {
    type: String,
    trim: true
  },
  assignedEngineer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  image: {
    type: String,
    default: ''
  },
  manualPdf: {
    type: String,
    default: ''
  },
  qrCode: {
    type: String,
    default: ''
  },
  currentStatus: {
    type: String,
    enum: ['Working', 'Under Maintenance', 'Out of Service', 'Disposed'],
    default: 'Working'
  },
  lastMaintenanceDate: {
    type: Date,
    default: null
  },
  nextMaintenanceDate: {
    type: Date,
    default: null
  },
  lastCalibrationDate: {
    type: Date,
    default: null
  },
  nextCalibrationDate: {
    type: Date,
    default: null
  },
  remarks: {
    type: String,
    trim: true
  },
  isDisposed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Auto-generate sequential Equipment ID (e.g., EQ-2026-001)
EquipmentSchema.pre('save', async function(next) {
  if (!this.isNew) {
    return next();
  }

  const year = new Date().getFullYear();
  const prefix = `EQ-${year}-`;
  
  try {
    const lastEquipment = await this.constructor.findOne({
      equipmentId: new RegExp(`^${prefix}`)
    }).sort({ equipmentId: -1 });

    let count = 0;
    if (lastEquipment && lastEquipment.equipmentId) {
      const parts = lastEquipment.equipmentId.split('-');
      const sequence = parseInt(parts[2], 10);
      if (!isNaN(sequence)) {
        count = sequence;
      }
    }

    const nextSeq = String(count + 1).padStart(3, '0');
    this.equipmentId = `${prefix}${nextSeq}`;
    next();
  } catch (error) {
    next(error);
  }
});

// Helper to update department counters
const updateDepartmentCounters = async (departmentId) => {
  if (!departmentId) return;
  const Department = mongoose.model('Department');
  const Equipment = mongoose.model('Equipment');

  const [total, working, maintenance] = await Promise.all([
    Equipment.countDocuments({ department: departmentId, isDisposed: { $ne: true } }),
    Equipment.countDocuments({ department: departmentId, currentStatus: 'Working', isDisposed: { $ne: true } }),
    Equipment.countDocuments({ department: departmentId, currentStatus: 'Under Maintenance', isDisposed: { $ne: true } })
  ]);

  await Department.findByIdAndUpdate(departmentId, {
    totalEquipment: total,
    workingEquipment: working,
    maintenanceEquipment: maintenance
  });
};

// Capture old department before saving changes
EquipmentSchema.pre('save', async function(next) {
  if (this.isModified('department') && !this.isNew) {
    try {
      const oldDoc = await this.constructor.findById(this._id);
      if (oldDoc) {
        this._oldDepartment = oldDoc.department;
      }
    } catch (err) {
      console.error('Error finding old department in pre-save:', err);
    }
  }
  next();
});

// Update counters after save
EquipmentSchema.post('save', async function(doc) {
  try {
    await updateDepartmentCounters(doc.department);
    if (doc._oldDepartment && doc._oldDepartment.toString() !== doc.department.toString()) {
      await updateDepartmentCounters(doc._oldDepartment);
    }
  } catch (err) {
    console.error('Error updating department counters after save:', err);
  }
});

// Update counters after deletion
EquipmentSchema.post('remove', async function(doc) {
  try {
    await updateDepartmentCounters(doc.department);
  } catch (err) {
    console.error('Error updating department counters after remove:', err);
  }
});

EquipmentSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    try {
      await updateDepartmentCounters(doc.department);
    } catch (err) {
      console.error('Error updating department counters after findOneAndDelete:', err);
    }
  }
});

module.exports = mongoose.model('Equipment', EquipmentSchema);
