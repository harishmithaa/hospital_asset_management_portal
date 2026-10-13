const AssetTransfer = require('../models/AssetTransfer');
const Equipment = require('../models/Equipment');
const Notification = require('../models/Notification');

// @desc    Get all asset transfers
// @route   GET /api/transfers
// @access  Private/Admin
exports.getTransfers = async (req, res) => {
  try {
    const { equipment } = req.query;
    const query = {};
    if (equipment) query.equipment = equipment;

    const transfers = await AssetTransfer.find(query)
      .populate('equipment', 'equipmentId name currentStatus')
      .populate('previousDepartment', 'name')
      .populate('newDepartment', 'name')
      .populate('approvedBy', 'name email')
      .sort({ transferDate: -1 });

    res.json({ success: true, count: transfers.length, transfers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Initiate and record an asset transfer
// @route   POST /api/transfers
// @access  Private/Admin
exports.createTransfer = async (req, res) => {
  const { equipment, newDepartment, reason, roomNumber, building } = req.body;

  try {
    const equip = await Equipment.findById(equipment);
    if (!equip) {
      return res.status(404).json({ success: false, message: 'Equipment not found' });
    }

    if (equip.isDisposed) {
      return res.status(400).json({ success: false, message: 'Cannot transfer a disposed equipment' });
    }

    const previousDepartment = equip.department;

    if (previousDepartment.toString() === newDepartment.toString()) {
      return res.status(400).json({ success: false, message: 'Equipment is already in this department' });
    }

    const transfer = new AssetTransfer({
      equipment,
      previousDepartment,
      newDepartment,
      approvedBy: req.user._id,
      reason,
      currentLocation: { roomNumber, building }
    });

    await transfer.save();

    // Update equipment department and location
    equip.department = newDepartment;
    if (roomNumber) equip.roomNumber = roomNumber;
    if (building) equip.building = building;
    await equip.save();

    await Notification.create({
      role: 'Admin',
      title: 'Equipment Transferred',
      message: `Equipment ${equip.name} (${equip.equipmentId}) has been transferred to a new department.`,
      category: 'Info'
    });

    const populated = await AssetTransfer.findById(transfer._id)
      .populate('equipment', 'name equipmentId')
      .populate('previousDepartment', 'name')
      .populate('newDepartment', 'name')
      .populate('approvedBy', 'name');

    res.status(201).json({ success: true, transfer: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
