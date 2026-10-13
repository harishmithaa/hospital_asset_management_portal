const Notification = require('../models/Notification');

// @desc    Get notifications for logged in user (includes broadcast notifications for their role)
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const query = {
      $or: [
        { user: req.user._id },
        { role: req.user.role },
        { user: null, role: null } // System broadcast to everyone
      ]
    };

    const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, count: notifications.length, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark single notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    notification.read = true;
    await notification.save();

    res.json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark all notifications as read for current user/role
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res) => {
  try {
    const filter = {
      $or: [
        { user: req.user._id },
        { role: req.user.role }
      ]
    };

    await Notification.updateMany(filter, { read: true });

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
