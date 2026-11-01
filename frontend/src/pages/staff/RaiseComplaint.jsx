import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { equipmentAPI, complaintAPI } from '../../services/api';
import { Plus, CheckCircle, AlertCircle, QrCode, X, Building2, MapPin } from 'lucide-react';
import QRScannerModal from '../../components/QRScannerModal';

export default function RaiseComplaint() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramEquipmentId = searchParams.get('equipmentId') || '';

  const [equipment, setEquipment] = useState([]);
  const [form, setForm] = useState({ equipment: paramEquipmentId, issueDescription: '', priority: 'Medium', additionalNotes: '' });
  const [scannedEquipment, setScannedEquipment] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [image, setImage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    equipmentAPI.getAll({ all: true }).then(async (r) => {
      if (r.data.success) {
        let list = r.data.equipment || [];
        if (paramEquipmentId) {
          let match = list.find(e => e._id === paramEquipmentId || e.equipmentId === paramEquipmentId);
          if (!match) {
            try {
              const single = await equipmentAPI.getById(paramEquipmentId);
              if (single.data.success && single.data.equipment) {
                match = single.data.equipment;
                list = [match, ...list];
              }
            } catch (_) {}
          }
          if (match) {
            setForm(f => ({ ...f, equipment: match._id }));
            setScannedEquipment(match);
          }
        }
        setEquipment(list);
      }
    });
  }, [paramEquipmentId]);

  useEffect(() => {
    if (form.equipment && equipment.length > 0) {
      const match = equipment.find(e => e._id === form.equipment);
      if (match) setScannedEquipment(match);
    } else if (!form.equipment) {
      setScannedEquipment(null);
    }
  }, [form.equipment, equipment]);

  const handleScanComplete = (scannedEq) => {
    if (scannedEq) {
      setEquipment(prev => {
        if (!prev.some(e => e._id === scannedEq._id)) {
          return [scannedEq, ...prev];
        }
        return prev;
      });
      setForm(f => ({ ...f, equipment: scannedEq._id }));
      setScannedEquipment(scannedEq);
      setScannerOpen(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.equipment || !form.issueDescription) { setError('Equipment and issue description are required.'); return; }
    setSaving(true); setError('');
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) formData.append(k, v); });
      if (image) formData.append('imageUpload', image);
      const res = await complaintAPI.create(formData);
      setSuccess(`Complaint ${res.data.complaint?.complaintId} raised successfully! Our technical team has been notified.`);
      setForm({ equipment: '', issueDescription: '', priority: 'Medium', additionalNotes: '' });
      setScannedEquipment(null);
      setImage(null);
    } catch (err) { setError(err.response?.data?.message || 'Failed to raise complaint'); }
    finally { setSaving(false); }
  };

  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <Plus className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Raise a Complaint</h2>
          <p className="text-xs text-slate-500">Report an equipment issue to the technical team</p>
        </div>
      </div>

      {/* Success Banner */}
      {success && (
        <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Complaint Raised!</p>
            <p className="text-xs text-emerald-700 mt-0.5">{success}</p>
            <button onClick={() => navigate('/my-complaints')} className="mt-2 text-xs text-emerald-700 font-bold hover:underline">→ View My Complaints</button>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-medium">{error}</div>}

          {/* Equipment Selection + QR Scan Action */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-700">
                Equipment with Issue *
              </label>
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95"
              >
                <QrCode className="h-3.5 w-3.5" />
                <span>Scan Equipment QR Tag</span>
              </button>
            </div>

            {/* Visual Confirmation Card when Equipment is Scanned/Selected */}
            {scannedEquipment && (
              <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between gap-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 bg-white border border-blue-150 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0 shadow-xs">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-slate-800">{scannedEquipment.name}</h4>
                      <span className="text-[10px] font-mono font-bold text-blue-700 bg-white px-1.5 py-0.5 rounded border border-blue-200">
                        {scannedEquipment.equipmentId}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        scannedEquipment.currentStatus === 'Working' ? 'bg-emerald-100 text-emerald-800' :
                        scannedEquipment.currentStatus === 'Under Maintenance' ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {scannedEquipment.currentStatus}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-slate-400" />
                        {scannedEquipment.department?.name || 'Department'}
                      </span>
                      {scannedEquipment.roomNumber && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          Room {scannedEquipment.roomNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { set('equipment', ''); setScannedEquipment(null); }}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-blue-100/60 transition-colors"
                  title="Clear / Change equipment"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <select
              value={form.equipment}
              onChange={e => {
                const val = e.target.value;
                set('equipment', val);
                const match = equipment.find(eq => eq._id === val);
                setScannedEquipment(match || null);
              }}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none bg-white font-medium"
              required
            >
              <option value="">Select equipment or scan QR above</option>
              {equipment.map(e => (
                <option key={e._id} value={e._id}>
                  {e.name} — {e.equipmentId} ({e.department?.name || 'Medical Asset'}) · [{e.currentStatus}]
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Priority *</label>
            <div className="flex gap-3">
              {[
                { value: 'Low',      color: 'border-green-300 bg-green-50 text-green-700', selected: 'border-green-500 bg-green-500 text-white' },
                { value: 'Medium',   color: 'border-amber-300 bg-amber-50 text-amber-700', selected: 'border-amber-500 bg-amber-500 text-white' },
                { value: 'High',     color: 'border-orange-300 bg-orange-50 text-orange-700', selected: 'border-orange-500 bg-orange-500 text-white' },
                { value: 'Critical', color: 'border-red-300 bg-red-50 text-red-700', selected: 'border-red-500 bg-red-500 text-white' },
              ].map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => set('priority', p.value)}
                  className={`flex-1 py-2 rounded-xl border-2 text-xs font-bold transition-all ${form.priority === p.value ? p.selected : p.color}`}
                >
                  {p.value}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              {form.priority === 'Critical' && '⚠ Critical: Equipment is completely non-functional or poses safety risk.'}
              {form.priority === 'High' && 'High: Major malfunction significantly affecting operations.'}
              {form.priority === 'Medium' && 'Medium: Equipment has issues but is still partially functional.'}
              {form.priority === 'Low' && 'Low: Minor issue, equipment is functional.'}
            </p>
          </div>

          {/* Issue Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Issue Description *</label>
            <textarea
              value={form.issueDescription}
              onChange={e => set('issueDescription', e.target.value)}
              rows={4}
              placeholder="Describe the issue clearly. Include: what happened, when it started, any error messages or alarm codes..."
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
              required
            />
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Additional Notes</label>
            <textarea
              value={form.additionalNotes}
              onChange={e => set('additionalNotes', e.target.value)}
              rows={2}
              placeholder="Any additional context (e.g. when does the issue occur, specific conditions, patient impact...)"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Attach Image (optional)</label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-blue-300 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={e => setImage(e.target.files[0])}
                className="hidden"
                id="imageUpload"
              />
              <label htmlFor="imageUpload" className="cursor-pointer">
                {image ? (
                  <p className="text-sm text-blue-600 font-medium">{image.name}</p>
                ) : (
                  <>
                    <AlertCircle className="h-6 w-6 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">Click to upload a photo of the issue</p>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate(-1)} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 shadow-sm">
              {saving ? 'Submitting...' : 'Submit Complaint'}
            </button>
          </div>
        </form>
      </div>

      {/* Info box */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
        <p className="text-xs text-blue-700 font-semibold mb-1">What happens next?</p>
        <ul className="text-xs text-blue-600 space-y-1 list-disc list-inside">
          <li>Your complaint will be reviewed by the Admin</li>
          <li>A Technician will be assigned to investigate</li>
          <li>You'll receive notifications as the status updates</li>
          <li>Track your complaint status in "My Complaints"</li>
        </ul>
      </div>
      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanComplete={handleScanComplete}
      />
    </div>
  );
}
