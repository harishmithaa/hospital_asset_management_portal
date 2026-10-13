const express = require('express');
const router = express.Router();
const { 
  getVendors, 
  getVendorById, 
  createVendor, 
  updateVendor, 
  deleteVendor 
} = require('../controllers/vendorController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, getVendors)
  .post(protect, authorize('Admin'), createVendor);

router.route('/:id')
  .get(protect, getVendorById)
  .put(protect, authorize('Admin'), updateVendor)
  .delete(protect, authorize('Admin'), deleteVendor);

module.exports = router;
