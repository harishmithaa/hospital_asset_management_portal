const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// Route files
const authRoutes = require('./routes/authRoutes');
const equipmentRoutes = require('./routes/equipmentRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const calibrationRoutes = require('./routes/calibrationRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const transferRoutes = require('./routes/transferRoutes');
const disposalRoutes = require('./routes/disposalRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reportRoutes = require('./routes/reportRoutes');
const warrantyAmcRoutes = require('./routes/warrantyAmcRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP Request Logger
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Set static folder for file uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/calibration', calibrationRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/disposal', disposalRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/warranty-amc', warrantyAmcRoutes);

// Root & health check endpoints
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Hospital Asset Management Portal API is running' });
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'HAMS Server is healthy' });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error(`[Express Error Handler]: ${err.stack}`);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server Error'
  });
});

module.exports = app;
