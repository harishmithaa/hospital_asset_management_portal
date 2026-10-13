import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { warrantyAmcAPI } from '../services/api';
import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle, X, Clock } from 'lucide-react';

const statusStyle = {
  'Active':   { bg: 'bg-emerald-100 text-emerald-700', icon: CheckCircle, iconColor: 'text-emerald-500' },
  'Expiring': { bg: 'bg-amber-100 text-amber-700',   icon: AlertTriangle, iconColor: 'text-amber-500' },
  'Expired':  { bg: 'bg-red-100 text-red-700',       icon: X,            iconColor: 'text-red-500' },
  'None':     { bg: 'bg-slate-100 text-slate-500',   icon: Clock,        iconColor: 'text-slate-400' },
};

const StatusBadge = ({ status }) => (
  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusStyle[status]?.bg || 'bg-slate-100 text-slate-600'}`}>{status}</span>
);

export default function WarrantyAMC() {
  const navigate = useNavigate();
  const [data, setData] = useState({ warranties: [], amcs: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('warranty');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    warrantyAmcAPI.getSummary()
      .then(r => { if (r.data.success) setData(r.data); })
      .finally(() => setLoading(false));
  }, []);

  const { warranties, amcs, stats } = data;

  const filteredWarranties = filterStatus ? warranties.filter(w => w.status === filterStatus) : warranties;
  const filteredAmcs = filterStatus ? amcs.filter(a => a.status === filterStatus) : amcs;

  return (
    <div className="space-y-5">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Warranty Active', value: stats.warrantyActive, color: 'bg-emerald-500' },
          { label: 'Warranty Expiring', value: stats.warrantyExpiring, color: 'bg-amber-500', alert: true },
          { label: 'Warranty Expired', value: stats.warrantyExpired, color: 'bg-red-500', alert: true },
          { label: 'AMC Active', value: stats.amcActive, color: 'bg-emerald-500' },
          { label: 'AMC Expiring', value: stats.amcExpiring, color: 'bg-amber-500', alert: true },
          { label: 'AMC Expired', value: stats.amcExpired, color: 'bg-red-500', alert: true },
        ].map(item => (
          <div key={item.label} className={`bg-white rounded-xl border ${item.alert && item.value > 0 ? 'border-red-200' : 'border-slate-200'} p-4`}>
            <p className="text-xl font-bold text-slate-800">{item.value ?? '—'}</p>
            <p className="text-xs text-slate-500 mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Alert banners */}
      {(stats.warrantyExpiring > 0 || stats.amcExpiring > 0) && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            {stats.warrantyExpiring > 0 && `${stats.warrantyExpiring} warranties`}
            {stats.warrantyExpiring > 0 && stats.amcExpiring > 0 && ' and '}
            {stats.amcExpiring > 0 && `${stats.amcExpiring} AMC contracts`}
            {' '}expiring within 30 days. Renew promptly.
          </p>
        </div>
      )}

      {/* Tabs + Filters */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200 flex items-center justify-between px-4">
          <div className="flex">
            {[
              { key: 'warranty', label: 'Warranty', icon: ShieldCheck },
              { key: 'amc', label: 'AMC Contracts', icon: ShieldAlert }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setFilterStatus(''); }}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:border-blue-500 outline-none bg-white my-2">
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Expiring">Expiring (30d)</option>
            <option value="Expired">Expired</option>
          </select>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center h-32"><div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 px-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Equipment</th>
                    <th className="text-left py-2 px-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Department</th>
                    <th className="text-left py-2 px-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Vendor</th>
                    <th className="text-left py-2 px-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{activeTab === 'warranty' ? 'Warranty End' : 'AMC End'}</th>
                    <th className="text-left py-2 px-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(activeTab === 'warranty' ? filteredWarranties : filteredAmcs).map(item => (
                    <tr key={item._id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => navigate(`/equipment/${item._id}`)}>
                      <td className="py-2.5 px-3">
                        <p className="text-xs font-semibold text-blue-600 hover:underline">{item.name}</p>
                        <p className="text-[10px] text-slate-400">{item.equipmentId}</p>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-600">{item.department?.name || '—'}</td>
                      <td className="py-2.5 px-3 text-xs text-slate-600">{item.vendor?.companyName || '—'}</td>
                      <td className="py-2.5 px-3 text-xs">
                        {activeTab === 'warranty'
                          ? (item.warrantyEnd ? <span className={item.status === 'Expired' ? 'text-red-600 font-semibold' : item.status === 'Expiring' ? 'text-amber-600 font-semibold' : 'text-slate-600'}>{new Date(item.warrantyEnd).toLocaleDateString()}</span> : '—')
                          : (item.amcEnd ? <span className={item.status === 'Expired' ? 'text-red-600 font-semibold' : item.status === 'Expiring' ? 'text-amber-600 font-semibold' : 'text-slate-600'}>{new Date(item.amcEnd).toLocaleDateString()}</span> : '—')
                        }
                      </td>
                      <td className="py-2.5 px-3"><StatusBadge status={item.status} /></td>
                    </tr>
                  ))}
                  {(activeTab === 'warranty' ? filteredWarranties : filteredAmcs).length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-slate-400 text-sm">No records found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
