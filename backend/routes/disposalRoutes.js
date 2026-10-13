const express = require('express');
const router = express.Router();
const { getDisposals, createDisposal, getDisposalByEquipment } = require('../controllers/disposalController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.route('/')
  .get(protect, authorize('Admin'), getDisposals)
  .post(protect, authorize('Admin'), upload.single('disposalCertificate'), createDisposal);

router.get('/equipment/:id', protect, authorize('Admin'), getDisposalByEquipment);

module.exports = router;
