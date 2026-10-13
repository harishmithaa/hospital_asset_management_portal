import React from 'react';
import { useNotifications } from '../context/NotificationContext';
import { Bell, CheckCircle, AlertTriangle, Info, X, CheckCheck } from 'lucide-react';

const getCategoryStyle = (category) => {
  switch (category) {
    case 'Critical': return { icon: <AlertTriangle className="h-4 w-4 text-red-500" />, bg: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700' };
    case 'Warning':  return { icon: <AlertTriangle className="h-4 w-4 text-amber-500" />, bg: 'bg-amber-50 border-amber-200', badge: 'bg-amber-100 text-amber-700' };
    case 'Success':  return { icon: <CheckCircle className="h-4 w-4 text-emerald-500" />, bg: 'bg-emerald-50 border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' };
    default:         return { icon: <Info className="h-4 w-4 text-blue-500" />, bg: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-700' };
  }
};

export default function Notifications() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Bell className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Notifications</h2>
            <p className="text-xs text-slate-500">{unreadCount} unread</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark All Read
          </button>
        )}
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <Bell className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No notifications</p>
          <p className="text-xs text-slate-400 mt-1">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const style = getCategoryStyle(n.category);
            return (
              <div
                key={n._id}
                className={`bg-white border rounded-xl p-4 flex gap-3 transition-all ${!n.read ? 'border-blue-200 shadow-sm' : 'border-slate-200'}`}
              >
                <div className="mt-0.5 flex-shrink-0">{style.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>{n.category}</span>
                      {!n.read && (
                        <button
                          onClick={() => markAsRead(n._id)}
                          className="text-slate-400 hover:text-blue-600 transition-colors"
                          title="Mark as read"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{n.message}</p>
                  <p className="text-[10px] text-slate-400 mt-2">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                {!n.read && <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
