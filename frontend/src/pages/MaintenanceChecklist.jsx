import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { maintenanceAPI } from '../services/api';
import {
  ClipboardList, Package, CheckCircle2,
  XCircle, Minus, Clock, Plus, Trash2, Save, X, Wrench,
  Search, Edit3, AlertCircle
} from 'lucide-react';

// ─── Status config for checklist items ────────────────────────────────────
const CHECKLIST_STATUSES = [
  { value: 'Pending', label: 'Pending', color: 'bg-slate-100 text-slate-500', icon: Clock },
  { value: 'Pass',    label: 'Pass',    color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  { value: 'Fail',    label: 'Fail',    color: 'bg-red-100 text-red-700', icon: XCircle },
  { value: 'N/A',     label: 'N/A',     color: 'bg-amber-100 text-amber-600', icon: Minus },
];
const STATUS_CONFIG = Object.fromEntries(CHECKLIST_STATUSES.map(s => [s.value, s]));

const DEFAULT_CHECKLIST_TEMPLATES = {
  Preventive: [
    'Inspect power cable and connections',
    'Clean exterior surfaces and body',
    'Check and calibrate display readings',
    'Test alarm functions',
    'Lubricate moving parts',
    'Verify safety mechanisms',
    'Check filter condition',
    'Test battery backup (if applicable)',
    'Log meter/hour readings',
  ],
  Corrective: [
    'Identify fault and root cause',
    'Inspect relevant components',
    'Replace faulty parts',
    'Test repaired functionality',
    'Verify no secondary faults',
    'Document findings',
  ],
  Routine: [
    'Visual inspection',
    'Clean equipment',
    'Verify operational parameters',
    'Check consumable levels',
    'Update maintenance log',
  ],
  Emergency: [
    'Identify emergency fault',
    'Isolate equipment if unsafe',
    'Diagnose root cause',
    'Apply immediate fix',
    'Functional verification test',
    'Report to admin',
  ],
};

// ─── Checklist Item Row ───────────────────────────────────────────────────
function ChecklistRow({ item, index, onChange, onRemove }) {
  const [showNote, setShowNote] = useState(!!item.notes);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 hover:border-slate-300 transition-colors">
      <div className="flex items-start gap-3">
        <span className="text-slate-400 text-xs font-mono mt-1 w-5 flex-shrink-0">{index + 1}.</span>
        <input
          type="text"
          value={item.label}
          onChange={e => onChange({ ...item, label: e.target.value })}
          className="flex-1 text-sm font-medium text-slate-800 bg-transparent outline-none border-b border-transparent focus:border-blue-400 pb-0.5 transition-colors"
          placeholder="Checklist item..."
        />
        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
          {CHECKLIST_STATUSES.map(s => {
            const SIcon = s.icon;
            return (
              <button
                key={s.value}
                title={s.label}
                onClick={() => onChange({ ...item, status: s.value })}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border-2 transition-all ${
                  item.status === s.value
                    ? `${s.color} border-current shadow-sm scale-105`
                    : 'bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100'
                }`}
              >
                <SIcon className="h-3 w-3" />
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => setShowNote(n => !n)}
            title="Add note"
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onRemove}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {showNote && (
        <input
          type="text"
          value={item.notes}
          onChange={e => onChange({ ...item, notes: e.target.value })}
          className="w-full ml-8 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-blue-400"
          placeholder="Optional note..."
        />
      )}
    </div>
  );
}

// ─── Spare Part Row ───────────────────────────────────────────────────────
function SparePartRow({ part, index, onChange, onRemove }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 hover:border-slate-300 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Part #{index + 1}</span>
        <button onClick={onRemove} className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <div className="col-span-2 md:col-span-1">
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Part Name *</label>
          <input
            type="text"
            value={part.partName}
            onChange={e => onChange({ ...part, partName: e.target.value })}
            className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-400 bg-slate-50"
            placeholder="e.g. HEPA Filter"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Part Number</label>
          <input
            type="text"
            value={part.partNumber}
            onChange={e => onChange({ ...part, partNumber: e.target.value })}
            className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-400 bg-slate-50"
            placeholder="SKU / Model"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Qty</label>
          <input
            type="number"
            min="1"
            value={part.quantity}
            onChange={e => onChange({ ...part, quantity: parseInt(e.target.value) || 1 })}
            className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-400 bg-slate-50"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Unit Cost (₹)</label>
          <input
            type="number"
            min="0"
            value={part.unitCost}
            onChange={e => onChange({ ...part, unitCost: parseFloat(e.target.value) || 0 })}
            className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-400 bg-slate-50"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Supplied By</label>
          <input
            type="text"
            value={part.suppliedBy}
            onChange={e => onChange({ ...part, suppliedBy: e.target.value })}
            className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-400 bg-slate-50"
            placeholder="Vendor name"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Replaced On</label>
          <input
            type="date"
            value={part.replacedDate ? part.replacedDate.slice(0, 10) : new Date().toISOString().slice(0, 10)}
            onChange={e => onChange({ ...part, replacedDate: e.target.value })}
            className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-400 bg-slate-50"
          />
        </div>
        <div className="col-span-2 md:col-span-3">
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Notes</label>
          <input
            type="text"
            value={part.notes}
            onChange={e => onChange({ ...part, notes: e.target.value })}
            className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-400 bg-slate-50"
            placeholder="Additional notes..."
          />
        </div>
      </div>
      <div className="mt-2 flex justify-end">
        <span className="text-xs font-bold text-blue-600">
          Subtotal: ₹{((part.unitCost || 0) * (part.quantity || 1)).toLocaleString()}
        </span>
      </div>
    </div>
  );
}

// ─── Record Selector Modal ────────────────────────────────────────────────
function RecordSelector({ records, onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'complaint', 'preventive'

  const filtered = records.filter(r => {
    const matchesSearch =
      r.equipment?.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.equipment?.equipmentId?.toLowerCase().includes(search.toLowerCase()) ||
      r.type?.toLowerCase().includes(search.toLowerCase()) ||
      r.complaint?.complaintId?.toLowerCase().includes(search.toLowerCase()) ||
      r.complaint?.issueDescription?.toLowerCase().includes(search.toLowerCase()) ||
      r.workDescription?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filterType === 'complaint') return !!r.complaint || r.type === 'Corrective';
    if (filterType === 'preventive') return r.type === 'Preventive';
    return true;
  });

  const complaintCount = records.filter(r => !!r.complaint || r.type === 'Corrective').length;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800">Select Maintenance &amp; Complaint Record</h3>
            <p className="text-xs text-slate-400">Choose a scheduled service or corrective complaint ticket</p>
          </div>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400 hover:text-slate-600" /></button>
        </div>

        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400"
              placeholder="Search by equipment, type, or complaint..."
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                filterType === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({records.length})
            </button>
            <button
              onClick={() => setFilterType('complaint')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                filterType === 'complaint' ? 'bg-amber-600 text-white shadow-sm' : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              Complaints &amp; Corrective ({complaintCount})
            </button>
            <button
              onClick={() => setFilterType('preventive')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                filterType === 'preventive' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Preventive
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-8">No matching records found</p>
          ) : filtered.map(r => (
            <button
              key={r._id}
              onClick={() => onSelect(r)}
              className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700">
                      {r.equipment?.name || 'Unknown Equipment'}
                    </p>
                    {r.complaint ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                        {r.complaint.complaintId || 'Complaint'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                        {r.type}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {r.equipment?.equipmentId} &middot; {new Date(r.scheduledDate).toLocaleDateString()}
                    {r.engineer?.name && ` · Tech: ${r.engineer.name}`}
                  </p>
                  {(r.complaint?.issueDescription || (r.type === 'Corrective' && r.workDescription)) && (
                    <p className="text-xs text-amber-800 bg-amber-50/80 px-2 py-1 rounded-md mt-1 border border-amber-100 font-medium line-clamp-1">
                      Issue: {r.complaint?.issueDescription || r.workDescription}
                    </p>
                  )}
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                  r.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                  r.status === 'In Progress' ? 'bg-indigo-100 text-indigo-700' :
                  r.status === 'Overdue' ? 'bg-red-100 text-red-700' :
                  'bg-slate-100 text-slate-600'
                }`}>{r.status}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────
export default function MaintenanceChecklist() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const complaintIdParam = searchParams.get('complaintId');

  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showSelector, setShowSelector] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  // Checklist state
  const [checklist, setChecklist] = useState([]);
  const [newItemLabel, setNewItemLabel] = useState('');
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [checklistSaved, setChecklistSaved] = useState(false);

  // Spare parts state
  const [spareParts, setSpareParts] = useState([]);
  const [savingParts, setSavingParts] = useState(false);
  const [partsSaved, setPartsSaved] = useState(false);

  const [activeTab, setActiveTab] = useState('checklist');

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await maintenanceAPI.getAll();
      if (res.data.success) setRecords(res.data.maintenance);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const selectRecord = useCallback((record) => {
    setSelectedRecord(record);
    setChecklist(record.checklistItems && record.checklistItems.length > 0
      ? record.checklistItems.map(i => ({ ...i }))
      : []
    );
    setSpareParts(record.spareParts && record.spareParts.length > 0
      ? record.spareParts.map(p => ({ ...p }))
      : []
    );
    setChecklistSaved(false);
    setPartsSaved(false);
    setShowSelector(false);
    setActiveTab('checklist');
  }, []);

  // Auto-load record if complaintId is present in URL
  useEffect(() => {
    if (complaintIdParam) {
      setLoading(true);
      maintenanceAPI.getByComplaint(complaintIdParam)
        .then(res => {
          if (res.data.success && res.data.maintenance) {
            selectRecord(res.data.maintenance);
          }
        })
        .catch(err => {
          console.error('Error fetching complaint maintenance:', err);
        })
        .finally(() => setLoading(false));
    }
  }, [complaintIdParam, selectRecord]);

  const completeMaintenanceRecord = async () => {
    if (!selectedRecord) return;
    const isComplaint = !!selectedRecord.complaint;
    const confirmMsg = isComplaint
      ? `Complete corrective maintenance? This will resolve complaint ${selectedRecord.complaint.complaintId || ''} and return the equipment to Working status.`
      : 'Mark this maintenance record as Completed and return equipment to Working status?';

    if (!window.confirm(confirmMsg)) return;

    setCompleting(true);
    try {
      const res = await maintenanceAPI.update(selectedRecord._id, {
        status: 'Completed',
        completedDate: new Date(),
        nextServiceDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
      if (res.data.success) {
        alert(
          isComplaint
            ? `Maintenance completed! Complaint ${selectedRecord.complaint.complaintId || ''} is now Resolved and equipment is back to Working.`
            : 'Maintenance marked as Completed! Equipment returned to Working status.'
        );
        await loadRecords();
        if (res.data.maintenance) {
          selectRecord(res.data.maintenance);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to complete maintenance');
    } finally {
      setCompleting(false);
    }
  };

  const applyTemplate = () => {
    const tmpl = DEFAULT_CHECKLIST_TEMPLATES[selectedRecord?.type] || DEFAULT_CHECKLIST_TEMPLATES.Preventive;
    setChecklist(tmpl.map(label => ({ label, status: 'Pending', notes: '' })));
  };

  const addChecklistItem = () => {
    const label = newItemLabel.trim();
    if (!label) return;
    setChecklist(prev => [...prev, { label, status: 'Pending', notes: '' }]);
    setNewItemLabel('');
  };

  const addSparePart = () => {
    setSpareParts(prev => [...prev, {
      partName: '',
      partNumber: '',
      quantity: 1,
      unitCost: 0,
      suppliedBy: '',
      replacedDate: new Date().toISOString().slice(0, 10),
      notes: ''
    }]);
  };

  const saveChecklist = async () => {
    if (!selectedRecord) return;
    setSavingChecklist(true);
    try {
      await maintenanceAPI.updateChecklist(selectedRecord._id, checklist);
      setChecklistSaved(true);
      setTimeout(() => setChecklistSaved(false), 3000);
      await loadRecords();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save checklist');
    } finally {
      setSavingChecklist(false);
    }
  };

  const saveSpareParts = async () => {
    if (!selectedRecord) return;
    const invalid = spareParts.find(p => !p.partName?.trim());
    if (invalid) { alert('All parts must have a Part Name'); return; }
    setSavingParts(true);
    try {
      await maintenanceAPI.updateSpareParts(selectedRecord._id, spareParts);
      setPartsSaved(true);
      setTimeout(() => setPartsSaved(false), 3000);
      await loadRecords();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save spare parts');
    } finally {
      setSavingParts(false);
    }
  };

  // Stats
  const checklistStats = {
    pass: checklist.filter(i => i.status === 'Pass').length,
    fail: checklist.filter(i => i.status === 'Fail').length,
    pending: checklist.filter(i => i.status === 'Pending').length,
    na: checklist.filter(i => i.status === 'N/A').length,
    total: checklist.length,
  };
  const completion = checklistStats.total > 0
    ? Math.round(((checklistStats.pass + checklistStats.na) / checklistStats.total) * 100)
    : 0;
  const partsTotal = spareParts.reduce((s, p) => s + (p.unitCost || 0) * (p.quantity || 1), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-blue-600" />
            Maintenance Checklist &amp; Spare Parts
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Digital inspection checklists and parts replacement history</p>
        </div>
        <button
          id="btn-select-record"
          onClick={() => setShowSelector(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Wrench className="h-4 w-4" />
          {selectedRecord ? 'Switch Record' : 'Select Record'}
        </button>
      </div>

      {/* No record selected */}
      {!selectedRecord && (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="h-8 w-8 text-blue-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">Select a Maintenance Record</h3>
          <p className="text-sm text-slate-400 mb-6">Choose a maintenance task to manage its checklist and spare parts log.</p>
          <button
            id="btn-browse-records"
            onClick={() => setShowSelector(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Search className="h-4 w-4" /> Browse Records
          </button>
        </div>
      )}

      {/* Selected record view */}
      {selectedRecord && (
        <>
          {/* Linked Complaint Alert Banner */}
          {selectedRecord.complaint && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start justify-between gap-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 rounded-lg text-amber-700 flex-shrink-0 mt-0.5">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-900">
                      Breakdown Complaint Ticket: {selectedRecord.complaint.complaintId || 'Complaint'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                      {selectedRecord.complaint.priority || 'Medium'} Priority
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 font-medium mt-1">
                    {selectedRecord.complaint.issueDescription || selectedRecord.workDescription}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/complaints')}
                className="text-xs font-bold text-amber-800 hover:text-amber-900 bg-amber-100/70 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
              >
                View in Complaints &rarr;
              </button>
            </div>
          )}

          {/* Record Header Card */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-blue-100 text-xs font-medium uppercase tracking-wider">
                    {selectedRecord.type} Maintenance
                  </p>
                  {selectedRecord.complaint && (
                    <span className="bg-amber-400 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Complaint Linked
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold">{selectedRecord.equipment?.name}</h2>
                <p className="text-blue-100 text-sm mt-0.5">
                  {selectedRecord.equipment?.equipmentId} &nbsp;&middot;&nbsp;
                  Scheduled: {new Date(selectedRecord.scheduledDate).toLocaleDateString()}
                  {selectedRecord.engineer && ` · Technician: ${selectedRecord.engineer.name}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                  selectedRecord.status === 'Completed' ? 'bg-emerald-500/30 text-emerald-100' :
                  selectedRecord.status === 'In Progress' ? 'bg-white/20 text-white' :
                  selectedRecord.status === 'Overdue' ? 'bg-red-500/30 text-red-100' :
                  'bg-white/20 text-white'
                }`}>{selectedRecord.status}</span>
                {selectedRecord.status !== 'Completed' && (
                  <button
                    onClick={completeMaintenanceRecord}
                    disabled={completing}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                    title={selectedRecord.complaint ? 'Resolve complaint and mark completed' : 'Mark maintenance as completed'}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{completing ? 'Completing...' : selectedRecord.complaint ? 'Resolve & Complete' : 'Complete'}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 mt-4">
              <div className="bg-white/10 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold">{completion}%</p>
                <p className="text-[11px] text-blue-100">Complete</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-emerald-200">{checklistStats.pass}</p>
                <p className="text-[11px] text-blue-100">Pass</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-red-200">{checklistStats.fail}</p>
                <p className="text-[11px] text-blue-100">Fail</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold">&#8377;{partsTotal.toLocaleString()}</p>
                <p className="text-[11px] text-blue-100">Parts Cost</p>
              </div>
            </div>

            {checklist.length > 0 && (
              <div className="mt-4">
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${completion}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {[
              { id: 'checklist', label: 'Checklist', icon: ClipboardList, count: checklist.length },
              { id: 'parts', label: 'Spare Parts', icon: Package, count: spareParts.length },
            ].map(tab => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'
                }`}>{tab.count}</span>
              </button>
            ))}
          </div>

          {/* ─── Checklist Tab ───────────────────────────────────────── */}
          {activeTab === 'checklist' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex flex-1 gap-2">
                    <input
                      id="input-new-checklist-item"
                      type="text"
                      value={newItemLabel}
                      onChange={e => setNewItemLabel(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addChecklistItem()}
                      className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400"
                      placeholder="Type a checklist item and press Enter..."
                    />
                    <button
                      id="btn-add-checklist-item"
                      onClick={addChecklistItem}
                      disabled={!newItemLabel.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-40 transition-colors"
                    >
                      <Plus className="h-4 w-4" /> Add
                    </button>
                  </div>
                  <button
                    id="btn-load-template"
                    onClick={applyTemplate}
                    className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <ClipboardList className="h-4 w-4 text-slate-400" />
                    Load Template
                  </button>
                </div>
                {checklist.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {CHECKLIST_STATUSES.map(s => (
                      <button
                        key={s.value}
                        onClick={() => setChecklist(prev => prev.map(i => ({ ...i, status: s.value })))}
                        className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold border ${s.color} border-transparent hover:border-current transition-colors`}
                      >
                        Mark All {s.label}
                      </button>
                    ))}
                    <button
                      onClick={() => { if (window.confirm('Clear all checklist items?')) setChecklist([]); }}
                      className="text-[11px] px-2.5 py-1 rounded-lg font-semibold text-red-500 hover:bg-red-50 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                )}
              </div>

              {checklist.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
                  <ClipboardList className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No checklist items. Add items above or load a template.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {checklist.map((item, i) => (
                    <ChecklistRow
                      key={i}
                      item={item}
                      index={i}
                      onChange={updated => setChecklist(prev => prev.map((x, j) => j === i ? updated : x))}
                      onRemove={() => setChecklist(prev => prev.filter((_, j) => j !== i))}
                    />
                  ))}
                </div>
              )}

              {checklist.length > 0 && (
                <div className="grid grid-cols-4 gap-3">
                  {CHECKLIST_STATUSES.map(s => (
                    <div key={s.value} className={`rounded-xl p-3 text-center ${s.color}`}>
                      <p className="text-lg font-bold">{checklist.filter(i => i.status === s.value).length}</p>
                      <p className="text-[11px] font-semibold">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  id="btn-save-checklist"
                  onClick={saveChecklist}
                  disabled={savingChecklist}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-50 ${
                    checklistSaved ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {savingChecklist ? (
                    <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                  ) : checklistSaved ? (
                    <><CheckCircle2 className="h-4 w-4" /> Saved!</>
                  ) : (
                    <><Save className="h-4 w-4" /> Save Checklist</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ─── Spare Parts Tab ─────────────────────────────────────── */}
          {activeTab === 'parts' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Spare Parts Replacement Log</p>
                  <p className="text-xs text-slate-400 mt-0.5">Track every part replaced during this maintenance session.</p>
                </div>
                <button
                  id="btn-add-spare-part"
                  onClick={addSparePart}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" /> Add Part
                </button>
              </div>

              {spareParts.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
                  <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No spare parts logged yet. Click "Add Part" to begin.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {spareParts.map((part, i) => (
                    <SparePartRow
                      key={i}
                      part={part}
                      index={i}
                      onChange={updated => setSpareParts(prev => prev.map((x, j) => j === i ? updated : x))}
                      onRemove={() => setSpareParts(prev => prev.filter((_, j) => j !== i))}
                    />
                  ))}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-blue-800">{spareParts.length} part(s) logged</p>
                      <p className="text-xs text-blue-500">Saving will auto-update the maintenance record cost.</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-blue-500 font-medium">Total Parts Cost</p>
                      <p className="text-2xl font-bold text-blue-700">&#8377;{partsTotal.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  id="btn-save-spare-parts"
                  onClick={saveSpareParts}
                  disabled={savingParts}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-50 ${
                    partsSaved ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {savingParts ? (
                    <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                  ) : partsSaved ? (
                    <><CheckCircle2 className="h-4 w-4" /> Saved!</>
                  ) : (
                    <><Save className="h-4 w-4" /> Save Parts Log</>
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showSelector && (
        <RecordSelector
          records={records}
          onSelect={selectRecord}
          onClose={() => setShowSelector(false)}
        />
      )}
    </div>
  );
}
