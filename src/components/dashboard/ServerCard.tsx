'use client';

import React, { useState } from 'react';
import { IServer } from '@/types';
import { Server, RefreshCw, Cpu, HardDrive, MemoryStick, Clock, Trash2, ArrowUpRight } from 'lucide-react';
import { formatUptime } from '@/lib/utils';
import Link from 'next/link';

interface ServerCardProps {
  server: IServer;
  onRefresh?: () => void;
  onDelete?: (id: string) => void;
}

export default function ServerCard({ server, onRefresh, onDelete }: ServerCardProps) {
  const [pinging, setPinging] = useState(false);
  const [status, setStatus] = useState(server.status);
  const [specs, setSpecs] = useState(server.specs);
  const [lastPing, setLastPing] = useState(server.lastPing);

  const handlePing = async () => {
    if (!server._id) return;
    setPinging(true);
    try {
      const res = await fetch(`/api/servers/${server._id}/ping`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStatus(data.status);
        if (data.specs) setSpecs(data.specs);
        if (data.lastPing) setLastPing(data.lastPing);
      }
    } catch {
      setStatus('offline');
    } finally {
      setPinging(false);
      onRefresh?.();
    }
  };

  const isOnline = status === 'online';

  return (
    <div className="group relative rounded-2xl border border-slate-800 bg-slate-900/50 p-5 shadow-lg backdrop-blur-xl transition hover:border-slate-700 hover:shadow-indigo-500/5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-slate-800/90 p-3 text-indigo-400 group-hover:bg-indigo-500/10 transition">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white tracking-tight text-base">{server.name}</h3>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                  isOnline
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                {status}
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400 mt-0.5">
              {server.ip}:{server.agentPort} <span className="text-slate-600">|</span> SSH:{server.sshPort}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePing}
            disabled={pinging}
            title="Ping Agent Health Check"
            className="rounded-lg p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${pinging ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
          {onDelete && server._id && (
            <button
              onClick={() => onDelete(server._id!)}
              title="Delete Server"
              className="rounded-lg p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-800/80 pt-4">
        <div className="rounded-xl bg-slate-950/60 p-2.5 border border-slate-800/40">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Cpu className="h-3.5 w-3.5 text-indigo-400" />
            <span>CPU</span>
          </div>
          <p className="mt-1 font-semibold text-sm text-slate-200">
            {isOnline ? `${specs?.cpuUsage ?? 0}%` : '--'}
          </p>
        </div>

        <div className="rounded-xl bg-slate-950/60 p-2.5 border border-slate-800/40">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <MemoryStick className="h-3.5 w-3.5 text-emerald-400" />
            <span>RAM</span>
          </div>
          <p className="mt-1 font-semibold text-sm text-slate-200">
            {isOnline ? `${specs?.memoryUsage ?? 0}%` : '--'}
          </p>
        </div>

        <div className="rounded-xl bg-slate-950/60 p-2.5 border border-slate-800/40">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <HardDrive className="h-3.5 w-3.5 text-amber-400" />
            <span>Disk</span>
          </div>
          <p className="mt-1 font-semibold text-sm text-slate-200">
            {isOnline ? `${specs?.diskUsage ?? 0}%` : '--'}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>Uptime: {isOnline && specs?.uptimeSeconds ? formatUptime(specs.uptimeSeconds) : 'N/A'}</span>
        </div>
        <div>
          <span>{server.os || 'Linux'}</span>
        </div>
      </div>
    </div>
  );
}
