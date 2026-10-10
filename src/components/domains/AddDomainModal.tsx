'use client';

import React, { useState } from 'react';
import { X, Globe, AlertCircle } from 'lucide-react';
import { IServer, IUser } from '@/types';

interface AddDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  servers: IServer[];
  users: IUser[];
  initialServerId?: string;
  initialUserId?: string;
  initialPort?: number;
  onDomainAdded: () => void;
}

export default function AddDomainModal({
  isOpen,
  onClose,
  servers,
  users,
  initialServerId,
  initialUserId,
  initialPort,
  onDomainAdded,
}: AddDomainModalProps) {
  const [formData, setFormData] = useState({
    domainName: '',
    serverId: initialServerId || servers[0]?._id || '',
    userId: initialUserId || users[0]?._id || '',
    targetPort: initialPort || users[0]?.hostingPort || 8081,
  });

  // Keep form data in sync when modal opens or initial props change
  React.useEffect(() => {
    if (isOpen) {
      const selectedU = users.find((u) => u._id === (initialUserId || users[0]?._id));
      setFormData({
        domainName: '',
        serverId: initialServerId || servers[0]?._id || '',
        userId: initialUserId || users[0]?._id || '',
        targetPort: initialPort || selectedU?.hostingPort || 8081,
      });
    }
  }, [isOpen, initialServerId, initialUserId, initialPort, servers, users]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          targetPort: Number(formData.targetPort),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to map domain');
      }

      onDomainAdded();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-400 border border-emerald-500/20">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Add Custom Domain</h2>
              <p className="text-xs text-slate-400">Automated Nginx Reverse Proxy</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Domain Name</label>
            <input
              type="text"
              required
              placeholder="subdomain.clientapp.com"
              value={formData.domainName}
              onChange={(e) => setFormData({ ...formData, domainName: e.target.value })}
              className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Target VPS Server</label>
            <select
              required
              value={formData.serverId}
              onChange={(e) => setFormData({ ...formData, serverId: e.target.value })}
              className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="" disabled>Select Server</option>
              {servers.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.ip})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Target Port (Auto-Assigned)</label>
              <input
                type="number"
                required
                placeholder="8081"
                value={formData.targetPort}
                onChange={(e) => setFormData({ ...formData, targetPort: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Tenant User</label>
              <select
                required
                value={formData.userId}
                onChange={(e) => {
                  const selUid = e.target.value;
                  const selUser = users.find((u) => u._id === selUid);
                  setFormData({
                    ...formData,
                    userId: selUid,
                    targetPort: selUser?.hostingPort || formData.targetPort || 8081,
                  });
                }}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="" disabled>Select User</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} (Port {u.hostingPort || 8081})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-900 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-700 transition disabled:opacity-50"
            >
              {loading ? 'Configuring Nginx...' : 'Deploy Reverse Proxy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
