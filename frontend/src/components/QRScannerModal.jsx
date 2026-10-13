import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, X, Search, Camera, CheckCircle2, AlertCircle, ArrowRight, ExternalLink, Wrench, Plus, Gauge } from 'lucide-react';
import { equipmentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function QRScannerModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'search'
  const [equipmentList, setEquipmentList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [scannedResult, setScannedResult] = useState(null);
  const [scannedEquipment, setScannedEquipment] = useState(null);
  const [loadingEq, setLoadingEq] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  const scannerRef = useRef(null);
  const html5QrcodeRef = useRef(null);

  // Load equipment for quick lookup tab
  useEffect(() => {
    if (isOpen) {
      equipmentAPI.getAll()
        .then(res => {
          if (res.data.success) {
            setEquipmentList(res.data.equipment || []);
          }
        })
        .catch(err => console.error('Failed to load equipment list:', err));
    } else {
      stopScanner();
      setScannedResult(null);
      setScannedEquipment(null);
      setCameraError(null);
    }
  }, [isOpen]);

  // Start Camera Scanner
  useEffect(() => {
    if (isOpen && activeTab === 'camera' && !scannedEquipment) {
      startScanner();
    } else {
      stopScanner();
    }
    return () => {
      stopScanner();
    };
  }, [isOpen, activeTab, scannedEquipment]);

  const startScanner = async () => {
    setCameraError(null);
    try {
      if (html5QrcodeRef.current) {
        await stopScanner();
      }

      // Check camera permission / devices
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setCameraError('No camera found on this device. Use manual lookup tab below.');
        return;
      }

      const html5Qrcode = new Html5Qrcode('qr-reader-container');
      html5QrcodeRef.current = html5Qrcode;

      const cameraId = devices[devices.length - 1]?.id || devices[0]?.id;

      await html5Qrcode.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 220, height: 220 }
        },
        (decodedText) => {
          handleDecodedText(decodedText);
        },
        () => {
          // ignore scan errors (frame by frame)
        }
      );
      setIsScanning(true);
    } catch (err) {
      console.warn('Camera scanner start error:', err);
      setCameraError('Camera access denied or unavailable. Use the manual lookup tab below.');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
        await html5QrcodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
      html5QrcodeRef.current = null;
    }
    setIsScanning(false);
  };

  const handleDecodedText = async (rawText) => {
    stopScanner();
    setScannedResult(rawText);
    setLoadingEq(true);

    // Parse potential equipment ID or ObjectId
    let targetId = rawText.trim();
    if (targetId.startsWith('HAMS-EQ-')) {
      targetId = targetId.replace('HAMS-EQ-', '');
    } else if (targetId.includes('/equipment/')) {
      targetId = targetId.split('/equipment/').pop();
    }

    try {
      // Find matching equipment by _id or equipmentId
      const res = await equipmentAPI.getAll();
      if (res.data.success) {
        const found = res.data.equipment.find(
          e => e._id === targetId || e.equipmentId?.toLowerCase() === targetId.toLowerCase() || e.serialNumber?.toLowerCase() === targetId.toLowerCase()
        );
        if (found) {
          setScannedEquipment(found);
        } else {
          // Try fetching by ID
          try {
            const single = await equipmentAPI.getById(targetId);
            if (single.data.success) {
              setScannedEquipment(single.data.equipment);
            } else {
              setScannedEquipment(null);
            }
          } catch (e) {
            setScannedEquipment(null);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setScannedEquipment(null);
    } finally {
      setLoadingEq(false);
    }
  };

  const handleSelectEquipment = (eq) => {
    setScannedEquipment(eq);
    setScannedResult(eq.equipmentId);
    stopScanner();
  };

  const handleAction = (path) => {
    onClose();
    navigate(path);
  };

  if (!isOpen) return null;

  const filteredEquipment = equipmentList.filter(eq =>
    eq.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    eq.equipmentId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    eq.department?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    eq.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
              <QrCode className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Equipment QR Scanner</h2>
              <p className="text-[11px] text-blue-100">Scan equipment tag or search asset code</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* If an equipment has been scanned / selected */}
          {scannedEquipment ? (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-1" />
                <h3 className="text-base font-bold text-slate-800">{scannedEquipment.name}</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">Asset ID: {scannedEquipment.equipmentId}</p>
                
                <div className="flex justify-center gap-2 mt-3">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    scannedEquipment.currentStatus === 'Working' ? 'bg-emerald-100 text-emerald-800' :
                    scannedEquipment.currentStatus === 'Under Maintenance' ? 'bg-amber-100 text-amber-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {scannedEquipment.currentStatus}
                  </span>
                  <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full">
                    {scannedEquipment.department?.name || 'Department'}
                  </span>
                </div>
              </div>

              {/* Equipment Spec Snapshot */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Model</span>
                  <span className="font-semibold text-slate-700">{scannedEquipment.model || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Serial No.</span>
                  <span className="font-semibold text-slate-700">{scannedEquipment.serialNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Location</span>
                  <span className="font-semibold text-slate-700">{scannedEquipment.location || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Warranty Expiry</span>
                  <span className="font-semibold text-slate-700">
                    {scannedEquipment.warrantyExpiryDate ? new Date(scannedEquipment.warrantyExpiryDate).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quick Actions</p>
                
                <button
                  onClick={() => handleAction(`/equipment/${scannedEquipment._id}`)}
                  className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-blue-700 font-semibold text-xs transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" /> View Full Equipment Lifecycle
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                {user?.role === 'Department Staff' && (
                  <button
                    onClick={() => handleAction(`/raise-complaint?equipmentId=${scannedEquipment._id}`)}
                    className="w-full flex items-center justify-between p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-amber-800 font-semibold text-xs transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Plus className="h-4 w-4" /> Report Issue / Raise Complaint
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}

                {(user?.role === 'Admin' || user?.role === 'Biomedical Engineer') && (
                  <>
                    <button
                      onClick={() => handleAction(`/maintenance?equipmentId=${scannedEquipment._id}`)}
                      className="w-full flex items-center justify-between p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-emerald-800 font-semibold text-xs transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Wrench className="h-4 w-4" /> Schedule / Log Maintenance
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => handleAction(`/calibration?equipmentId=${scannedEquipment._id}`)}
                      className="w-full flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl text-purple-800 font-semibold text-xs transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Gauge className="h-4 w-4" /> Record Calibration Test
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>

              {/* Scan Another Button */}
              <button
                onClick={() => {
                  setScannedEquipment(null);
                  setScannedResult(null);
                  setActiveTab('camera');
                }}
                className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-700 font-medium text-center border-t border-slate-100 mt-2"
              >
                Scan Another Equipment Tag
              </button>
            </div>
          ) : (
            /* Mode Selection Tabs & Scanner UI */
            <div>
              {/* Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
                <button
                  onClick={() => setActiveTab('camera')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'camera' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Camera className="h-4 w-4" /> Live Camera
                </button>
                <button
                  onClick={() => setActiveTab('search')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'search' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Search className="h-4 w-4" /> Manual Search / Lookup
                </button>
              </div>

              {activeTab === 'camera' ? (
                <div className="space-y-3">
                  {cameraError ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-2">
                      <AlertCircle className="h-6 w-6 text-amber-600 mx-auto" />
                      <p className="text-xs font-medium text-amber-800">{cameraError}</p>
                      <button
                        onClick={() => setActiveTab('search')}
                        className="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700"
                      >
                        Switch to Manual Lookup
                      </button>
                    </div>
                  ) : (
                    <div className="relative rounded-2xl overflow-hidden border-2 border-dashed border-blue-300 bg-slate-900 min-h-[250px] flex items-center justify-center">
                      <div id="qr-reader-container" className="w-full h-full" />
                      {loadingEq && (
                        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-2">
                          <div className="h-8 w-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
                          <p className="text-xs font-semibold">Reading QR Code...</p>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 text-center">
                    Point your camera directly at the QR sticker tag attached to the equipment.
                  </p>
                </div>
              ) : (
                /* Search / Select List */
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Enter Asset ID, Name, Serial Number or Department..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1.5 divide-y divide-slate-100">
                    {filteredEquipment.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs">No matching equipment found</div>
                    ) : (
                      filteredEquipment.map((eq) => (
                        <div
                          key={eq._id}
                          onClick={() => handleSelectEquipment(eq)}
                          className="p-2.5 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors flex items-center justify-between"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-800">{eq.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{eq.equipmentId} • {eq.department?.name}</p>
                          </div>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            eq.currentStatus === 'Working' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {eq.currentStatus}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
