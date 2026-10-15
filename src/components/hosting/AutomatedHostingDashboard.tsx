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
  Layers,
  HelpCircle,
  Eye,
  EyeOff,
  Radio,
  Sparkles,
  Users,
  AlertCircle,
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
  // Selected server for telemetry & filtering (defaults to first server or null)
  const [selectedServerId, setSelectedServerId] = useState<string>(server?._id || servers[0]?._id || '');

  // Active sub-tab under hardware metrics: 'create' or 'requests'
  const [activeTab, setActiveTab] = useState<'create' | 'requests'>('create');

  // Unified Create Isolated Tenant form state
  const [createUsername, setCreateUsername] = useState('');
  const [userFullName, setUserFullName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [quotaVal, setQuotaVal] = useState(10);
  const [quotaUnit, setQuotaUnit] = useState('GB');
  const [ramQuotaMB, setRamQuotaMB] = useState(2048);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Request approval state
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // Modal state
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);

  // Find currently active server object based on selection
  const activeServer = servers.find((s) => s._id === selectedServerId) || server || servers[0] || null;

  // Compute live telemetry for the active server
  const ramPercent = activeServer?.specs?.memoryUsage ?? 28;
  const ramTotal = activeServer?.specs?.totalMemoryMB || 2048;
  const ramUsed = Math.round((ramTotal * ramPercent) / 100);

  const cpuPercent = activeServer?.specs?.cpuUsage ?? 15;
  const diskPercent = activeServer?.specs?.diskUsage ?? 22;
  const diskTotalGB = 40;
  const diskUsedGB = parseFloat(((diskTotalGB * diskPercent) / 100).toFixed(1));
  const diskFreeGB = parseFloat((diskTotalGB - diskUsedGB).toFixed(1));

  const serverIp = activeServer?.ip || '127.0.0.1';

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

    const chosenServerId = selectedServerId || activeServer?._id || servers[0]?._id;

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userFullName || createUsername,
          email: userEmail || `${createUsername.toLowerCase()}@vps.local`,
          password: Math.random().toString(36).substring(2, 12) + '!1A',
          linuxUsername: createUsername.toLowerCase(),
          quota_val: quotaVal,
          quota_unit: quotaUnit,
          ramLimitMB: ramQuotaMB,
          serverId: chosenServerId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create tenant user');
      }

      setCreateUsername('');
      setUserFullName('');
      setUserEmail('');
      setQuotaVal(10);
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
    const chosenServerId = selectedServerId || activeServer?._id || servers[0]?._id;

    try {
      const res = await fetch(`/api/requests/${req._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          assignedServerId: chosenServerId,
          allocatedRamMB: req.requestedRamMB || 2048,
          allocatedDiskMB: req.requestedDiskMB || 10240,
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

  // Filter users based on role and active server
  const displayedUsers = isSuperAdmin
    ? users
    : users.filter((u) => u._id === currentUserId || u.email === currentUserId);

  // Filter requests based on role
  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const displayedRequests = isSuperAdmin
    ? requests
    : requests.filter((r) => {
        const uid = typeof r.userId === 'object' ? (r.userId as IUser)?._id : r.userId;
        return uid === currentUserId;
      });

  return (
    <div className="space-y-6">
      {/* Top Bar with Server Selector & Guide Button */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 backdrop-blur-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Automated VPS User & Server Control</span>
            </h2>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Isolation & Auto-Port Active
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {isSuperAdmin
              ? 'Select any VPS server node from your fleet to monitor real-time RAM, CPU, Storage, and provision isolated tenant environments.'
              : 'View your isolated Linux environment, website port, and request hardware resource upgrades.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Help Guide button */}
          <button
            type="button"
            onClick={() => setShowHelpGuide(!showHelpGuide)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-600 transition"
          >
            <HelpCircle className="h-3.5 w-3.5 text-indigo-400" />
            <span>{showHelpGuide ? 'Hide Guide' : 'কুইক গাইড (Setup Guide)'}</span>
          </button>

          {/* Server Switcher Dropdown/Tabs if multiple servers exist */}
          {servers.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 pl-2 font-medium flex items-center gap-1">
                <Server className="h-3.5 w-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Active Node:</span>
              </span>
              <select
                value={selectedServerId || activeServer?._id}
                onChange={(e) => setSelectedServerId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-white px-2.5 py-1.5 outline-none rounded-lg cursor-pointer"
              >
                {servers.map((s) => (
                  <option key={s._id} value={s._id} className="bg-slate-900 text-white">
                    {s.name} ({s.ip}) — {s.status.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Expandable Setup & How-To Guide in Bengali */}
      {showHelpGuide && (
        <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 to-slate-950 p-5 backdrop-blur-xl shadow-xl animate-in fade-in duration-150 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-indigo-500/20">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="text-lg">📘</span>
              <span>সহজ নির্দেশিকা: নতুন সার্ভার যুক্ত করা ও ইউজারদের সার্ভার তৈরি করে দেওয়া</span>
            </h3>
            <button
              onClick={() => setShowHelpGuide(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕ বন্ধ করুন
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="rounded-xl border border-indigo-500/20 bg-slate-900/60 p-4 space-y-2">
              <p className="font-bold text-indigo-300 flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] text-white">1</span>
                <span>নতুন VPS সার্ভার যুক্ত করা</span>
              </p>
              <p className="text-slate-300 leading-relaxed">
                উপরে <strong className="text-white">&quot;Connect VPS&quot;</strong> বাটনে ক্লিক করুন। আপনার VPS সার্ভারে ১-ক্লিকে টার্মিনালে এজেন্ট স্ক্রিপ্ট রান করুন এবং আইপি ও API Key দিয়ে কানেক্ট করুন। সার্ভারটি তালিকায় চলে আসবে।
              </p>
            </div>

            <div className="rounded-xl border border-purple-500/20 bg-slate-900/60 p-4 space-y-2">
              <p className="font-bold text-purple-300 flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-[10px] text-white">2</span>
                <span>ইউজারদের জন্য সার্ভার তৈরি করা</span>
              </p>
              <p className="text-slate-300 leading-relaxed">
                নিচের ফর্মে ইউজারের নাম ও RAM/ROM কোটা দিয়ে <strong className="text-white">&quot;Create Isolated Tenant&quot;</strong> চাপুন। স্বয়ংক্রিয়ভাবে ঐ সার্ভারে সুরক্ষিত ডিরেক্টরি (<code className="text-purple-300 font-mono">chmod 700</code>) এবং একটি অটো-পোর্ট (যেমন 8081) চালু হয়ে যাবে!
              </p>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-slate-900/60 p-4 space-y-2">
              <p className="font-bold text-emerald-300 flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white">3</span>
                <span>ডোমেইন ও ওয়েবসাইট চালু করা</span>
              </p>
              <p className="text-slate-300 leading-relaxed">
                ইউজারদের টেবিলে <strong className="text-white">&quot;Manage&quot;</strong> ক্লিক করে সরাসরি তাদের ওয়েবসাইটের পোর্ট দেখতে পারবেন এবং ডোমেইন যুক্ত করলে Nginx রিভার্স প্রক্সি স্বয়ংক্রিয়ভাবে পোর্টটিতে ট্রাফিক ফরওয়ার্ড করবে।
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Telemetry Metrics for the Active VPS Node */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* RAM Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl shadow-lg relative overflow-hidden group hover:border-indigo-500/40 transition">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="h-4 w-4 text-indigo-400" />
              <span>RAM Allocation</span>
            </span>
            <span className="font-mono text-xs text-indigo-300 font-semibold">{ramUsed} / {ramTotal} MB</span>
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <p className="text-3xl font-extrabold text-white tracking-tight font-mono">{ramPercent}%</p>
            <span className="text-xs text-slate-400 font-medium">Node: {activeServer?.name || 'Local'}</span>
          </div>

          <div className="w-full bg-slate-950 rounded-full h-2 mt-3 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, ramPercent)}%` }}
            />
          </div>
        </div>

        {/* CPU Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Server className="h-4 w-4 text-amber-400" />
              <span>CPU Load & Cores</span>
            </span>
            <span className="font-mono text-xs text-amber-300 font-semibold">{serverIp}</span>
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <p className="text-3xl font-extrabold text-white tracking-tight font-mono">{cpuPercent}%</p>
            <span className="text-xs text-slate-400 font-medium">{activeServer?.os || 'Ubuntu Linux'}</span>
          </div>

          <div className="w-full bg-slate-950 rounded-full h-2 mt-3 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, cpuPercent)}%` }}
            />
          </div>
        </div>

        {/* Storage Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <HardDrive className="h-4 w-4 text-emerald-400" />
              <span>Disk / ROM Storage</span>
            </span>
            <span className="font-mono text-xs text-emerald-300 font-semibold">{diskUsedGB} / {diskTotalGB} GB</span>
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <p className="text-3xl font-extrabold text-white tracking-tight font-mono">{diskPercent}%</p>
            <span className="text-xs text-slate-400 font-medium">{diskFreeGB} GB Free</span>
          </div>

          <div className="w-full bg-slate-950 rounded-full h-2 mt-3 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, diskPercent)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Unified Provisioning & Requests Management Box */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className={`text-xs font-semibold uppercase tracking-wider px-3.5 py-2 rounded-xl transition flex items-center gap-2 ${
                  activeTab === 'create'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Plus className="h-4 w-4" />
                <span>Create Isolated Tenant (Auto Port & Quota)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className={`text-xs font-semibold uppercase tracking-wider px-3.5 py-2 rounded-xl transition flex items-center gap-2 ${
                activeTab === 'requests' || !isSuperAdmin
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>Tenant Resource Requests</span>
              {pendingRequests.length > 0 && (
                <span className="bg-amber-400 text-slate-950 font-extrabold text-[10px] px-1.5 py-0.5 rounded-full">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <FolderLock className="h-4 w-4 text-emerald-400" />
            <span>Targeting: <strong className="text-white">{activeServer?.name || 'Local'}</strong> (Port :{nextSequentialPort})</span>
          </div>
        </div>

        {/* TAB 1: Fast Tenant Creation */}
        {isSuperAdmin && activeTab === 'create' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-slate-400">
                Creates an isolated user on <span className="text-indigo-300 font-semibold">{activeServer?.name || 'Selected VPS'}</span>, enforces <code className="text-purple-300 font-mono">chmod 700 /home/&lt;user&gt;</code> privacy, and assigns dedicated port <span className="text-emerald-400 font-mono font-bold">:{nextSequentialPort}</span>.
              </p>
              <span className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-full font-mono">
                Next Free Port: {nextSequentialPort}
              </span>
            </div>

            {createError && (
              <div className="mb-4 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTenant} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold">Linux Username</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. client1"
                  value={createUsername}
                  onChange={(e) => setCreateUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold">Display / Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Client One"
                  value={userFullName}
                  onChange={(e) => setUserFullName(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold">Storage Quota</label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    required
                    min={1}
                    value={quotaVal}
                    onChange={(e) => setQuotaVal(Number(e.target.value))}
                    className="w-2/3 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-xs font-mono"
                  />
                  <select
                    value={quotaUnit}
                    onChange={(e) => setQuotaUnit(e.target.value)}
                    className="w-1/3 bg-slate-950/80 border border-slate-800 rounded-xl px-2 py-2 text-white focus:outline-none focus:border-indigo-500 text-xs font-semibold"
                  >
                    <option value="GB">GB</option>
                    <option value="MB">MB</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold">RAM Allocation</label>
                <select
                  value={ramQuotaMB}
                  onChange={(e) => setRamQuotaMB(Number(e.target.value))}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500 text-xs font-semibold"
                >
                  <option value={1024}>1.0 GB RAM</option>
                  <option value={2048}>2.0 GB RAM</option>
                  <option value={4096}>4.0 GB RAM</option>
                  <option value={8192}>8.0 GB RAM</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl px-4 py-2 text-xs transition shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Provisioning...</span>
                    </>
                  ) : (
                    <span>Provision Tenant</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: User Tenant Requests List */}
        {(activeTab === 'requests' || !isSuperAdmin) && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-purple-300 flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  <span>Tenant Resource Requests</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isSuperAdmin
                    ? 'Review requests submitted by users. Approving a request auto-provisions their isolated directory, port, and quotas.'
                    : 'Track your pending or approved requests for server and resource allocations.'}
                </p>
              </div>

              {!isSuperAdmin && onRequestServer && (
                <button
                  type="button"
                  onClick={onRequestServer}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3.5 py-2 rounded-xl font-semibold transition flex items-center gap-1.5 shadow"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Request Server Resources</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Requested Resources</th>
                    <th className="py-3 px-4">Purpose / Notes</th>
                    <th className="py-3 px-4">Status</th>
                    {isSuperAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {displayedRequests.length === 0 ? (
                    <tr>
                      <td colSpan={isSuperAdmin ? 5 : 4} className="py-8 text-center text-slate-500">
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
                        <tr key={r._id} className="hover:bg-slate-800/30 transition">
                          <td className="py-3 px-4">
                            <p className="font-semibold text-white">{reqUser?.name || 'Tenant User'}</p>
                            <p className="text-[11px] text-slate-500">{reqUser?.email}</p>
                          </td>
                          <td className="py-3 px-4 font-mono text-purple-300">
                            {ramGB} GB RAM / {diskGB} GB Storage
                          </td>
                          <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                            {r.purpose || r.adminNotes || 'General Hosting'}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                r.status === 'approved'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : r.status === 'rejected'
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          {isSuperAdmin && (
                            <td className="py-3 px-4 text-right space-x-2">
                              {isPending ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={approvingId === r._id}
                                    onClick={() => handleApproveRequest(r)}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-lg font-semibold transition shadow disabled:opacity-50"
                                  >
                                    {approvingId === r._id ? 'Provisioning...' : 'Approve & Auto-Setup'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={rejectingId === r._id}
                                    onClick={() => r._id && handleRejectRequest(r._id)}
                                    className="bg-rose-600/80 hover:bg-rose-600 text-white text-xs px-2.5 py-1.5 rounded-lg font-semibold transition disabled:opacity-50"
                                  >
                                    Reject
                                  </button>
                                </>
                              ) : (
                                <span className="text-slate-500 text-xs">Processed</span>
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

      {/* Tenant Users Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-400" />
              <span>Isolated Tenant Accounts (Click row to manage & view credentials)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Each user runs inside their own locked <code className="text-purple-300 font-mono">chmod 700</code> sandbox with an auto-assigned web port.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">{displayedUsers.length} active tenant(s)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 uppercase font-semibold border-b border-slate-800">
                <th className="py-3 px-4">Linux Username</th>
                <th className="py-3 px-4">Isolated Web Port & URL</th>
                <th className="py-3 px-4">RAM Quota</th>
                <th className="py-3 px-4">Storage Quota</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {displayedUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No users configured yet.
                  </td>
                </tr>
              ) : (
                displayedUsers.map((u) => {
                  const isRoot = u.role === 'superadmin' || u.linuxUsername === 'root_admin' || u.linuxUsername === 'root';
                  const port = u.hostingPort || (isRoot ? 80 : 8081);
                  const ramGb = ((u.limits?.ramLimitMB || 2048) / 1024).toFixed(1);
                  const totalMb = u.limits?.diskLimitMB || (isRoot ? 20480 : 10240);
                  const diskGb = (totalMb / 1024).toFixed(1);

                  return (
                    <tr
                      key={u._id}
                      onClick={() => setSelectedUser(u)}
                      className="hover:bg-slate-800/40 cursor-pointer transition group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          <span className="font-bold text-white font-mono group-hover:text-indigo-400 transition">
                            {u.linuxUsername || u.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 pl-4">{u.email}</p>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        {isRoot ? (
                          <span className="text-indigo-400 font-semibold">Port 80 (Master Plane)</span>
                        ) : (
                          <a
                            href={`http://${serverIp}:${port}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 hover:underline"
                          >
                            <span>Port {port}</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-indigo-300">
                        {ramGb} GB RAM
                      </td>
                      <td className="py-3.5 px-4 font-mono text-emerald-300">
                        {diskGb} GB Storage
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUser(u);
                          }}
                          className="bg-slate-800 hover:bg-indigo-600 hover:text-white text-indigo-300 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                        >
                          Manage & Access
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details & Credentials Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedUser.name} ({selectedUser.linuxUsername})
                  </h3>
                  <p className="text-[11px] text-slate-400">{selectedUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Home Path */}
              <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 space-y-1">
                <span className="text-slate-400 font-semibold">Isolated Home Directory:</span>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-purple-300">
                    /home/{selectedUser.linuxUsername || selectedUser.name}
                  </span>
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
                    chmod 700 Zero-Trust
                  </span>
                </div>
              </div>

              {/* Web URL */}
              <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 space-y-1">
                <span className="text-slate-400 font-semibold">Web Server URL:</span>
                <div>
                  <a
                    href={`http://${serverIp}:${selectedUser.hostingPort || 8081}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 underline font-mono inline-flex items-center gap-1.5"
                  >
                    <span>http://{serverIp}:{selectedUser.hostingPort || 8081}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              {/* SSH Command */}
              <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 space-y-1">
                <span className="text-slate-400 font-semibold">SSH Login Command:</span>
                <div className="relative mt-1">
                  <code className="bg-slate-900 px-3 py-2 rounded-lg text-indigo-300 block font-mono text-xs border border-slate-800">
                    ssh {selectedUser.linuxUsername || selectedUser.name}@{serverIp}
                  </code>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `ssh ${selectedUser.linuxUsername || selectedUser.name}@${serverIp}`,
                        'ssh'
                      )
                    }
                    className="absolute right-2 top-1.5 p-1 text-slate-400 hover:text-white"
                    title="Copy SSH Command"
                  >
                    {copiedText === 'ssh' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* SSH Password */}
              <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-semibold">Password:</span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    <span>{showPassword ? 'Hide' : 'Reveal'}</span>
                  </button>
                </div>
                <div className="relative mt-1">
                  <span className="bg-slate-900 px-3 py-2 rounded-lg text-amber-300 font-mono text-xs block border border-slate-800">
                    {showPassword ? (selectedUser.sshPassword || 'Password123!') : '••••••••••••'}
                  </span>
                  <button
                    onClick={() => copyToClipboard(selectedUser.sshPassword || 'Password123!', 'pass')}
                    className="absolute right-2 top-1.5 p-1 text-slate-400 hover:text-white"
                    title="Copy Password"
                  >
                    {copiedText === 'pass' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Custom Domains Linked */}
              <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-semibold">Attached Custom Domains:</span>
                  <button
                    type="button"
                    onClick={() => {
                      onConnectDomain(selectedUser, activeServer || servers[0]);
                      setSelectedUser(null);
                    }}
                    className="text-[11px] text-emerald-400 hover:underline font-semibold"
                  >
                    + Attach Domain
                  </button>
                </div>
                {domains.filter((d) => {
                  const uid = typeof d.userId === 'object' ? (d.userId as IUser)?._id : d.userId;
                  return uid === selectedUser._id;
                }).length === 0 ? (
                  <p className="text-[11px] text-slate-500">
                    No custom domain mapped yet. User site is served on port {selectedUser.hostingPort || 8081}.
                  </p>
                ) : (
                  domains
                    .filter((d) => {
                      const uid = typeof d.userId === 'object' ? (d.userId as IUser)?._id : d.userId;
                      return uid === selectedUser._id;
                    })
                    .map((dom) => (
                      <div key={dom._id} className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5" />
                        <a href={`http://${dom.domainName}`} target="_blank" rel="noopener noreferrer" className="underline">
                          {dom.domainName}
                        </a>
                        <span className="text-slate-500">→ :{dom.targetPort}</span>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={regenerating}
                onClick={() => handleRegeneratePassword(selectedUser._id!)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? 'animate-spin' : ''}`} />
                <span>Reset Password</span>
              </button>

              {isSuperAdmin && (
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => handleDeleteUser(selectedUser._id!, selectedUser.linuxUsername || selectedUser.name)}
                  className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete User</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
