'use client';

import React, { useState } from 'react';
import { IUser, IServer, IDomain, IServerRequest } from '@/types';
import {
  Server,
  Globe,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Key,
  Terminal,
  Shield,
  Sliders,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  FolderLock,
  Cpu,
  HardDrive,
  UserCheck,
} from 'lucide-react';

interface AutomatedHostingDashboardProps {
  users: IUser[];
  server: IServer | null;
  servers?: IServer[];
  domains: IDomain[];
  requests?: IServerRequest[];
  isSuperAdmin: boolean;
  currentUserId?: string;
  onRefresh: () => void;
  onConnectDomain: (user: IUser, server: IServer) => void;
  onRequestServer?: () => void;
}

export default function AutomatedHostingDashboard({
  users,
  server,
  servers = [],
  domains,
  requests = [],
  isSuperAdmin,
  currentUserId,
  onRefresh,
  onConnectDomain,
  onRequestServer,
}: AutomatedHostingDashboardProps) {
  // Active sub-tab under hardware metrics: 'create' or 'requests'
  const [activeTab, setActiveTab] = useState<'create' | 'requests'>('create');

  // Unified Create Isolated Tenant form state
  const [createUsername, setCreateUsername] = useState('');
  const [quotaVal, setQuotaVal] = useState(1);
  const [quotaUnit, setQuotaUnit] = useState('GB');
  const [targetServerId, setTargetServerId] = useState(server?._id || servers[0]?._id || '');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Request approval state
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // Modal state (matches Image 2)
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Compute live telemetry for the server
  const ramPercent = server?.specs?.memoryUsage || 45;
  const ramTotal = server?.specs?.totalMemoryMB || 2048;
  const ramUsed = Math.round((ramTotal * ramPercent) / 100);

  const cpuPercent = server?.specs?.cpuUsage || 18;
  const diskPercent = server?.specs?.diskUsage || 25;
  const diskTotalGB = 40;
  const diskUsedGB = parseFloat(((diskTotalGB * diskPercent) / 100).toFixed(1));
  const diskFreeGB = parseFloat((diskTotalGB - diskUsedGB).toFixed(1));

  const serverIp = server?.ip || '127.0.0.1';

  // Calculate next sequential port
  const usedPorts = users
    .map((u) => u.hostingPort)
    .filter((p): p is number => typeof p === 'number' && p >= 8081 && p <= 8150);
  let nextSequentialPort = 8081;
  while (usedPorts.includes(nextSequentialPort) && nextSequentialPort <= 8150) {
    nextSequentialPort++;
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Unified Tenant Creation handler
  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createUsername) return;
    setCreating(true);
    setCreateError(null);

    const chosenServerId = targetServerId || server?._id || servers[0]?._id;

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createUsername,
          email: `${createUsername.toLowerCase()}@vps.local`,
          password: Math.random().toString(36).substring(2, 12),
          linuxUsername: createUsername.toLowerCase(),
          quota_val: quotaVal,
          quota_unit: quotaUnit,
          serverId: chosenServerId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create tenant user');
      }

      setCreateUsername('');
      setQuotaVal(1);
      onRefresh();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Error creating isolated tenant user');
    } finally {
      setCreating(false);
    }
  };

  // One-click approve and auto-provision tenant request
  const handleApproveRequest = async (req: IServerRequest) => {
    if (!req._id) return;
    setApprovingId(req._id);
    const chosenServerId = targetServerId || server?._id || servers[0]?._id;

    try {
      const res = await fetch(`/api/requests/${req._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          assignedServerId: chosenServerId,
          allocatedRamMB: req.requestedRamMB || 2048,
          allocatedDiskMB: req.requestedDiskMB || 1024,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onRefresh();
      } else {
        alert(data.error || 'Failed to approve request');
      }
    } catch {
      alert('Network error while approving request');
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectRequest = async (reqId: string) => {
    const reason = prompt('Optional rejection note:');
    if (reason === null) return;
    setRejectingId(reqId);
    try {
      const res = await fetch(`/api/requests/${reqId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'rejected',
          adminNotes: reason || 'Declined by Administrator',
        }),
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      } else {
        alert(data.error || 'Failed to reject request');
      }
    } catch {
      alert('Network error while rejecting request');
    } finally {
      setRejectingId(null);
    }
  };

  const handleRegeneratePassword = async (userId: string) => {
    setRegenerating(true);
    try {
      const res = await fetch(`/api/users/${userId}/regenerate-password`, { method: 'POST' });
      const data = await res.json();
      if (data.success && selectedUser) {
        setSelectedUser({ ...selectedUser, sshPassword: data.password });
        onRefresh();
      } else {
        alert(data.error || 'Failed to regenerate password');
      }
    } catch {
      alert('Error communicating with server');
    } finally {
      setRegenerating(false);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete tenant '${username}'? All private files and hosting port will be wiped out!`)) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSelectedUser(null);
        onRefresh();
      } else {
        alert(data.error || 'Delete failed');
      }
    } catch {
      alert('Error deleting user');
    } finally {
      setDeleting(false);
    }
  };

  // Filter users based on role
  const displayedUsers = isSuperAdmin
    ? users
    : users.filter((u) => u._id === currentUserId || u.email === currentUserId);

  // Filter requests based on role
  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const displayedRequests = isSuperAdmin
    ? requests
    : requests.filter((r) => (r.userId as any)?._id === currentUserId || (r.userId as any) === currentUserId);

  return (
    <div className="space-y-6">
      {/* Header bar matching Image 1 */}
      <div className="rounded-2xl bg-gray-800/90 border border-gray-700 py-4 px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-lg">
        <h1 className="text-xl font-bold tracking-wide text-blue-400 flex items-center gap-2">
          <span>🚀</span>
          <span>Fully Automated User & Hosting Dashboard</span>
        </h1>
        <div className="flex items-center space-x-2">
          <span className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></span>
          <span className="bg-green-500/20 text-green-400 text-xs font-semibold px-3 py-1 rounded-full border border-green-500/30">
            Auto Port & Quota Mode
          </span>
        </div>
      </div>

      {/* Overall Server Stats Grid matching Image 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* RAM Card */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg">
          <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Overall RAM Usage</h2>
          <p className="text-3xl font-extrabold mt-2 text-blue-300">{ramPercent}%</p>
          <div className="w-full bg-gray-700 rounded-full h-2.5 mt-3 overflow-hidden">
            <div className="bg-blue-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${ramPercent}%` }}></div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Used: {ramUsed} MB / Total: {ramTotal} MB
          </p>
        </div>

        {/* CPU Card */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg">
          <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Overall CPU Usage</h2>
          <p className="text-3xl font-extrabold mt-2 text-yellow-300">{cpuPercent}%</p>
          <div className="w-full bg-gray-700 rounded-full h-2.5 mt-3 overflow-hidden">
            <div className="bg-yellow-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${cpuPercent}%` }}></div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Node: {server?.name || 'Local'} | {server?.os || 'Intel Xeon Platinum'}
          </p>
        </div>

        {/* Disk Card */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg">
          <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Overall Disk Storage</h2>
          <p className="text-3xl font-extrabold mt-2 text-green-300">{diskPercent}%</p>
          <div className="w-full bg-gray-700 rounded-full h-2.5 mt-3 overflow-hidden">
            <div className="bg-green-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${diskPercent}%` }}></div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Used: {diskUsedGB} GB / Total: {diskTotalGB} GB (Free: {diskFreeGB} GB)
          </p>
        </div>
      </div>

      {/* Unified Tenant Operations: Create Tenant OR Review User Requests */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg space-y-5">
        {/* Navigation Tabs between Direct Provisioning and User Requests List */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-700 pb-3">
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className={`text-xs font-semibold uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  activeTab === 'create'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <span>➕</span>
                <span>Create Isolated Tenant (Auto Port & Quota)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className={`text-xs font-semibold uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'requests' || !isSuperAdmin
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <span>📥</span>
              <span>Tenant Requests List</span>
              {pendingRequests.length > 0 && (
                <span className="bg-amber-400 text-gray-950 font-extrabold text-[10px] px-1.5 py-0.2 rounded-full">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          </div>

          <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
            <FolderLock className="h-3.5 w-3.5 text-purple-400" />
            <span>Enforces <code className="text-purple-300 font-mono">chmod 700</code> Zero-Trust File Privacy</span>
          </div>
        </div>

        {/* TAB 1: Unified Create Isolated Tenant Form (Super Admin) */}
        {isSuperAdmin && activeTab === 'create' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-400">
                Provisions an isolated Linux user with private directory, loop disk storage quota, and automated background HTTP server on port <span className="text-green-400 font-mono font-bold">:{nextSequentialPort}</span>.
              </p>
              <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full font-mono">
                Next Port: {nextSequentialPort}
              </span>
            </div>

            {createError && (
              <div className="mb-4 bg-red-900/40 border border-red-500 rounded-xl p-3 text-red-300 text-xs">
                ⚠️ {createError}
              </div>
            )}

            <form onSubmit={handleCreateTenant} className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-1">
                <label className="block text-xs text-gray-400 mb-1 uppercase font-semibold">Username</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. client1"
                  value={createUsername}
                  onChange={(e) => setCreateUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-sm font-mono"
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs text-gray-400 mb-1 uppercase font-semibold">Storage Amount</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={quotaVal}
                  onChange={(e) => setQuotaVal(Number(e.target.value))}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs text-gray-400 mb-1 uppercase font-semibold">Unit</label>
                <select
                  value={quotaUnit}
                  onChange={(e) => setQuotaUnit(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
                >
                  <option value="MB">MB</option>
                  <option value="GB">GB</option>
                </select>
              </div>

              {servers.length > 1 && (
                <div className="md:col-span-1">
                  <label className="block text-xs text-gray-400 mb-1 uppercase font-semibold">Target Node</label>
                  <select
                    value={targetServerId}
                    onChange={(e) => setTargetServerId(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
                  >
                    {servers.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.ip})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className={`flex items-end ${servers.length > 1 ? 'md:col-span-1' : 'md:col-span-2'}`}>
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg px-4 py-2 transition shadow text-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {creating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Provisioning Port {nextSequentialPort}...</span>
                    </>
                  ) : (
                    <span>Create Isolated Tenant & Auto-Setup</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: User Tenant Requests List ("eta user request korbe setar list hobe") */}
        {(activeTab === 'requests' || !isSuperAdmin) && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-purple-300 flex items-center gap-2">
                  <span>📥</span>
                  <span>Tenant Server & Resource Requests</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isSuperAdmin
                    ? 'Incoming requests submitted by users. Approving a request auto-provisions their chmod 700 environment, unique port, and quota.'
                    : 'Track your pending or approved requests for server and resource allocations.'}
                </p>
              </div>

              {!isSuperAdmin && onRequestServer && (
                <button
                  type="button"
                  onClick={onRequestServer}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3.5 py-2 rounded-lg font-semibold transition flex items-center gap-1.5 shadow"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Request Server Access</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto border border-gray-700/60 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-900/80 text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="py-2.5 px-3.5">User</th>
                    <th className="py-2.5 px-3.5">Requested Resources</th>
                    <th className="py-2.5 px-3.5">Purpose / Notes</th>
                    <th className="py-2.5 px-3.5">Status</th>
                    {isSuperAdmin && <th className="py-2.5 px-3.5 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-gray-700">
                  {displayedRequests.length === 0 ? (
                    <tr>
                      <td colSpan={isSuperAdmin ? 5 : 4} className="py-6 text-center text-gray-500">
                        No requests submitted yet.
                      </td>
                    </tr>
                  ) : (
                    displayedRequests.map((r) => {
                      const reqUser = r.user || (typeof r.userId === 'object' ? (r.userId as IUser) : null);
                      const isPending = r.status === 'pending';
                      const ramGB = (r.requestedRamMB / 1024).toFixed(1);
                      const diskGB = (r.requestedDiskMB / 1024).toFixed(1);

                      return (
                        <tr key={r._id} className="hover:bg-gray-750 transition">
                          <td className="py-3 px-3.5">
                            <p className="font-semibold text-white">{reqUser?.name || 'Tenant User'}</p>
                            <p className="text-[11px] text-gray-400">{reqUser?.email}</p>
                          </td>
                          <td className="py-3 px-3.5 font-mono text-purple-300">
                            {ramGB} GB RAM / {diskGB} GB Storage
                          </td>
                          <td className="py-3 px-3.5 text-gray-300 max-w-xs truncate">
                            {r.purpose || r.adminNotes || 'General Hosting'}
                          </td>
                          <td className="py-3 px-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                r.status === 'approved'
                                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                  : r.status === 'rejected'
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          {isSuperAdmin && (
                            <td className="py-3 px-3.5 text-right space-x-2">
                              {isPending ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={approvingId === r._id}
                                    onClick={() => handleApproveRequest(r)}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] px-3 py-1.5 rounded-lg font-semibold transition shadow disabled:opacity-50"
                                  >
                                    {approvingId === r._id ? 'Provisioning...' : 'Approve & Auto-Setup'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={rejectingId === r._id}
                                    onClick={() => r._id && handleRejectRequest(r._id)}
                                    className="bg-red-600/80 hover:bg-red-600 text-white text-[11px] px-2.5 py-1.5 rounded-lg font-semibold transition disabled:opacity-50"
                                  >
                                    Reject
                                  </button>
                                </>
                              ) : (
                                <span className="text-gray-500 text-[11px]">Processed</span>
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
        )}
      </div>

      {/* System Users Table matching Image 1 */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4 border-b border-gray-700 pb-2">
          <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
            <span>👥</span>
            <span>System Users (Click row for details & website link)</span>
          </h2>
          <span className="text-xs text-slate-400">{displayedUsers.length} user(s) configured</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-gray-400 text-xs uppercase border-b border-gray-700">
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Hosting Port & URL</th>
                <th className="py-3 px-4">Used / Allocated Limit</th>
                <th className="py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-700">
              {displayedUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                displayedUsers.map((u) => {
                  const isRoot = u.role === 'superadmin' || u.linuxUsername === 'root_admin' || u.linuxUsername === 'root';
                  const port = u.hostingPort || (isRoot ? 80 : 8081);
                  const webUrl = `http://${serverIp}:${port}`;
                  const usedMb = u.usedStorageMB || (isRoot ? 1.8 : 0.05);
                  const totalMb = u.limits?.diskLimitMB || (isRoot ? 20480 : 1024);

                  return (
                    <tr
                      key={u._id}
                      onClick={() => setSelectedUser(u)}
                      className="hover:bg-gray-700/50 cursor-pointer transition"
                    >
                      <td className="py-3 px-4 font-bold text-blue-300">
                        {u.linuxUsername || u.name}
                      </td>
                      <td className="py-3 px-4 text-green-300 font-mono">
                        {isRoot ? (
                          <span className="text-blue-300 font-mono text-xs font-semibold">
                            Port 80 (Master Control)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 hover:underline text-green-300">
                            Port {port}
                            <ExternalLink className="h-3 w-3 text-green-400" />
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-yellow-300 font-semibold">
                        {usedMb} MB / {totalMb} MB
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-blue-500/20 text-blue-400 text-xs px-2.5 py-1 rounded-full border border-blue-500/30 font-medium">
                          Manage
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Modal matching Image 2 */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-700 pb-3">
              <h3 className="text-lg font-bold text-blue-400">
                User: {selectedUser.linuxUsername || selectedUser.name}
              </h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-white font-bold text-xl px-2"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-sm text-gray-300">
              <p>
                <strong>Home Directory:</strong>{' '}
                <span className="text-white font-mono">
                  {selectedUser.linuxUsername === 'root_admin' ? '/root' : `/home/${selectedUser.linuxUsername || selectedUser.name}`}
                </span>
                <span className="ml-2 text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
                  chmod 700 sandbox
                </span>
              </p>

              <p>
                <strong>Website URL:</strong>{' '}
                <a
                  href={`http://${serverIp}:${selectedUser.hostingPort || (selectedUser.role === 'superadmin' ? 80 : 8081)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 underline font-mono inline-flex items-center gap-1"
                >
                  <span>http://{serverIp}:{selectedUser.hostingPort || (selectedUser.role === 'superadmin' ? 80 : 8081)}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </p>

              <p>
                <strong>Storage Usage:</strong>{' '}
                <span className="text-yellow-300 font-semibold">
                  {selectedUser.usedStorageMB || 0.05} MB / {selectedUser.limits?.diskLimitMB || 1024} MB
                </span>
              </p>

              <div>
                <strong>SSH Login:</strong>
                <div className="relative mt-1">
                  <code className="bg-gray-900 px-3 py-2 rounded-lg text-blue-300 block font-mono text-xs border border-gray-800">
                    ssh {selectedUser.linuxUsername || selectedUser.name}@{serverIp}
                  </code>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `ssh ${selectedUser.linuxUsername || selectedUser.name}@${serverIp}`,
                        'ssh'
                      )
                    }
                    className="absolute right-2 top-1.5 p-1 text-gray-400 hover:text-white"
                    title="Copy SSH Command"
                  >
                    {copiedText === 'ssh' ? (
                      <Check className="h-3.5 w-3.5 text-green-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <strong>Password:</strong>
                <div className="relative mt-1">
                  <span className="bg-gray-900 px-3 py-1.5 rounded-lg text-yellow-300 font-mono text-xs block border border-gray-800">
                    {selectedUser.sshPassword || 'Password123!'}
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(selectedUser.sshPassword || 'Password123!', 'pass')
                    }
                    className="absolute right-2 top-1 p-1 text-gray-400 hover:text-white"
                    title="Copy Password"
                  >
                    {copiedText === 'pass' ? (
                      <Check className="h-3.5 w-3.5 text-green-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Connected Custom Domains for this user */}
              <div className="pt-2">
                <strong>Connected Custom Domains:</strong>
                <div className="mt-1 space-y-1">
                  {domains.filter((d) => (d.userId as any)?._id === selectedUser._id || (d.userId as any) === selectedUser._id).length === 0 ? (
                    <p className="text-xs text-gray-500">
                      No custom domain linked yet (running on internal port {selectedUser.hostingPort || 8081}).
                    </p>
                  ) : (
                    domains
                      .filter((d) => (d.userId as any)?._id === selectedUser._id || (d.userId as any) === selectedUser._id)
                      .map((dom) => (
                        <div key={dom._id} className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                          <Globe className="h-3.5 w-3.5" />
                          <a href={`http://${dom.domainName}`} target="_blank" rel="noopener noreferrer" className="underline">
                            {dom.domainName}
                          </a>
                          <span className="text-gray-500">→ :{dom.targetPort}</span>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-gray-700">
              <button
                type="button"
                onClick={() => {
                  const srv = server || ({ _id: selectedUser.assignedServers?.[0] } as any);
                  onConnectDomain(selectedUser, srv);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3.5 py-2 rounded-lg font-semibold transition flex items-center gap-1.5 shadow"
              >
                <Globe className="h-3.5 w-3.5" />
                <span>Connect Domain</span>
              </button>

              <div className="flex items-center gap-2">
                {selectedUser.role !== 'superadmin' && (
                  <button
                    type="button"
                    disabled={regenerating}
                    onClick={() => selectedUser._id && handleRegeneratePassword(selectedUser._id)}
                    className="bg-yellow-600 hover:bg-yellow-500 text-white text-xs px-3.5 py-2 rounded-lg font-semibold transition disabled:opacity-50"
                  >
                    {regenerating ? 'Regenerating...' : 'Regenerate Password'}
                  </button>
                )}

                {isSuperAdmin && selectedUser.role !== 'superadmin' && (
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() =>
                      selectedUser._id &&
                      handleDeleteUser(selectedUser._id, selectedUser.linuxUsername || selectedUser.name)
                    }
                    className="bg-red-600 hover:bg-red-500 text-white text-xs px-3.5 py-2 rounded-lg font-semibold transition disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Delete User & Files'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
