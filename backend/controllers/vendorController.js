const Vendor = require('../models/Vendor');
const Equipment = require('../models/Equipment');
const Maintenance = require('../models/Maintenance');

// @desc    Get all vendors
// @route   GET /api/vendors
// @access  Private
exports.getVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find({}).sort({ companyName: 1 });
    res.json({ success: true, count: vendors.length, vendors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get vendor details, rating statistics, and job histories
// @route   GET /api/vendors/:id
// @access  Private
exports.getVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    // Equipment managed by this vendor
    const equipment = await Equipment.find({ supplierVendor: vendor._id, isArchived: false })
      .populate('department', 'name');

    // Maintenance jobs assigned to this vendor
    const maintenance = await Maintenance.find({ vendor: vendor._id })
      .populate('equipment', 'equipmentId name')
      .populate('engineer', 'name');

    const completedJobs = maintenance.filter(job => job.status === 'Completed');
    const pendingJobs = maintenance.filter(job => ['Scheduled', 'Overdue'].includes(job.status));
    
    // Total maintenance cost
    const totalMaintenanceCost = completedJobs.reduce((acc, job) => acc + (job.cost || 0), 0);

    res.json({
      success: true,
      vendor,
      stats: {
        equipmentCount: equipment.length,
        completedJobsCount: completedJobs.length,
        pendingJobsCount: pendingJobs.length,
        totalCost: totalMaintenanceCost
      },
      equipment,
      maintenance
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new vendor
// @route   POST /api/vendors
// @access  Private/Admin
exports.createVendor = async (req, res) => {
  try {
    const { companyName, contactPerson, email, phone, address, gstNumber, specialization, contractStart, contractEnd, rating, status } = req.body;

    const vendorExists = await Vendor.findOne({ companyName });

    if (vendorExists) {
      return res.status(400).json({ success: false, message: 'Vendor with this company name already exists' });
    }

    const vendor = await Vendor.create({
      companyName,
      contactPerson,
      email,
      phone,
      address,
      gstNumber,
      specialization,
      contractStart,
      contractEnd,
      rating: rating || 5,
      status: status || 'Active'
    });

    // activity logged

    res.status(201).json({ success: true, vendor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update vendor details
// @route   PUT /api/vendors/:id
// @access  Private/Admin
exports.updateVendor = async (req, res) => {
  try {
    let vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    const previousValue = JSON.parse(JSON.stringify(vendor));

    vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, { new: true });

    // activity logged

    res.json({ success: true, vendor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete vendor record
// @route   DELETE /api/vendors/:id
// @access  Private/Admin
exports.deleteVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    // Check if equipment is linked to this vendor
    const equipCount = await Equipment.countDocuments({ supplierVendor: vendor._id });
    if (equipCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete vendor. There are ${equipCount} equipment records linked to them. Please reassign the equipment first.`
      });
    }

    const previousValue = JSON.parse(JSON.stringify(vendor));
    await Vendor.findByIdAndDelete(req.params.id);

    // activity logged

    res.json({ success: true, message: 'Vendor removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
