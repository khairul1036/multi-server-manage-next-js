'use client';

import React, { useState } from 'react';
import {
  X,
  Users,
  Shield,
  Server,
  Key,
  HardDrive,
  Cpu,
  Layers,
  FolderLock,
  AlertCircle,
  CheckCircle2,
  Lock,
  Globe,
} from 'lucide-react';
import { IServer } from '@/types';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  servers: IServer[];
  onUserAdded: () => void;
}

export default function AddUserModal({
  isOpen,
  onClose,
  servers,
  onUserAdded,
}: AddUserModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    linuxUsername: '',
    sshPassword: '',
    serverId: servers[0]?._id || '',
    quota_val: 10,
    quota_unit: 'GB',
    ramLimitMB: 2048,
    role: 'user',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    const sanitizedLinux = val.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20);
    setFormData((prev) => ({
      ...prev,
      name: val,
      linuxUsername: prev.linuxUsername ? prev.linuxUsername : sanitizedLinux,
      email: prev.email ? prev.email : (sanitizedLinux ? `${sanitizedLinux}@cloud.local` : ''),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password || 'UserPassword123!',
          linuxUsername: formData.linuxUsername,
          role: formData.role,
          serverId: formData.serverId || undefined,
          quota_val: formData.quota_val,
          quota_unit: formData.quota_unit,
          ramLimitMB: formData.ramLimitMB,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create tenant user');
      }

      onUserAdded();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl border border-slate-700/80 bg-slate-900/95 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 p-2.5 text-purple-400 border border-purple-500/30">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Create User & Provision Isolated VPS Server</span>
              </h2>
              <p className="text-xs text-slate-400">
                Creates account, isolated Linux directory, hardware limits, and web port
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Target VPS Server */}
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3.5 space-y-2">
            <label className="block text-xs font-semibold text-indigo-300 flex items-center gap-2">
              <Server className="h-4 w-4 text-indigo-400" />
              <span>Target VPS Node (কোন সার্ভারে তৈরি হবে)</span>
            </label>
            <select
              value={formData.serverId}
              onChange={(e) => setFormData({ ...formData, serverId: e.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            >
              {servers.length === 0 ? (
                <option value="">No VPS connected yet (Local simulation)</option>
              ) : (
                servers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.ip}) — Status: {s.status.toUpperCase()}
                  </option>
                ))
              )}
            </select>
            <p className="text-[11px] text-slate-400">
              Remote agent automatically executes user isolation on this selected node.
            </p>
          </div>

          {/* User Basic Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. John Doe"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address (Login)</label>
              <input
                type="email"
                required
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Linux Username
              </label>
              <input
                type="text"
                required
                placeholder="john_user"
                value={formData.linuxUsername}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    linuxUsername: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''),
                  })
                }
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2 text-sm text-white font-mono placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              <p className="mt-1 text-[11px] text-slate-500 font-mono">
                Dir: /home/{formData.linuxUsername || 'username'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Password (Login & SSH)
              </label>
              <input
                type="text"
                required
                placeholder="UserPassword123!"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2 text-sm text-white font-mono placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Hardware Quotas: RAM & Storage */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-3">
            <p className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-400" />
              <span>Hardware Allocation Quota (রিসোর্স লিমিট)</span>
            </p>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">RAM Quota</label>
                <select
                  value={formData.ramLimitMB}
                  onChange={(e) => setFormData({ ...formData, ramLimitMB: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value={1024}>1.0 GB RAM</option>
                  <option value={2048}>2.0 GB RAM</option>
                  <option value={4096}>4.0 GB RAM</option>
                  <option value={8192}>8.0 GB RAM</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Storage Quota</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={formData.quota_val}
                  onChange={(e) => setFormData({ ...formData, quota_val: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Unit</label>
                <select
                  value={formData.quota_unit}
                  onChange={(e) => setFormData({ ...formData, quota_unit: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="GB">GB</option>
                  <option value="MB">MB</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-slate-300">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <FolderLock className="h-3.5 w-3.5" />
                <span>chmod 700 Zero-Trust Isolation Enforced</span>
              </span>
              <span className="font-mono text-indigo-400">⚡ Auto Port: 8081-8150</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-purple-500/20 hover:from-purple-600 hover:to-indigo-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Provisioning User Server...</span>
                </>
              ) : (
                <span>Create User & Provision Environment</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
