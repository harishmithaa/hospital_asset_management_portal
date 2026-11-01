const Complaint = require('../models/Complaint');
const Equipment = require('../models/Equipment');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Notification = require('../models/Notification');
const Maintenance = require('../models/Maintenance');

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
    if (req.user.role === 'Technician' || req.user.role === 'Biomedical Engineer') {
      query.assignedEngineer = req.user.id;
    }

    if (req.user.role === 'Department Staff') {
      if (req.user.department) {
        query.department = req.user.department;
      } else {
        return res.json({ success: true, count: 0, complaints: [] });
      }
    }

    // Vendor: only see complaints explicitly passed to this vendor
    if (req.user.role === 'Vendor') {
      const vendorUser = await User.findById(req.user.id);
      const vendorRecord = await Vendor.findOne({ email: vendorUser.email });
      if (vendorRecord) {
        query.passedToVendor = true;
        query.assignedVendor = vendorRecord._id;
      } else {
        return res.json({ success: true, count: 0, complaints: [] });
      }
    }

    if (department && req.user.role === 'Admin') query.department = department;

    const complaints = await Complaint.find(query)
      .populate('equipment', 'equipmentId name currentStatus category roomNumber supplierVendor')
      .populate('department', 'name location')
      .populate('raisedBy', 'name email role')
      .populate('assignedEngineer', 'name email phone')
      .populate('assignedVendor', 'companyName contactPerson email phone specialization')
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
      .populate({
        path: 'equipment',
        select: 'equipmentId name currentStatus serialNumber manufacturer modelNumber roomNumber qrCode category supplierVendor',
        populate: { path: 'supplierVendor', select: 'companyName contactPerson email phone specialization' }
      })
      .populate('department', 'name head location contact')
      .populate('raisedBy', 'name email phone role')
      .populate('assignedEngineer', 'name email phone')
      .populate('assignedVendor', 'companyName contactPerson email phone specialization')
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

