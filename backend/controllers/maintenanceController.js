const Maintenance = require('../models/Maintenance');
const Equipment = require('../models/Equipment');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Complaint = require('../models/Complaint');

// @desc    Get all maintenance tasks
// @route   GET /api/maintenance
// @access  Private
exports.getMaintenance = async (req, res) => {
  try {
    const { status, type, department, engineer, equipment } = req.query;
    
    const query = {};

    if (status) query.status = status;
    if (type) query.type = type;
    if (engineer) query.engineer = engineer;
    if (equipment) query.equipment = equipment;

    // Role-based restrictions: Technician sees assigned tasks OR unassigned tasks
    if (req.user.role === 'Technician') {
      query.$or = [{ engineer: req.user.id }, { engineer: null }];
    }

    // Vendor should only see service requests assigned / passed to their company
    if (req.user.role === 'Vendor') {
      const vendorUser = await User.findById(req.user.id);
      const vendorRecord = await Vendor.findOne({ email: vendorUser.email });
      if (vendorRecord) {
        query.vendor = vendorRecord._id;
      } else {
        return res.json({ success: true, count: 0, maintenance: [] });
      }
    }

    let maintenanceList = await Maintenance.find(query)
      .populate({
        path: 'equipment',
        select: 'name equipmentId currentStatus department room',
        populate: { path: 'department', select: 'name' }
      })
      .populate('engineer', 'name email phone')
      .populate('vendor', 'companyName contactPerson email phone')
      .populate('complaint', 'complaintId issueDescription')
      .sort({ scheduledDate: -1 });

    // Filter by department in-memory (nested field)
    if (department) {
      maintenanceList = maintenanceList.filter(item => 
        item.equipment && 
        item.equipment.department && 
        item.equipment.department._id.toString() === department
      );
    }

    res.json({ success: true, count: maintenanceList.length, maintenance: maintenanceList });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single maintenance record
// @route   GET /api/maintenance/:id
// @access  Private
exports.getMaintenanceById = async (req, res) => {
  try {
    const record = await Maintenance.findById(req.params.id)
      .populate('equipment', 'name equipmentId currentStatus department roomNumber building')
      .populate('engineer', 'name email phone')
      .populate('vendor', 'companyName contactPerson email phone')
      .populate('complaint', 'complaintId issueDescription status');

    if (!record) {
      return res.status(404).json({ success: false, message: 'Maintenance record not found' });
    }

    res.json({ success: true, maintenance: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Schedule / Create new maintenance
// @route   POST /api/maintenance
// @access  Private/Admin
exports.createMaintenance = async (req, res) => {
  try {
    const { equipment: equipmentId, type, scheduledDate, engineer, vendor, complaint, remarks, nextServiceDate } = req.body;

    const equipment = await Equipment.findById(equipmentId);
    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Equipment not found' });
    }

    const maintenance = await Maintenance.create({
      equipment: equipmentId,
      type: type || 'Preventive',
      scheduledDate,
      engineer: engineer || null,
      vendor: vendor || null,
      complaint: complaint || null,
      remarks,
      nextServiceDate: nextServiceDate || null,
      status: 'Scheduled'
    });

    // Update equipment status to Under Maintenance
    equipment.currentStatus = 'Under Maintenance';
    await equipment.save();

    // Notify engineer if assigned
    if (engineer) {
      await Notification.create({
        user: engineer,
        title: 'New Maintenance Scheduled',
        message: `Maintenance scheduled for ${equipment.name} (${equipment.equipmentId}) on ${new Date(scheduledDate).toLocaleDateString()}.`,
        category: 'Info'
      });
    }

    const populated = await Maintenance.findById(maintenance._id)
      .populate('equipment', 'name equipmentId')
      .populate('engineer', 'name email');

    res.status(201).json({ success: true, maintenance: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update maintenance record (Engineer completes it)
// @route   PUT /api/maintenance/:id
// @access  Private/Admin/Engineer
exports.updateMaintenance = async (req, res) => {
  try {
    let record = await Maintenance.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ success: false, message: 'Maintenance record not found' });
    }

    // Technician can only update their own assigned records
    if (req.user.role === 'Technician' && record.engineer?.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this record' });
    }

    const {
      status,
      completedDate,
      workDescription,
      partsReplaced,
      cost,
      remarks,
      nextServiceDate,
      reportPath,
      engineer,
      vendor,
      vendorArrivalDate,
      vendorDispatchNotes,
      vendorServiceStatus,
      passedToVendor,
      checklistItems,
      spareParts
    } = req.body;

    const isTech = req.user.role === 'Technician' || req.user.role === 'Biomedical Engineer';
    let targetStatus = status;

    // Technicians cannot mark as Completed alone — redirect to 'Pending Admin Audit'
    if (isTech && targetStatus === 'Completed') {
      targetStatus = 'Pending Admin Audit';
    }

    if (targetStatus) record.status = targetStatus;
    if (completedDate && (req.user.role === 'Admin' || targetStatus === 'Completed')) record.completedDate = completedDate;
    if (workDescription !== undefined) record.workDescription = workDescription;
    if (partsReplaced !== undefined) record.partsReplaced = partsReplaced;
    if (cost !== undefined) record.cost = cost;
    if (remarks !== undefined) record.remarks = remarks;
    if (nextServiceDate !== undefined) record.nextServiceDate = nextServiceDate;
    if (engineer !== undefined) record.engineer = engineer || null;
    if (vendor !== undefined) record.vendor = vendor || null;
    if (passedToVendor !== undefined) record.passedToVendor = passedToVendor;
    if (vendorArrivalDate !== undefined) record.vendorArrivalDate = vendorArrivalDate ? new Date(vendorArrivalDate) : null;
    if (vendorDispatchNotes !== undefined) record.vendorDispatchNotes = vendorDispatchNotes;
    if (vendorServiceStatus) record.vendorServiceStatus = vendorServiceStatus;

    // Sync to linked Complaint if present
    if (record.complaint && (vendorArrivalDate !== undefined || vendorServiceStatus)) {
      try {
        const comp = await Complaint.findById(record.complaint);
        if (comp) {
          if (vendorArrivalDate !== undefined) comp.vendorArrivalDate = vendorArrivalDate ? new Date(vendorArrivalDate) : null;
          if (vendorServiceStatus) comp.vendorServiceStatus = vendorServiceStatus;
          await comp.save();
        }
      } catch (e) {
        console.warn('Failed to sync vendor arrival to complaint:', e);
      }
    }

    // Accept JSON arrays for structured checklist and spare parts
    if (checklistItems !== undefined) {
      try { record.checklistItems = typeof checklistItems === 'string' ? JSON.parse(checklistItems) : checklistItems; } catch (e) {}
    }
    if (spareParts !== undefined) {
      try { record.spareParts = typeof spareParts === 'string' ? JSON.parse(spareParts) : spareParts; } catch (e) {}
    }

    // Handle file upload for service report
    if (req.files && req.files['reportPath'] && req.files['reportPath'][0]) {
      record.reportPath = `/uploads/${req.files['reportPath'][0].filename}`;
    } else if (reportPath !== undefined) {
      record.reportPath = reportPath;
    }

    await record.save();

    // CASE 1: Technician sent maintenance for Admin Audit
    if (record.status === 'Pending Admin Audit') {
      const equipment = await Equipment.findById(record.equipment);

      // Sync linked complaint to 'Pending Admin Audit'
      if (record.complaint) {
        const comp = await Complaint.findById(record.complaint);
        if (comp && !['Completed', 'Closed'].includes(comp.status)) {
          comp.status = 'Pending Admin Audit';
          comp.updates.push({
            status: 'Pending Admin Audit',
            note: `Technician ${req.user.name} submitted maintenance checklist and parts log for Admin Audit.`,
            updatedBy: req.user._id
          });
          await comp.save();
        }
      }

      // Notify all Admins
      const adminUsers = await User.find({ role: 'Admin' });
      for (const admin of adminUsers) {
        await Notification.create({
          user: admin._id,
          title: 'Audit Required: Maintenance Submitted by Technician',
          message: `Technician ${req.user.name} completed maintenance checklist for ${equipment?.name || 'Equipment'} (${equipment?.equipmentId || ''}). Sent for Admin Audit.`,
          category: 'Warning'
        });
      }
    }

    // CASE 2: Admin completed maintenance audit
    if (record.status === 'Completed') {
      if (!record.completedDate) {
        record.completedDate = new Date();
        await record.save();
      }

      const equipment = await Equipment.findById(record.equipment);
      if (equipment) {
        equipment.lastMaintenanceDate = record.completedDate || new Date();
        if (record.nextServiceDate) {
          equipment.nextMaintenanceDate = record.nextServiceDate;
        }
        // Restore to Working if it was Under Maintenance or Out of Service
        if (equipment.currentStatus === 'Under Maintenance' || equipment.currentStatus === 'Out of Service') {
          equipment.currentStatus = 'Working';
        }
        await equipment.save();

        // Notify technician that maintenance audit was approved
        if (record.engineer) {
          await Notification.create({
            user: record.engineer,
            title: 'Maintenance Audit Approved',
            message: `Admin ${req.user.name} approved and completed maintenance for ${equipment.name} (${equipment.equipmentId}).`,
            category: 'Success'
          });
        }
      }

      // If this maintenance was for a complaint, automatically mark the complaint as Completed
      if (record.complaint) {
        const comp = await Complaint.findById(record.complaint);
        if (comp && !['Completed', 'Closed'].includes(comp.status)) {
          comp.status = 'Completed';
          comp.updates.push({
            status: 'Completed',
            note: `Admin approved maintenance audit and marked completed everywhere.`,
            updatedBy: req.user._id
          });
          await comp.save();

          if (comp.raisedBy) {
            await Notification.create({
              user: comp.raisedBy,
              title: 'Complaint Resolved & Verified',
              message: `Your complaint ${comp.complaintId} has been resolved and verified by Admin. Equipment is back to Working status.`,
              category: 'Success'
            });
          }
        }
      }
    }

    const populated = await Maintenance.findById(record._id)
      .populate('equipment', 'name equipmentId currentStatus')
      .populate('engineer', 'name email phone')
      .populate('complaint', 'complaintId issueDescription priority')
      .populate('vendor', 'companyName');

    res.json({ success: true, maintenance: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete maintenance record
// @route   DELETE /api/maintenance/:id
// @access  Private/Admin
exports.deleteMaintenance = async (req, res) => {
  try {
    const record = await Maintenance.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ success: false, message: 'Maintenance record not found' });
    }

    await Maintenance.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Maintenance record deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update checklist items for a maintenance record
// @route   PUT /api/maintenance/:id/checklist
// @access  Private/Admin/Technician
exports.updateChecklist = async (req, res) => {
  try {
    const record = await Maintenance.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Not found' });

    if (req.user.role === 'Technician' && record.engineer?.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { checklistItems } = req.body;
    if (!Array.isArray(checklistItems)) {
      return res.status(400).json({ success: false, message: 'checklistItems must be an array' });
    }
    record.checklistItems = checklistItems;
    await record.save();
    res.json({ success: true, maintenance: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update spare parts replacement history
// @route   PUT /api/maintenance/:id/spare-parts
// @access  Private/Admin/Technician
exports.updateSpareParts = async (req, res) => {
  try {
    const record = await Maintenance.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Not found' });

    if (req.user.role === 'Technician' && record.engineer?.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { spareParts } = req.body;
    if (!Array.isArray(spareParts)) {
      return res.status(400).json({ success: false, message: 'spareParts must be an array' });
    }
    record.spareParts = spareParts;
    // Recalculate total cost from spare parts
    const partsTotal = spareParts.reduce((sum, p) => sum + (p.unitCost || 0) * (p.quantity || 1), 0);
    if (partsTotal > 0) record.cost = partsTotal;
    await record.save();
    res.json({ success: true, maintenance: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get or create corrective maintenance record for a complaint
// @route   POST /api/maintenance/complaint/:complaintId
// @access  Private
exports.getOrCreateComplaintMaintenance = async (req, res) => {
  try {
    const { complaintId } = req.params;

    // Support MongoDB _id or string complaintId (e.g. CP-2026-00001)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(complaintId);
    const complaint = await Complaint.findOne(
      isObjectId ? { _id: complaintId } : { complaintId }
    ).populate('equipment', 'name equipmentId currentStatus department')
     .populate('assignedEngineer', 'name email');

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Look for existing Maintenance linked to this complaint
    let record = await Maintenance.findOne({ complaint: complaint._id })
      .populate('equipment', 'name equipmentId currentStatus department room')
      .populate('engineer', 'name email')
      .populate('complaint', 'complaintId issueDescription priority status');

    if (!record) {
      const defaultCorrectiveItems = [
        { label: 'Identify fault & root cause', status: 'Pending', notes: complaint.issueDescription || '' },
        { label: 'Inspect relevant components & cabling', status: 'Pending', notes: '' },
        { label: 'Replace faulty parts (if required)', status: 'Pending', notes: '' },
        { label: 'Test repaired functionality & calibration', status: 'Pending', notes: '' },
        { label: 'Verify electrical safety & grounding', status: 'Pending', notes: '' },
        { label: 'Final operational checkout & handover', status: 'Pending', notes: '' }
      ];

      const assignedEng = complaint.assignedEngineer?._id || (req.user.role === 'Technician' ? req.user.id : null);

      record = await Maintenance.create({
        equipment: complaint.equipment._id || complaint.equipment,
        type: 'Corrective',
        scheduledDate: new Date(),
        status: 'In Progress',
        engineer: assignedEng,
        complaint: complaint._id,
        workDescription: `Corrective service for complaint ${complaint.complaintId}: ${complaint.issueDescription}`,
        checklistItems: defaultCorrectiveItems,
        cost: 0
      });

      // Update complaint status if it was Open or Assigned
      if (['Open', 'Assigned'].includes(complaint.status)) {
        complaint.status = 'In Progress';
        if (!complaint.assignedEngineer && assignedEng) {
          complaint.assignedEngineer = assignedEng;
        }
        complaint.updates.push({
          status: 'In Progress',
          note: 'Technician launched digital checklist for corrective repair.',
          updatedBy: req.user._id
        });
        await complaint.save();
      }

      record = await Maintenance.findById(record._id)
        .populate('equipment', 'name equipmentId currentStatus department room')
        .populate('engineer', 'name email')
        .populate('complaint', 'complaintId issueDescription priority status');
    }

    res.json({ success: true, maintenance: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

