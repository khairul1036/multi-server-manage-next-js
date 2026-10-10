'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { IServerRequest, IServer } from '@/types';
import RequestServerModal from '@/components/requests/RequestServerModal';
import {
  Server,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Sliders,
  Shield,
  Layers,
  ArrowRight,
} from 'lucide-react';

export default function RequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<IServerRequest[]>([]);
  const [servers, setServers] = useState<IServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Approval modal state
  const [selectedReq, setSelectedReq] = useState<IServerRequest | null>(null);
  const [assignedServerId, setAssignedServerId] = useState('');
  const [allocatedRamMB, setAllocatedRamMB] = useState(2048);
  const [allocatedDiskMB, setAllocatedDiskMB] = useState(20480);
  const [processing, setProcessing] = useState(false);

  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'admin';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqRes, srvRes] = await Promise.all([
        fetch('/api/requests').then((r) => r.json()),
        fetch('/api/servers').then((r) => r.json()),
      ]);

      if (reqRes.success) setRequests(reqRes.requests);
      if (srvRes.success) {
        setServers(srvRes.servers);
        if (srvRes.servers[0]) setAssignedServerId(srvRes.servers[0]._id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenApprove = (req: IServerRequest) => {
    setSelectedReq(req);
    setAllocatedRamMB(req.requestedRamMB);
    setAllocatedDiskMB(req.requestedDiskMB);
  };

  const handleApprove = async () => {
    if (!selectedReq?._id || !assignedServerId) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/requests/${selectedReq._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          assignedServerId,
          allocatedRamMB,
          allocatedDiskMB,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedReq(null);
        fetchData();
      } else {
        alert(data.error || 'Failed to approve');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Please enter rejection reason (optional):');
    if (reason === null) return;
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', adminNotes: reason }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Layers className="h-6 w-6 text-indigo-400" />
            <span>Server Access & Quota Requests</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isSuperAdmin
              ? 'Review tenant requests, assign VPS nodes, and allocate RAM & Disk limits.'
              : 'Request VPS server access and hardware resources (RAM, ROM) from the Administrator.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/60 px-3.5 py-2.5 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Refresh</span>
          </button>
          {!isSuperAdmin && (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition"
            >
              <Plus className="h-4 w-4" />
              <span>New Resource Request</span>
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                {isSuperAdmin && <th className="px-5 py-4">Requesting Tenant</th>}
                <th className="px-5 py-4">Requested RAM</th>
                <th className="px-5 py-4">Requested Disk</th>
                <th className="px-5 py-4">Intended Purpose</th>
                <th className="px-5 py-4">Assigned Node</th>
                <th className="px-5 py-4">Status</th>
                {isSuperAdmin && <th className="px-5 py-4 text-right">Review Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 7 : 6} className="px-5 py-12 text-center text-slate-500">
                    {isSuperAdmin
                      ? 'No pending server requests from tenants.'
                      : 'You have not submitted any server requests yet. Click "New Resource Request" to request access.'}
                  </td>
                </tr>
              ) : (
                requests.map((req) => {
                  const reqUser = req.user || (req.userId as any);
                  const assignedSrv = req.assignedServer || (req.assignedServerId as any);

                  return (
                    <tr key={req._id} className="hover:bg-slate-800/30 transition">
                      {isSuperAdmin && (
                        <td className="px-5 py-4">
                          <p className="font-semibold text-white">{reqUser?.name || 'Tenant'}</p>
                          <p className="text-[11px] text-slate-500">{reqUser?.email}</p>
                        </td>
                      )}
                      <td className="px-5 py-4 font-mono text-indigo-400">
                        {(req.requestedRamMB / 1024).toFixed(1)} GB
                      </td>
                      <td className="px-5 py-4 font-mono text-emerald-400">
                        {(req.requestedDiskMB / 1024).toFixed(1)} GB
                      </td>
                      <td className="px-5 py-4 max-w-xs truncate text-slate-300">
                        {req.purpose}
                      </td>
                      <td className="px-5 py-4">
                        {assignedSrv ? (
                          <span className="font-medium text-slate-200">{assignedSrv.name}</span>
                        ) : (
                          <span className="text-slate-600">Pending allocation</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                            req.status === 'approved'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : req.status === 'rejected'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              req.status === 'approved'
                                ? 'bg-emerald-400'
                                : req.status === 'rejected'
                                ? 'bg-rose-400'
                                : 'bg-amber-400 animate-pulse'
                            }`}
                          />
                          {req.status}
                        </span>
                      </td>
                      {isSuperAdmin && (
                        <td className="px-5 py-4 text-right">
                          {req.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenApprove(req)}
                                className="rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold hover:bg-emerald-600 hover:text-white transition"
                              >
                                Approve & Limit
                              </button>
                              <button
                                onClick={() => req._id && handleReject(req._id)}
                                className="rounded-lg bg-rose-600/10 text-rose-400 border border-rose-500/20 px-2.5 py-1.5 text-xs font-medium hover:bg-rose-600 hover:text-white transition"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500">Processed</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approval Modal */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white">Approve & Allocate Limits</h3>
            <p className="text-xs text-slate-400 mt-1">
              Select the hosting VPS node and configure RAM/ROM quotas for this tenant.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Assign VPS Server
                </label>
                <select
                  value={assignedServerId}
                  onChange={(e) => setAssignedServerId(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                >
                  {servers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.ip})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Allocated RAM (MB)
                  </label>
                  <input
                    type="number"
                    step={256}
                    value={allocatedRamMB}
                    onChange={(e) => setAllocatedRamMB(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    {(allocatedRamMB / 1024).toFixed(1)} GB Max
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Allocated Disk (MB)
                  </label>
                  <input
                    type="number"
                    step={1024}
                    value={allocatedDiskMB}
                    onChange={(e) => setAllocatedDiskMB(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    {(allocatedDiskMB / 1024).toFixed(1)} GB Max
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedReq(null)}
                  className="rounded-xl px-4 py-2.5 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={processing}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 transition disabled:opacity-50"
                >
                  {processing ? 'Provisioning...' : 'Confirm Approval & Quotas'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <RequestServerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onRequestSubmitted={fetchData}
      />
    </div>
  );
}
