const path = require('path');
const fs = require('fs');
const Calibration = require('../models/Calibration');
const Equipment = require('../models/Equipment');
const Notification = require('../models/Notification');
const { generateCalibrationPDF } = require('../utils/pdfGenerator');

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

    // Role restrictions: filter by engineer only if requested in query
    if (engineer) query.engineer = engineer;

    // Auto-update calibration statuses based on due date:
    // 1. If dueDate is past (< now) and not Completed -> Overdue
    // 2. If dueDate is within 7 days from now (or past) and was Scheduled -> Pending
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await Calibration.updateMany(
      { dueDate: { $lt: now }, status: { $nin: ['Completed', 'Cancelled'] } },
      { $set: { status: 'Overdue' } }
    );

    await Calibration.updateMany(
      { dueDate: { $gte: now, $lte: oneWeekFromNow }, status: 'Scheduled' },
      { $set: { status: 'Pending' } }
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
    // Admins cannot log calibrations; only technicians can submit calibration records
    if (req.user.role === 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Administrators cannot log calibrations. Only assigned Technicians can perform and submit calibration records.'
      });
    }

    const { equipment: equipmentId, calibrationDate, dueDate, engineer, vendor, result, observations, status } = req.body;

    const equipment = await Equipment.findById(equipmentId);
    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Equipment not found' });
    }

    const certificateUpload = req.file ? `/uploads/${req.file.filename}` : '';

    // Calibration can only be 'Completed' if a certificate document is uploaded
    let finalStatus = status || 'Pending';
    if (finalStatus === 'Completed' && !certificateUpload) {
      finalStatus = 'Pending';
    }

    // If scheduling next calibration (without completion certificate):
    // Within 1 week of due date -> status turns to 'Pending'
    // Past due -> 'Overdue'
    // More than 1 week ahead -> 'Scheduled'
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const targetDue = dueDate ? new Date(dueDate) : null;

    if (finalStatus !== 'Completed' && targetDue) {
      if (targetDue < now) {
        finalStatus = 'Overdue';
      } else if (targetDue <= oneWeekFromNow) {
        finalStatus = 'Pending';
      } else {
        finalStatus = 'Scheduled';
      }
    }

    const calibration = await Calibration.create({
      equipment: equipmentId,
      calibrationDate: calibrationDate || new Date(),
      dueDate,
      engineer: engineer || req.user.id,
      vendor: vendor || null,
      result: result || 'Pass',
      observations,
      status: finalStatus,
      certificateUpload
    });

    // Update equipment calibration dates
    if (calibration.status === 'Completed') {
      equipment.lastCalibrationDate = calibrationDate || new Date();
      if (dueDate) equipment.nextCalibrationDate = dueDate;
      if (calibration.result === 'Fail') {
        equipment.currentStatus = 'Out of Service';
      }
      await equipment.save();
    } else if (calibration.status === 'Pending' || calibration.status === 'Scheduled' || calibration.status === 'Overdue') {
      if (dueDate) {
        equipment.nextCalibrationDate = dueDate;
        await equipment.save();
      }
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
    if (req.user.role === 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Administrators cannot submit or modify calibration test logs.'
      });
    }

    let record = await Calibration.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ success: false, message: 'Calibration record not found' });
    }

    const updates = { ...req.body };
    if (req.file) {
      updates.certificateUpload = `/uploads/${req.file.filename}`;
    }

    // Require certificate document to change status to 'Completed'
    if (updates.status === 'Completed' && !updates.certificateUpload && !record.certificateUpload) {
      return res.status(400).json({
        success: false,
        message: 'A calibration certificate document must be uploaded to mark calibration as Completed.'
      });
    }

    record = await Calibration.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate('equipment', 'name equipmentId')
      .populate('engineer', 'name email');

    // If completed, update equipment dates
    if (record.status === 'Completed') {
      const equipment = await Equipment.findById(record.equipment._id || record.equipment);
      if (equipment) {
        equipment.lastCalibrationDate = record.calibrationDate || new Date();
        if (record.dueDate) {
          equipment.nextCalibrationDate = record.dueDate;
        }
        if (record.result === 'Fail') {
          equipment.currentStatus = 'Out of Service';
        } else if (equipment.currentStatus === 'Out of Service') {
          equipment.currentStatus = 'Working';
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

// @desc    Download / view calibration certificate PDF (with dynamic PDF generation fallback if physical file missing)
// @route   GET /api/calibration/:id/certificate
// @access  Public / Token optional
exports.getCalibrationCertificate = async (req, res) => {
  try {
    const calibration = await Calibration.findById(req.params.id)
      .populate({
        path: 'equipment',
        select: 'name equipmentId model serialNumber department',
        populate: { path: 'department', select: 'name' }
      })
      .populate('engineer', 'name email');

    if (!calibration) {
      return res.status(404).json({ success: false, message: 'Calibration record not found' });
    }

    const eqName = calibration.equipment?.name || 'Biomedical Equipment';
    const eqId = calibration.equipment?.equipmentId || 'EQ-UNKNOWN';
    const deptName = calibration.equipment?.department?.name || 'Clinical Engineering';
    const techName = calibration.engineer?.name ? `Tech. ${calibration.engineer.name}` : 'Lead Biomedical Technician';
    const calDate = calibration.calibrationDate ? new Date(calibration.calibrationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Verified';
    const dueDate = calibration.dueDate ? new Date(calibration.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Scheduled';
    const result = calibration.result || 'PASS';
    const observations = calibration.observations || 'All operating parameters verified within clinical tolerances.';

    // 1. If physical file exists on disk, serve it directly
    if (calibration.certificateUpload) {
      const cleanPath = calibration.certificateUpload.replace(/^\/+/, '');
      const filePath = path.join(__dirname, '..', cleanPath);
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Content-Disposition', `inline; filename="calibration_${eqId}.pdf"`);
        return res.sendFile(filePath);
      }
    }

    // 2. Resilient fallback: Dynamically generate standard-compliant official PDF
    const pdfBuffer = generateCalibrationPDF({
      title: 'HAMS CERTIFICATE OF CALIBRATION & COMPLIANCE',
      certNumber: `CERT-CAL-${calibration._id.toString().slice(-6).toUpperCase()}`,
      equipmentName: eqName,
      equipmentId: eqId,
      department: deptName,
      date: calDate,
      dueDate: dueDate,
      result: result,
      observations: observations,
      techName: techName
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Content-Disposition', `inline; filename="calibration_${eqId}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

