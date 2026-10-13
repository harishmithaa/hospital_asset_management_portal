const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { generateQRCode } = require('../utils/qr');

// Import Models
const User = require('../models/User');
const Department = require('../models/Department');
const Vendor = require('../models/Vendor');
const Equipment = require('../models/Equipment');
const Maintenance = require('../models/Maintenance');
const Complaint = require('../models/Complaint');
const Calibration = require('../models/Calibration');
const AssetTransfer = require('../models/AssetTransfer');
const DisposalRecord = require('../models/DisposalRecord');
const Notification = require('../models/Notification');

const getRandItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

const seedData = async () => {
  try {
    console.log('Connecting to database...');
    await connectDB();

    console.log('Clearing collections...');
    await Promise.all([
      User.deleteMany({}),
      Department.deleteMany({}),
      Vendor.deleteMany({}),
      Equipment.deleteMany({}),
      Maintenance.deleteMany({}),
      Complaint.deleteMany({}),
      Calibration.deleteMany({}),
      AssetTransfer.deleteMany({}),
      DisposalRecord.deleteMany({}),
      Notification.deleteMany({})
    ]);
    console.log('Database cleared.');

    // ─── 1. Departments ───────────────────────────────────────────────────────
    console.log('Seeding Departments...');
    const deptData = [
      { name: 'Emergency',         location: 'Ground Floor, Block A', contact: '+1-555-0101', head: 'Dr. Sarah Connor' },
      { name: 'Radiology',         location: 'Basement, Block A',     contact: '+1-555-0102', head: 'Dr. Robert Chen' },
      { name: 'ICU',               location: '1st Floor, Block B',    contact: '+1-555-0103', head: 'Dr. Alan Grant' },
      { name: 'Operation Theatre', location: '2nd Floor, Block B',    contact: '+1-555-0104', head: 'Dr. Ellie Sattler' },
      { name: 'Cardiology',        location: '1st Floor, Super Spec', contact: '+1-555-0105', head: 'Dr. Ian Malcolm' },
      { name: 'Orthopedics',       location: '2nd Floor, Block A',    contact: '+1-555-0106', head: 'Dr. Peter Parker' },
      { name: 'Laboratory',        location: '3rd Floor, Block A',    contact: '+1-555-0107', head: 'Dr. Hank Pym' },
      { name: 'Dialysis',          location: '3rd Floor, Super Spec', contact: '+1-555-0108', head: 'Dr. Stephen Strange' },
      { name: 'Pediatrics',        location: '3rd Floor, Block B',    contact: '+1-555-0109', head: 'Dr. Reed Richards' },
      { name: 'Neurology',         location: '2nd Floor, Super Spec', contact: '+1-555-0110', head: 'Dr. Tony Stark' }
    ];
    const departments = await Department.insertMany(deptData);
    console.log(`Seeded ${departments.length} departments.`);

    // ─── 2. Vendors ───────────────────────────────────────────────────────────
    console.log('Seeding Vendors...');
    const vendorData = [
      { companyName: 'GE Healthcare',        contactPerson: 'John Smith',    email: 'john.smith@ge.com',         phone: '9876543210', address: 'Chicago, IL',       gstNumber: '29AAAAA1111A1Z1', specialization: 'Imaging & Life Support',    rating: 4.8, status: 'Active' },
      { companyName: 'Siemens Healthineers', contactPerson: 'Emma Watson',   email: 'emma.watson@siemens.com',   phone: '9876543211', address: 'Erlangen, Germany', gstNumber: '29BBBBB2222B1Z2', specialization: 'Imaging & Lab Diagnostics', rating: 4.7, status: 'Active' },
      { companyName: 'Philips Healthcare',   contactPerson: 'David Miller',  email: 'david.miller@philips.com',  phone: '9876543212', address: 'Amsterdam, NL',     gstNumber: '29CCCCC3333C1Z3', specialization: 'Monitoring & Cardiology',   rating: 4.6, status: 'Active' },
      { companyName: 'Mindray',              contactPerson: 'Li Wei',        email: 'vendor@hospital.com',       phone: '9876543213', address: 'Shenzhen, China',   gstNumber: '29DDDDD4444D1Z4', specialization: 'Patient Monitors',          rating: 4.3, status: 'Active' },
      { companyName: 'Dräger',               contactPerson: 'Hans Mueller',  email: 'hans@draeger.com',          phone: '9876543214', address: 'Lübeck, Germany',   gstNumber: '29EEEEE5555E1Z5', specialization: 'Anesthesia & Ventilation',  rating: 4.7, status: 'Active' }
    ];
    const vendors = await Vendor.insertMany(vendorData);
    console.log(`Seeded ${vendors.length} vendors.`);

    // The vendor user (vendor@hospital.com) matches Mindray email
    const vendorRecord = vendors.find(v => v.email === 'vendor@hospital.com');

    // ─── 3. Users (4 Demo Accounts) ───────────────────────────────────────────
    console.log('Seeding Users...');

    const adminUser = new User({
      name: 'Dr. Administrator',
      email: 'admin@hospital.com',
      phone: '+1-555-1001',
      role: 'Admin',
      department: null,
      status: 'Active',
      password: 'Admin@123',
      passwordReset: false
    });
    await adminUser.save();

    const engineerUser = new User({
      name: 'Eng. James Wilson',
      email: 'engineer@hospital.com',
      phone: '+1-555-1002',
      role: 'Biomedical Engineer',
      department: departments[0]._id, // Emergency
      status: 'Active',
      password: 'Engineer@123',
      passwordReset: false
    });
    await engineerUser.save();

    const staffUser = new User({
      name: 'Nurse Clara Oswald',
      email: 'staff@hospital.com',
      phone: '+1-555-1003',
      role: 'Department Staff',
      department: departments[4]._id, // Cardiology
      status: 'Active',
      password: 'Staff@123',
      passwordReset: false
    });
    await staffUser.save();

    const vendorUser = new User({
      name: 'Vendor Rep Li Wei',
      email: 'vendor@hospital.com',
      phone: '+1-555-1004',
      role: 'Vendor',
      department: null,
      status: 'Active',
      password: 'Vendor@123',
      passwordReset: false
    });
    await vendorUser.save();

    console.log('Seeded 4 demo users.');

    // Assign engineer to some departments
    await Department.findByIdAndUpdate(departments[0]._id, { engineerAssigned: engineerUser._id }); // Emergency
    await Department.findByIdAndUpdate(departments[2]._id, { engineerAssigned: engineerUser._id }); // ICU
    await Department.findByIdAndUpdate(departments[4]._id, { engineerAssigned: engineerUser._id }); // Cardiology

    // ─── 4. Equipment ─────────────────────────────────────────────────────────
    console.log('Seeding Equipment...');

    const equipmentDefs = [
      // Cardiology (staff user's department - so she can see and raise complaints)
      {
        name: 'ECG Machine',         category: 'Monitoring',   department: departments[4]._id, manufacturer: 'Philips',   modelNumber: 'PageWriter TC70', serialNumber: 'PH-TC70-2024-001', purchaseDate: daysAgo(400), installationDate: daysAgo(380), purchaseCost: 45000, usefulLife: 10, warrantyStart: daysAgo(400), warrantyEnd: daysFromNow(230), amcStart: daysAgo(30), amcEnd: daysFromNow(335), supplierVendor: vendors[2]._id, assignedEngineer: engineerUser._id, roomNumber: 'C-102', building: 'Block A', nextMaintenanceDate: daysFromNow(7), lastMaintenanceDate: daysAgo(83), currentStatus: 'Working', remarks: 'Primary ECG for Cardiology'
      },
      {
        name: 'Patient Monitor',     category: 'Monitoring',   department: departments[4]._id, manufacturer: 'Mindray',   modelNumber: 'MEC-2000', serialNumber: 'MR-2000-2025-001', purchaseDate: daysAgo(300), installationDate: daysAgo(285), purchaseCost: 28000, usefulLife: 8, warrantyStart: daysAgo(300), warrantyEnd: daysFromNow(65), amcStart: daysAgo(60), amcEnd: daysFromNow(305), supplierVendor: vendorRecord._id, assignedEngineer: engineerUser._id, roomNumber: 'C-103', building: 'Block A', nextMaintenanceDate: daysFromNow(20), lastMaintenanceDate: daysAgo(70), currentStatus: 'Working'
      },
      {
        name: 'Defibrillator',       category: 'Life Support', department: departments[4]._id, manufacturer: 'Philips',   modelNumber: 'HeartStart MRx', serialNumber: 'PH-MRX-2024-003', purchaseDate: daysAgo(500), installationDate: daysAgo(490), purchaseCost: 55000, usefulLife: 12, warrantyStart: daysAgo(500), warrantyEnd: daysFromNow(-30), amcStart: daysAgo(70), amcEnd: daysFromNow(295), supplierVendor: vendors[2]._id, assignedEngineer: engineerUser._id, roomNumber: 'C-101', building: 'Block A', nextMaintenanceDate: daysFromNow(3), lastMaintenanceDate: daysAgo(87), currentStatus: 'Working', remarks: 'Warranty expired'
      },
      // Emergency
      {
        name: 'Ventilator',          category: 'Life Support', department: departments[0]._id, manufacturer: 'Dräger',    modelNumber: 'Evita V500', serialNumber: 'DR-V500-2024-001', purchaseDate: daysAgo(600), installationDate: daysAgo(590), purchaseCost: 95000, usefulLife: 15, warrantyStart: daysAgo(600), warrantyEnd: daysFromNow(165), amcStart: daysAgo(60), amcEnd: daysFromNow(305), supplierVendor: vendors[4]._id, assignedEngineer: engineerUser._id, roomNumber: 'E-101', building: 'Block B', nextMaintenanceDate: daysFromNow(-5), lastMaintenanceDate: daysAgo(95), currentStatus: 'Under Maintenance', remarks: 'Preventive maintenance overdue'
      },
      {
        name: 'Ultrasound Machine',  category: 'Imaging',      department: departments[1]._id, manufacturer: 'GE',        modelNumber: 'Voluson E10', serialNumber: 'GE-E10-2023-001', purchaseDate: daysAgo(730), installationDate: daysAgo(715), purchaseCost: 120000, usefulLife: 12, warrantyStart: daysAgo(730), warrantyEnd: daysFromNow(-100), amcStart: daysAgo(50), amcEnd: daysFromNow(315), supplierVendor: vendors[0]._id, assignedEngineer: engineerUser._id, roomNumber: 'R-201', building: 'Block A', nextMaintenanceDate: daysFromNow(30), lastMaintenanceDate: daysAgo(60), currentStatus: 'Working'
      },
      // ICU
      {
        name: 'Anesthesia Machine',  category: 'Life Support', department: departments[3]._id, manufacturer: 'Dräger',    modelNumber: 'Perseus A500', serialNumber: 'DR-PA500-2024-001', purchaseDate: daysAgo(450), installationDate: daysAgo(440), purchaseCost: 85000, usefulLife: 15, warrantyStart: daysAgo(450), warrantyEnd: daysFromNow(275), amcStart: daysAgo(20), amcEnd: daysFromNow(345), supplierVendor: vendors[4]._id, assignedEngineer: engineerUser._id, roomNumber: 'OT-301', building: 'Block B', nextMaintenanceDate: daysFromNow(45), lastMaintenanceDate: daysAgo(45), currentStatus: 'Working'
      },
      {
        name: 'MRI Scanner',         category: 'Imaging',      department: departments[1]._id, manufacturer: 'Siemens',   modelNumber: 'MAGNETOM Sola', serialNumber: 'SI-SOLA-2022-001', purchaseDate: daysAgo(900), installationDate: daysAgo(870), purchaseCost: 750000, usefulLife: 15, warrantyStart: daysAgo(900), warrantyEnd: daysFromNow(180), amcStart: daysAgo(15), amcEnd: daysFromNow(350), supplierVendor: vendors[1]._id, assignedEngineer: engineerUser._id, roomNumber: 'R-101', building: 'Block A', nextMaintenanceDate: daysFromNow(60), lastMaintenanceDate: daysAgo(30), currentStatus: 'Working'
      },
      {
        name: 'Blood Gas Analyzer',  category: 'Laboratory',   department: departments[6]._id, manufacturer: 'Siemens',   modelNumber: 'RAPIDPoint 500e', serialNumber: 'SI-RP500-2024-001', purchaseDate: daysAgo(250), installationDate: daysAgo(240), purchaseCost: 35000, usefulLife: 8, warrantyStart: daysAgo(250), warrantyEnd: daysFromNow(480), amcStart: null, amcEnd: null, supplierVendor: vendors[1]._id, assignedEngineer: engineerUser._id, roomNumber: 'L-401', building: 'Block A', nextMaintenanceDate: daysFromNow(60), lastMaintenanceDate: daysAgo(30), currentStatus: 'Working'
      },
      {
        name: 'Infusion Pump',       category: 'Therapeutic',  department: departments[2]._id, manufacturer: 'Mindray',   modelNumber: 'BeneFusion nVP', serialNumber: 'MR-NVP-2024-001', purchaseDate: daysAgo(150), installationDate: daysAgo(145), purchaseCost: 8500, usefulLife: 7, warrantyStart: daysAgo(150), warrantyEnd: daysFromNow(580), amcStart: null, amcEnd: null, supplierVendor: vendorRecord._id, assignedEngineer: engineerUser._id, roomNumber: 'ICU-201', building: 'Block B', nextMaintenanceDate: daysFromNow(180), lastMaintenanceDate: daysAgo(5), currentStatus: 'Working'
      },
      // Disposed equipment example
      {
        name: 'Old X-Ray Unit',      category: 'Imaging',      department: departments[1]._id, manufacturer: 'Siemens',   modelNumber: 'MULTIX Fusion', serialNumber: 'SI-MF-2015-001', purchaseDate: daysAgo(3650), installationDate: daysAgo(3640), purchaseCost: 280000, usefulLife: 10, warrantyStart: daysAgo(3650), warrantyEnd: daysAgo(2920), amcStart: null, amcEnd: null, supplierVendor: vendors[1]._id, assignedEngineer: null, roomNumber: 'R-102', building: 'Block A', currentStatus: 'Disposed', isDisposed: true, remarks: 'End of useful life'
      }
    ];

    const createdEquipment = [];
    for (const def of equipmentDefs) {
      const equip = new Equipment(def);
      await equip.save();
      const qr = await generateQRCode(`HAMS-EQ:${equip.equipmentId}`);
      equip.qrCode = qr;
      await equip.save();
      createdEquipment.push(equip);
    }
    console.log(`Seeded ${createdEquipment.length} equipment items.`);

    // ─── 5. Maintenance Records ────────────────────────────────────────────────
    console.log('Seeding Maintenance records...');

    const ecgMachine = createdEquipment[0]; // ECG Machine in Cardiology
    const ventilator = createdEquipment[3]; // Ventilator in Emergency (overdue)

    const maintenanceRecords = [
      {
        equipment: ecgMachine._id,
        type: 'Preventive',
        scheduledDate: daysAgo(83),
        completedDate: daysAgo(82),
        engineer: engineerUser._id,
        status: 'Completed',
        workDescription: 'Full preventive maintenance performed. Electrodes checked, calibration verified.',
        partsReplaced: 'Lead wires replaced',
        cost: 1200,
        remarks: 'Equipment functioning optimally.',
        nextServiceDate: daysFromNow(7)
      },
      {
        equipment: ecgMachine._id,
        type: 'Preventive',
        scheduledDate: daysFromNow(7),
        engineer: engineerUser._id,
        status: 'Scheduled',
        workDescription: '',
        cost: 0,
        nextServiceDate: daysFromNow(97)
      },
      {
        equipment: ventilator._id,
        type: 'Preventive',
        scheduledDate: daysFromNow(-5),
        engineer: engineerUser._id,
        status: 'Overdue',
        workDescription: '',
        cost: 0,
        remarks: 'Maintenance overdue - schedule immediately'
      },
      {
        equipment: createdEquipment[6]._id, // MRI Scanner
        type: 'Routine',
        scheduledDate: daysAgo(30),
        completedDate: daysAgo(29),
        engineer: engineerUser._id,
        status: 'Completed',
        workDescription: 'Magnetic field calibration, cooling system check, gradient coil inspection.',
        partsReplaced: 'Coolant filter replaced',
        cost: 8500,
        remarks: 'All systems nominal.',
        nextServiceDate: daysFromNow(60)
      }
    ];

    await Maintenance.insertMany(maintenanceRecords);
    console.log(`Seeded ${maintenanceRecords.length} maintenance records.`);

    // ─── 6. Complaints ─────────────────────────────────────────────────────────
    console.log('Seeding Complaints...');

    const complaint1 = new Complaint({
      equipment: ecgMachine._id,
      department: departments[4]._id, // Cardiology
      raisedBy: staffUser._id,
      issueDescription: 'ECG machine producing noisy readings. Intermittent signal loss observed during patient monitoring.',
      priority: 'High',
      status: 'Assigned',
      assignedEngineer: engineerUser._id,
      additionalNotes: 'Happens mostly in humid conditions.',
      updates: [
        { status: 'Open', note: 'Complaint raised.', updatedBy: staffUser._id, timestamp: daysAgo(5) },
        { status: 'Assigned', note: 'Assigned to Eng. James Wilson for investigation.', updatedBy: adminUser._id, timestamp: daysAgo(4) }
      ]
    });
    await complaint1.save();

    const complaint2 = new Complaint({
      equipment: createdEquipment[1]._id, // Patient Monitor
      department: departments[4]._id,
      raisedBy: staffUser._id,
      issueDescription: 'SpO2 probe not reading correctly. Values fluctuating between 85-98% without patient condition change.',
      priority: 'Critical',
      status: 'In Progress',
      assignedEngineer: engineerUser._id,
      updates: [
        { status: 'Open', note: 'Complaint raised.', updatedBy: staffUser._id, timestamp: daysAgo(3) },
        { status: 'Assigned', note: 'Assigned to engineer.', updatedBy: adminUser._id, timestamp: daysAgo(2) },
        { status: 'In Progress', note: 'Engineer investigating probe connection and sensor calibration.', updatedBy: engineerUser._id, timestamp: daysAgo(1) }
      ]
    });
    await complaint2.save();

    const complaint3 = new Complaint({
      equipment: ventilator._id,
      department: departments[0]._id, // Emergency
      raisedBy: adminUser._id,
      issueDescription: 'Ventilator alarm triggering false positive pressure alarms. Checked circuit - no leaks found.',
      priority: 'Critical',
      status: 'Completed',
      assignedEngineer: engineerUser._id,
      updates: [
        { status: 'Open', note: 'Complaint raised.', updatedBy: adminUser._id, timestamp: daysAgo(10) },
        { status: 'Assigned', note: 'Assigned.', updatedBy: adminUser._id, timestamp: daysAgo(9) },
        { status: 'In Progress', note: 'Engineer identified faulty pressure sensor.', updatedBy: engineerUser._id, timestamp: daysAgo(8) },
        { status: 'Completed', note: 'Pressure sensor replaced. Alarm tested - all clear.', updatedBy: engineerUser._id, timestamp: daysAgo(6) }
      ]
    });
    await complaint3.save();

    console.log('Seeded 3 complaints.');

    // ─── 7. Calibration ────────────────────────────────────────────────────────
    console.log('Seeding Calibrations...');

    await Calibration.insertMany([
      {
        equipment: ecgMachine._id,
        calibrationDate: daysAgo(120),
        dueDate: daysFromNow(60),
        engineer: engineerUser._id,
        result: 'Pass',
        observations: 'All leads within ±2% tolerance. Calibration certificate issued.',
        status: 'Completed',
        certificateUpload: ''
      },
      {
        equipment: ventilator._id,
        calibrationDate: daysAgo(200),
        dueDate: daysFromNow(-20),
        engineer: engineerUser._id,
        result: 'Pass',
        observations: 'Flow sensor calibrated. Due for re-calibration.',
        status: 'Overdue',
        certificateUpload: ''
      },
      {
        equipment: createdEquipment[6]._id, // MRI
        calibrationDate: daysAgo(90),
        dueDate: daysFromNow(90),
        engineer: engineerUser._id,
        result: 'Pass',
        observations: 'Magnetic field homogeneity within spec. Gradient linearity verified.',
        status: 'Completed',
        certificateUpload: ''
      }
    ]);
    console.log('Seeded 3 calibration records.');

    // ─── 8. Transfer History ────────────────────────────────────────────────────
    console.log('Seeding Transfer records...');

    await AssetTransfer.insertMany([
      {
        equipment: createdEquipment[4]._id, // Ultrasound
        previousDepartment: departments[4]._id, // Cardiology
        newDepartment: departments[1]._id,       // Radiology
        transferDate: daysAgo(200),
        approvedBy: adminUser._id,
        reason: 'Radiology department received a new patient load. Ultrasound relocated for better utilization.',
        currentLocation: { roomNumber: 'R-201', building: 'Block A' }
      }
    ]);
    console.log('Seeded 1 transfer record.');

    // ─── 9. Disposal Record ────────────────────────────────────────────────────
    console.log('Seeding Disposal records...');
    const disposedEquip = createdEquipment[9]; // Old X-Ray Unit

    await DisposalRecord.create({
      equipment: disposedEquip._id,
      disposalDate: daysAgo(30),
      reason: 'Equipment reached end of useful life (10 years). Repair costs exceed 80% of replacement value.',
      disposalMethod: 'Medical Equipment Scrapping via certified vendor',
      scrapValue: 15000,
      approvedBy: adminUser._id,
      remarks: 'Replaced by new Digital X-Ray System.'
    });
    console.log('Seeded 1 disposal record.');

    // ─── 10. Notifications ─────────────────────────────────────────────────────
    console.log('Seeding Notifications...');

    await Notification.insertMany([
      { role: 'Admin',                title: 'Warranty Expiring Soon',       message: 'Defibrillator (EQ-2026-003) warranty has expired. Please renew.', category: 'Warning' },
      { role: 'Admin',                title: 'Maintenance Overdue',          message: 'Ventilator (EQ-2026-004) preventive maintenance is 5 days overdue.', category: 'Critical' },
      { role: 'Admin',                title: 'Calibration Overdue',          message: 'Ventilator (EQ-2026-004) calibration is overdue by 20 days.', category: 'Critical' },
      { role: 'Admin',                title: 'New Complaint Raised',         message: 'Complaint raised for ECG Machine (EQ-2026-001) — High Priority.', category: 'Warning' },
      { user: engineerUser._id,       title: 'Complaint Assigned',           message: 'Complaint for Patient Monitor assigned to you. Please investigate.', category: 'Info' },
      { user: engineerUser._id,       title: 'Maintenance Due in 7 Days',    message: 'ECG Machine (EQ-2026-001) preventive maintenance due in 7 days.', category: 'Warning' },
      { user: staffUser._id,          title: 'Complaint Assigned to Engineer', message: 'Your complaint for ECG Machine has been assigned to Eng. James Wilson.', category: 'Info' },
      { role: 'Vendor',               title: 'Service Information',          message: 'Patient Monitor (EQ-2026-002) associated with your company has an open complaint.', category: 'Info' }
    ]);
    console.log('Seeded 8 notifications.');

    console.log('\n✅ Database seeded successfully!');
    console.log('─────────────────────────────────────────────');
    console.log('Demo Login Credentials:');
    console.log('  Admin:              admin@hospital.com    / Admin@123');
    console.log('  Biomedical Engineer: engineer@hospital.com / Engineer@123');
    console.log('  Department Staff:   staff@hospital.com    / Staff@123');
    console.log('  Vendor:             vendor@hospital.com   / Vendor@123');
    console.log('─────────────────────────────────────────────\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error.message);
    process.exit(1);
  }
};

seedData();
