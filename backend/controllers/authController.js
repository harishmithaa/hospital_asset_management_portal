const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'hams_secret_key_for_jwt_2026_auth', {
    expiresIn: '30d'
  });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.status === 'Inactive') {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // activity logged

    res.json({
      success: true,
      token: generateToken(user._id),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        department: user.department,
        profileImage: user.profileImage,
        passwordReset: user.passwordReset,
        status: user.status
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('department', 'name');
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all users
// @route   GET /api/auth/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({}).populate('department', 'name').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a user
// @route   POST /api/auth/users
// @access  Private/Admin
exports.createUser = async (req, res) => {
  const { name, email, phone, role, department, password, status } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const profileImage = req.file ? `/uploads/${req.file.filename}` : '';

    const user = await User.create({
      name,
      email,
      phone,
      role,
      department: department || null,
      password: password || 'Default@123',
      profileImage,
      status: status || 'Active',
      passwordReset: true
    });

    // activity logged

    res.status(201).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a user
// @route   PUT /api/auth/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  try {
    let user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const previousValue = JSON.parse(JSON.stringify(user));

    const fieldsToUpdate = {
      name: req.body.name || user.name,
      email: req.body.email || user.email,
      phone: req.body.phone || user.phone,
      role: req.body.role || user.role,
      department: req.body.department !== undefined ? (req.body.department || null) : user.department,
      status: req.body.status || user.status,
      passwordReset: req.body.passwordReset !== undefined ? req.body.passwordReset : user.passwordReset
    };

    if (req.file) {
      fieldsToUpdate.profileImage = `/uploads/${req.file.filename}`;
    }

    if (req.body.password) {
      fieldsToUpdate.password = req.body.password;
    }

    // Use save if updating password to trigger pre-save hook
    if (req.body.password) {
      user.name = fieldsToUpdate.name;
      user.email = fieldsToUpdate.email;
      user.phone = fieldsToUpdate.phone;
      user.role = fieldsToUpdate.role;
      user.department = fieldsToUpdate.department;
      user.status = fieldsToUpdate.status;
      user.passwordReset = fieldsToUpdate.passwordReset;
      user.password = req.body.password;
      if (fieldsToUpdate.profileImage) {
        user.profileImage = fieldsToUpdate.profileImage;
      }
      await user.save();
    } else {
      user = await User.findByIdAndUpdate(req.params.id, fieldsToUpdate, { new: true });
    }

    // activity logged

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/auth/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent deleting oneself
    if (user._id.toString() === req.user.id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own admin account' });
    }

    const previousValue = JSON.parse(JSON.stringify(user));
    await User.findByIdAndDelete(req.params.id);

    // activity logged

    res.json({ success: true, message: 'User removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
