import React from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Calendar, Shield } from 'lucide-react';
import { getFileUrl } from '../services/api';

export default function Profile() {
  const { user } = useAuth();

  return (
    <div className="max-w-xl mx-auto font-sans animate-slide-up">
      <div className="glass-panel border border-slate-100 dark:border-slate-800 p-8 flex flex-col items-center">
        
        {/* Profile picture */}
        <div className="h-28 w-28 rounded-full overflow-hidden border-2 border-medical-500 shadow flex items-center justify-center bg-slate-50">
          {user?.profileImage ? (
            <img src={getFileUrl(user.profileImage)} alt="Profile" className="object-cover h-full w-full" />
          ) : (
            <User className="h-14 w-14 text-slate-400" />
          )}
        </div>

        <h2 className="text-xl font-bold mt-4 text-slate-800 dark:text-white">{user?.name}</h2>
        <span className="text-xs bg-medical-500/10 text-medical-600 px-3 py-1 rounded-full font-bold capitalize mt-1.5">{user?.role}</span>

        {/* Info Grid */}
        <div className="w-full mt-8 space-y-4 border-t border-slate-100 dark:border-slate-850 pt-6 text-sm font-semibold text-slate-650 dark:text-slate-400">
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-400 flex items-center gap-2"><Mail className="h-4 w-4" /> Email Address</span>
            <span className="text-slate-800 dark:text-slate-200">{user?.email}</span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-slate-400 flex items-center gap-2"><Phone className="h-4 w-4" /> Contact Phone</span>
            <span className="text-slate-800 dark:text-slate-200">{user?.phone || 'N/A'}</span>
          </div>

          {user?.department && (
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400 flex items-center gap-2"><Shield className="h-4 w-4" /> Department Ward</span>
              <span className="text-slate-800 dark:text-slate-200">{user.department.name}</span>
            </div>
          )}

          <div className="flex justify-between items-center py-1">
            <span className="text-slate-400 flex items-center gap-2"><Calendar className="h-4 w-4" /> Last Session Login</span>
            <span className="text-slate-800 dark:text-slate-200">
              {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'First time session'}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
