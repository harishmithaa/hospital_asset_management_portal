const express = require('express');
const router = express.Router();
const { loginUser, getMe, getUsers, createUser, updateUser, deleteUser } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public route
router.post('/login', loginUser);

// Protected routes
router.get('/me', protect, getMe);

// Admin-only routes for user management
router.route('/users')
  .get(protect, authorize('Admin'), getUsers)
  .post(protect, authorize('Admin'), upload.single('profileImage'), createUser);

router.route('/users/:id')
  .put(protect, authorize('Admin'), upload.single('profileImage'), updateUser)
  .delete(protect, authorize('Admin'), deleteUser);

module.exports = router;
