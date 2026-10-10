'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Server, ShieldCheck, LogOut, LogIn, UserPlus } from 'lucide-react';

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);

  const handleSeed = async () => {
    setSeeding(true);
    setSeedMsg(null);
    try {
      const res = await fetch('/api/auth/seed', { method: 'POST' });
      const data = await res.json();
      setSeedMsg(data.message || 'Seeded');
      setTimeout(() => setSeedMsg(null), 4000);
    } catch {
      setSeedMsg('Seed request failed');
    } finally {
      setSeeding(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
            <Server className="h-5 w-5 text-white" />
          </div>
          <div>
            <Link href="/" className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white">VPS Master</span>
              <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
                SaaS Control Plane
              </span>
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {seedMsg && (
            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 animate-fade-in">
              {seedMsg}
            </span>
          )}

          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition"
            title="Auto-seed Super Admin from .env"
          >
            <ShieldCheck className={`h-4 w-4 ${seeding ? 'animate-spin text-indigo-400' : 'text-emerald-400'}`} />
            <span className="hidden sm:inline">{seeding ? 'Seeding...' : 'Seed Admin'}</span>
          </button>

          <div className="h-4 w-px bg-slate-800" />

          {loading ? (
            <div className="h-8 w-20 bg-slate-900/60 rounded-lg animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-slate-900/60 p-1.5 border border-slate-800 text-slate-400">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600/20 text-indigo-400 font-semibold text-xs">
                  {getInitials(user.name)}
                </div>
                <div className="text-left pr-2 text-xs hidden sm:block">
                  <p className="font-medium text-slate-200">{user.name}</p>
                  <p className="text-[10px] text-indigo-400 uppercase font-semibold">{user.role}</p>
                </div>
              </div>

              <button
                onClick={logout}
                title="Sign Out"
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 p-2 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 transition"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
              >
                <LogIn className="h-3.5 w-3.5 text-indigo-400" />
                <span>Log In</span>
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20 hover:from-indigo-600 hover:to-purple-700 transition"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Register</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
