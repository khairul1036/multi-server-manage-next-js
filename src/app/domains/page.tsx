'use client';

import React, { useEffect, useState } from 'react';
import { IDomain, IServer, IUser } from '@/types';
import AddDomainModal from '@/components/domains/AddDomainModal';
import { Globe, Plus, RefreshCw, Trash2, ShieldCheck, ExternalLink, Server } from 'lucide-react';

export default function DomainsPage() {
  const [domains, setDomains] = useState<IDomain[]>([]);
  const [servers, setServers] = useState<IServer[]>([]);
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [domRes, srvRes, usrRes] = await Promise.all([
        fetch('/api/domains').then((r) => r.json()),
        fetch('/api/servers').then((r) => r.json()),
        fetch('/api/users').then((r) => r.json()),
      ]);

      if (domRes.success) setDomains(domRes.domains);
      if (srvRes.success) setServers(srvRes.servers);
      if (usrRes.success) setUsers(usrRes.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteDomain = async (id: string) => {
    if (!confirm('Remove this domain and delete its Nginx configuration on the remote server?')) return;
    try {
      const res = await fetch(`/api/domains/${id}`, { method: 'DELETE' });
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
            <Globe className="h-6 w-6 text-emerald-400" />
            <span>Automated Domain & Nginx Routing</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Zero-admin Nginx reverse proxy management. Agent updates /etc/nginx/conf.d and runs reload.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/60 px-3.5 py-2.5 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setModalOpen(true)}
            disabled={servers.length === 0}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 transition disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Domain</span>
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">Domain Name</th>
                <th className="px-5 py-4">Target Server</th>
                <th className="px-5 py-4">Target Port</th>
                <th className="px-5 py-4">Assigned Tenant</th>
                <th className="px-5 py-4">Nginx Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {domains.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    No custom domains added yet. Click &quot;Add New Domain&quot; to configure Nginx.
                  </td>
                </tr>
              ) : (
                domains.map((d) => {
                  const srv = d.server || (d.serverId as unknown as IServer);
                  const usr = d.user || (d.userId as unknown as IUser);
                  return (
                    <tr key={d._id} className="hover:bg-slate-800/30 transition">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{d.domainName}</span>
                          <a
                            href={`http://${d.domainName}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-500 hover:text-indigo-400"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {d.nginxConfigPath || `/etc/nginx/conf.d/${d.domainName}.conf`}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-medium text-slate-200">{srv?.name || 'VPS'}</span>
                        <p className="text-[11px] text-slate-500 font-mono">{srv?.ip || 'Remote IP'}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          :{d.targetPort}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span>{usr?.name || 'Tenant'}</span>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {usr?.linuxUsername ? `~/${usr.linuxUsername}` : usr?.email}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                            d.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${d.status === 'active' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                          {d.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => d._id && handleDeleteDomain(d._id)}
                          title="Delete Domain & Remove Nginx Config"
                          className="rounded-lg p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        >
                          <Trash2 className="h-4 w-4" />
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

      <AddDomainModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        servers={servers}
        users={users}
        onDomainAdded={fetchData}
      />
    </div>
  );
}
