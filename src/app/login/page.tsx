'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Server, Lock, Mail, Eye, EyeOff, ArrowRight, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await login(email, password);
    if (!res.success) {
      setError(res.error || 'Invalid credentials');
      setLoading(false);
    }
  };

  const handleRunSeed = async () => {
    setSeeding(true);
    setSeedMsg(null);
    setError(null);

    try {
      const res = await fetch('/api/auth/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSeedMsg(`Super Admin is ready! Email: ${data.email || 'admin@saas.com'} | Pass: Admin123456!`);
        setEmail(data.email || 'admin@saas.com');
        setPassword('Admin123456!');
      } else {
        setError(data.error || 'Seeding failed');
      }
    } catch {
      setError('Could not connect to database for seeding.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Glow backdrop */}
        <div className="relative">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20 blur-xl" />

          <div className="relative rounded-3xl border border-slate-800 bg-slate-950/90 p-8 shadow-2xl backdrop-blur-2xl">
            {/* Header */}
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
                <Server className="h-7 w-7 text-white" />
              </div>
              <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">
                VPS Master Login
              </h1>
              <p className="mt-1 text-xs text-slate-400">
                Log in to manage your multi-server fleet and Nginx routes
              </p>
            </div>

            {/* Run Super Admin Seed Action Button */}
            <div className="mt-5">
              <button
                type="button"
                onClick={handleRunSeed}
                disabled={seeding}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 py-2.5 px-4 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 hover:border-emerald-500/50 transition disabled:opacity-50 shadow-md shadow-emerald-500/5"
              >
                <ShieldCheck className={`h-4 w-4 text-emerald-400 ${seeding ? 'animate-spin' : ''}`} />
                <span>{seeding ? 'Running Database Seed...' : 'Run Seed Admin & Auto-Fill'}</span>
              </button>
            </div>

            {seedMsg && (
              <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-200">Database Seed Executed</p>
                  <p className="text-[11px] text-emerald-300/80 mt-0.5">{seedMsg}</p>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="admin@saas.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/80 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/80 pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-slate-300 transition"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-2.5 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-600 hover:to-purple-700 transition disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="mt-6 border-t border-slate-800/80 pt-4 text-center">
              <p className="text-xs text-slate-400">
                Don&apos;t have an account?{' '}
                <Link
                  href="/register"
                  className="font-semibold text-indigo-400 hover:text-indigo-300 transition underline underline-offset-4"
                >
                  Register here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
