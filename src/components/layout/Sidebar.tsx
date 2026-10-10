'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Server,
  Globe,
  Users,
  Shield,
  Layers,
  FolderLock,
  FileCode,
  Sliders,
  Cpu,
  HardDrive,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'admin';

  const adminNav = [
    { name: 'Fleet Overview', href: '/', icon: LayoutDashboard },
    { name: 'VPS Fleet', href: '/servers', icon: Server },
    { name: 'Server Requests', href: '/requests', icon: Layers },
    { name: 'Domain Routing', href: '/domains', icon: Globe },
    { name: 'Tenant Quotas', href: '/users', icon: Users },
    { name: 'Agent Setup', href: '/agent-setup', icon: FileCode },
  ];

  const userNav = [
    { name: 'My Servers', href: '/servers', icon: Server },
    { name: 'Request Server Access', href: '/requests', icon: Layers },
    { name: 'My Domains', href: '/domains', icon: Globe },
    { name: 'My Isolated Files', href: '/files', icon: FolderLock },
  ];

  const navItems = isSuperAdmin ? adminNav : userNav;

  return (
    <aside className="w-64 flex-shrink-0 border-r border-slate-800 bg-slate-950 p-4 min-h-[calc(100vh-4rem)] flex flex-col justify-between">
      <div className="space-y-6">
        <div>
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            {isSuperAdmin ? 'Master Administration' : 'My Cloud Workspace'}
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/10 text-indigo-400 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Tenant Quota summary if user is non-admin */}
        {!isSuperAdmin && user?.limits && (
          <div>
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              My Resource Limits
            </p>
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Max RAM</span>
                </span>
                <span className="font-mono font-semibold text-slate-200">
                  {(user.limits.ramLimitMB / 1024).toFixed(1)} GB
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <HardDrive className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Max Disk</span>
                </span>
                <span className="font-mono font-semibold text-slate-200">
                  {(user.limits.diskLimitMB / 1024).toFixed(1)} GB
                </span>
              </div>
            </div>
          </div>
        )}

        <div>
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Zero-Trust Privacy
          </p>
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-400">
              <Shield className="h-4 w-4" />
              <span>chmod 700 Isolation</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Files and home directories are strictly isolated per user. No cross-tenant access allowed.
            </p>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-xs text-slate-500 px-3">
          <span>Role: <strong className="text-indigo-400 uppercase">{user?.role || 'Guest'}</strong></span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        </div>
      </div>
    </aside>
  );
}
