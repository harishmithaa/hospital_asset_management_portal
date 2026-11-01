import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { calibrationAPI, equipmentAPI, authAPI, getFileUrl } from '../services/api';
import {
  Gauge, Plus, X, AlertTriangle, CheckCircle2,
  FileText, Calendar, Clock, ChevronRight, Search,
  Filter, Building2, MapPin, User, ShieldCheck, Check,
  ArrowRight, Upload, Sparkles
} from 'lucide-react';

const statusColors = {
  'Completed':      'bg-emerald-100 text-emerald-700 border border-emerald-200',
  'Pending':        'bg-blue-100 text-blue-700 border border-blue-200',
  'Overdue':        'bg-red-100 text-red-700 border border-red-200',
  'Not Calibrated': 'bg-slate-100 text-slate-500 border border-slate-200',
  'Cancelled':      'bg-slate-100 text-slate-500 border border-slate-200',
};

const isPastDue = (dateStr) => {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return target.getTime() < today.getTime();
};

const formatTechName = (name) => {
  if (!name) return '—';
  return name.replace(/^Eng\.\s+/i, 'Tech. ');
};

// ─── Modal 1: Log / Complete Calibration (Mandatory Certificate) ───────────
function LogCalibrationModal({ equipment, pendingRecord, technicians, onClose, onCompleted }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  // Calculate default next due date (+6 months)
  const defaultDueDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().slice(0, 10);
  };

  const [form, setForm] = useState({
    equipment: equipment?._id || pendingRecord?.equipment?._id || '',
    calibrationDate: new Date().toISOString().slice(0, 10),
    dueDate: pendingRecord?.dueDate ? new Date(pendingRecord.dueDate).toISOString().slice(0, 10) : defaultDueDate(),
    engineer: pendingRecord?.engineer?._id || user?._id || '',
    result: 'Pass',
    observations: pendingRecord?.observations || ''
  });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fileError, setFileError] = useState('');

  const handleQuickDue = (months) => {
    const base = new Date(form.calibrationDate || Date.now());
    base.setMonth(base.getMonth() + months);
    setForm(f => ({ ...f, dueDate: base.toISOString().slice(0, 10) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check mandatory document submission
    if (!file && !pendingRecord?.certificateUpload) {
      setFileError('Calibration certificate / test report document is mandatory to certify and mark as Completed.');
      return;
    }
    setFileError('');

    if (!form.equipment || !form.dueDate) {
      alert('Equipment and next due date are required');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('equipment', form.equipment);
      formData.append('calibrationDate', form.calibrationDate);
      formData.append('dueDate', form.dueDate);
      formData.append('result', form.result);
      formData.append('observations', form.observations || '');
      formData.append('engineer', form.engineer || user._id);
      formData.append('status', 'Completed'); // Set to completed because document is provided!
      if (file) formData.append('certificateUpload', file);

      let savedRecord;
      if (pendingRecord?._id) {
        const res = await calibrationAPI.update(pendingRecord._id, formData);
        savedRecord = res.data.calibration;
      } else {
        const res = await calibrationAPI.create(formData);
        savedRecord = res.data.calibration;
      }

      onCompleted(savedRecord, equipment || pendingRecord?.equipment);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit calibration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800">
              {pendingRecord ? 'Complete Pending Calibration' : 'Log Certified Calibration'}
            </h3>
            <p className="text-xs text-slate-400">
              {equipment?.name || pendingRecord?.equipment?.name} ({equipment?.equipmentId || pendingRecord?.equipment?.equipmentId})
            </p>
          </div>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400 hover:text-slate-600" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Calibration Date *</label>
              <input
                type="date"
                value={form.calibrationDate}
                onChange={e => setForm(f => ({ ...f, calibrationDate: e.target.value }))}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Result *</label>
              <select
                value={form.result}
                onChange={e => setForm(f => ({ ...f, result: e.target.value }))}
                className="input-field"
              >
                <option value="Pass">Pass (Compliant)</option>
                <option value="Fail">Fail (Out of Tolerance)</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-600">Validity / Next Due Date *</label>
              <div className="flex gap-1">
                <button type="button" onClick={() => handleQuickDue(6)} className="text-[10px] font-bold px-2 py-0.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded">
                  +6 Months
                </button>
                <button type="button" onClick={() => handleQuickDue(12)} className="text-[10px] font-bold px-2 py-0.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded">
                  +1 Year
                </button>
              </div>
            </div>
            <input
              type="date"
              value={form.dueDate}
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Technician Responsible</label>
            <select
              value={form.engineer}
              onChange={e => setForm(f => ({ ...f, engineer: e.target.value }))}
              className="input-field"
            >
              <option value={user?._id}>Current ({formatTechName(user?.name)})</option>
              {technicians.filter(t => t._id !== user?._id).map(t => (
                <option key={t._id} value={t._id}>{formatTechName(t.name)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Observations / Test Values</label>
            <textarea
              value={form.observations}
              onChange={e => setForm(f => ({ ...f, observations: e.target.value }))}
              className="input-field resize-none"
              rows={2}
              placeholder="e.g., Electrical safety within ±1.2%, output calibrated to reference standard..."
            />
          </div>

          {/* Mandatory Document Submission Box */}
          <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                <Upload className="h-3.5 w-3.5 text-purple-600" />
                Upload Calibration Certificate (Mandatory) *
              </span>
              <span className="text-[10px] bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded font-bold uppercase">
                Required for Completed
              </span>
            </div>
            <p className="text-[11px] text-purple-700">
              Attach the official calibration report, test log, or vendor certificate (.pdf, .jpg, .png).
            </p>
            <input
              type="file"
              onChange={e => {
                setFile(e.target.files[0]);
                if (e.target.files[0]) setFileError('');
              }}
              accept=".pdf,.jpg,.png,.jpeg"
              className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
            />
            {fileError && <p className="text-xs text-red-600 font-semibold">{fileError}</p>}
            {pendingRecord?.certificateUpload && !file && (
              <p className="text-[11px] text-emerald-700 font-medium">Existing document attached: {pendingRecord.certificateUpload}</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              <CheckCircle2 className="h-4 w-4" />
              {saving ? 'Verifying & Saving...' : 'Submit & Certify'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal 2: Schedule Next Calibration Pop-up (Shows Pending) ────────────
function ScheduleNextModal({ completedRecord, equipment, technicians, onClose, onScheduled }) {
  const { user } = useAuth();

  // Pre-calculate next due date (+1 year or +6 months from completed date)
  const calculateDefault = (months) => {
    const base = completedRecord?.calibrationDate ? new Date(completedRecord.calibrationDate) : new Date();
    base.setMonth(base.getMonth() + months);
    return base.toISOString().slice(0, 10);
  };

  const [form, setForm] = useState({
    dueDate: calculateDefault(12),
    engineer: completedRecord?.engineer?._id || user?._id || '',
    observations: 'Scheduled periodic recalibration cycle.'
  });
  const [saving, setSaving] = useState(false);

  const handleQuickDue = (months) => {
    setForm(f => ({ ...f, dueDate: calculateDefault(months) }));
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('equipment', equipment?._id || completedRecord?.equipment?._id || completedRecord?.equipment);
      formData.append('calibrationDate', new Date().toISOString().slice(0, 10));
      formData.append('dueDate', form.dueDate);
      formData.append('engineer', form.engineer || user?._id);
      formData.append('status', 'Pending'); // Marked as Pending until due date & documents submitted!
      formData.append('result', 'Pass');
      formData.append('observations', form.observations || 'Scheduled periodic calibration task.');

      await calibrationAPI.create(formData);
      onScheduled();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to schedule next calibration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Success header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-emerald-200 animate-pulse" />
            <h3 className="font-bold text-lg">Calibration Certified!</h3>
          </div>
          <p className="text-xs text-emerald-100">
            Document verified. Now schedule the <strong>Next Calibration Cycle</strong> to keep {equipment?.name || 'this device'} compliant.
          </p>
        </div>

        <form onSubmit={handleConfirm} className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2.5">
            <Clock className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-blue-900">Next Cycle Will Show as "Pending"</p>
              <p className="text-[11px] text-blue-700 mt-0.5">
                This schedule will remain <strong>Pending</strong> until its due date arrives, and flips to <strong>Completed</strong> only when new test documents are submitted.
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-600">Next Calibration Due Date *</label>
              <div className="flex gap-1">
                <button type="button" onClick={() => handleQuickDue(6)} className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded">
                  +6 Mo
                </button>
                <button type="button" onClick={() => handleQuickDue(12)} className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded">
                  +1 Year
                </button>
              </div>
            </div>
            <input
              type="date"
              value={form.dueDate}
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Assign Technician</label>
            <select
              value={form.engineer}
              onChange={e => setForm(f => ({ ...f, engineer: e.target.value }))}
              className="input-field"
            >
              <option value={user?._id}>{formatTechName(user?.name)} (Current)</option>
              {technicians.filter(t => t._id !== user?._id).map(t => (
                <option key={t._id} value={t._id}>{formatTechName(t.name)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Reminder Note</label>
            <input
              type="text"
              value={form.observations}
              onChange={e => setForm(f => ({ ...f, observations: e.target.value }))}
              className="input-field text-xs"
              placeholder="e.g., Annual electrical & flow rate verification"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Skip for Now
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              <Calendar className="h-4 w-4" />
              {saving ? 'Scheduling...' : 'Schedule as Pending'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal 3: Equipment Calibration History & Log Drawer ──────────────────
function EquipmentHistoryDrawer({ equipment, records, technicians, onClose, onRefresh, onLogNew, onCompletePending }) {
  const eqRecords = records.filter(r => (r.equipment?._id || r.equipment) === equipment._id);
  const pendingRecord = eqRecords.find(r => r.status === 'Pending' || r.status === 'Overdue');
  const completedRecords = eqRecords.filter(r => r.status === 'Completed');
  const latestCompleted = completedRecords[0];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-end p-0 backdrop-blur-xs transition-opacity">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                {equipment.category}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {equipment.equipmentId}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-800">{equipment.name}</h2>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5 text-slate-400" />{equipment.department?.name || '—'}</span>
              {equipment.roomNumber && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-slate-400" />Room {equipment.roomNumber}</span>}
              {equipment.assignedEngineer && <span className="flex items-center gap-1"><User className="h-3.5 w-3.5 text-slate-400" />{formatTechName(equipment.assignedEngineer?.name)}</span>}
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action & Status Bar */}
        <div className="p-5 border-b border-slate-100 bg-white space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Calibration</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">
                {latestCompleted?.calibrationDate
                  ? new Date(latestCompleted.calibrationDate).toLocaleDateString()
                  : equipment.lastCalibrationDate
                  ? new Date(equipment.lastCalibrationDate).toLocaleDateString()
                  : 'Not Recorded'}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Next Due Date</p>
              <p className={`text-sm font-semibold mt-0.5 ${
                pendingRecord && isPastDue(pendingRecord.dueDate)
                  ? 'text-red-600 font-bold'
                  : 'text-slate-800'
              }`}>
                {pendingRecord?.dueDate
                  ? new Date(pendingRecord.dueDate).toLocaleDateString()
                  : latestCompleted?.dueDate
                  ? new Date(latestCompleted.dueDate).toLocaleDateString()
                  : equipment.nextCalibrationDate
                  ? new Date(equipment.nextCalibrationDate).toLocaleDateString()
                  : 'Not Scheduled'}
              </p>
            </div>
          </div>

          {/* Pending / Overdue Task Alert */}
          {pendingRecord && (
            <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
              isPastDue(pendingRecord.dueDate)
                ? 'bg-red-50 border-red-200'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-start gap-2.5">
                <Clock className={`h-4 w-4 mt-0.5 flex-shrink-0 ${isPastDue(pendingRecord.dueDate) ? 'text-red-600' : 'text-blue-600'}`} />
                <div>
                  <p className={`text-xs font-bold ${isPastDue(pendingRecord.dueDate) ? 'text-red-900' : 'text-blue-900'}`}>
                    {isPastDue(pendingRecord.dueDate) ? 'Calibration Overdue!' : 'Recalibration Pending'}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Due: {new Date(pendingRecord.dueDate).toLocaleDateString()} · Submit certificate to mark Completed.
                  </p>
                </div>
              </div>
              <button
                onClick={() => onCompletePending(pendingRecord)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm flex-shrink-0 ${
                  isPastDue(pendingRecord.dueDate) ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                Submit Document &rarr;
              </button>
            </div>
          )}

          <div className="flex justify-between items-center pt-1">
            <span className="text-xs font-bold text-slate-700">Calibration History ({eqRecords.length})</span>
            <button
              onClick={() => onLogNew(equipment)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-colors shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" /> Log / Schedule Test
            </button>
          </div>
        </div>

        {/* History Ledger */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {eqRecords.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Gauge className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-500">No calibration logs on record</p>
              <p className="text-xs text-slate-400 mt-1">Perform the first precision test and upload its certificate.</p>
              <button
                onClick={() => onLogNew(equipment)}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700"
              >
                Log First Calibration
              </button>
            </div>
          ) : (
            eqRecords.map(r => (
              <div key={r._id} className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        r.result === 'Pass' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {r.result}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[r.status] || 'bg-slate-100 text-slate-600'}`}>
                        {r.status}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 mt-1.5">
                      Calibrated: {new Date(r.calibrationDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Next Due: <span className={isPastDue(r.dueDate) && r.status !== 'Completed' ? 'text-red-600 font-semibold' : 'text-slate-700'}>
                        {new Date(r.dueDate).toLocaleDateString()}
                      </span>
                    </p>
                    {r.observations && (
                      <p className="text-xs text-slate-600 bg-slate-50 rounded-md p-2 mt-2">
                        {r.observations}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-1">
                      Technician: {formatTechName(r.engineer?.name)}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {r.certificateUpload ? (
                      <a
                        href={getFileUrl(r.certificateUpload)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors"
                      >
                        <FileText className="h-3.5 w-3.5 text-purple-600" />
                        <span>Certificate</span>
                      </a>
                    ) : r.status !== 'Completed' ? (
                      <button
                        onClick={() => onCompletePending(r)}
                        className="px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                      >
                        Upload Doc
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">No Doc</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Calibration Tracking Page ───────────────────────────────────────
export default function Calibration() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'Admin';
  const isEngineer = user?.role === 'Technician' || user?.role === 'Biomedical Engineer';

  const [records, setRecords] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState('equipment'); // 'equipment' | 'records'
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [selectedDrawerEquipment, setSelectedDrawerEquipment] = useState(null);
  const [logModalState, setLogModalState] = useState(null); // { equipment, pendingRecord }
  const [scheduleModalState, setScheduleModalState] = useState(null); // { completedRecord, equipment }

  const loadData = async () => {
    setLoading(true);
    try {
      const [calRes, eqRes, usersRes] = await Promise.all([
        calibrationAPI.getAll(),
        equipmentAPI.getAll(),
        authAPI.getUsers().catch(() => ({ data: { success: false, users: [] } }))
      ]);

      if (calRes.data.success) setRecords(calRes.data.calibrations);
      if (eqRes.data.success) setEquipmentList(eqRes.data.equipment);
      if (usersRes.data?.success) {
        setTechnicians(usersRes.data.users.filter(u => u.role === 'Technician' || u.role === 'Biomedical Engineer'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Compute calibration status for every equipment
  const equipmentCalibrationMap = useMemo(() => {
    const map = {};
    equipmentList.forEach(eq => {
      const eqRecords = records.filter(r => (r.equipment?._id || r.equipment) === eq._id);
      const pending = eqRecords.find(r => r.status === 'Pending' || r.status === 'Overdue');
      const completed = eqRecords.filter(r => r.status === 'Completed');
      const latestCompleted = completed[0];

      let status = 'Not Calibrated';
      if (pending) {
        status = isPastDue(pending.dueDate) ? 'Overdue' : 'Pending';
      } else if (latestCompleted) {
        status = isPastDue(latestCompleted.dueDate) ? 'Overdue' : 'Completed';
      } else if (eq.nextCalibrationDate) {
        status = isPastDue(eq.nextCalibrationDate) ? 'Overdue' : 'Completed';
      }

      map[eq._id] = {
        equipment: eq,
        records: eqRecords,
        status,
        lastDate: latestCompleted?.calibrationDate || eq.lastCalibrationDate,
        nextDueDate: pending?.dueDate || latestCompleted?.dueDate || eq.nextCalibrationDate,
        latestCompleted,
        pending
      };
    });
    return map;
  }, [equipmentList, records]);

  // Filtered equipment
  const filteredEquipment = useMemo(() => {
    return equipmentList.filter(eq => {
      const data = equipmentCalibrationMap[eq._id];
      const matchesSearch =
        eq.name?.toLowerCase().includes(search.toLowerCase()) ||
        eq.equipmentId?.toLowerCase().includes(search.toLowerCase()) ||
        eq.department?.name?.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;
      if (filterStatus && data?.status !== filterStatus) return false;
      return true;
    });
  }, [equipmentList, equipmentCalibrationMap, search, filterStatus]);

  // Stats
  const stats = useMemo(() => {
    let completed = 0, pending = 0, overdue = 0, notCalibrated = 0;
    Object.values(equipmentCalibrationMap).forEach(v => {
      if (v.status === 'Completed') completed++;
      else if (v.status === 'Pending') pending++;
      else if (v.status === 'Overdue') overdue++;
      else notCalibrated++;
    });
    return { completed, pending, overdue, notCalibrated, total: equipmentList.length };
  }, [equipmentCalibrationMap, equipmentList]);

  // Flow handlers
  const handleStartLogNew = (equipment) => {
    setLogModalState({ equipment, pendingRecord: null });
  };

  const handleStartCompletePending = (pendingRecord) => {
    const eq = equipmentList.find(e => e._id === (pendingRecord.equipment?._id || pendingRecord.equipment));
    setLogModalState({ equipment: eq, pendingRecord });
  };

  // When a calibration is certified with document -> open Schedule Next Calibration popup!
  const handleCalibrationCompleted = (savedRecord, equipment) => {
    setLogModalState(null);
    loadData();
    // Launch Pop-up for scheduling next calibration!
    setScheduleModalState({ completedRecord: savedRecord, equipment });
  };

  const handleNextScheduled = () => {
    setScheduleModalState(null);
    loadData();
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Gauge className="h-6 w-6 text-purple-600" />
            Equipment Calibration &amp; Compliance Tracking
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Precision verification, certificate document archiving, and recurring calibration cycles
          </p>
        </div>
        {(isAdmin || isEngineer) && (
          <button
            onClick={() => setLogModalState({ equipment: equipmentList[0], pendingRecord: null })}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-colors shadow-sm self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" /> Log Calibration
          </button>
        )}
      </div>

      {/* Overview Stat Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Certified Valid</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.completed}</p>
        </div>
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pending Recalibration</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Overdue Alert</p>
          <p className={`text-2xl font-bold mt-1 ${stats.overdue > 0 ? 'text-red-600' : 'text-slate-400'}`}>
            {stats.overdue}
          </p>
        </div>
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Equipments</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{stats.total}</p>
        </div>
      </div>

      {/* Tabs & Search / Filter Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('equipment')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'equipment' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Equipments ({equipmentList.length})
            </button>
            <button
              onClick={() => setActiveTab('records')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'records' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Calibration Logs ({records.length})
            </button>
          </div>

          {/* Search + Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search equipment or department..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-purple-400"
              />
            </div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-purple-400 bg-white"
            >
              <option value="">All Statuses</option>
              <option value="Completed">Completed / Valid</option>
              <option value="Pending">Pending Recalibration</option>
              <option value="Overdue">Overdue</option>
              <option value="Not Calibrated">Not Calibrated</option>
            </select>
            {(search || filterStatus) && (
              <button onClick={() => { setSearch(''); setFilterStatus(''); }} className="text-xs text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main View Area */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeTab === 'equipment' ? (
        /* ── View 1: Equipments Calibration List (Touch to View History) ──────── */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Equipment</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Department</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Last Calibration</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Next Due Date</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Logs</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEquipment.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      No equipments matching your filter.
                    </td>
                  </tr>
                ) : (
                  filteredEquipment.map(eq => {
                    const data = equipmentCalibrationMap[eq._id];
                    return (
                      <tr
                        key={eq._id}
                        onClick={() => setSelectedDrawerEquipment(eq)}
                        className="hover:bg-purple-50/40 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0 text-purple-600">
                              <Gauge className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800 group-hover:text-purple-700 transition-colors">
                                {eq.name}
                              </p>
                              <p className="text-[11px] text-slate-400 font-mono">{eq.equipmentId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {eq.department?.name || '—'}
                          {eq.roomNumber && <span className="text-slate-400 block text-[10px]">Room {eq.roomNumber}</span>}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {data?.lastDate ? new Date(data.lastDate).toLocaleDateString() : <span className="text-slate-400 italic">None</span>}
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          {data?.nextDueDate ? (
                            <span className={data.status === 'Overdue' ? 'text-red-600 font-bold' : 'text-slate-700 font-medium'}>
                              {new Date(data.nextDueDate).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Not set</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[data?.status] || 'bg-slate-100 text-slate-600'}`}>
                            {data?.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500 font-semibold">
                          {data?.records.length || 0} on file
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-xs text-purple-600 font-bold group-hover:translate-x-0.5 transition-all"
                          >
                            <span>View Log</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── View 2: All Calibration Records Log ─────────────────────────── */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Equipment</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Test Date</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Next Due</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Result</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Technician</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Certificate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      No calibration records logged yet.
                    </td>
                  </tr>
                ) : (
                  records.map(r => (
                    <tr key={r._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => {
                            const eq = equipmentList.find(e => e._id === (r.equipment?._id || r.equipment));
                            if (eq) setSelectedDrawerEquipment(eq);
                          }}
                          className="text-left"
                        >
                          <p className="text-xs font-bold text-purple-700 hover:underline">{r.equipment?.name || 'Equipment'}</p>
                          <p className="text-[10px] text-slate-400">{r.equipment?.equipmentId}</p>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">{new Date(r.calibrationDate).toLocaleDateString()}</td>
                      <td className="py-3.5 px-4 text-xs">
                        <span className={isPastDue(r.dueDate) && r.status !== 'Completed' ? 'text-red-600 font-bold' : 'text-slate-600'}>
                          {new Date(r.dueDate).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.result === 'Pass' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                          {r.result}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[r.status] || 'bg-slate-100 text-slate-600'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">{formatTechName(r.engineer?.name)}</td>
                      <td className="py-3.5 px-4">
                        {r.certificateUpload ? (
                          <a
                            href={getFileUrl(r.certificateUpload)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:underline"
                          >
                            <FileText className="h-3.5 w-3.5" /> View PDF
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No document</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Drawer: Equipment History & Log ─────────────────────────────────── */}
      {selectedDrawerEquipment && (
        <EquipmentHistoryDrawer
          equipment={selectedDrawerEquipment}
          records={records}
          technicians={technicians}
          onClose={() => setSelectedDrawerEquipment(null)}
          onRefresh={loadData}
          onLogNew={handleStartLogNew}
          onCompletePending={handleStartCompletePending}
        />
      )}

      {/* ── Modal 1: Log / Submit Calibration with Mandatory Document ──────── */}
      {logModalState && (
        <LogCalibrationModal
          equipment={logModalState.equipment}
          pendingRecord={logModalState.pendingRecord}
          technicians={technicians}
          onClose={() => setLogModalState(null)}
          onCompleted={handleCalibrationCompleted}
        />
      )}

      {/* ── Modal 2: Schedule Next Calibration Pop-up (Shows as Pending) ───── */}
      {scheduleModalState && (
        <ScheduleNextModal
          completedRecord={scheduleModalState.completedRecord}
          equipment={scheduleModalState.equipment}
          technicians={technicians}
          onClose={() => setScheduleModalState(null)}
          onScheduled={handleNextScheduled}
        />
      )}
    </div>
  );
}
