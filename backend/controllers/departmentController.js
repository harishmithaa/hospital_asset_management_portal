const Department = require('../models/Department');
const Equipment = require('../models/Equipment');

// @desc    Get all departments
// @route   GET /api/departments
// @access  Private
exports.getDepartments = async (req, res) => {
  try {
    const departments = await Department.find({}).populate('engineerAssigned', 'name email phone');
    res.json({ success: true, count: departments.length, departments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single department details & assets
// @route   GET /api/departments/:id
// @access  Private
exports.getDepartmentById = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id).populate('engineerAssigned', 'name email phone');

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    const equipment = await Equipment.find({ department: department._id, isArchived: false })
      .populate('assignedEngineer', 'name')
      .populate('supplierVendor', 'companyName');

    res.json({
      success: true,
      department,
      equipment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new department
// @route   POST /api/departments
// @access  Private/Admin
exports.createDepartment = async (req, res) => {
  const { name, head, location, engineerAssigned, contact } = req.body;

  try {
    const deptExists = await Department.findOne({ name });

    if (deptExists) {
      return res.status(400).json({ success: false, message: 'Department with this name already exists' });
    }

    const department = await Department.create({
      name,
      head,
      location,
      engineerAssigned: engineerAssigned || null,
      contact
    });

    // activity logged

    res.status(201).json({ success: true, department });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update department
// @route   PUT /api/departments/:id
// @access  Private/Admin
exports.updateDepartment = async (req, res) => {
  try {
    let department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    const previousValue = JSON.parse(JSON.stringify(department));

    const fieldsToUpdate = {
      name: req.body.name || department.name,
      head: req.body.head !== undefined ? req.body.head : department.head,
      location: req.body.location !== undefined ? req.body.location : department.location,
      engineerAssigned: req.body.engineerAssigned !== undefined ? (req.body.engineerAssigned || null) : department.engineerAssigned,
      contact: req.body.contact !== undefined ? req.body.contact : department.contact
    };

    department = await Department.findByIdAndUpdate(req.params.id, fieldsToUpdate, { new: true });

    // activity logged

    res.json({ success: true, department });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete department
// @route   DELETE /api/departments/:id
// @access  Private/Admin
exports.deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    // Check if equipment is linked to this department
    const equipCount = await Equipment.countDocuments({ department: department._id });
    if (equipCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete department. There are ${equipCount} equipment records linked to it. Please reassign the equipment first.`
      });
    }

    const previousValue = JSON.parse(JSON.stringify(department));
    await Department.findByIdAndDelete(req.params.id);

    // activity logged

    res.json({ success: true, message: 'Department deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
