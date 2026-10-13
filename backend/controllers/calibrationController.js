const Calibration = require('../models/Calibration');
const Equipment = require('../models/Equipment');
const Notification = require('../models/Notification');

// @desc    Get all calibration records
// @route   GET /api/calibration
// @access  Private/Admin/Engineer
exports.getCalibrations = async (req, res) => {
  try {
    const { status, equipment, engineer } = req.query;
    const query = {};

    if (status) query.status = status;
    if (equipment) query.equipment = equipment;
    if (engineer) query.engineer = engineer;

    // Role restrictions
    if (req.user.role === 'Biomedical Engineer') {
      query.engineer = req.user.id;
    }

    // Auto-update overdue status
    const now = new Date();
    await Calibration.updateMany(
      { dueDate: { $lt: now }, status: { $ne: 'Completed' } },
      { $set: { status: 'Overdue' } }
    );

    const calibrations = await Calibration.find(query)
      .populate({
        path: 'equipment',
        select: 'name equipmentId currentStatus',
        populate: { path: 'department', select: 'name' }
      })
      .populate('engineer', 'name email phone')
      .populate('vendor', 'companyName contactPerson')
      .sort({ dueDate: 1 });

    res.json({ success: true, count: calibrations.length, calibrations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single calibration record
// @route   GET /api/calibration/:id
// @access  Private
exports.getCalibrationById = async (req, res) => {
  try {
    const calibration = await Calibration.findById(req.params.id)
      .populate('equipment', 'name equipmentId currentStatus')
      .populate('engineer', 'name email phone')
      .populate('vendor', 'companyName contactPerson');

    if (!calibration) {
      return res.status(404).json({ success: false, message: 'Calibration record not found' });
    }

    res.json({ success: true, calibration });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new calibration record
// @route   POST /api/calibration
// @access  Private/Admin/Engineer
exports.createCalibration = async (req, res) => {
  try {
    const { equipment: equipmentId, calibrationDate, dueDate, engineer, vendor, result, observations, status } = req.body;

    const equipment = await Equipment.findById(equipmentId);
    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Equipment not found' });
    }

    const certificateUpload = req.file ? `/uploads/${req.file.filename}` : '';

    const calibration = await Calibration.create({
      equipment: equipmentId,
      calibrationDate,
      dueDate,
      engineer: engineer || req.user.id,
      vendor: vendor || null,
      result: result || 'Pass',
      observations,
      status: status || 'Completed',
      certificateUpload
    });

    // Update equipment calibration dates
    if (calibration.status === 'Completed') {
      equipment.lastCalibrationDate = calibrationDate || new Date();
      equipment.nextCalibrationDate = dueDate;
      if (calibration.result === 'Fail') {
        equipment.currentStatus = 'Out of Service';
      }
      await equipment.save();
    }

    const populated = await Calibration.findById(calibration._id)
      .populate('equipment', 'name equipmentId')
      .populate('engineer', 'name email');

    res.status(201).json({ success: true, calibration: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update calibration record
// @route   PUT /api/calibration/:id
// @access  Private/Admin/Engineer
exports.updateCalibration = async (req, res) => {
  try {
    let record = await Calibration.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ success: false, message: 'Calibration record not found' });
    }

    const updates = { ...req.body };
    if (req.file) {
      updates.certificateUpload = `/uploads/${req.file.filename}`;
    }

    record = await Calibration.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate('equipment', 'name equipmentId')
      .populate('engineer', 'name email');

    // If completed, update equipment dates
    if (updates.status === 'Completed' && updates.dueDate) {
      const equipment = await Equipment.findById(record.equipment._id || record.equipment);
      if (equipment) {
        equipment.lastCalibrationDate = updates.calibrationDate || record.calibrationDate;
        equipment.nextCalibrationDate = updates.dueDate;
        if (updates.result === 'Fail') {
          equipment.currentStatus = 'Out of Service';
        }
        await equipment.save();
      }
    }

    res.json({ success: true, calibration: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete calibration record
// @route   DELETE /api/calibration/:id
// @access  Private/Admin
exports.deleteCalibration = async (req, res) => {
  try {
    const record = await Calibration.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ success: false, message: 'Calibration record not found' });
    }

    await Calibration.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Calibration record deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
