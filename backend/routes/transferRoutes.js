const express = require('express');
const router = express.Router();
const { getTransfers, createTransfer } = require('../controllers/transferController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, authorize('Admin'), getTransfers)
  .post(protect, authorize('Admin'), createTransfer);

module.exports = router;
