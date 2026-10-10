'use client';

import React, { useEffect, useState } from 'react';
import StatsOverview from '@/components/dashboard/StatsOverview';
import ServerCard from '@/components/dashboard/ServerCard';
import AddServerModal from '@/components/servers/AddServerModal';
import AddDomainModal from '@/components/domains/AddDomainModal';
import RequestServerModal from '@/components/requests/RequestServerModal';
import AutomatedHostingDashboard from '@/components/hosting/AutomatedHostingDashboard';
import { useAuth } from '@/context/AuthContext';
import { IServer, IDomain, IUser, IActivityLog, IServerRequest } from '@/types';
import {
  Server,
  Plus,
  Globe,
  Users,
  RefreshCw,
  FolderLock,
  Layers,
  Activity,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  HardDrive,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'admin';

  const [stats, setStats] = useState({
    totalServers: 0,
    onlineServers: 0,
    offlineServers: 0,
    totalDomains: 0,
    totalUsers: 0,
  });
  const [servers, setServers] = useState<IServer[]>([]);
  const [domains, setDomains] = useState<IDomain[]>([]);
  const [users, setUsers] = useState<IUser[]>([]);
  const [requests, setRequests] = useState<IServerRequest[]>([]);
  const [recentLogs, setRecentLogs] = useState<IActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [domainModalOpen, setDomainModalOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);

  // Domain modal preselection
  const [domainPreset, setDomainPreset] = useState<{
    serverId?: string;
    userId?: string;
    port?: number;
  }>({});

  const handleConnectDomain = (targetUser: IUser, targetServer: IServer) => {
    setDomainPreset({
      serverId: targetServer?._id || servers[0]?._id,
      userId: targetUser?._id,
      port: targetUser?.hostingPort || 8081,
    });
    setDomainModalOpen(true);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, serversRes, domainsRes, usersRes, reqRes] = await Promise.all([
        fetch('/api/stats').then((r) => r.json()).catch(() => ({})),
        fetch('/api/servers').then((r) => r.json()).catch(() => ({})),
        fetch('/api/domains').then((r) => r.json()).catch(() => ({})),
        fetch('/api/users').then((r) => r.json()).catch(() => ({})),
        fetch('/api/requests').then((r) => r.json()).catch(() => ({})),
      ]);

      if (statsRes?.success) {
        setStats(statsRes.stats);
        if (statsRes.recentLogs) setRecentLogs(statsRes.recentLogs);
      }
      if (serversRes?.success) setServers(serversRes.servers);
      if (domainsRes?.success) setDomains(domainsRes.domains);
      if (usersRes?.success) setUsers(usersRes.users);
      if (reqRes?.success) setRequests(reqRes.requests);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteServer = async (id: string) => {
    if (!confirm('Are you sure you want to remove this VPS server?')) return;
    try {
      const res = await fetch(`/api/servers/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <span>{isSuperAdmin ? 'Centralized VPS Fleet Control' : `Welcome, ${user?.name || 'Tenant'}`}</span>
            <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
              {isSuperAdmin ? 'Super Admin' : 'Isolated Tenant'}
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isSuperAdmin
              ? 'Master control plane overseeing all remote Linux servers, Nginx routing, and tenant quotas.'
              : 'Monitor your assigned servers, manage your reverse proxy domains, and browse your private files.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {isSuperAdmin ? (
            <>
              <button
                onClick={() => setServerModalOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition"
              >
                <Plus className="h-4 w-4" />
                <span>Connect VPS</span>
              </button>

              <button
                onClick={() => setDomainModalOpen(true)}
                disabled={servers.length === 0}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 transition disabled:opacity-50"
              >
                <Globe className="h-4 w-4" />
                <span>Add Domain</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setRequestModalOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-600 hover:to-purple-700 transition"
              >
                <Layers className="h-4 w-4" />
                <span>Request Server / Upgrade</span>
              </button>

              <Link
                href="/files"
                className="flex items-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2.5 text-xs font-semibold text-slate-200 hover:text-white transition"
              >
                <FolderLock className="h-4 w-4 text-purple-400" />
                <span>My Private Files</span>
              </Link>
            </>
          )}

          <button
            onClick={fetchData}
            title="Refresh All Data"
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 text-slate-400 hover:text-white hover:border-slate-700 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tenant Resource Quota Banner (if regular user) */}
      {!isSuperAdmin && user?.limits && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-indigo-500/30 bg-slate-900/60 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Allocated RAM Quota</span>
              <Cpu className="h-4 w-4 text-indigo-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-white">
              {(user.limits.ramLimitMB / 1024).toFixed(1)} GB
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Configured by Super Admin</p>
          </div>

          <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/60 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Allocated Disk / ROM Quota</span>
              <HardDrive className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-white">
              {(user.limits.diskLimitMB / 1024).toFixed(1)} GB
            </p>
            <p className="text-[11px] text-slate-500 mt-1">High-Speed Isolated Storage</p>
          </div>

          <div className="rounded-2xl border border-purple-500/30 bg-slate-900/60 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Tenant Privacy Sandbox</span>
              <FolderLock className="h-4 w-4 text-purple-400" />
            </div>
            <p className="mt-2 text-lg font-bold text-white font-mono truncate">
              /home/{user.linuxUsername || 'user'}
            </p>
            <p className="text-[11px] text-emerald-400 mt-1">chmod 700 Zero-Trust Enforced</p>
          </div>
        </div>
      )}

      {/* Admin Stats Cards */}
      {isSuperAdmin && <StatsOverview stats={stats} />}

      {/* Automated User & Hosting Dashboard (Matches Reference Image 1 & 2) */}
      <AutomatedHostingDashboard
        users={users}
        server={servers[0] || null}
        servers={servers}
        domains={domains}
        requests={requests}
        isSuperAdmin={isSuperAdmin}
        currentUserId={user?.id || user?._id || user?.email}
        onRefresh={fetchData}
        onConnectDomain={handleConnectDomain}
        onRequestServer={() => setRequestModalOpen(true)}
      />

      {/* Servers Fleet Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              {isSuperAdmin ? 'Connected VPS Fleet' : 'My Accessible VPS Servers'}
            </h2>
            <span className="text-xs text-slate-500">({servers.length})</span>
          </div>

          <Link
            href="/servers"
            className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
          >
            <span>View All Details</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {servers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Server className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-white">
              {isSuperAdmin ? 'No VPS Nodes Connected' : 'No Server Assigned to Your Account'}
            </h3>
            <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
              {isSuperAdmin
                ? 'Add your first remote Linux server by installing the Worker Agent.'
                : 'Submit a server request to the Super Administrator to get access to a node and resources.'}
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              {isSuperAdmin ? (
                <button
                  onClick={() => setServerModalOpen(true)}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition"
                >
                  Connect First Server
                </button>
              ) : (
                <button
                  onClick={() => setRequestModalOpen(true)}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition"
                >
                  Request Server Access Now
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {servers.map((srv) => (
              <ServerCard
                key={srv._id}
                server={srv}
                onRefresh={fetchData}
                onDelete={isSuperAdmin ? handleDeleteServer : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Two Column Section: Live Domains & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Domain Routing Quick View */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 shadow-lg backdrop-blur-xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-emerald-400" />
              <h3 className="font-semibold text-white text-sm">Automated Nginx Domains</h3>
            </div>
            <Link
              href="/domains"
              className="text-xs font-medium text-emerald-400 hover:text-emerald-300"
            >
              Manage ({domains.length})
            </Link>
          </div>

          <div className="mt-4 space-y-2.5">
            {domains.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                No domains mapped yet.
              </p>
            ) : (
              domains.slice(0, 5).map((d) => (
                <div
                  key={d._id}
                  className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3 border border-slate-800/40 text-xs"
                >
                  <div>
                    <p className="font-medium text-slate-200">{d.domainName}</p>
                    <p className="text-[11px] text-slate-500">
                      Proxy to port <span className="font-mono text-emerald-400">:{d.targetPort}</span>
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                    {d.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 shadow-lg backdrop-blur-xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-400" />
              <h3 className="font-semibold text-white text-sm">Audit & System Activity</h3>
            </div>
            <span className="text-[11px] text-slate-500">Real-time</span>
          </div>

          <div className="mt-4 space-y-3">
            {recentLogs.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                No system activity recorded yet.
              </p>
            ) : (
              recentLogs.slice(0, 5).map((log) => (
                <div key={log._id} className="flex items-start gap-3 text-xs">
                  <div className="mt-0.5 rounded-full p-1 bg-slate-800 text-slate-400">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-300">
                      {log.action} <span className="text-slate-500 font-normal">({log.target || 'Fleet'})</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{log.details}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {isSuperAdmin && (
        <AddServerModal
          isOpen={serverModalOpen}
          onClose={() => setServerModalOpen(false)}
          onServerAdded={fetchData}
        />
      )}

      <AddDomainModal
        isOpen={domainModalOpen}
        onClose={() => {
          setDomainModalOpen(false);
          setDomainPreset({});
        }}
        servers={servers}
        users={users}
        initialServerId={domainPreset.serverId}
        initialUserId={domainPreset.userId}
        initialPort={domainPreset.port}
        onDomainAdded={fetchData}
      />

      <RequestServerModal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        onRequestSubmitted={fetchData}
      />
    </div>
  );
}
