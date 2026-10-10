'use client';

import React, { useEffect, useState } from 'react';
import { IUser, IServer } from '@/types';
import AddUserModal from '@/components/users/AddUserModal';
import EditLimitsModal from '@/components/users/EditLimitsModal';
import { Users, Plus, RefreshCw, ShieldCheck, FolderLock, Server, Sliders, Cpu, HardDrive } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<IUser[]>([]);
  const [servers, setServers] = useState<IServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<IUser | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usrRes, srvRes] = await Promise.all([
        fetch('/api/users').then((r) => r.json()),
        fetch('/api/servers').then((r) => r.json()),
      ]);

      if (usrRes.success) setUsers(usrRes.users);
      if (srvRes.success) setServers(srvRes.servers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Users className="h-6 w-6 text-purple-400" />
            <span>Tenant Management & Resource Quotas</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure tenant user accounts, allocate RAM & Disk limits, and enforce <code className="text-purple-400">chmod 700</code> file isolation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/60 px-3.5 py-2.5 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-purple-500/20 hover:bg-purple-500 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Create Tenant</span>
          </button>
        </div>
      </div>

      {/* Isolation Explanation Banner */}
      <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 flex items-start gap-3">
        <FolderLock className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs">
          <p className="font-semibold text-purple-200">Zero-Trust Directory Privacy & Hardware Slicing Active</p>
          <p className="text-purple-300/80 mt-0.5 leading-relaxed">
            Super Administrator controls hardware limits (RAM & Disk Quotas) per tenant. All directories are locked with <code className="bg-purple-950/60 px-1 py-0.5 rounded text-purple-200 font-mono">chmod 700 /home/&lt;username&gt;</code> ensuring complete privacy.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">Tenant User</th>
                <th className="px-5 py-4">Linux Username</th>
                <th className="px-5 py-4">RAM Quota</th>
                <th className="px-5 py-4">Disk / ROM Quota</th>
                <th className="px-5 py-4">Assigned Node</th>
                <th className="px-5 py-4">Role</th>
                <th className="px-5 py-4 text-right">Quota Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    No users created yet. Click &quot;Create Tenant&quot; to provision an isolated user.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const ramGB = ((u.limits?.ramLimitMB || 2048) / 1024).toFixed(1);
                  const diskGB = ((u.limits?.diskLimitMB || 20480) / 1024).toFixed(1);

                  return (
                    <tr key={u._id} className="hover:bg-slate-800/30 transition">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-lg bg-purple-500/20 text-purple-400 font-semibold flex items-center justify-center text-xs">
                            {u.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{u.name}</p>
                            <p className="text-[11px] text-slate-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-purple-400">
                        {u.linuxUsername || '--'}
                      </td>
                      <td className="px-5 py-4 font-mono text-indigo-400 font-semibold">
                        {ramGB} GB RAM
                      </td>
                      <td className="px-5 py-4 font-mono text-emerald-400 font-semibold">
                        {diskGB} GB Disk
                      </td>
                      <td className="px-5 py-4 text-slate-400">
                        {u.assignedServers && u.assignedServers.length > 0 ? (
                          <span className="flex items-center gap-1 text-slate-300">
                            <Server className="h-3.5 w-3.5 text-indigo-400" />
                            <span>{u.assignedServers.length} Node(s)</span>
                          </span>
                        ) : (
                          <span className="text-slate-600">Unassigned</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="capitalize font-medium text-slate-300">{u.role}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setEditingUser(u)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-purple-600/20 hover:text-purple-300 hover:border-purple-500/30 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition"
                        >
                          <Sliders className="h-3.5 w-3.5" />
                          <span>Limit Quotas</span>
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

      <AddUserModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        servers={servers}
        onUserAdded={fetchData}
      />

      <EditLimitsModal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        user={editingUser}
        servers={servers}
        onSaved={fetchData}
      />
    </div>
  );
}
