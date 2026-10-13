import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { departmentAPI, authAPI } from '../services/api';
import { useForm } from 'react-hook-form';
import { Building2, Plus, Edit2, Trash2, User, Phone, MapPin, X } from 'lucide-react';

export default function Departments() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [departments, setDepartments] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const { register, handleSubmit, reset, setValue } = useForm();

  const loadData = async () => {
    try {
      setLoading(true);
      const [resDept, resUsers] = await Promise.all([
        departmentAPI.getAll(),
        isAdmin ? authAPI.getUsers() : Promise.resolve({ data: { success: true, users: [] } })
      ]);

      if (resDept.data.success) setDepartments(resDept.data.departments);
      if (resUsers.data.success) {
        setEngineers(resUsers.data.users.filter(u => u.role === 'Biomedical Engineer'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    reset();
    setEditMode(false);
    setModalOpen(true);
  };

  const handleOpenEdit = (dept) => {
    setEditMode(true);
    setSelectedId(dept._id);
    setModalOpen(true);

    setValue('name', dept.name);
    setValue('head', dept.head);
    setValue('location', dept.location);
    setValue('engineerAssigned', dept.engineerAssigned?._id || '');
    setValue('contact', dept.contact);
  };

  const onSubmit = async (data) => {
    try {
      let res;
      if (editMode) {
        res = await departmentAPI.update(selectedId, data);
      } else {
        res = await departmentAPI.create(data);
      }

      if (res.data.success) {
        alert(editMode ? 'Department details updated!' : 'Department created successfully!');
        setModalOpen(false);
        loadData();
      }
    } catch (err) {
      alert(`Error: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      const res = await departmentAPI.delete(id);
      if (res.data.success) {
        alert('Department deleted successfully.');
        loadData();
      }
    } catch (err) {
      alert(`Error deleting: ${err.response?.data?.message || err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="h-8 w-8 border-4 border-medical-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      
      {/* Top Banner */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Manage all clinical wards and medical zones</span>
        {isAdmin && (
          <button onClick={handleOpenCreate} className="btn-primary py-2 px-3 text-xs bg-medical-500 hover:bg-medical-600">
            <Plus className="h-4 w-4" /> Add Department
          </button>
        )}
      </div>

      {/* Grid of Wards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((dept) => (
          <div key={dept._id} className="glass-card border border-slate-100 dark:border-slate-800 flex flex-col justify-between p-6">
            <div>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-medical-500/10 text-medical-600 rounded-lg">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-base">{dept.name}</h3>
                </div>
                {isAdmin && (
                  <div className="flex gap-1.5">
                    <button onClick={() => handleOpenEdit(dept)} className="p-1 text-slate-400 hover:text-blue-650 rounded">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(dept._id, dept.name)} className="p-1 text-slate-400 hover:text-red-650 rounded">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Counts metrics */}
              <div className="grid grid-cols-3 gap-2 text-center my-5 bg-slate-50/50 dark:bg-slate-900/30 p-2.5 border border-slate-100 dark:border-slate-800/40 rounded-xl">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Total</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200 block mt-0.5">{dept.totalEquipment}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Working</span>
                  <span className="text-sm font-bold text-emerald-500 block mt-0.5">{dept.workingEquipment}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Service</span>
                  <span className="text-sm font-bold text-amber-500 block mt-0.5">{dept.maintenanceEquipment}</span>
                </div>
              </div>

              {/* Department details */}
              <div className="space-y-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400" />
                  <span>Head: {dept.head || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span>Location: {dept.location || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span>Contact: {dept.contact || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Footer Engineer info */}
            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-5 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Assigned Biomedical Eng:</span>
              <span className="font-semibold text-slate-650 dark:text-slate-350">{dept.engineerAssigned?.name || 'Unassigned'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-slide-up">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/30">
              <h3 className="font-bold text-slate-800 dark:text-white">{editMode ? 'Edit Department details' : 'Add Department'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Department Name *</label>
                <input type="text" {...register('name', { required: true })} className="input-field py-1.5" required />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Ward Head *</label>
                <input type="text" {...register('head', { required: true })} className="input-field py-1.5" required />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Location *</label>
                <input type="text" {...register('location', { required: true })} className="input-field py-1.5" placeholder="e.g. Floor 2, Block A" required />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Department Contact</label>
                <input type="text" {...register('contact')} className="input-field py-1.5" />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Assigned Biomedical Engineer</label>
                <select {...register('engineerAssigned')} className="input-field py-2">
                  <option value="">Select Engineer</option>
                  {engineers.map(e => (
                    <option key={e._id} value={e._id}>{e.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary py-2 text-sm font-semibold">Cancel</button>
                <button type="submit" className="btn-primary py-2 text-sm font-bold bg-medical-500 hover:bg-medical-600">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
