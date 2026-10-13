import React, { useState, useEffect } from 'react';
import { authAPI, departmentAPI, getFileUrl } from '../services/api';
import { useForm } from 'react-hook-form';
import { Plus, Edit2, Trash2, Shield, User, X, Mail, Phone } from 'lucide-react';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const { register, handleSubmit, reset, setValue } = useForm();

  const loadData = async () => {
    try {
      setLoading(true);
      const [resUsers, resDepts] = await Promise.all([
        authAPI.getUsers(),
        departmentAPI.getAll()
      ]);

      if (resUsers.data.success) setUsers(resUsers.data.users);
      if (resDepts.data.success) setDepartments(resDepts.data.departments);
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

  const handleOpenEdit = (u) => {
    setEditMode(true);
    setSelectedId(u._id);
    setModalOpen(true);

    setValue('name', u.name);
    setValue('email', u.email);
    setValue('phone', u.phone);
    setValue('role', u.role);
    setValue('department', u.department?._id || '');
    setValue('status', u.status);
    setValue('password', ''); // Blank by default, only set if changing
  };

  const onSubmit = async (data) => {
    try {
      const fd = new FormData();
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
          fd.append(key, data[key]);
        }
      });

      const profileInput = document.getElementById('userProfileImageFile');
      if (profileInput?.files[0]) {
        fd.append('profileImage', profileInput.files[0]);
      }

      let res;
      if (editMode) {
        res = await authAPI.updateUser(selectedId, fd);
      } else {
        res = await authAPI.createUser(fd);
      }

      if (res.data.success) {
        alert(editMode ? 'User settings updated!' : 'User account created successfully!');
        setModalOpen(false);
        loadData();
      }
    } catch (err) {
      alert(`Error saving user: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name}?`)) return;
    try {
      const res = await authAPI.deleteUser(id);
      if (res.data.success) {
        alert('User removed.');
        loadData();
      }
    } catch (err) {
      alert(`Error deleting user: ${err.response?.data?.message || err.message}`);
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
      
      {/* Top Banner controls */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Manage directory of system administrators, engineers, staff and vendor reps</span>
        <button onClick={handleOpenCreate} className="btn-primary py-2 px-3 text-xs bg-medical-500 hover:bg-medical-600">
          <Plus className="h-4 w-4" /> Create User
        </button>
      </div>

      {/* Grid of accounts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((u) => (
          <div key={u._id} className="glass-card border border-slate-100 dark:border-slate-800 flex flex-col justify-between p-6">
            <div>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 flex items-center justify-center bg-slate-50">
                    {u.profileImage ? (
                      <img src={getFileUrl(u.profileImage)} alt="Profile" className="object-cover h-full w-full" />
                    ) : (
                      <User className="h-6 w-6 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm">{u.name}</h3>
                    <span className="text-[10px] text-slate-400 font-bold block capitalize">{u.role}</span>
                  </div>
                </div>
                
                <div className="flex gap-1">
                  <button onClick={() => handleOpenEdit(u)} className="p-1 text-slate-400 hover:text-blue-650 rounded">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(u._id, u.name)} className="p-1 text-slate-400 hover:text-red-655 rounded">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* details */}
              <div className="space-y-2 mt-5 text-xs font-semibold text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-850 pt-4">
                <div className="flex justify-between">
                  <span className="text-slate-400">Email:</span>
                  <span className="text-slate-750 dark:text-slate-350">{u.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Phone:</span>
                  <span className="text-slate-750 dark:text-slate-350">{u.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Wards Dept:</span>
                  <span className="text-slate-755 dark:text-slate-355">{u.department?.name || 'All Hospital'}</span>
                </div>
              </div>
            </div>

            {/* Status indicator */}
            <div className="border-t border-slate-100 dark:border-slate-850 pt-4 mt-5 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Account Status:</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                u.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
              }`}>{u.status}</span>
            </div>
          </div>
        ))}
      </div>

      {/* User Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-slide-up">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/30">
              <h3 className="font-bold text-slate-800 dark:text-white">{editMode ? 'Edit User Credentials' : 'Create User Account'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">Close</button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 font-sans">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Full Name *</label>
                <input type="text" {...register('name', { required: true })} className="input-field py-1.5" required />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Email Address *</label>
                <input type="email" {...register('email', { required: true })} className="input-field py-1.5" required />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Phone Number</label>
                <input type="text" {...register('phone')} className="input-field py-1.5" />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Role *</label>
                <select {...register('role', { required: true })} className="input-field py-2" required>
                  <option value="Admin">Admin</option>
                  <option value="Biomedical Engineer">Biomedical Engineer</option>
                  <option value="Department Staff">Department Staff</option>
                  <option value="Vendor">Vendor rep</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Department Wards (Optional)</label>
                <select {...register('department')} className="input-field py-2">
                  <option value="">Hospital Wide</option>
                  {departments.map(d => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Password {editMode && '(Leave blank to keep)'}</label>
                <input type="password" {...register('password')} className="input-field py-1.5" placeholder={editMode ? '••••••••' : 'Enter login password'} required={!editMode} />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Account Status</label>
                <select {...register('status')} className="input-field py-2">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Profile Image</label>
                <input type="file" id="userProfileImageFile" className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-medical-50 file:text-medical-700" />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary py-2 text-sm font-semibold">Cancel</button>
                <button type="submit" className="btn-primary py-2 text-sm font-bold bg-medical-500 hover:bg-medical-600">Save Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