// @desc    Update complaint (assign engineer, update status, record vendor arrival)
// @route   PUT /api/complaints/:id
// @access  Private
exports.updateComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const { status, note, assignedEngineer, priority, vendorArrivalDate, vendorServiceStatus, vendorDispatchNotes } = req.body;

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

    // Vendor Arrival and Service updates by Technician
    if (vendorArrivalDate !== undefined) {
      complaint.vendorArrivalDate = vendorArrivalDate ? new Date(vendorArrivalDate) : null;
    }
    if (vendorServiceStatus) {
      complaint.vendorServiceStatus = vendorServiceStatus;
    }
    if (vendorDispatchNotes !== undefined) {
      complaint.vendorDispatchNotes = vendorDispatchNotes;
    }

    // Sync to linked Maintenance record if vendor details were updated
    if (vendorArrivalDate !== undefined || vendorServiceStatus) {
      const linkedMaint = await Maintenance.findOne({ complaint: complaint._id });
      if (linkedMaint) {
        if (vendorArrivalDate !== undefined) linkedMaint.vendorArrivalDate = vendorArrivalDate ? new Date(vendorArrivalDate) : null;
        if (vendorServiceStatus) linkedMaint.vendorServiceStatus = vendorServiceStatus;
        await linkedMaint.save();
      }
    }

    // Status transitions (Engineer or Admin updates)
    if (status && status !== complaint.status && !assignedEngineer) {
      complaint.status = status;

      complaint.updates.push({
        status,
        note: note || (vendorArrivalDate ? `Vendor arrival date recorded: ${new Date(vendorArrivalDate).toLocaleDateString()}` : `Status updated to ${status}.`),
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
    } else if (note && !assignedEngineer) {
      complaint.updates.push({
        status: complaint.status,
        note,
        updatedBy: req.user._id
      });
    }

    await complaint.save();

    const populated = await Complaint.findById(complaint._id)
      .populate('equipment', 'equipmentId name currentStatus category roomNumber')
      .populate('department', 'name location')
      .populate('raisedBy', 'name email role')
      .populate('assignedEngineer', 'name email phone')
      .populate('assignedVendor', 'companyName contactPerson email phone specialization')
      .populate({ path: 'updates.updatedBy', select: 'name role' });

    res.json({ success: true, complaint: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Pass / Escalate complaint to external Vendor
// @route   PUT /api/complaints/:id/pass-to-vendor
// @access  Private (Technician, Admin)
exports.passToVendor = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id).populate('equipment');
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const { vendorId, dispatchNotes, scheduledArrivalDate } = req.body;

    const targetVendorId = vendorId || complaint.equipment?.supplierVendor;
    if (!targetVendorId) {
      return res.status(400).json({ success: false, message: 'No vendor specified or linked to this equipment. Please select a vendor.' });
    }

    const vendorDoc = await Vendor.findById(targetVendorId);
    if (!vendorDoc) {
      return res.status(404).json({ success: false, message: 'Vendor not found in directory.' });
    }

    complaint.passedToVendor = true;
    complaint.assignedVendor = targetVendorId;
    complaint.vendorDispatchDate = new Date();
    complaint.vendorDispatchNotes = dispatchNotes || '';
    if (scheduledArrivalDate) {
      complaint.vendorArrivalDate = new Date(scheduledArrivalDate);
      complaint.vendorServiceStatus = 'Vendor Visit Scheduled';
    } else {
      complaint.vendorServiceStatus = 'Dispatched to Vendor';
    }
    complaint.status = 'Waiting for Vendor';

    const arrivalNotice = scheduledArrivalDate ? ` (Expected arrival: ${new Date(scheduledArrivalDate).toLocaleDateString()})` : '';
    complaint.updates.push({
      status: 'Waiting for Vendor',
      note: `Escalated to vendor ${vendorDoc.companyName}${arrivalNotice}. Notes: ${dispatchNotes || 'OEM vendor service required.'}`,
      updatedBy: req.user._id
    });

    await complaint.save();

    // Ensure linked Maintenance record is created or updated for Vendor portal
    let maint = await Maintenance.findOne({ complaint: complaint._id });
    if (!maint) {
      maint = await Maintenance.create({
        equipment: complaint.equipment._id,
        type: 'Corrective',
        scheduledDate: scheduledArrivalDate ? new Date(scheduledArrivalDate) : new Date(),
        engineer: complaint.assignedEngineer || req.user._id,
        vendor: targetVendorId,
        complaint: complaint._id,
        passedToVendor: true,
        vendorArrivalDate: scheduledArrivalDate ? new Date(scheduledArrivalDate) : null,
        vendorDispatchNotes: dispatchNotes || '',
        vendorServiceStatus: scheduledArrivalDate ? 'Vendor Visit Scheduled' : 'Dispatched to Vendor',
        workDescription: `Vendor callout for complaint: ${complaint.issueDescription}`,
        remarks: `Dispatched to ${vendorDoc.companyName} by Technician ${req.user.name}: ${dispatchNotes || ''}`,
        status: 'Scheduled'
      });
    } else {
      maint.vendor = targetVendorId;
      maint.passedToVendor = true;
      if (scheduledArrivalDate) maint.vendorArrivalDate = new Date(scheduledArrivalDate);
      if (dispatchNotes) maint.vendorDispatchNotes = dispatchNotes;
      maint.vendorServiceStatus = scheduledArrivalDate ? 'Vendor Visit Scheduled' : 'Dispatched to Vendor';
      await maint.save();
    }

    // Notify Vendor user if an account exists
    const vendorUser = await User.findOne({ email: vendorDoc.email, role: 'Vendor' });
    if (vendorUser) {
      await Notification.create({
        user: vendorUser._id,
        title: 'New Service Request Dispatched',
        message: `Issue on ${complaint.equipment?.name} (${complaint.equipment?.equipmentId}) has been passed to your company. Complaint: ${complaint.complaintId}.`,
        category: 'Warning'
      });
    }

    // Notify Admin
    await Notification.create({
      role: 'Admin',
      title: 'Complaint Escalated to Vendor',
      message: `Technician ${req.user.name} passed complaint ${complaint.complaintId} (${complaint.equipment?.name}) to vendor ${vendorDoc.companyName}.`,
      category: 'Info'
    });

    const populated = await Complaint.findById(complaint._id)
      .populate('equipment', 'equipmentId name currentStatus category roomNumber')
      .populate('department', 'name location')
      .populate('raisedBy', 'name email role')
      .populate('assignedEngineer', 'name email phone')
      .populate('assignedVendor', 'companyName contactPerson email phone specialization')
      .populate({ path: 'updates.updatedBy', select: 'name role' });

    res.json({ success: true, message: `Issue passed to ${vendorDoc.companyName} successfully`, complaint: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update vendor arrival date and visit notes
// @route   PUT /api/complaints/:id/vendor-arrival
// @access  Private (Technician, Admin)
exports.updateVendorArrival = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const { vendorArrivalDate, vendorServiceStatus, note } = req.body;

    if (vendorArrivalDate !== undefined) {
      complaint.vendorArrivalDate = vendorArrivalDate ? new Date(vendorArrivalDate) : null;
    }
    if (vendorServiceStatus) {
      complaint.vendorServiceStatus = vendorServiceStatus;
    }

    const statusText = vendorServiceStatus || 'Arrival date updated';
    complaint.updates.push({
      status: complaint.status,
      note: note || `Technician updated vendor arrival details: ${vendorArrivalDate ? new Date(vendorArrivalDate).toLocaleDateString() : 'Date cleared'} (${statusText})`,
      updatedBy: req.user._id
    });

    await complaint.save();

    // Sync to Maintenance if linked
    const maint = await Maintenance.findOne({ complaint: complaint._id });
    if (maint) {
      if (vendorArrivalDate !== undefined) maint.vendorArrivalDate = vendorArrivalDate ? new Date(vendorArrivalDate) : null;
      if (vendorServiceStatus) maint.vendorServiceStatus = vendorServiceStatus;
      await maint.save();
    }

    const populated = await Complaint.findById(complaint._id)
      .populate('equipment', 'equipmentId name currentStatus category roomNumber')
      .populate('department', 'name location')
      .populate('raisedBy', 'name email role')
      .populate('assignedEngineer', 'name email phone')
      .populate('assignedVendor', 'companyName contactPerson email phone specialization')
      .populate({ path: 'updates.updatedBy', select: 'name role' });

    res.json({ success: true, message: 'Vendor arrival details updated', complaint: populated });
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
