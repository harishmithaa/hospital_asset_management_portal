const express = require('express');
const router = express.Router();
const { 
  getEquipment, 
  getEquipmentById, 
  createEquipment, 
  updateEquipment, 
  deleteEquipment,
  getEquipmentStats
} = require('../controllers/equipmentController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const multiUpload = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'manualPdf', maxCount: 1 }
]);

router.get('/stats', protect, authorize('Admin'), getEquipmentStats);

router.route('/')
  .get(protect, getEquipment)
  .post(protect, authorize('Admin'), multiUpload, createEquipment);

router.route('/:id')
  .get(protect, getEquipmentById)
  .put(protect, authorize('Admin'), multiUpload, updateEquipment)
  .delete(protect, authorize('Admin'), deleteEquipment);

module.exports = router;
