'use client';

import React, { useEffect, useState } from 'react';
import { IServer } from '@/types';
import ServerCard from '@/components/dashboard/ServerCard';
import AddServerModal from '@/components/servers/AddServerModal';
import RequestServerModal from '@/components/requests/RequestServerModal';
import { useAuth } from '@/context/AuthContext';
import { Server, Plus, RefreshCw, HardDrive, Cpu, ShieldCheck, Layers } from 'lucide-react';

export default function ServersPage() {
  const { user } = useAuth();
  const [servers, setServers] = useState<IServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);

  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'admin';

  const fetchServers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/servers');
      const data = await res.json();
      if (data.success) {
        setServers(data.servers);
      }
    } catch (err) {
      console.error('Failed to load servers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this VPS server from master control?')) return;
    try {
      const res = await fetch(`/api/servers/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchServers();
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
            <Server className="h-6 w-6 text-indigo-400" />
            <span>{isSuperAdmin ? 'Fleet VPS Management' : 'My Assigned VPS Servers'}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isSuperAdmin
              ? 'Super Admin control plane: monitor worker nodes, register new servers, and manage telemetry.'
              : 'View live telemetry (CPU, RAM, Uptime) for servers assigned to your account.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchServers}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/60 px-3.5 py-2.5 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Refresh</span>
          </button>

          {isSuperAdmin ? (
            <button
              onClick={() => setAddModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Add VPS Server</span>
            </button>
          ) : (
            <button
              onClick={() => setRequestModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-600 hover:to-purple-700 transition"
            >
              <Layers className="h-4 w-4" />
              <span>Request Server Upgrade</span>
            </button>
          )}
        </div>
      </div>

      {servers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center">
          <Server className="h-10 w-10 text-indigo-400 mx-auto" />
          <p className="mt-3 text-sm text-slate-300 font-medium">
            {isSuperAdmin ? 'No VPS servers connected' : 'No VPS server assigned to your account yet'}
          </p>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            {isSuperAdmin
              ? 'Connect a server using the IP and API key to begin monitoring.'
              : 'Submit a server resource request to the Super Administrator to get an allocated node.'}
          </p>

          <div className="mt-5">
            {isSuperAdmin ? (
              <button
                onClick={() => setAddModalOpen(true)}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-indigo-500"
              >
                Connect First Server
              </button>
            ) : (
              <button
                onClick={() => setRequestModalOpen(true)}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-indigo-500"
              >
                Request Server Access Now
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {servers.map((srv) => (
            <ServerCard
              key={srv._id}
              server={srv}
              onRefresh={fetchServers}
              onDelete={isSuperAdmin ? handleDelete : undefined}
            />
          ))}
        </div>
      )}

      {isSuperAdmin && (
        <AddServerModal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          onServerAdded={fetchServers}
        />
      )}

      <RequestServerModal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        onRequestSubmitted={fetchServers}
      />
    </div>
  );
}
