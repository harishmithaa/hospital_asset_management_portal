const DisposalRecord = require('../models/DisposalRecord');
const Equipment = require('../models/Equipment');
const Notification = require('../models/Notification');

// @desc    Get all disposal records
// @route   GET /api/disposal
// @access  Private/Admin
exports.getDisposals = async (req, res) => {
  try {
    const disposals = await DisposalRecord.find({})
      .populate({
        path: 'equipment',
        select: 'name equipmentId category manufacturer',
        populate: { path: 'department', select: 'name' }
      })
      .populate('approvedBy', 'name email')
      .sort({ disposalDate: -1 });

    res.json({ success: true, count: disposals.length, disposals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Decommission and dispose equipment
// @route   POST /api/disposal
// @access  Private/Admin
exports.createDisposal = async (req, res) => {
  const { equipment, disposalDate, reason, disposalMethod, scrapValue, remarks } = req.body;

  try {
    const equip = await Equipment.findById(equipment);
    if (!equip) {
      return res.status(404).json({ success: false, message: 'Equipment not found' });
    }

    if (equip.isDisposed) {
      return res.status(400).json({ success: false, message: 'Equipment is already disposed' });
    }

    const disposalCertificate = req.file ? `/uploads/${req.file.filename}` : '';

    const record = new DisposalRecord({
      equipment,
      disposalDate: disposalDate || new Date(),
      reason,
      disposalMethod,
      scrapValue: scrapValue || 0,
      approvedBy: req.user._id,
      disposalCertificate,
      remarks
    });

    await record.save();

    // Mark equipment as disposed
    equip.currentStatus = 'Disposed';
    equip.isDisposed = true;
    await equip.save();

    await Notification.create({
      role: 'Admin',
      title: 'Equipment Disposed',
      message: `Equipment ${equip.name} (${equip.equipmentId}) has been marked as Disposed.`,
      category: 'Warning'
    });

    res.status(201).json({ success: true, record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get disposal record for specific equipment
// @route   GET /api/disposal/equipment/:id
// @access  Private
exports.getDisposalByEquipment = async (req, res) => {
  try {
    const record = await DisposalRecord.findOne({ equipment: req.params.id })
      .populate('approvedBy', 'name email');

    res.json({ success: true, record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
