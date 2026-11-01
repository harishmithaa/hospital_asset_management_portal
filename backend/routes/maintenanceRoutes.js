const express = require('express');
const router = express.Router();
const { 
  getMaintenance, 
  getMaintenanceById, 
  createMaintenance, 
  updateMaintenance, 
  deleteMaintenance,
  updateChecklist,
  updateSpareParts
} = require('../controllers/maintenanceController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const multiUpload = upload.fields([
  { name: 'beforeImage', maxCount: 1 },
  { name: 'afterImage', maxCount: 1 },
  { name: 'reportPath', maxCount: 1 }
]);

router.route('/')
  .get(protect, getMaintenance)
  .post(protect, multiUpload, createMaintenance);

router.route('/:id')
  .get(protect, getMaintenanceById)
  .put(protect, multiUpload, updateMaintenance)
  .delete(protect, authorize('Admin'), deleteMaintenance);

// Structured sub-resource endpoints
router.put('/:id/checklist', protect, updateChecklist);
router.put('/:id/spare-parts', protect, updateSpareParts);

module.exports = router;
