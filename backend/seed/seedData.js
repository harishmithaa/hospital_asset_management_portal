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
      name: 'Tech. James Wilson',
      email: 'technician@hospital.com',
      phone: '+1-555-1002',
      role: 'Technician',
      department: departments[0]._id, // Emergency
      status: 'Active',
      password: 'Technician@123',
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
        name: 'ECG Machine',         category: 'Monitoring',   department: departments[4]._id, manufacturer: 'Philips',   modelNumber: 'PageWriter TC70', serialNumber: 'PH-TC70-2024-001', purchaseDate: daysAgo(365), installationDate: daysAgo(350), purchaseCost: 45000, usefulLife: 10, warrantyStart: daysAgo(365), warrantyEnd: daysFromNow(180), amcStart: daysAgo(30), amcEnd: daysFromNow(335), supplierVendor: vendors[2]._id, assignedEngineer: engineerUser._id, roomNumber: 'C-102', building: 'Block A', nextMaintenanceDate: daysFromNow(0), lastMaintenanceDate: daysAgo(30), currentStatus: 'Working', remarks: 'Primary ECG for Cardiology - Routine service scheduled today'
      },
      {
        name: 'Patient Monitor',     category: 'Monitoring',   department: departments[4]._id, manufacturer: 'Mindray',   modelNumber: 'MEC-2000', serialNumber: 'MR-2000-2025-001', purchaseDate: daysAgo(200), installationDate: daysAgo(190), purchaseCost: 28000, usefulLife: 8, warrantyStart: daysAgo(200), warrantyEnd: daysFromNow(165), amcStart: daysAgo(20), amcEnd: daysFromNow(345), supplierVendor: vendorRecord._id, assignedEngineer: engineerUser._id, roomNumber: 'C-103', building: 'Block A', nextMaintenanceDate: daysFromNow(5), lastMaintenanceDate: daysAgo(3), currentStatus: 'Working'
      },
      {
        name: 'Defibrillator',       category: 'Life Support', department: departments[4]._id, manufacturer: 'Philips',   modelNumber: 'HeartStart MRx', serialNumber: 'PH-MRX-2024-003', purchaseDate: daysAgo(400), installationDate: daysAgo(390), purchaseCost: 55000, usefulLife: 12, warrantyStart: daysAgo(400), warrantyEnd: daysAgo(15), amcStart: daysAgo(15), amcEnd: daysFromNow(350), supplierVendor: vendors[2]._id, assignedEngineer: engineerUser._id, roomNumber: 'C-101', building: 'Block A', nextMaintenanceDate: daysFromNow(3), lastMaintenanceDate: daysAgo(25), currentStatus: 'Working', remarks: 'Warranty expired - covered under active AMC'
      },
      // Emergency
      {
        name: 'Ventilator',          category: 'Life Support', department: departments[0]._id, manufacturer: 'Dräger',    modelNumber: 'Evita V500', serialNumber: 'DR-V500-2024-001', purchaseDate: daysAgo(500), installationDate: daysAgo(490), purchaseCost: 95000, usefulLife: 15, warrantyStart: daysAgo(500), warrantyEnd: daysFromNow(200), amcStart: daysAgo(30), amcEnd: daysFromNow(335), supplierVendor: vendors[4]._id, assignedEngineer: engineerUser._id, roomNumber: 'E-101', building: 'Block B', nextMaintenanceDate: daysAgo(1), lastMaintenanceDate: daysAgo(91), currentStatus: 'Under Maintenance', remarks: 'Preventive maintenance 1 day overdue - under active inspection'
      },
      {
        name: 'Ultrasound Machine',  category: 'Imaging',      department: departments[1]._id, manufacturer: 'GE',        modelNumber: 'Voluson E10', serialNumber: 'GE-E10-2023-001', purchaseDate: daysAgo(600), installationDate: daysAgo(585), purchaseCost: 120000, usefulLife: 12, warrantyStart: daysAgo(600), warrantyEnd: daysFromNow(130), amcStart: daysAgo(45), amcEnd: daysFromNow(320), supplierVendor: vendors[0]._id, assignedEngineer: engineerUser._id, roomNumber: 'R-201', building: 'Block A', nextMaintenanceDate: daysFromNow(7), lastMaintenanceDate: daysAgo(45), currentStatus: 'Working'
      },
      // ICU
      {
        name: 'Anesthesia Machine',  category: 'Life Support', department: departments[3]._id, manufacturer: 'Dräger',    modelNumber: 'Perseus A500', serialNumber: 'DR-PA500-2024-001', purchaseDate: daysAgo(350), installationDate: daysAgo(340), purchaseCost: 85000, usefulLife: 15, warrantyStart: daysAgo(350), warrantyEnd: daysFromNow(215), amcStart: daysAgo(20), amcEnd: daysFromNow(345), supplierVendor: vendors[4]._id, assignedEngineer: engineerUser._id, roomNumber: 'OT-301', building: 'Block B', nextMaintenanceDate: daysFromNow(18), lastMaintenanceDate: daysAgo(45), currentStatus: 'Working'
      },
      {
        name: 'MRI Scanner',         category: 'Imaging',      department: departments[1]._id, manufacturer: 'Siemens',   modelNumber: 'MAGNETOM Sola', serialNumber: 'SI-SOLA-2022-001', purchaseDate: daysAgo(700), installationDate: daysAgo(680), purchaseCost: 750000, usefulLife: 15, warrantyStart: daysAgo(700), warrantyEnd: daysFromNow(260), amcStart: daysAgo(10), amcEnd: daysFromNow(355), supplierVendor: vendors[1]._id, assignedEngineer: engineerUser._id, roomNumber: 'R-101', building: 'Block A', nextMaintenanceDate: daysFromNow(30), lastMaintenanceDate: daysAgo(8), currentStatus: 'Working'
      },
      {
        name: 'Blood Gas Analyzer',  category: 'Laboratory',   department: departments[6]._id, manufacturer: 'Siemens',   modelNumber: 'RAPIDPoint 500e', serialNumber: 'SI-RP500-2024-001', purchaseDate: daysAgo(180), installationDate: daysAgo(170), purchaseCost: 35000, usefulLife: 8, warrantyStart: daysAgo(180), warrantyEnd: daysFromNow(400), amcStart: null, amcEnd: null, supplierVendor: vendors[1]._id, assignedEngineer: engineerUser._id, roomNumber: 'L-401', building: 'Block A', nextMaintenanceDate: daysFromNow(45), lastMaintenanceDate: daysAgo(30), currentStatus: 'Working'
      },
      {
        name: 'Infusion Pump',       category: 'Therapeutic',  department: departments[2]._id, manufacturer: 'Mindray',   modelNumber: 'BeneFusion nVP', serialNumber: 'MR-NVP-2024-001', purchaseDate: daysAgo(90), installationDate: daysAgo(85), purchaseCost: 8500, usefulLife: 7, warrantyStart: daysAgo(90), warrantyEnd: daysFromNow(640), amcStart: null, amcEnd: null, supplierVendor: vendorRecord._id, assignedEngineer: engineerUser._id, roomNumber: 'ICU-201', building: 'Block B', nextMaintenanceDate: daysFromNow(1), lastMaintenanceDate: daysAgo(30), currentStatus: 'Working', remarks: 'Routine preventive service scheduled for tomorrow'
      },
      // Disposed equipment example
      {
        name: 'Old X-Ray Unit',      category: 'Imaging',      department: departments[1]._id, manufacturer: 'Siemens',   modelNumber: 'MULTIX Fusion', serialNumber: 'SI-MF-2015-001', purchaseDate: daysAgo(3650), installationDate: daysAgo(3640), purchaseCost: 280000, usefulLife: 10, warrantyStart: daysAgo(3650), warrantyEnd: daysAgo(2920), amcStart: null, amcEnd: null, supplierVendor: vendors[1]._id, assignedEngineer: null, roomNumber: 'R-102', building: 'Block A', currentStatus: 'Disposed', isDisposed: true, remarks: 'End of useful life - decommissioned and scrapped'
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

    const ecgMachine = createdEquipment[0];    // ECG Machine (Scheduled Today)
    const patientMonitor = createdEquipment[1]; // Patient Monitor (Completed with checklist)
    const ventilator = createdEquipment[3];    // Ventilator (Overdue 1 day)
    const mriScanner = createdEquipment[6];    // MRI Scanner (Completed with spare parts)
    const infusionPump = createdEquipment[8];  // Infusion Pump (Scheduled Tomorrow)

    const maintenanceRecords = [
      {
        equipment: ecgMachine._id,
        type: 'Routine',
        scheduledDate: daysFromNow(0), // TODAY
        engineer: engineerUser._id,
        status: 'Scheduled',
        workDescription: 'Monthly routine electrical safety inspection, lead continuity testing, and printer calibration.',
        cost: 0,
        nextServiceDate: daysFromNow(30),
        checklistItems: [
          { label: 'Power supply & battery backup test', status: 'Pending', notes: '' },
          { label: 'Visual casing & connector inspection', status: 'Pending', notes: '' },
          { label: '12-lead cable continuity test', status: 'Pending', notes: '' },
          { label: 'Thermal printer test print', status: 'Pending', notes: '' }
        ]
      },
      {
        equipment: infusionPump._id,
        type: 'Preventive',
        scheduledDate: daysFromNow(1), // TOMORROW (Presentation day!)
        engineer: engineerUser._id,
        status: 'Scheduled',
        workDescription: 'Quarterly flow rate accuracy check, occlusion pressure sensor calibration, and battery run-time verification.',
        cost: 0,
        nextServiceDate: daysFromNow(90),
        checklistItems: [
          { label: 'Flow rate accuracy test (±2% tolerance)', status: 'Pending', notes: '' },
          { label: 'Occlusion sensor pressure response', status: 'Pending', notes: '' },
          { label: 'Air-in-line ultrasonic detector test', status: 'Pending', notes: '' },
          { label: 'Battery hold charge test (minimum 4 hours)', status: 'Pending', notes: '' }
        ]
      },
      {
        equipment: ventilator._id,
        type: 'Preventive',
        scheduledDate: daysAgo(1), // Overdue by 1 day
        engineer: engineerUser._id,
        status: 'Overdue',
        workDescription: 'Scheduled full preventive overhaul: O2 sensor replacement and circuit leak test.',
        cost: 0,
        remarks: 'Maintenance 1 day overdue - priority service requested by ICU'
      },
      {
        equipment: patientMonitor._id,
        type: 'Preventive',
        scheduledDate: daysAgo(3),
        completedDate: daysAgo(3),
        engineer: engineerUser._id,
        status: 'Completed',
        workDescription: 'Preventive maintenance performed. Replaced damaged SpO2 sensor cable and updated module firmware.',
        partsReplaced: 'SpO2 Finger Sensor Assembly',
        cost: 1450,
        remarks: 'Monitor calibrated and verified for ICU duty.',
        nextServiceDate: daysFromNow(5),
        checklistItems: [
          { label: 'Power supply & battery backup test', status: 'Pass', notes: 'Battery health 99%' },
          { label: 'Visual casing & display inspection', status: 'Pass', notes: 'Touch screen responsive' },
          { label: 'ECG / NIBP / SpO2 sensor input verification', status: 'Pass', notes: 'Pulse oximetry signal nominal' },
          { label: 'Audio and visual alarm functional check', status: 'Pass', notes: 'All warning tones working' }
        ],
        spareParts: [
          {
            partName: 'Adult Reusable SpO2 Sensor',
            partNumber: 'MR-SPO2-AD',
            quantity: 1,
            unitCost: 1450,
            totalPrice: 1450,
            suppliedBy: 'Mindray Healthcare',
            replacementDate: daysAgo(3),
            notes: 'Replaced fluctuating sensor probe'
          }
        ]
      },
      {
        equipment: mriScanner._id,
        type: 'Preventive',
        scheduledDate: daysAgo(8),
        completedDate: daysAgo(8),
        engineer: engineerUser._id,
        status: 'Completed',
        workDescription: 'Cryogen levels check, gradient coil thermal inspection, and magnetic field calibration.',
        partsReplaced: 'Compressor Helium Adsorber Filter',
        cost: 8500,
        remarks: 'All magnetic and imaging tolerances certified.',
        nextServiceDate: daysFromNow(30),
        checklistItems: [
          { label: 'Cryogen / liquid helium level check', status: 'Pass', notes: 'Helium level at 94%' },
          { label: 'RF coil connectivity & signal SNR check', status: 'Pass', notes: 'Signal-to-noise ratio within spec' },
          { label: 'Gradient coil cooling system pressure', status: 'Pass', notes: 'Cooling loop 4.2 bar nominal' },
          { label: 'Patient table motorized transport check', status: 'Pass', notes: 'Smooth translation' }
        ],
        spareParts: [
          {
            partName: 'Helium Adsorber Capsule',
            partNumber: 'SI-ADS-500',
            quantity: 1,
            unitCost: 8500,
            totalPrice: 8500,
            suppliedBy: 'Siemens Healthineers',
            replacementDate: daysAgo(8),
            notes: 'Scheduled annual adsorber exchange'
          }
        ]
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
      issueDescription: 'ECG trace showing intermittent lead artifact on chest leads V1-V3.',
      priority: 'High',
      status: 'Assigned',
      assignedEngineer: engineerUser._id,
      additionalNotes: 'Occurs primarily when patient moves slightly.',
      updates: [
        { status: 'Open', note: 'Complaint raised by ward nurse.', updatedBy: staffUser._id, timestamp: daysAgo(1) },
        { status: 'Assigned', note: 'Assigned to Tech. James Wilson for lead continuity inspection.', updatedBy: adminUser._id, timestamp: daysAgo(1) }
      ]
    });
    await complaint1.save();

    const complaint2 = new Complaint({
      equipment: patientMonitor._id,
      department: departments[4]._id,
      raisedBy: staffUser._id,
      issueDescription: 'NIBP cuff taking longer than usual to inflate during routine interval readings.',
      priority: 'Medium',
      status: 'In Progress',
      assignedEngineer: engineerUser._id,
      updates: [
        { status: 'Open', note: 'Complaint submitted.', updatedBy: staffUser._id, timestamp: daysAgo(2) },
        { status: 'Assigned', note: 'Assigned to engineer.', updatedBy: adminUser._id, timestamp: daysAgo(2) },
        { status: 'In Progress', note: 'Technician checking pneumatic valve and tubing connector seal.', updatedBy: engineerUser._id, timestamp: daysAgo(1) }
      ]
    });
    await complaint2.save();

    const complaint3 = new Complaint({
      equipment: ventilator._id,
      department: departments[0]._id, // Emergency
      raisedBy: adminUser._id,
      issueDescription: 'Ventilator touch screen calibration slightly misaligned on right edge.',
      priority: 'Low',
      status: 'Completed',
      assignedEngineer: engineerUser._id,
      updates: [
        { status: 'Open', note: 'Complaint reported.', updatedBy: adminUser._id, timestamp: daysAgo(5) },
        { status: 'Assigned', note: 'Assigned.', updatedBy: adminUser._id, timestamp: daysAgo(5) },
        { status: 'In Progress', note: 'Touch digitizer re-calibrated via service mode.', updatedBy: engineerUser._id, timestamp: daysAgo(4) },
        { status: 'Completed', note: 'Screen response verified and sanitized.', updatedBy: engineerUser._id, timestamp: daysAgo(3) }
      ]
    });
    await complaint3.save();

    console.log('Seeded 3 complaints.');

    // ─── 7. Calibration ────────────────────────────────────────────────────────
    console.log('Seeding Calibrations...');

    await Calibration.insertMany([
      {
        equipment: ecgMachine._id,
        calibrationDate: daysAgo(90),
        dueDate: daysFromNow(3), // Due in 3 days!
        engineer: engineerUser._id,
        result: 'Pass',
        observations: 'All leads within ±1.5% tolerance. Ready for periodic recalibration.',
        status: 'Completed',
        certificateUpload: ''
      },
      {
        equipment: infusionPump._id,
        calibrationDate: daysAgo(180),
        dueDate: daysFromNow(1), // Due Tomorrow!
        engineer: engineerUser._id,
        result: 'Pass',
        observations: 'Annual flow delivery calibration due tomorrow.',
        status: 'Pending',
        certificateUpload: ''
      },
      {
        equipment: ventilator._id,
        calibrationDate: daysAgo(185),
        dueDate: daysAgo(1), // Overdue 1 day
        engineer: engineerUser._id,
        result: 'Pass',
        observations: 'Flow sensor calibrated. 1 day overdue for renewal.',
        status: 'Overdue',
        certificateUpload: ''
      },
      {
        equipment: mriScanner._id,
        calibrationDate: daysAgo(30),
        dueDate: daysFromNow(60),
        engineer: engineerUser._id,
        result: 'Pass',
        observations: 'Magnetic field homogeneity certified within spec.',
        status: 'Completed',
        certificateUpload: ''
      }
    ]);
    console.log('Seeded 4 calibration records.');

    // ─── 8. Transfer History ────────────────────────────────────────────────────
    console.log('Seeding Transfer records...');

    await AssetTransfer.insertMany([
      {
        equipment: createdEquipment[4]._id, // Ultrasound
        previousDepartment: departments[4]._id, // Cardiology
        newDepartment: departments[1]._id,       // Radiology
        transferDate: daysAgo(14),
        approvedBy: adminUser._id,
        reason: 'Radiology department received higher patient volume. Relocated for optimal equipment utilization.',
        currentLocation: { roomNumber: 'R-201', building: 'Block A' }
      }
    ]);
    console.log('Seeded 1 transfer record.');

    // ─── 9. Disposal Record ────────────────────────────────────────────────────
    console.log('Seeding Disposal records...');
    const disposedEquip = createdEquipment[9]; // Old X-Ray Unit

    await DisposalRecord.create({
      equipment: disposedEquip._id,
      disposalDate: daysAgo(7),
      reason: 'Equipment reached end of useful life (10 years). Repair costs exceed replacement value.',
      disposalMethod: 'Medical Equipment Scrapping via certified vendor',
      scrapValue: 15000,
      approvedBy: adminUser._id,
      remarks: 'Decommissioned safely. Replaced by Digital X-Ray System.'
    });
    console.log('Seeded 1 disposal record.');

    // ─── 10. Notifications ─────────────────────────────────────────────────────
    console.log('Seeding Notifications...');

    await Notification.insertMany([
      { role: 'Admin',                title: 'Maintenance Due Tomorrow',     message: 'Infusion Pump (EQ-2026-009) quarterly maintenance is scheduled for tomorrow.', category: 'Info' },
      { role: 'Admin',                title: 'Maintenance Due Today',        message: 'ECG Machine (EQ-2026-001) routine maintenance is scheduled for today.', category: 'Warning' },
      { role: 'Admin',                title: 'Maintenance Overdue',          message: 'Ventilator (EQ-2026-004) preventive maintenance is 1 day overdue.', category: 'Critical' },
      { role: 'Admin',                title: 'Warranty Expired',             message: 'Defibrillator (EQ-2026-003) warranty expired 15 days ago. Active under AMC.', category: 'Warning' },
      { user: engineerUser._id,       title: 'Task Scheduled for Today',     message: 'ECG Machine (EQ-2026-001) routine inspection scheduled for today.', category: 'Info' },
      { user: engineerUser._id,       title: 'Task Scheduled for Tomorrow',  message: 'Infusion Pump (EQ-2026-009) preventive maintenance scheduled for tomorrow.', category: 'Info' },
      { user: staffUser._id,          title: 'Complaint Update',             message: 'Complaint for ECG Machine has been assigned to Tech. James Wilson.', category: 'Info' },
      { role: 'Vendor',               title: 'Service Notification',         message: 'Patient Monitor (EQ-2026-002) completed recent sensor maintenance.', category: 'Success' }
    ]);
    console.log('Seeded 8 notifications.');

    console.log('\n✅ Database seeded successfully!');
    console.log('─────────────────────────────────────────────');
    console.log('Demo Login Credentials:');
    console.log('  Admin:            admin@hospital.com      / Admin@123');
    console.log('  Technician:       technician@hospital.com / Technician@123');
    console.log('  Department Staff: staff@hospital.com      / Staff@123');
    console.log('  Vendor:           vendor@hospital.com     / Vendor@123');
    console.log('─────────────────────────────────────────────\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error.message);
    process.exit(1);
  }
};

seedData();
