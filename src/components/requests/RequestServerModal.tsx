'use client';

import React, { useState } from 'react';
import { X, Server, Cpu, HardDrive, AlertCircle, CheckCircle2 } from 'lucide-react';

interface RequestServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestSubmitted: () => void;
}

export default function RequestServerModal({
  isOpen,
  onClose,
  onRequestSubmitted,
}: RequestServerModalProps) {
  const [formData, setFormData] = useState({
    requestedRamMB: 2048,
    requestedDiskMB: 20480,
    purpose: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit request');
      }

      onRequestSubmitted();
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
            <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-400 border border-indigo-500/20">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Request Server Access</h2>
              <p className="text-xs text-slate-400">Submit resource request to Super Admin</p>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Requested RAM
              </label>
              <select
                value={formData.requestedRamMB}
                onChange={(e) => setFormData({ ...formData, requestedRamMB: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value={1024}>1 GB RAM</option>
                <option value={2048}>2 GB RAM</option>
                <option value={4096}>4 GB RAM</option>
                <option value={8192}>8 GB RAM</option>
                <option value={16384}>16 GB RAM</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Requested Disk / ROM
              </label>
              <select
                value={formData.requestedDiskMB}
                onChange={(e) => setFormData({ ...formData, requestedDiskMB: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value={10240}>10 GB SSD</option>
                <option value={20480}>20 GB SSD</option>
                <option value={51200}>50 GB SSD</option>
                <option value={102400}>100 GB SSD</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Project Workload / Purpose
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Hosting a Next.js fullstack web application with background queues and PostgreSQL"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
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
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-600 hover:to-purple-700 transition disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
