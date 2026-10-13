const Complaint = require('../models/Complaint');
const Equipment = require('../models/Equipment');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Notification = require('../models/Notification');

// @desc    Get all complaints
// @route   GET /api/complaints
// @access  Private
exports.getComplaints = async (req, res) => {
  try {
    const { status, priority, department, equipment, assignedEngineer, raisedBy } = req.query;
    const query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (equipment) query.equipment = equipment;
    if (assignedEngineer) query.assignedEngineer = assignedEngineer;
    if (raisedBy) query.raisedBy = raisedBy;

    // Role restrictions
    if (req.user.role === 'Biomedical Engineer') {
      query.assignedEngineer = req.user.id;
    }

    if (req.user.role === 'Department Staff') {
      if (req.user.department) {
        query.department = req.user.department;
      } else {
        return res.json({ success: true, count: 0, complaints: [] });
      }
    }

    if (req.user.role === 'Vendor') {
      const vendorUser = await User.findById(req.user.id);
      const vendorRecord = await Vendor.findOne({ email: vendorUser.email });
      if (vendorRecord) {
        const vendorEquips = await Equipment.find({ supplierVendor: vendorRecord._id }).select('_id');
        query.equipment = { $in: vendorEquips.map(e => e._id) };
      } else {
        return res.json({ success: true, count: 0, complaints: [] });
      }
    }

    if (department && req.user.role === 'Admin') query.department = department;

    const complaints = await Complaint.find(query)
      .populate('equipment', 'equipmentId name currentStatus category')
      .populate('department', 'name location')
      .populate('raisedBy', 'name email role')
      .populate('assignedEngineer', 'name email phone')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: complaints.length, complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single complaint
// @route   GET /api/complaints/:id
// @access  Private
exports.getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('equipment', 'equipmentId name currentStatus serialNumber manufacturer modelNumber roomNumber qrCode category')
      .populate('department', 'name head location contact')
      .populate('raisedBy', 'name email phone role')
      .populate('assignedEngineer', 'name email phone')
      .populate({ path: 'updates.updatedBy', select: 'name role' });

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    res.json({ success: true, complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Raise a new complaint
// @route   POST /api/complaints
// @access  Private (Staff, Admin, Engineer)
exports.createComplaint = async (req, res) => {
  try {
    const { equipment: equipmentId, issueDescription, priority, additionalNotes } = req.body;

    const equip = await Equipment.findById(equipmentId);
    if (!equip) {
      return res.status(404).json({ success: false, message: 'Equipment not found' });
    }

    const imageUpload = req.file ? `/uploads/${req.file.filename}` : '';

    const complaint = new Complaint({
      equipment: equipmentId,
      department: equip.department,
      raisedBy: req.user._id,
      issueDescription,
      priority: priority || 'Medium',
      additionalNotes,
      imageUpload,
      status: 'Open'
    });

    complaint.updates.push({
      status: 'Open',
      note: 'Complaint raised and waiting for engineer assignment.',
      updatedBy: req.user._id
    });

    await complaint.save();

    // Automatically set equipment status to Under Maintenance when complaint is raised
    equip.currentStatus = 'Under Maintenance';
    await equip.save();

    // Notify Admin
    await Notification.create({
      role: 'Admin',
      title: 'New Complaint Raised',
      message: `Complaint ${complaint.complaintId} raised for ${equip.name} (${equip.equipmentId}).`,
      category: 'Warning'
    });

    res.status(201).json({ success: true, complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update complaint (assign engineer, update status)
// @route   PUT /api/complaints/:id
// @access  Private
exports.updateComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const { status, note, assignedEngineer, priority } = req.body;

    // Assign engineer (Admin only action)
    if (assignedEngineer && assignedEngineer !== String(complaint.assignedEngineer)) {
      complaint.assignedEngineer = assignedEngineer;
      complaint.status = 'Assigned';

      complaint.updates.push({
        status: 'Assigned',
        note: note || 'Engineer assigned to this complaint.',
        updatedBy: req.user._id
      });

      // Notify the assigned engineer
      await Notification.create({
        user: assignedEngineer,
        title: 'Complaint Assigned to You',
        message: `Complaint ${complaint.complaintId} has been assigned to you. Please investigate.`,
        category: 'Info'
      });

      // Notify staff who raised it
      await Notification.create({
        user: complaint.raisedBy,
        title: 'Complaint Assigned',
        message: `Your complaint ${complaint.complaintId} has been assigned to an engineer.`,
        category: 'Info'
      });
    }

    if (priority) complaint.priority = priority;

    // Status transitions (Engineer or Admin updates)
    if (status && status !== complaint.status && !assignedEngineer) {
      complaint.status = status;

      complaint.updates.push({
        status,
        note: note || `Status updated to ${status}.`,
        updatedBy: req.user._id
      });

      // When resolved — restore equipment to Working
      if (status === 'Completed' || status === 'Closed') {
        const equip = await Equipment.findById(complaint.equipment);
        if (equip && equip.currentStatus === 'Under Maintenance') {
          equip.currentStatus = 'Working';
          await equip.save();
        }

        // Notify the staff member
        await Notification.create({
          user: complaint.raisedBy,
          title: 'Complaint Resolved',
          message: `Your complaint ${complaint.complaintId} has been marked as ${status}. Equipment is back in service.`,
          category: 'Success'
        });
      }
    }

    await complaint.save();

    const populated = await Complaint.findById(complaint._id)
      .populate('equipment', 'equipmentId name currentStatus')
      .populate('raisedBy', 'name email')
      .populate('assignedEngineer', 'name email phone');

    res.json({ success: true, complaint: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete complaint
// @route   DELETE /api/complaints/:id
// @access  Private/Admin
exports.deleteComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    await Complaint.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Complaint removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
