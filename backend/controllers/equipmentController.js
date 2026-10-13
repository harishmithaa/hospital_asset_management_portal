const Equipment = require('../models/Equipment');
const Maintenance = require('../models/Maintenance');
const Complaint = require('../models/Complaint');
const Calibration = require('../models/Calibration');
const AssetTransfer = require('../models/AssetTransfer');
const DisposalRecord = require('../models/DisposalRecord');
const { generateQRCode } = require('../utils/qr');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Vendor = require('../models/Vendor');

// @desc    Get all equipment (with filters and search)
// @route   GET /api/equipment
// @access  Private
exports.getEquipment = async (req, res) => {
  try {
    const { status, category, department, search, isDisposed } = req.query;

    const query = {};

    // Disposed filter (default: show non-disposed)
    if (isDisposed === 'true') {
      query.isDisposed = true;
    } else {
      query.isDisposed = { $ne: true };
    }

    // Role restrictions
    if (req.user.role === 'Biomedical Engineer') {
      query.assignedEngineer = req.user.id;
    }

    if (req.user.role === 'Department Staff') {
      if (req.user.department) {
        query.department = req.user.department;
      } else {
        return res.json({ success: true, count: 0, equipment: [] });
      }
    }

    if (req.user.role === 'Vendor') {
      const vendorUser = await User.findById(req.user.id);
      const vendorRecord = await Vendor.findOne({ email: vendorUser.email });
      if (vendorRecord) {
        query.supplierVendor = vendorRecord._id;
      } else {
        return res.json({ success: true, count: 0, equipment: [] });
      }
    }

    // Filters
    if (status) query.currentStatus = status;
    if (category) query.category = category;
    if (department && req.user.role === 'Admin') query.department = department;

    // Search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { equipmentId: { $regex: search, $options: 'i' } },
        { manufacturer: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const equipmentList = await Equipment.find(query)
      .populate('department', 'name location')
      .populate('assignedEngineer', 'name email phone')
      .populate('supplierVendor', 'companyName contactPerson email phone')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: equipmentList.length, equipment: equipmentList });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single equipment + complete lifecycle history
// @route   GET /api/equipment/:id
// @access  Private
exports.getEquipmentById = async (req, res) => {
  try {
    let equipment = await Equipment.findById(req.params.id)
      .populate('department', 'name head location contact')
      .populate('assignedEngineer', 'name email phone')
      .populate('supplierVendor', 'companyName contactPerson email phone address');

    if (!equipment) {
      equipment = await Equipment.findOne({ equipmentId: req.params.id })
        .populate('department', 'name head location contact')
        .populate('assignedEngineer', 'name email phone')
        .populate('supplierVendor', 'companyName contactPerson email phone address');
    }

    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Equipment not found' });
    }

    return processEquipmentDetails(equipment, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const processEquipmentDetails = async (equipment, res) => {
  const equipId = equipment._id;

  const [maintenance, complaints, calibrations, transfers, disposal] = await Promise.all([
    Maintenance.find({ equipment: equipId })
      .populate('engineer', 'name email')
      .populate('vendor', 'companyName')
      .sort({ scheduledDate: -1 }),
    Complaint.find({ equipment: equipId })
      .populate('raisedBy', 'name role')
      .populate('assignedEngineer', 'name email')
      .sort({ createdAt: -1 }),
    Calibration.find({ equipment: equipId })
      .populate('engineer', 'name email')
      .sort({ calibrationDate: -1 }),
    AssetTransfer.find({ equipment: equipId })
      .populate('previousDepartment', 'name')
      .populate('newDepartment', 'name')
      .populate('approvedBy', 'name')
      .sort({ transferDate: -1 }),
    DisposalRecord.findOne({ equipment: equipId })
      .populate('approvedBy', 'name email')
  ]);

  res.json({
    success: true,
    equipment,
    history: { maintenance, complaints, calibrations, transfers, disposal }
  });
};

// @desc    Create new equipment
// @route   POST /api/equipment
// @access  Private/Admin
exports.createEquipment = async (req, res) => {
  try {
    const data = { ...req.body };

    if (req.files) {
      if (req.files['image']) data.image = `/uploads/${req.files['image'][0].filename}`;
      if (req.files['manualPdf']) data.manualPdf = `/uploads/${req.files['manualPdf'][0].filename}`;
    }

    const equipment = new Equipment(data);
    await equipment.save();

    // Generate QR code
    const qrCodeDataUrl = await generateQRCode(`HAMS-EQ:${equipment.equipmentId}`);
    equipment.qrCode = qrCodeDataUrl;
    await equipment.save();

    // Notify admin
    await Notification.create({
      role: 'Admin',
      title: 'New Equipment Registered',
      message: `${equipment.name} (${equipment.equipmentId}) has been registered in the system.`,
      category: 'Success'
    });

    res.status(201).json({ success: true, equipment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update equipment details
// @route   PUT /api/equipment/:id
// @access  Private/Admin
exports.updateEquipment = async (req, res) => {
  try {
    let equipment = await Equipment.findById(req.params.id);

    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Equipment not found' });
    }

    const data = { ...req.body };

    if (req.files) {
      if (req.files['image']) data.image = `/uploads/${req.files['image'][0].filename}`;
      if (req.files['manualPdf']) data.manualPdf = `/uploads/${req.files['manualPdf'][0].filename}`;
    }

    Object.keys(data).forEach(key => {
      equipment[key] = data[key];
    });

    await equipment.save();

    res.json({ success: true, equipment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete equipment permanently (Admin only)
// @route   DELETE /api/equipment/:id
// @access  Private/Admin
exports.deleteEquipment = async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);

    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Equipment not found' });
    }

    await Equipment.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Equipment permanently deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get equipment stats for dashboard
// @route   GET /api/equipment/stats
// @access  Private/Admin
exports.getEquipmentStats = async (req, res) => {
  try {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      total,
      working,
      underMaintenance,
      outOfService,
      disposed,
      maintenanceDue,
      calibrationDue,
      warrantyExpiring,
      amcExpiring
    ] = await Promise.all([
      Equipment.countDocuments({ isDisposed: { $ne: true } }),
      Equipment.countDocuments({ currentStatus: 'Working', isDisposed: { $ne: true } }),
      Equipment.countDocuments({ currentStatus: 'Under Maintenance', isDisposed: { $ne: true } }),
      Equipment.countDocuments({ currentStatus: 'Out of Service', isDisposed: { $ne: true } }),
      Equipment.countDocuments({ isDisposed: true }),
      Equipment.countDocuments({ nextMaintenanceDate: { $lte: in7Days }, isDisposed: { $ne: true } }),
      Equipment.countDocuments({ nextCalibrationDate: { $lte: in7Days }, isDisposed: { $ne: true } }),
      Equipment.countDocuments({ warrantyEnd: { $gte: now, $lte: in30Days }, isDisposed: { $ne: true } }),
      Equipment.countDocuments({ amcEnd: { $gte: now, $lte: in30Days }, isDisposed: { $ne: true } })
    ]);

    res.json({
      success: true,
      stats: { total, working, underMaintenance, outOfService, disposed, maintenanceDue, calibrationDue, warrantyExpiring, amcExpiring }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
