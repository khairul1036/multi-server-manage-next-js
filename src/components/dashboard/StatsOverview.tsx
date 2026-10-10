'use client';

import React from 'react';
import { Server, Globe, Users, ShieldCheck, Activity } from 'lucide-react';

interface StatsOverviewProps {
  stats: {
    totalServers: number;
    onlineServers: number;
    offlineServers: number;
    totalDomains: number;
    totalUsers: number;
  };
}

export default function StatsOverview({ stats }: StatsOverviewProps) {
  const cards = [
    {
      label: 'Connected VPS',
      value: stats.totalServers,
      subvalue: `${stats.onlineServers} Online / ${stats.offlineServers} Offline`,
      icon: Server,
      gradient: 'from-blue-500/20 to-indigo-500/10',
      border: 'border-blue-500/30',
      iconColor: 'text-blue-400',
    },
    {
      label: 'Active Domains',
      value: stats.totalDomains,
      subvalue: 'Nginx Reverse Proxies',
      icon: Globe,
      gradient: 'from-emerald-500/20 to-teal-500/10',
      border: 'border-emerald-500/30',
      iconColor: 'text-emerald-400',
    },
    {
      label: 'Isolated Tenants',
      value: stats.totalUsers,
      subvalue: 'Linux useradd -m Users',
      icon: Users,
      gradient: 'from-purple-500/20 to-pink-500/10',
      border: 'border-purple-500/30',
      iconColor: 'text-purple-400',
    },
    {
      label: 'Fleet Health',
      value: stats.totalServers > 0 ? `${Math.round((stats.onlineServers / stats.totalServers) * 100)}%` : '100%',
      subvalue: '1-min Agent Health Check',
      icon: Activity,
      gradient: 'from-amber-500/20 to-orange-500/10',
      border: 'border-amber-500/30',
      iconColor: 'text-amber-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`relative overflow-hidden rounded-2xl border ${card.border} bg-slate-900/60 p-5 shadow-lg backdrop-blur-xl transition hover:border-slate-600`}
          >
            <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br ${card.gradient} blur-2xl`} />
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">{card.label}</span>
              <div className={`rounded-xl bg-slate-800/80 p-2.5 ${card.iconColor}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-white tracking-tight">{card.value}</span>
              <p className="mt-1 text-xs text-slate-400">{card.subvalue}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
