import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import QRGeneratorModal from '../components/QRGeneratorModal';
import {
  equipmentAPI, maintenanceAPI, complaintAPI, calibrationAPI, authAPI, warrantyAmcAPI
} from '../services/api';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  ResponsiveContainer, XAxis, YAxis, Tooltip, Legend
} from 'recharts';
import {
  Stethoscope, Wrench, AlertCircle, CheckCircle, Clock, ShieldAlert,
  Plus, Package, FileText, TrendingUp, Users, Building2, CalendarClock,
  Gauge, ShieldCheck, TriangleAlert, Activity, ChevronRight, QrCode, Printer
} from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const StatCard = ({ label, value, icon: Icon, color, sub }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-5 hover:shadow-lg transition-all">
    <div className={`h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${color} shadow-sm`}>
      <Icon className="h-7 w-7 text-white" />
    </div>
    <div>
      <p className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">{value ?? '—'}</p>
      <p className="text-sm md:text-base font-semibold text-slate-600 mt-0.5">{label}</p>
      {sub && <p className={`text-xs mt-1 font-semibold ${sub.color || 'text-slate-400'}`}>{sub.text}</p>}
    </div>
  </div>
);

const SectionHeader = ({ title }) => (
  <h3 className="text-base md:text-lg font-black text-slate-800 tracking-wide mb-3">{title}</h3>
);

