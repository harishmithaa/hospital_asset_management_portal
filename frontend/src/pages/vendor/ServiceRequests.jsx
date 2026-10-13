import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { maintenanceAPI } from '../../services/api';
import { Wrench, ChevronRight } from 'lucide-react';

const statusColors = {
  'Scheduled':   'bg-blue-100 text-blue-700',
  'In Progress': 'bg-indigo-100 text-indigo-700',
  'Completed':   'bg-emerald-100 text-emerald-700',
  'Overdue':     'bg-red-100 text-red-700',
  'Cancelled':   'bg-slate-100 text-slate-500',
};

export default function ServiceRequests() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = {};
        if (filterStatus) params.status = filterStatus;
        const res = await maintenanceAPI.getAll(params);
        if (res.data.success) setRecords(res.data.maintenance);
      } finally { setLoading(false); }
    };
    load();
  }, [filterStatus]);

  const pending = records.filter(r => r.status === 'Scheduled').length;
  const inProgress = records.filter(r => r.status === 'In Progress').length;
  const completed = records.filter(r => r.status === 'Completed').length;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <Wrench className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Service Requests</h2>
          <p className="text-xs text-slate-500">View equipment assigned to your company for servicing</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending', value: pending, color: 'bg-blue-100 text-blue-700' },
          { label: 'In Progress', value: inProgress, color: 'bg-indigo-100 text-indigo-700' },
          { label: 'Completed', value: completed, color: 'bg-emerald-100 text-emerald-700' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-bold text-slate-800">{s.value}</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex gap-3 flex-wrap">
        {['', 'Scheduled', 'In Progress', 'Completed', 'Overdue'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filterStatus === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {s || 'All'}
          </button>
        ))}
        <span className="text-xs text-slate-400 self-center ml-auto">{records.length} records</span>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : records.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <Wrench className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No service requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(r => (
            <div key={r._id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Wrench className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{r.equipment?.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{r.equipment?.equipmentId}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[r.status] || 'bg-slate-100 text-slate-600'}`}>{r.status}</span>
                  </div>
                  <div className="mt-2 flex gap-4 flex-wrap text-xs text-slate-500">
                    <span>Type: <span className="font-medium text-slate-700">{r.type}</span></span>
                    <span>Scheduled: <span className="font-medium text-slate-700">{new Date(r.scheduledDate).toLocaleDateString()}</span></span>
                    {r.cost > 0 && <span>Cost: <span className="font-medium text-slate-700">₹{r.cost.toLocaleString()}</span></span>}
                  </div>
                  {r.workDescription && (
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{r.workDescription}</p>
                  )}
                  <div className="mt-2">
                    <button onClick={() => navigate(`/equipment/${r.equipment?._id}`)} className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
                      View Equipment <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
