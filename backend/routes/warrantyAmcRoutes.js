const express = require('express');
const router = express.Router();
const { getWarrantyAMCSummary, updateWarrantyAMC } = require('../controllers/warrantyAmcController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('Admin', 'Vendor'), getWarrantyAMCSummary);
router.put('/:id', protect, authorize('Admin'), updateWarrantyAMC);

module.exports = router;
