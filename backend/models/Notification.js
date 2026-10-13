const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // null indicates broadcast/role-based if role is set
  },
  role: {
    type: String,
    enum: ['Admin', 'Biomedical Engineer', 'Department Staff', 'Vendor'],
    default: null
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['Info', 'Warning', 'Critical', 'Success'],
    default: 'Info'
  },
  read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', NotificationSchema);