const statusBadge = (status) => {
  const map = {
    'Working':          'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Under Maintenance':'bg-amber-100 text-amber-800 border-amber-200',
    'Out of Service':   'bg-red-100 text-red-800 border-red-200',
    'Disposed':         'bg-slate-100 text-slate-600 border-slate-200',
    'Open':             'bg-blue-100 text-blue-800 border-blue-200',
    'Assigned':         'bg-amber-100 text-amber-800 border-amber-200',
    'In Progress':      'bg-indigo-100 text-indigo-800 border-indigo-200',
    'Completed':        'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Closed':           'bg-slate-100 text-slate-600 border-slate-200',
    'Scheduled':        'bg-blue-100 text-blue-800 border-blue-200',
    'Overdue':          'bg-red-100 text-red-800 border-red-200',
  };
  return (
    <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full border ${map[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {status}
    </span>
  );
};

const priorityBadge = (priority) => {
  const map = { 'Critical': 'bg-red-100 text-red-800', 'High': 'bg-orange-100 text-orange-800', 'Medium': 'bg-amber-100 text-amber-800', 'Low': 'bg-green-100 text-green-800' };
  return <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${map[priority] || 'bg-slate-100 text-slate-600'}`}>{priority}</span>;
};

// ─── Admin Dashboard ──────────────────────────────────────────────────────
function AdminDashboard() {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [warranties, setWarranties] = useState({ stats: {} });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [eq, maint, comp, wa] = await Promise.all([
          equipmentAPI.getAll(),
          maintenanceAPI.getAll(),
          complaintAPI.getAll(),
          warrantyAmcAPI.getSummary()
        ]);
        if (eq.data.success) setEquipment(eq.data.equipment);
        if (maint.data.success) setMaintenance(maint.data.maintenance);
        if (comp.data.success) setComplaints(comp.data.complaints);
        if (wa.data.success) setWarranties(wa.data);

        // Get stats from equipment endpoint
        try {
          const st = await equipmentAPI.getStats();
          if (st.data.success) setStats(st.data.stats);
        } catch (e) {}
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const working = equipment.filter(e => e.currentStatus === 'Working').length;
  const underMaint = equipment.filter(e => e.currentStatus === 'Under Maintenance').length;
  const outOfService = equipment.filter(e => e.currentStatus === 'Out of Service').length;
  const openComplaints = complaints.filter(c => ['Open','Assigned','In Progress'].includes(c.status)).length;
  const maintDue = equipment.filter(e => e.nextMaintenanceDate && new Date(e.nextMaintenanceDate) <= in7).length;
  const calDue = equipment.filter(e => e.nextCalibrationDate && new Date(e.nextCalibrationDate) <= in7).length;

  // Status distribution for pie
  const statusData = [
    { name: 'Working', value: working },
    { name: 'Maintenance', value: underMaint },
    { name: 'Out of Service', value: outOfService },
  ].filter(d => d.value > 0);

  // Department distribution
  const deptMap = {};
  equipment.forEach(e => {
    const name = e.department?.name || 'Unknown';
    deptMap[name] = (deptMap[name] || 0) + 1;
  });
  const deptData = Object.entries(deptMap).slice(0, 6).map(([name, count]) => ({ name, count }));

  // Complaint status
  const complaintStatusData = [
    { name: 'Open', value: complaints.filter(c => c.status === 'Open').length },
    { name: 'Assigned', value: complaints.filter(c => c.status === 'Assigned').length },
    { name: 'In Progress', value: complaints.filter(c => c.status === 'In Progress').length },
    { name: 'Completed', value: complaints.filter(c => c.status === 'Completed').length },
  ].filter(d => d.value > 0);

  // Monthly maintenance (last 6 months)
  const monthlyMaint = {};
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    monthlyMaint[`${monthNames[d.getMonth()]} '${d.getFullYear().toString().slice(2)}`] = 0;
  }
  maintenance.filter(m => m.status === 'Completed').forEach(m => {
    const d = new Date(m.completedDate || m.scheduledDate);
    const key = `${monthNames[d.getMonth()]} '${d.getFullYear().toString().slice(2)}`;
    if (key in monthlyMaint) monthlyMaint[key]++;
  });
  const monthlyData = Object.entries(monthlyMaint).map(([month, count]) => ({ month, count }));

  const recentComplaints = complaints.filter(c => c.status !== 'Closed').slice(0, 5);
  const upcomingMaint = maintenance.filter(m => m.status === 'Scheduled' || m.status === 'Overdue').slice(0, 5);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard label="Total Equipment" value={equipment.length} icon={Stethoscope} color="bg-blue-500" />
        <StatCard label="Working" value={working} icon={CheckCircle} color="bg-emerald-500" />
        <StatCard label="Under Maintenance" value={underMaint} icon={Wrench} color="bg-amber-500" />
        <StatCard label="Out of Service" value={outOfService} icon={AlertCircle} color="bg-red-500" />
        <StatCard label="Open Complaints" value={openComplaints} icon={TriangleAlert} color="bg-orange-500" sub={openComplaints > 0 ? { text: 'Needs attention', color: 'text-orange-600' } : null} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Maintenance Due (7d)" value={maintDue} icon={CalendarClock} color={maintDue > 0 ? 'bg-amber-500' : 'bg-slate-400'} sub={maintDue > 0 ? { text: 'Schedule soon', color: 'text-amber-600' } : null} />
        <StatCard label="Calibration Due" value={calDue} icon={Gauge} color={calDue > 0 ? 'bg-purple-500' : 'bg-slate-400'} />
        <StatCard label="Warranty Expiring" value={warranties.stats?.warrantyExpiring || 0} icon={ShieldCheck} color="bg-indigo-500" />
        <StatCard label="AMC Expiring" value={warranties.stats?.amcExpiring || 0} icon={ShieldAlert} color="bg-pink-500" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equipment by Dept */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <SectionHeader title="Equipment by Department" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deptData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Pie */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <SectionHeader title="Equipment Status" />
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {statusData.map((_, i) => <Cell key={i} fill={['#10b981','#f59e0b','#ef4444'][i]} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Maintenance */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <SectionHeader title="Monthly Maintenance Completed" />
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Complaint Status Pie */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <SectionHeader title="Complaint Status" />
          {complaintStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={complaintStatusData} cx="50%" cy="50%" outerRadius={70} paddingAngle={3} dataKey="value">
                  {complaintStatusData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">No active complaints</div>
          )}
        </div>
      </div>

      {/* Recent Complaints & Upcoming Maintenance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <SectionHeader title="Recent Complaints" />
            <Link to="/complaints" className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">View All <ChevronRight className="h-3 w-3" /></Link>
          </div>
          {recentComplaints.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No open complaints</p>
          ) : (
            <div className="space-y-3">
              {recentComplaints.map(c => (
                <div key={c._id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{c.complaintId} — {c.equipment?.name}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{c.issueDescription}</p>
                    <div className="flex gap-2 mt-1.5">{statusBadge(c.status)}{priorityBadge(c.priority)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <SectionHeader title="Upcoming / Overdue Maintenance" />
            <Link to="/maintenance" className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">View All <ChevronRight className="h-3 w-3" /></Link>
          </div>
          {upcomingMaint.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No pending maintenance</p>
          ) : (
            <div className="space-y-3">
              {upcomingMaint.map(m => (
                <div key={m._id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <Wrench className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{m.equipment?.name || 'Unknown'}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{m.type} — {new Date(m.scheduledDate).toLocaleDateString()}</p>
                    <div className="mt-1.5">{statusBadge(m.status)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Engineer Dashboard ───────────────────────────────────────────────────
function EngineerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [calibrations, setCalibrations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [eq, maint, comp, cal] = await Promise.all([
          equipmentAPI.getAll(),
          maintenanceAPI.getAll(),
          complaintAPI.getAll(),
          calibrationAPI.getAll()
        ]);
        if (eq.data.success) setEquipment(eq.data.equipment);
        if (maint.data.success) setMaintenance(maint.data.maintenance);
        if (comp.data.success) setComplaints(comp.data.complaints);
        if (cal.data.success) setCalibrations(cal.data.calibrations);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  const today = new Date(); today.setHours(0,0,0,0);
  const in7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const todayMaint = maintenance.filter(m => {
    const d = new Date(m.scheduledDate); d.setHours(0,0,0,0);
    return d.getTime() === today.getTime();
  });
  const openComplaints = complaints.filter(c => !['Completed','Closed','Cancelled'].includes(c.status));
  const overdueMaint = maintenance.filter(m => m.status === 'Overdue');
  const maintDue = equipment.filter(e => e.nextMaintenanceDate && new Date(e.nextMaintenanceDate) <= in7).length;
  const calDue = calibrations.filter(c => c.status === 'Overdue' || c.status === 'Pending').length;
  const completedThisMonth = maintenance.filter(m => {
    if (m.status !== 'Completed') return false;
    const d = new Date(m.completedDate || m.scheduledDate);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Assigned Equipment" value={equipment.length} icon={Stethoscope} color="bg-blue-500" />
        <StatCard label="Maintenance Due (7d)" value={maintDue} icon={CalendarClock} color={maintDue > 0 ? 'bg-amber-500' : 'bg-slate-400'} />
        <StatCard label="Open Complaints" value={openComplaints.length} icon={AlertCircle} color="bg-orange-500" />
        <StatCard label="Overdue Maintenance" value={overdueMaint.length} icon={TriangleAlert} color={overdueMaint.length > 0 ? 'bg-red-500' : 'bg-slate-400'} />
        <StatCard label="Calibration Due" value={calDue} icon={Gauge} color={calDue > 0 ? 'bg-purple-500' : 'bg-slate-400'} />
        <StatCard label="Completed This Month" value={completedThisMonth} icon={CheckCircle} color="bg-emerald-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Maintenance */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <SectionHeader title="Today's Maintenance" />
            <Link to="/maintenance" className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">View All <ChevronRight className="h-3 w-3" /></Link>
          </div>
          {todayMaint.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-8 w-8 text-blue-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No maintenance scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayMaint.map(m => (
                <div key={m._id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <Wrench className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800">{m.equipment?.name}</p>
                    <p className="text-xs text-slate-500">{m.type} maintenance</p>
                  </div>
                  {statusBadge(m.status)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Open Complaints */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <SectionHeader title="My Open Complaints" />
            <Link to="/complaints" className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">View All <ChevronRight className="h-3 w-3" /></Link>
          </div>
          {openComplaints.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-8 w-8 text-blue-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No open complaints</p>
            </div>
          ) : (
            <div className="space-y-3">
              {openComplaints.slice(0, 5).map(c => (
                <div key={c._id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{c.complaintId} — {c.equipment?.name}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{c.issueDescription}</p>
                    <div className="flex gap-2 mt-1.5">{statusBadge(c.status)}{priorityBadge(c.priority)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Assigned Equipment List */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <SectionHeader title="My Assigned Equipment" />
          <Link to="/equipment" className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">View All <ChevronRight className="h-3 w-3" /></Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-slate-100">
              <th className="text-left py-2 px-3 text-slate-500 font-semibold">Equipment</th>
              <th className="text-left py-2 px-3 text-slate-500 font-semibold">Department</th>
              <th className="text-left py-2 px-3 text-slate-500 font-semibold">Status</th>
              <th className="text-left py-2 px-3 text-slate-500 font-semibold">Next Maintenance</th>
            </tr></thead>
            <tbody>
              {equipment.slice(0, 8).map(e => (
                <tr key={e._id} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/equipment/${e._id}`)}>
                  <td className="py-2 px-3 font-medium text-slate-800">{e.name}<br /><span className="text-slate-400">{e.equipmentId}</span></td>
                  <td className="py-2 px-3 text-slate-600">{e.department?.name}</td>
                  <td className="py-2 px-3">{statusBadge(e.currentStatus)}</td>
                  <td className="py-2 px-3 text-slate-600">{e.nextMaintenanceDate ? new Date(e.nextMaintenanceDate).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Staff Dashboard ──────────────────────────────────────────────────────
function StaffDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEqForQR, setSelectedEqForQR] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [eq, comp] = await Promise.all([
          equipmentAPI.getAll(),
          complaintAPI.getAll({ raisedBy: user?._id })
        ]);
        if (eq.data.success) setEquipment(eq.data.equipment);
        if (comp.data.success) setComplaints(comp.data.complaints);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  const working = equipment.filter(e => e.currentStatus === 'Working').length;
  const underMaint = equipment.filter(e => e.currentStatus === 'Under Maintenance').length;
  const outOfService = equipment.filter(e => e.currentStatus === 'Out of Service').length;
  const myOpenComplaints = complaints.filter(c => !['Completed','Closed'].includes(c.status)).length;
  const myComplaints = complaints.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Dept Equipment" value={equipment.length} icon={Stethoscope} color="bg-blue-500" />
        <StatCard label="Working" value={working} icon={CheckCircle} color="bg-emerald-500" />
        <StatCard label="Under Maintenance" value={underMaint} icon={Wrench} color="bg-amber-500" />
        <StatCard label="My Open Complaints" value={myOpenComplaints} icon={AlertCircle} color="bg-orange-500" />
      </div>

      {/* QR Generation & Tag Sticking Module */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Equipment QR Sticker & Tag Generator</h3>
              <p className="text-xs text-slate-500">Generate and print physical QR tags to attach directly onto department medical machines</p>
            </div>
          </div>
        </div>

        {equipment.length === 0 ? (
          <p className="text-xs text-slate-400">No equipment found for this department.</p>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Select Equipment to Tag:</label>
              <select
                id="staff-eq-select"
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-slate-50 font-medium"
                onChange={(e) => {
                  const eq = equipment.find(item => item._id === e.target.value);
                  if (eq) setSelectedEqForQR(eq);
                }}
                defaultValue=""
              >
                <option value="" disabled>Choose equipment...</option>
                {equipment.map(e => (
                  <option key={e._id} value={e._id}>{e.name} ({e.equipmentId}) — {e.currentStatus}</option>
                ))}
              </select>
            </div>
            <div className="sm:mt-5 w-full sm:w-auto">
              <button
                onClick={() => {
                  const selectEl = document.getElementById('staff-eq-select');
                  const val = selectEl?.value || equipment[0]?._id;
                  const eq = equipment.find(item => item._id === val);
                  if (eq) setSelectedEqForQR(eq);
                }}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-colors"
              >
                <Printer className="h-4 w-4" /> Generate & Print Tag
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action CTA */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 flex items-center justify-between text-white">
        <div>
          <h3 className="font-bold text-lg">Report an Equipment Issue</h3>
          <p className="text-blue-100 text-sm mt-1">Quickly report any equipment malfunction to the engineering team</p>
        </div>
        <button
          onClick={() => navigate('/raise-complaint')}
          className="flex items-center gap-2 bg-white text-blue-600 font-bold px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-colors text-sm shadow-md"
        >
          <Plus className="h-4 w-4" /> Raise Complaint
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Equipment */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <SectionHeader title="Department Equipment" />
            <Link to="/equipment" className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">View All <ChevronRight className="h-3 w-3" /></Link>
          </div>
          <div className="space-y-2">
            {equipment.slice(0, 6).map(e => (
              <div key={e._id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                <div className={`h-2 w-2 rounded-full flex-shrink-0 ${e.currentStatus === 'Working' ? 'bg-emerald-500' : e.currentStatus === 'Under Maintenance' ? 'bg-amber-500' : 'bg-red-500'}`} />
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/equipment/${e._id}`)}>
                  <p className="text-sm font-bold text-slate-800 truncate">{e.name}</p>
                  <p className="text-xs text-slate-500 font-medium">{e.equipmentId}</p>
                </div>
                {statusBadge(e.currentStatus)}
                <button
                  onClick={(evt) => {
                    evt.stopPropagation();
                    setSelectedEqForQR(e);
                  }}
                  className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
                  title="Generate QR Tag"
                >
                  <QrCode className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* My Complaints */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <SectionHeader title="My Recent Complaints" />
            <Link to="/my-complaints" className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">View All <ChevronRight className="h-3 w-3" /></Link>
          </div>
          {myComplaints.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-8 w-8 text-blue-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No complaints raised yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myComplaints.map(c => (
                <div key={c._id} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-slate-800 truncate">{c.complaintId} — {c.equipment?.name}</p>
                    {statusBadge(c.status)}
                  </div>
                  <p className="text-xs text-slate-600 truncate mt-1">{c.issueDescription}</p>
                  <div className="flex items-center gap-2 mt-1.5">{priorityBadge(c.priority)}<span className="text-xs text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* QR Generator Modal */}
      <QRGeneratorModal
        isOpen={!!selectedEqForQR}
        onClose={() => setSelectedEqForQR(null)}
        equipment={selectedEqForQR}
      />
    </div>
  );
}

// ─── Vendor Dashboard ─────────────────────────────────────────────────────
function VendorDashboard() {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [eq, maint] = await Promise.all([
          equipmentAPI.getAll(),
          maintenanceAPI.getAll()
        ]);
        if (eq.data.success) setEquipment(eq.data.equipment);
        if (maint.data.success) setMaintenance(maint.data.maintenance);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  const pending = maintenance.filter(m => m.status === 'Scheduled').length;
  const completed = maintenance.filter(m => m.status === 'Completed').length;
  const inProgress = maintenance.filter(m => m.status === 'In Progress').length;

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Assigned Equipment" value={equipment.length} icon={Package} color="bg-blue-500" />
        <StatCard label="Pending Service" value={pending} icon={Clock} color="bg-amber-500" />
        <StatCard label="In Progress" value={inProgress} icon={Activity} color="bg-blue-500" />
        <StatCard label="Completed" value={completed} icon={CheckCircle} color="bg-emerald-500" />
      </div>

      {/* Upload Report CTA */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 flex items-center justify-between text-white">
        <div>
          <h3 className="font-bold text-lg">Upload Service Report</h3>
          <p className="text-blue-100 text-sm mt-1">Upload completed service documentation and invoices</p>
        </div>
        <button
          onClick={() => navigate('/service-reports')}
          className="flex items-center gap-2 bg-white text-blue-600 font-bold px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-colors text-sm shadow-md"
        >
          <FileText className="h-4 w-4" /> Upload Report
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned Equipment */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <SectionHeader title="Assigned Equipment" />
            <Link to="/equipment" className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">View All <ChevronRight className="h-3 w-3" /></Link>
          </div>
          {equipment.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">No equipment assigned</div>
          ) : (
            <div className="space-y-2">
              {equipment.slice(0, 6).map(e => (
                <div key={e._id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/equipment/${e._id}`)}>
                  <Package className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{e.name}</p>
                    <p className="text-[10px] text-slate-400">{e.equipmentId} — {e.department?.name}</p>
                  </div>
                  {statusBadge(e.currentStatus)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Service Requests */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <SectionHeader title="Service Requests" />
            <Link to="/service-requests" className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">View All <ChevronRight className="h-3 w-3" /></Link>
          </div>
          {maintenance.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">No service requests</div>
          ) : (
            <div className="space-y-3">
              {maintenance.slice(0, 5).map(m => (
                <div key={m._id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <Wrench className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{m.equipment?.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{m.type} — {new Date(m.scheduledDate).toLocaleDateString()}</p>
                  </div>
                  {statusBadge(m.status)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard Router ────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();

  if (user?.role === 'Admin') return <AdminDashboard />;
  if (user?.role === 'Biomedical Engineer') return <EngineerDashboard />;
  if (user?.role === 'Department Staff') return <StaffDashboard />;
  if (user?.role === 'Vendor') return <VendorDashboard />;

  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-slate-500">Loading dashboard...</p>
    </div>
  );
}
