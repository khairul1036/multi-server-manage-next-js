'use client';

import React, { useState } from 'react';
import { IServer } from '@/types';
import { Server, RefreshCw, Cpu, HardDrive, MemoryStick, Clock, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatUptime } from '@/lib/utils';

interface ServerCardProps {
  server: IServer;
  onRefresh?: () => void;
  onDelete?: (id: string) => void;
}

export default function ServerCard({ server, onRefresh, onDelete }: ServerCardProps) {
  const [pinging, setPinging] = useState(false);
  const [status, setStatus] = useState(server.status);
  const [specs, setSpecs] = useState(server.specs);

  const handlePing = async () => {
    if (!server._id) return;
    setPinging(true);
    try {
      const res = await fetch(`/api/servers/${server._id}/ping`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStatus(data.status);
        if (data.specs) setSpecs(data.specs);
      }
    } catch {
      setStatus('offline');
    } finally {
      setPinging(false);
      onRefresh?.();
    }
  };

  const isOnline = status === 'online';
  const cpuVal = specs?.cpuUsage ?? 0;
  const ramVal = specs?.memoryUsage ?? 0;
  const diskVal = specs?.diskUsage ?? 0;

  return (
    <div className="group relative rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl transition hover:border-indigo-500/40 hover:shadow-indigo-500/10">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-500/10 p-3 text-indigo-400 border border-indigo-500/20 group-hover:scale-105 transition">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white tracking-tight text-sm">{server.name}</h3>
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

      {/* Metrics Bars */}
      <div className="mt-5 grid grid-cols-3 gap-2.5 border-t border-slate-800/80 pt-4">
        {/* CPU */}
        <div className="rounded-xl bg-slate-950/70 p-2.5 border border-slate-800/60">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="flex items-center gap-1">
              <Cpu className="h-3 w-3 text-indigo-400" />
              <span>CPU</span>
            </span>
            <span className="font-mono text-white font-semibold">{isOnline ? `${cpuVal}%` : '--'}</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1 mt-2 overflow-hidden">
            <div
              className="bg-indigo-500 h-1 rounded-full transition-all duration-500"
              style={{ width: `${isOnline ? Math.min(100, cpuVal) : 0}%` }}
            />
          </div>
        </div>

        {/* RAM */}
        <div className="rounded-xl bg-slate-950/70 p-2.5 border border-slate-800/60">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="flex items-center gap-1">
              <MemoryStick className="h-3 w-3 text-emerald-400" />
              <span>RAM</span>
            </span>
            <span className="font-mono text-white font-semibold">{isOnline ? `${ramVal}%` : '--'}</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1 mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-1 rounded-full transition-all duration-500"
              style={{ width: `${isOnline ? Math.min(100, ramVal) : 0}%` }}
            />
          </div>
        </div>

        {/* Disk */}
        <div className="rounded-xl bg-slate-950/70 p-2.5 border border-slate-800/60">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="flex items-center gap-1">
              <HardDrive className="h-3 w-3 text-amber-400" />
              <span>Disk</span>
            </span>
            <span className="font-mono text-white font-semibold">{isOnline ? `${diskVal}%` : '--'}</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1 mt-2 overflow-hidden">
            <div
              className="bg-amber-500 h-1 rounded-full transition-all duration-500"
              style={{ width: `${isOnline ? Math.min(100, diskVal) : 0}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-indigo-400" />
          <span>Uptime: {isOnline && specs?.uptimeSeconds ? formatUptime(specs.uptimeSeconds) : 'N/A'}</span>
        </div>
        <div>
          <span className="font-mono text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">
            {server.os || 'Linux'}
          </span>
        </div>
      </div>
    </div>
  );
}
