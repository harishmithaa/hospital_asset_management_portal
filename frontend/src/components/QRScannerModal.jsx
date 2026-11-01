import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, X, Search, Camera, CheckCircle2, AlertCircle, ArrowRight, ExternalLink, Wrench, Plus, Gauge, SwitchCamera, RefreshCw } from 'lucide-react';
import { equipmentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function QRScannerModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'search'
  const [equipmentList, setEquipmentList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [scannedResult, setScannedResult] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [loadingEq, setLoadingEq] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  // Camera selection & switching state
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // default to 'environment' (back camera)
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);

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
      setScanError(null);
      setCameraError(null);
    }
  }, [isOpen]);

  // Start Camera Scanner
  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      startScanner();
    } else {
      stopScanner();
    }
    return () => {
      stopScanner();
    };
  }, [isOpen, activeTab]);

  const startScanner = async (targetOverride) => {
    setCameraError(null);
    try {
      if (html5QrcodeRef.current) {
        await stopScanner();
      }

      // Check camera devices
      let devices = [];
      try {
        devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
        }
      } catch (err) {
        console.warn('Could not enumerate cameras prior to permission:', err);
      }

      const html5Qrcode = new Html5Qrcode('qr-reader-container');
      html5QrcodeRef.current = html5Qrcode;

      // Determine camera config:
      // 1. Explicit override (when switching cameras)
      // 2. Previously selected device ID
      // 3. Known back camera device ID from labels
      // 4. Fallback to standard MediaTrackConstraints: { facingMode: "environment" } (rear camera on mobile)
      let cameraConfig = targetOverride;
      if (!cameraConfig) {
        if (selectedCameraId) {
          cameraConfig = selectedCameraId;
        } else if (devices.length > 0) {
          const backCam = devices.find(d => {
            const l = (d.label || '').toLowerCase();
            return l.includes('back') || l.includes('rear') || l.includes('environment');
          });
          if (backCam) {
            cameraConfig = backCam.id;
            setSelectedCameraId(backCam.id);
            setFacingMode('environment');
          } else {
            cameraConfig = { facingMode: facingMode || 'environment' };
          }
        } else {
          cameraConfig = { facingMode: facingMode || 'environment' };
        }
      }

      await html5Qrcode.start(
        cameraConfig,
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const qrEdge = Math.floor(minEdge * 0.72);
            return { width: Math.max(200, qrEdge), height: Math.max(200, qrEdge) };
          },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleDecodedText(decodedText);
        },
        () => {
          // ignore scan frame errors
        }
      );
      setIsScanning(true);

      // Once permission is granted, camera labels become available. Query them again:
      try {
        const freshDevices = await Html5Qrcode.getCameras();
        if (freshDevices && freshDevices.length > 0) {
          setCameras(freshDevices);
        }
      } catch (_) {}
    } catch (err) {
      console.warn('Camera scanner start error with primary config, attempting fallback:', err);
      // Fallback: If { facingMode: "environment" } fails on PC/laptop webcam,
      // fallback to the first available camera or user facing mode:
      try {
        const freshDevices = await Html5Qrcode.getCameras();
        if (freshDevices && freshDevices.length > 0) {
          setCameras(freshDevices);
          const fallbackId = freshDevices[0].id;
          setSelectedCameraId(fallbackId);
          await html5QrcodeRef.current.start(
            fallbackId,
            { fps: 10, qrbox: { width: 220, height: 220 } },
            (decodedText) => handleDecodedText(decodedText),
            () => {}
          );
          setIsScanning(true);
          return;
        }
      } catch (fallbackErr) {
        console.error('All camera attempts failed:', fallbackErr);
      }
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

  const handleToggleCamera = async () => {
    if (isSwitchingCamera) return;
    setIsSwitchingCamera(true);
    try {
      await stopScanner();

      // If we have recognized multiple devices in `cameras`:
      if (cameras.length > 1) {
        const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
        const nextIndex = (currentIndex + 1) % cameras.length;
        const nextDevice = cameras[nextIndex];
        setSelectedCameraId(nextDevice.id);
        const isBack = (nextDevice.label || '').toLowerCase().includes('back') || (nextDevice.label || '').toLowerCase().includes('rear');
        setFacingMode(isBack ? 'environment' : 'user');
        await startScanner(nextDevice.id);
      } else {
        // Toggle between environment (back) and user (front)
        const nextMode = facingMode === 'environment' ? 'user' : 'environment';
        setFacingMode(nextMode);
        setSelectedCameraId(null);
        await startScanner({ facingMode: nextMode });
      }
    } catch (err) {
      console.error('Failed to switch camera:', err);
    } finally {
      setIsSwitchingCamera(false);
    }
  };

  const handleSelectSpecificCamera = async (deviceId) => {
    if (isSwitchingCamera || deviceId === selectedCameraId) return;
    setIsSwitchingCamera(true);
    try {
      await stopScanner();
      setSelectedCameraId(deviceId);
      const cam = cameras.find(c => c.id === deviceId);
      if (cam) {
        const isBack = (cam.label || '').toLowerCase().includes('back') || (cam.label || '').toLowerCase().includes('rear');
        setFacingMode(isBack ? 'environment' : 'user');
      }
      await startScanner(deviceId);
    } catch (err) {
      console.error('Failed to switch camera:', err);
    } finally {
      setIsSwitchingCamera(false);
    }
  };

  const getCameraDisplayName = () => {
    if (selectedCameraId && cameras.length > 0) {
      const active = cameras.find(c => c.id === selectedCameraId);
      if (active?.label) return active.label;
    }
    return facingMode === 'environment' ? 'Rear / Back Camera' : 'Front Camera';
  };

  const handleDecodedText = async (rawText) => {
    stopScanner();
    setScannedResult(rawText);
    setScanError(null);
    setLoadingEq(true);

    // Parse equipment ID from multiple formats:
    // 1. Full app URL: http://localhost:5173/equipment/{mongoId}
    // 2. Legacy tag:   HAMS-EQ-{mongoId}
    // 3. Raw MongoDB ObjectId or equipmentId (e.g. EQ-2026-001)
    let targetId = rawText.trim();

    const urlMatch = targetId.match(/\/equipment\/([^/?#\s]+)/i);
    if (urlMatch) {
      // Direct URL format — navigate immediately
      setLoadingEq(false);
      onClose();
      navigate(`/equipment/${urlMatch[1]}`);
      return;
    }

    if (targetId.startsWith('HAMS-EQ-')) {
      targetId = targetId.replace('HAMS-EQ-', '');
    }

    try {
      // Try direct fetch by ObjectId first
      try {
        const single = await equipmentAPI.getById(targetId);
        if (single.data.success && single.data.equipment) {
          setLoadingEq(false);
          onClose();
          navigate(`/equipment/${single.data.equipment._id}`);
          return;
        }
      } catch (_) { /* not a valid ObjectId, fall through to list search */ }

      // Fall back: search the list by equipmentId / serialNumber
      const res = await equipmentAPI.getAll();
      if (res.data.success) {
        const found = res.data.equipment.find(
          e => e._id === targetId ||
               e.equipmentId?.toLowerCase() === targetId.toLowerCase() ||
               e.serialNumber?.toLowerCase() === targetId.toLowerCase()
        );
        if (found) {
          setLoadingEq(false);
          onClose();
          navigate(`/equipment/${found._id}`);
          return;
        }
      }

      // Nothing found — show error state
      setScanError(`No equipment matched "${rawText}". Check the QR sticker and try again.`);
      setScannedEquipment(null);
    } catch (err) {
      console.error(err);
      setScanError('Failed to look up equipment. Check your connection and try again.');
    } finally {
      setLoadingEq(false);
    }
  };

  const handleSelectEquipment = (eq) => {
    // Manual selection from list → navigate directly
    onClose();
    navigate(`/equipment/${eq._id}`);
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
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* Loading overlay while looking up QR code */}
          {loadingEq && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
                <div className="h-10 w-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm font-semibold text-blue-700">Looking up equipment...</p>
                <p className="text-xs text-blue-400 mt-1">Navigating to equipment details</p>
              </div>
            </div>
          )}

          {/* Scan error state */}
          {!loadingEq && scanError && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-800 mb-1">Equipment Not Found</h3>
                <p className="text-xs text-red-600">{scanError}</p>
              </div>
              <button
                onClick={() => {
                  setScanError(null);
                  setScannedResult(null);
                  setActiveTab('camera');
                }}
                className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-700 font-semibold text-center border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Scanner / Search tabs — shown when not loading and no error */}
          {!loadingEq && !scanError && (

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
                    <div className="space-y-2.5">
                      {/* Camera Bar / Quick Switcher */}
                      <div className="flex items-center justify-between gap-2 p-2 bg-slate-100 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                          <span className="text-xs font-bold text-slate-700 truncate">
                            {getCameraDisplayName()}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleToggleCamera}
                          disabled={isSwitchingCamera}
                          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-white hover:bg-slate-50 text-blue-700 border border-slate-200 rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50 flex-shrink-0"
                          title="Switch between front and back camera"
                        >
                          <SwitchCamera className={`h-3.5 w-3.5 text-blue-600 ${isSwitchingCamera ? 'animate-spin' : ''}`} />
                          <span>Switch Camera</span>
                        </button>
                      </div>

                      {/* Device dropdown if 3+ lenses detected */}
                      {cameras.length > 2 && (
                        <div className="flex items-center gap-2 px-1">
                          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex-shrink-0">Lens:</span>
                          <select
                            value={selectedCameraId || ''}
                            onChange={(e) => handleSelectSpecificCamera(e.target.value)}
                            className="flex-1 text-xs py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:ring-1 focus:ring-blue-500"
                          >
                            {cameras.map((c, i) => (
                              <option key={c.id} value={c.id}>
                                {c.label || `Camera ${i + 1}`}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Live Camera Viewfinder */}
                      <div className="relative rounded-2xl overflow-hidden border-2 border-dashed border-blue-300 bg-slate-900 min-h-[260px] flex items-center justify-center">
                        <div id="qr-reader-container" className="w-full h-full" />

                        {/* Floating quick flip camera button */}
                        <button
                          type="button"
                          onClick={handleToggleCamera}
                          disabled={isSwitchingCamera}
                          className="absolute top-3 right-3 z-20 h-9 w-9 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur flex items-center justify-center shadow-lg border border-white/20 active:scale-90 transition-all disabled:opacity-50"
                          title="Switch Camera (Front / Back)"
                          aria-label="Switch Camera"
                        >
                          <SwitchCamera className={`h-4 w-4 ${isSwitchingCamera ? 'animate-spin' : ''}`} />
                        </button>

                        {/* Scanning frame guide */}
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div className="w-48 h-48 border-2 border-emerald-400/80 rounded-2xl relative shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]">
                            <span className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                            <span className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                            <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                            <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
                          </div>
                        </div>

                        {loadingEq && (
                          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-2 z-30">
                            <div className="h-8 w-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs font-semibold">Reading QR Code...</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 text-center">
                    Point your camera directly at the QR sticker tag. Tap "Switch Camera" to toggle between back and front camera.
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
