import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { equipmentAPI, departmentAPI, vendorAPI, authAPI } from '../services/api';
import {
  Plus, Search, Filter, X, Stethoscope, QrCode, Edit2, Trash2,
  ChevronRight, Download, Building2, User, Calendar, AlertCircle, CheckCircle, Wrench, Package
} from 'lucide-react';

const STATUS_COLORS = {
  'Working':           'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Under Maintenance': 'bg-amber-100 text-amber-700 border-amber-200',
  'Out of Service':    'bg-red-100 text-red-700 border-red-200',
  'Disposed':          'bg-slate-100 text-slate-500 border-slate-200',
};

const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center text-xs font-bold px-3 py-1 rounded-full border ${STATUS_COLORS[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
    {status}
  </span>
);

// ─── Add/Edit Equipment Modal (Admin only) ────────────────────────────────
function EquipmentModal({ equipment, departments, vendors, engineers, onClose, onSaved }) {
  const isEdit = !!equipment;
  const [form, setForm] = useState({
    name: equipment?.name || '',
    category: equipment?.category || '',
    manufacturer: equipment?.manufacturer || '',
    modelNumber: equipment?.modelNumber || '',
    serialNumber: equipment?.serialNumber || '',
    purchaseDate: equipment?.purchaseDate ? equipment.purchaseDate.slice(0, 10) : '',
    purchaseCost: equipment?.purchaseCost || '',
    installationDate: equipment?.installationDate ? equipment.installationDate.slice(0, 10) : '',
    usefulLife: equipment?.usefulLife || '',
    department: equipment?.department?._id || equipment?.department || '',
    roomNumber: equipment?.roomNumber || '',
    building: equipment?.building || '',
    assignedEngineer: equipment?.assignedEngineer?._id || equipment?.assignedEngineer || '',
    supplierVendor: equipment?.supplierVendor?._id || equipment?.supplierVendor || '',
    warrantyStart: equipment?.warrantyStart ? equipment.warrantyStart.slice(0, 10) : '',
    warrantyEnd: equipment?.warrantyEnd ? equipment.warrantyEnd.slice(0, 10) : '',
    amcStart: equipment?.amcStart ? equipment.amcStart.slice(0, 10) : '',
    amcEnd: equipment?.amcEnd ? equipment.amcEnd.slice(0, 10) : '',
    nextMaintenanceDate: equipment?.nextMaintenanceDate ? equipment.nextMaintenanceDate.slice(0, 10) : '',
    remarks: equipment?.remarks || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.category || !form.department) { setError('Name, Category and Department are required.'); return; }
    setSaving(true); setError('');
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '') formData.append(k, v); });
      if (isEdit) { await equipmentAPI.update(equipment._id, formData); }
      else { await equipmentAPI.create(formData); }
      onSaved();
    } catch (err) { setError(err.response?.data?.message || 'Failed to save equipment'); }
    finally { setSaving(false); }
  };

  const CATEGORIES = ['Imaging','Life Support','Monitoring','Laboratory','Therapeutic','Surgical','Other'];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-base font-bold text-slate-800">{isEdit ? 'Edit Equipment' : 'Register New Equipment'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-medium">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Equipment Name *" value={form.name} onChange={v => set('name', v)} />
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Category *</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className="input-field">
                <option value="">Select category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Field label="Manufacturer" value={form.manufacturer} onChange={v => set('manufacturer', v)} />
            <Field label="Model Number" value={form.modelNumber} onChange={v => set('modelNumber', v)} />
            <Field label="Serial Number" value={form.serialNumber} onChange={v => set('serialNumber', v)} />
            <Field label="Purchase Cost (₹)" type="number" value={form.purchaseCost} onChange={v => set('purchaseCost', v)} />
            <Field label="Purchase Date" type="date" value={form.purchaseDate} onChange={v => set('purchaseDate', v)} />
            <Field label="Installation Date" type="date" value={form.installationDate} onChange={v => set('installationDate', v)} />
            <Field label="Useful Life (years)" type="number" value={form.usefulLife} onChange={v => set('usefulLife', v)} />
            <Field label="Next Maintenance Date" type="date" value={form.nextMaintenanceDate} onChange={v => set('nextMaintenanceDate', v)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Department *</label>
              <select value={form.department} onChange={e => set('department', e.target.value)} className="input-field">
                <option value="">Select department</option>
                {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </div>
            <Field label="Room Number" value={form.roomNumber} onChange={v => set('roomNumber', v)} />
            <Field label="Building/Block" value={form.building} onChange={v => set('building', v)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Assigned Engineer</label>
              <select value={form.assignedEngineer} onChange={e => set('assignedEngineer', e.target.value)} className="input-field">
                <option value="">None</option>
                {engineers.map(eng => <option key={eng._id} value={eng._id}>{eng.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Supplier/Vendor</label>
              <select value={form.supplierVendor} onChange={e => set('supplierVendor', e.target.value)} className="input-field">
                <option value="">None</option>
                {vendors.map(v => <option key={v._id} value={v._id}>{v.companyName}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-600 mb-3">Warranty & AMC</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Warranty Start" type="date" value={form.warrantyStart} onChange={v => set('warrantyStart', v)} />
              <Field label="Warranty End" type="date" value={form.warrantyEnd} onChange={v => set('warrantyEnd', v)} />
              <Field label="AMC Start" type="date" value={form.amcStart} onChange={v => set('amcStart', v)} />
              <Field label="AMC End" type="date" value={form.amcEnd} onChange={v => set('amcEnd', v)} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Remarks</label>
            <textarea value={form.remarks} onChange={e => set('remarks', e.target.value)} rows={2} className="input-field resize-none" placeholder="Optional notes..." />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : isEdit ? 'Update Equipment' : 'Register Equipment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const Field = ({ label, type = 'text', value, onChange, placeholder }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="input-field" />
  </div>
);

// ─── Equipment Page ───────────────────────────────────────────────────────
export default function Equipment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'Admin';

  const [equipment, setEquipment] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editEquipment, setEditEquipment] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      if (filterDept && isAdmin) params.department = filterDept;

      const [eq] = await Promise.all([equipmentAPI.getAll(params)]);
      if (eq.data.success) setEquipment(eq.data.equipment);

      if (isAdmin && departments.length === 0) {
        const [depts, vends, users] = await Promise.all([departmentAPI.getAll(), vendorAPI.getAll(), authAPI.getUsers()]);
        if (depts.data.success) setDepartments(depts.data.departments);
        if (vends.data.success) setVendors(vends.data.vendors);
        if (users.data.success) setEngineers(users.data.users.filter(u => u.role === 'Biomedical Engineer'));
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [filterStatus, filterDept]);

  const handleSearch = (e) => { e.preventDefault(); loadData(); };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    try { await equipmentAPI.delete(id); loadData(); }
    catch (err) { alert(err.response?.data?.message || 'Delete failed'); }
  };

  const getPageTitle = () => {
    if (user?.role === 'Biomedical Engineer') return 'My Assigned Equipment';
    if (user?.role === 'Vendor') return 'My Assigned Equipment';
    if (user?.role === 'Department Staff') return 'Department Equipment';
    return 'Equipment';
  };

  const filtered = equipment.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.equipmentId?.toLowerCase().includes(search.toLowerCase()) ||
    e.manufacturer?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <p className="text-xs text-slate-500">{filtered.length} equipment found</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setEditEquipment(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" /> Register Equipment
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, ID, manufacturer..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 outline-none bg-white">
            <option value="">All Statuses</option>
            <option value="Working">Working</option>
            <option value="Under Maintenance">Under Maintenance</option>
            <option value="Out of Service">Out of Service</option>
          </select>
          {isAdmin && (
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 outline-none bg-white">
              <option value="">All Departments</option>
              {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          )}
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">Search</button>
          {(search || filterStatus || filterDept) && (
            <button type="button" onClick={() => { setSearch(''); setFilterStatus(''); setFilterDept(''); loadData(); }} className="px-3 py-2 text-slate-500 hover:text-slate-700 text-sm font-medium">
              <X className="h-4 w-4" />
            </button>
          )}
        </form>
      </div>

      {/* Equipment Grid/Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <Stethoscope className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No equipment found</p>
          {isAdmin && <button onClick={() => setShowModal(true)} className="mt-3 text-sm text-blue-600 font-semibold hover:underline">Register first equipment</button>}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-3.5 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Equipment</th>
                  <th className="text-left py-3.5 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Category</th>
                  <th className="text-left py-3.5 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Department</th>
                  <th className="text-left py-3.5 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="text-left py-3.5 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider hidden lg:table-cell">Next Maintenance</th>
                  {isAdmin && <th className="text-left py-3.5 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Actions</th>}
                  <th className="py-3.5 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(e => (
                  <tr key={e._id} className="hover:bg-slate-50 transition-colors group">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Stethoscope className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-base font-bold text-slate-900">{e.name}</p>
                          <p className="text-xs text-slate-500 font-mono font-medium">{e.equipmentId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-sm font-medium text-slate-700">{e.category}</td>
                    <td className="py-3.5 px-4 text-sm font-medium text-slate-700">
                      <span>{e.department?.name || '—'}</span>
                      {e.roomNumber && <br />}
                      {e.roomNumber && <span className="text-slate-400 text-xs">Room {e.roomNumber}</span>}
                    </td>
                    <td className="py-3.5 px-4"><StatusBadge status={e.currentStatus} /></td>
                    <td className="py-3.5 px-4 text-sm text-slate-700 hidden lg:table-cell font-medium">
                      {e.nextMaintenanceDate ? (
                        <span className={new Date(e.nextMaintenanceDate) < new Date() ? 'text-red-600 font-bold' : ''}>
                          {new Date(e.nextMaintenanceDate).toLocaleDateString()}
                        </span>
                      ) : '—'}
                    </td>
                    {isAdmin && (
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => { setEditEquipment(e); setShowModal(true); }} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(e._id, e.name)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                    <td className="py-3.5 px-4">
                      <button onClick={() => navigate(`/equipment/${e._id}`)} className="flex items-center gap-1 text-sm text-blue-600 font-bold hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-all">
                        Details <ChevronRight className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <EquipmentModal
          equipment={editEquipment}
          departments={departments}
          vendors={vendors}
          engineers={engineers}
          onClose={() => { setShowModal(false); setEditEquipment(null); }}
          onSaved={() => { setShowModal(false); setEditEquipment(null); loadData(); }}
        />
      )}
    </div>
  );
}
