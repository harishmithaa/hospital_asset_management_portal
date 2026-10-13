const express = require('express');
const router = express.Router();
const { 
  getCalibrations, 
  getCalibrationById, 
  createCalibration, 
  updateCalibration, 
  deleteCalibration 
} = require('../controllers/calibrationController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.route('/')
  .get(protect, getCalibrations)
  .post(protect, upload.single('certificateUpload'), createCalibration);

router.route('/:id')
  .get(protect, getCalibrationById)
  .put(protect, upload.single('certificateUpload'), updateCalibration)
  .delete(protect, authorize('Admin'), deleteCalibration);

module.exports = router;
