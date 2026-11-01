const express = require('express');
const router = express.Router();
const { 
  getComplaints, 
  getComplaintById, 
  createComplaint, 
  updateComplaint, 
  passToVendor,
  updateVendorArrival,
  deleteComplaint 
} = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.route('/')
  .get(protect, getComplaints)
  .post(protect, upload.single('imageUpload'), createComplaint);

router.put('/:id/pass-to-vendor', protect, passToVendor);
router.put('/:id/vendor-arrival', protect, updateVendorArrival);

router.route('/:id')
  .get(protect, getComplaintById)
  .put(protect, updateComplaint)
  .delete(protect, authorize('Admin'), deleteComplaint);

module.exports = router;
