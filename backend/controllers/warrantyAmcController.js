const Equipment = require('../models/Equipment');
const Vendor = require('../models/Vendor');
const User = require('../models/User');

// @desc    Get warranty & AMC summary for all equipment
// @route   GET /api/warranty-amc
// @access  Private/Admin/Vendor
exports.getWarrantyAMCSummary = async (req, res) => {
  try {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    let query = { isDisposed: { $ne: true } };

    // Vendor can only see their assigned equipment
    if (req.user.role === 'Vendor') {
      const vendorUser = await User.findById(req.user.id);
      const vendorRecord = await Vendor.findOne({ email: vendorUser.email });
      if (vendorRecord) {
        query.supplierVendor = vendorRecord._id;
      } else {
        return res.json({ success: true, warranties: [], amcs: [] });
      }
    }

    const equipment = await Equipment.find(query)
      .populate('department', 'name')
      .populate('supplierVendor', 'companyName contactPerson email phone')
      .select('name equipmentId warrantyStart warrantyEnd amcStart amcEnd supplierVendor department')
      .sort({ createdAt: -1 });

    const warranties = equipment
      .filter(e => e.warrantyStart || e.warrantyEnd)
      .map(e => {
        let warrantyStatus = 'None';
        if (e.warrantyEnd) {
          if (e.warrantyEnd < now) warrantyStatus = 'Expired';
          else if (e.warrantyEnd <= in30Days) warrantyStatus = 'Expiring';
          else warrantyStatus = 'Active';
        }
        return {
          _id: e._id,
          equipmentId: e.equipmentId,
          name: e.name,
          department: e.department,
          vendor: e.supplierVendor,
          warrantyStart: e.warrantyStart,
          warrantyEnd: e.warrantyEnd,
          status: warrantyStatus
        };
      });

    const amcs = equipment
      .filter(e => e.amcStart || e.amcEnd)
      .map(e => {
        let amcStatus = 'None';
        if (e.amcEnd) {
          if (e.amcEnd < now) amcStatus = 'Expired';
          else if (e.amcEnd <= in30Days) amcStatus = 'Expiring';
          else amcStatus = 'Active';
        }
        return {
          _id: e._id,
          equipmentId: e.equipmentId,
          name: e.name,
          department: e.department,
          vendor: e.supplierVendor,
          amcStart: e.amcStart,
          amcEnd: e.amcEnd,
          status: amcStatus
        };
      });

    const stats = {
      warrantyActive: warranties.filter(w => w.status === 'Active').length,
      warrantyExpiring: warranties.filter(w => w.status === 'Expiring').length,
      warrantyExpired: warranties.filter(w => w.status === 'Expired').length,
      amcActive: amcs.filter(a => a.status === 'Active').length,
      amcExpiring: amcs.filter(a => a.status === 'Expiring').length,
      amcExpired: amcs.filter(a => a.status === 'Expired').length
    };

    res.json({ success: true, warranties, amcs, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update warranty/AMC dates for equipment
// @route   PUT /api/warranty-amc/:id
// @access  Private/Admin
exports.updateWarrantyAMC = async (req, res) => {
  try {
    const { warrantyStart, warrantyEnd, amcStart, amcEnd, supplierVendor } = req.body;

    const equipment = await Equipment.findByIdAndUpdate(
      req.params.id,
      { warrantyStart, warrantyEnd, amcStart, amcEnd, supplierVendor },
      { new: true }
    ).populate('supplierVendor', 'companyName contactPerson');

    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Equipment not found' });
    }

    res.json({ success: true, equipment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
