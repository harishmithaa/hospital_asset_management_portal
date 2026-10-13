import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { complaintAPI } from '../../services/api';
import { ClipboardList, Plus, ChevronRight } from 'lucide-react';

const statusColors = {
  'Open':        'bg-blue-100 text-blue-700',
  'Assigned':    'bg-amber-100 text-amber-700',
  'In Progress': 'bg-indigo-100 text-indigo-700',
  'Completed':   'bg-emerald-100 text-emerald-700',
  'Closed':      'bg-slate-100 text-slate-500',
  'Cancelled':   'bg-red-100 text-red-700',
};
const priorityColors = {
  'Critical': 'bg-red-100 text-red-700',
  'High':     'bg-orange-100 text-orange-700',
  'Medium':   'bg-amber-100 text-amber-700',
  'Low':      'bg-green-100 text-green-700',
};

export default function MyComplaints() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Department staff sees complaints for their department
        const params = {};
        if (filterStatus) params.status = filterStatus;
        const res = await complaintAPI.getAll(params);
        if (res.data.success) {
          // Filter to only show complaints raised by this user
          const myComplaints = res.data.complaints.filter(c =>
            c.raisedBy?._id === user?._id || c.raisedBy?.email === user?.email
          );
          setComplaints(myComplaints);
        }
      } finally { setLoading(false); }
    };
    load();
  }, [filterStatus, user]);

  const open = complaints.filter(c => !['Completed','Closed','Cancelled'].includes(c.status)).length;
  const resolved = complaints.filter(c => ['Completed','Closed'].includes(c.status)).length;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">My Complaints</h2>
            <p className="text-xs text-slate-500">{open} open · {resolved} resolved</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/raise-complaint')}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> Raise New Complaint
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: complaints.length, color: 'bg-slate-100 text-slate-700' },
          { label: 'Open', value: open, color: open > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700' },
          { label: 'Resolved', value: resolved, color: resolved > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-bold text-slate-800">{s.value}</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex gap-3 flex-wrap">
        {['', 'Open', 'Assigned', 'In Progress', 'Completed', 'Closed'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filterStatus === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Complaint list */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : complaints.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <ClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No complaints raised yet</p>
          <button onClick={() => navigate('/raise-complaint')} className="mt-3 text-sm text-blue-600 font-bold hover:underline flex items-center gap-1 mx-auto">
            <Plus className="h-3.5 w-3.5" /> Raise your first complaint
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map(c => (
            <div key={c._id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-mono font-bold text-slate-600">{c.complaintId}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[c.status]}`}>{c.status}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${priorityColors[c.priority]}`}>{c.priority}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{c.equipment?.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{c.issueDescription}</p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                    <span>Raised: {new Date(c.createdAt).toLocaleDateString()}</span>
                    {c.assignedEngineer && <span>Engineer: {c.assignedEngineer.name}</span>}
                  </div>
                </div>
                <button onClick={() => navigate(`/equipment/${c.equipment?._id}`)} className="flex-shrink-0 p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Status Timeline Summary */}
              {c.updates && c.updates.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Latest Update</p>
                  {(() => {
                    const last = c.updates[c.updates.length - 1];
                    return (
                      <div className="flex items-start gap-2">
                        <div className={`h-2 w-2 rounded-full mt-1.5 flex-shrink-0 ${statusColors[last.status]?.includes('emerald') ? 'bg-emerald-500' : statusColors[last.status]?.includes('amber') ? 'bg-amber-500' : 'bg-blue-500'}`} />
                        <p className="text-xs text-slate-600">{last.note}</p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
