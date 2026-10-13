const Equipment = require('../models/Equipment');
const Maintenance = require('../models/Maintenance');
const Complaint = require('../models/Complaint');
const Calibration = require('../models/Calibration');

// @desc    Get aggregated report data based on report type
// @route   GET /api/reports/:type
// @access  Private/Admin
exports.getReportData = async (req, res) => {
  const { type } = req.params;
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  try {
    let reportData = [];

    switch (type) {
      case 'equipment':
        reportData = await Equipment.find({})
          .populate('department', 'name')
          .populate('supplierVendor', 'companyName')
          .populate('assignedEngineer', 'name')
          .select('equipmentId name category manufacturer modelNumber serialNumber purchaseDate purchaseCost installationDate usefulLife currentStatus warrantyEnd amcEnd lastMaintenanceDate nextMaintenanceDate roomNumber building remarks isDisposed');
        break;

      case 'maintenance':
        reportData = await Maintenance.find({})
          .populate({ path: 'equipment', select: 'equipmentId name', populate: { path: 'department', select: 'name' } })
          .populate('engineer', 'name')
          .select('type scheduledDate completedDate cost status workDescription partsReplaced remarks nextServiceDate');
        break;

      case 'complaint':
        reportData = await Complaint.find({})
          .populate('equipment', 'equipmentId name')
          .populate('department', 'name')
          .populate('raisedBy', 'name')
          .populate('assignedEngineer', 'name')
          .select('complaintId priority status issueDescription additionalNotes createdAt');
        break;

      case 'calibration':
        reportData = await Calibration.find({})
          .populate({ path: 'equipment', select: 'equipmentId name', populate: { path: 'department', select: 'name' } })
          .populate('engineer', 'name')
          .select('calibrationDate dueDate result status observations certificateUpload');
        break;

      case 'warranty-amc':
        const equipment = await Equipment.find({ isDisposed: { $ne: true } })
          .populate('department', 'name')
          .populate('supplierVendor', 'companyName contactPerson')
          .select('equipmentId name warrantyStart warrantyEnd amcStart amcEnd supplierVendor department');

        reportData = equipment.map(e => {
          let warrantyStatus = 'None';
          if (e.warrantyEnd) {
            warrantyStatus = e.warrantyEnd < now ? 'Expired' : e.warrantyEnd <= in30Days ? 'Expiring' : 'Active';
          }
          let amcStatus = 'None';
          if (e.amcEnd) {
            amcStatus = e.amcEnd < now ? 'Expired' : e.amcEnd <= in30Days ? 'Expiring' : 'Active';
          }
          return {
            equipmentId: e.equipmentId,
            name: e.name,
            department: e.department?.name,
            vendor: e.supplierVendor?.companyName,
            warrantyStart: e.warrantyStart,
            warrantyEnd: e.warrantyEnd,
            warrantyStatus,
            amcStart: e.amcStart,
            amcEnd: e.amcEnd,
            amcStatus
          };
        });
        break;

      default:
        return res.status(400).json({ success: false, message: `Invalid report type: ${type}. Valid types: equipment, maintenance, complaint, calibration, warranty-amc` });
    }

    res.json({ success: true, type, count: reportData.length, data: reportData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
