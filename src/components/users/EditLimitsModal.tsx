'use client';

import React, { useState } from 'react';
import { X, Sliders, Cpu, HardDrive, AlertCircle, Server } from 'lucide-react';
import { IUser, IServer } from '@/types';

interface EditLimitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: IUser | null;
  servers: IServer[];
  onSaved: () => void;
}

export default function EditLimitsModal({
  isOpen,
  onClose,
  user,
  servers,
  onSaved,
}: EditLimitsModalProps) {
  const [ramLimitMB, setRamLimitMB] = useState(user?.limits?.ramLimitMB || 2048);
  const [diskLimitMB, setDiskLimitMB] = useState(user?.limits?.diskLimitMB || 20480);
  const [selectedServers, setSelectedServers] = useState<string[]>(
    user?.assignedServers?.map((s: any) => typeof s === 'string' ? s : s._id || s.id) || []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleToggleServer = (serverId: string) => {
    if (selectedServers.includes(serverId)) {
      setSelectedServers(selectedServers.filter((id) => id !== serverId));
    } else {
      setSelectedServers([...selectedServers, serverId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user._id,
          ramLimitMB: Number(ramLimitMB),
          diskLimitMB: Number(diskLimitMB),
          assignedServers: selectedServers,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update user quotas');
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error updating limits');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-purple-500/10 p-2 text-purple-400 border border-purple-500/20">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Adjust Tenant Quotas & Access</h2>
              <p className="text-xs text-slate-400">Configure RAM and Disk limits for {user.name}</p>
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

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                RAM Limit (MB)
              </label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min={256}
                  step={256}
                  value={ramLimitMB}
                  onChange={(e) => setRamLimitMB(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                {(ramLimitMB / 1024).toFixed(1)} GB Max RAM
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Disk / ROM Limit (MB)
              </label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min={1024}
                  step={1024}
                  value={diskLimitMB}
                  onChange={(e) => setDiskLimitMB(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                {(diskLimitMB / 1024).toFixed(1)} GB Max Disk
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Assigned VPS Servers
            </label>
            <div className="max-h-40 overflow-y-auto space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-2.5">
              {servers.length === 0 ? (
                <p className="text-xs text-slate-500 py-2 text-center">No VPS servers connected</p>
              ) : (
                servers.map((s) => {
                  const isAssigned = selectedServers.includes(s._id || '');
                  return (
                    <label
                      key={s._id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/60 cursor-pointer hover:border-slate-700 transition"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isAssigned}
                          onChange={() => handleToggleServer(s._id || '')}
                          className="rounded border-slate-700 bg-slate-800 text-purple-600 focus:ring-purple-500 h-4 w-4"
                        />
                        <span className="text-xs font-medium text-slate-200">{s.name}</span>
                        <span className="text-[11px] font-mono text-slate-500">({s.ip})</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-semibold">{s.status}</span>
                    </label>
                  );
                })
              )}
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
              className="rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-purple-500/20 hover:from-purple-600 hover:to-indigo-700 transition disabled:opacity-50"
            >
              {loading ? 'Saving Quotas...' : 'Update Limits'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
