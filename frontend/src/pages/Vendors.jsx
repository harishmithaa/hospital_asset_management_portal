import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { vendorAPI } from '../services/api';
import { useForm } from 'react-hook-form';
import { Briefcase, Star, Plus, Edit2, Trash2, Mail, Phone, MapPin, X } from 'lucide-react';

export default function Vendors() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const { register, handleSubmit, reset, setValue } = useForm();

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await vendorAPI.getAll();
      if (res.data.success) {
        setVendors(res.data.vendors);
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

  const handleOpenEdit = (v) => {
    setEditMode(true);
    setSelectedId(v._id);
    setModalOpen(true);

    setValue('companyName', v.companyName);
    setValue('contactPerson', v.contactPerson);
    setValue('email', v.email);
    setValue('phone', v.phone);
    setValue('address', v.address);
    setValue('gstNumber', v.gstNumber);
    setValue('specialization', v.specialization);
    setValue('rating', v.rating);
    setValue('status', v.status);
  };

  const onSubmit = async (data) => {
    try {
      let res;
      if (editMode) {
        res = await vendorAPI.update(selectedId, data);
      } else {
        res = await vendorAPI.create(data);
      }

      if (res.data.success) {
        alert(editMode ? 'Vendor records updated!' : 'Vendor profile created successfully!');
        setModalOpen(false);
        loadData();
      }
    } catch (err) {
      alert(`Error: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name}?`)) return;
    try {
      const res = await vendorAPI.delete(id);
      if (res.data.success) {
        alert('Vendor record removed.');
        loadData();
      }
    } catch (err) {
      alert(`Error deleting vendor: ${err.response?.data?.message || err.message}`);
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
      
      {/* Top Controls Banner */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Directory of medical hardware manufacturers and technicians</span>
        {isAdmin && (
          <button onClick={handleOpenCreate} className="btn-primary py-2 px-3 text-xs bg-medical-500 hover:bg-medical-600">
            <Plus className="h-4 w-4" /> Add Vendor
          </button>
        )}
      </div>

      {/* Grid view of contractors */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vendors.map((v) => (
          <div key={v._id} className="glass-card border border-slate-100 dark:border-slate-800 flex flex-col justify-between p-6">
            <div>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-medical-500/10 text-medical-600 rounded-lg">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm">{v.companyName}</h3>
                    <span className="text-[10px] text-slate-400 font-bold block">{v.specialization}</span>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-1.5">
                    <button onClick={() => handleOpenEdit(v)} className="p-1 text-slate-400 hover:text-blue-650 rounded">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(v._id, v.companyName)} className="p-1 text-slate-400 hover:text-red-655 rounded">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Contact list details */}
              <div className="space-y-2 mt-5 text-xs font-semibold text-slate-600 dark:text-slate-400 border-t border-slate-150/40 dark:border-slate-800/40 pt-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span>Email: {v.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span>Phone: {v.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span>Address: {v.address || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Performance ratings */}
            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-5 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Vendor Score:</span>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                <span className="font-bold text-slate-700 dark:text-slate-200">{v.rating || '5.0'} / 5.0</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal form */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-slide-up">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/30">
              <h3 className="font-bold text-slate-800 dark:text-white">{editMode ? 'Edit Vendor Details' : 'Add New Vendor'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 font-sans">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Company Name *</label>
                <input type="text" {...register('companyName', { required: true })} className="input-field py-1.5" required />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Contact Person *</label>
                <input type="text" {...register('contactPerson', { required: true })} className="input-field py-1.5" required />
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
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Company Address</label>
                <input type="text" {...register('address')} className="input-field py-1.5" />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">GST/TAX ID</label>
                <input type="text" {...register('gstNumber')} className="input-field py-1.5" />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Specialization Speciality *</label>
                <input type="text" {...register('specialization', { required: true })} className="input-field py-1.5" placeholder="e.g. Life Support, Imaging" required />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Rating Rating (0 - 5)</label>
                <input type="number" step="0.1" min="0" max="5" {...register('rating')} className="input-field py-1.5" />
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
