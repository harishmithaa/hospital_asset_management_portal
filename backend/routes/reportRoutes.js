const express = require('express');
const router = express.Router();
const { getReportData } = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.route('/:type')
  .get(protect, getReportData);

module.exports = router;
