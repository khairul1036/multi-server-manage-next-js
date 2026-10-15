'use client';

import React, { useState } from 'react';
import {
  X,
  Server,
  Key,
  Shield,
  AlertCircle,
  CheckCircle2,
  Terminal,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  HelpCircle,
  Radio,
} from 'lucide-react';

interface AddServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onServerAdded: () => void;
}

export default function AddServerModal({ isOpen, onClose, onServerAdded }: AddServerModalProps) {
  const [activeTab, setActiveTab] = useState<'form' | 'guide'>('form');

  const [formData, setFormData] = useState({
    name: '',
    ip: '',
    sshPort: 22,
    agentPort: Number(process.env.NEXT_PUBLIC_AGENT_PORT) || 4000,
    agentApiKey: process.env.NEXT_PUBLIC_DEFAULT_AGENT_KEY || 'agent_secret_key_change_me_123',
    tags: 'production, nginx',
  });

  const [testingPing, setTestingPing] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    os?: string;
    ram?: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleTestConnection = async () => {
    if (!formData.ip) {
      setError('Please enter a server IP address first');
      return;
    }
    setTestingPing(true);
    setError(null);
    setTestResult(null);

    try {
      const res = await fetch('/api/servers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: formData.ip,
          agentPort: Number(formData.agentPort),
          agentApiKey: formData.agentApiKey,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: 'Connection Successful! Agent is online and ready.',
          os: data.data?.os,
          ram: data.data?.memory?.totalMB ? `${Math.round(data.data.memory.totalMB / 1024)} GB` : undefined,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Server did not respond on agent port.',
        });
      }
    } catch {
      setTestResult({
        success: false,
        message: 'Network error while attempting connection test.',
      });
    } finally {
      setTestingPing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          sshPort: Number(formData.sshPort),
          agentPort: Number(formData.agentPort),
          tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to add server');
      }

      onServerAdded();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const bashScript = `# 1. Update and install Node.js & Nginx
sudo apt update && sudo apt install -y curl nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# 2. Setup SaaS Agent Directory
sudo mkdir -p /opt/saas-agent
sudo chown -R $USER:$USER /opt/saas-agent
cd /opt/saas-agent

# 3. Create .env Configuration
cat << 'EOF' > .env
AGENT_PORT=${formData.agentPort || 4000}
AGENT_API_KEY=${formData.agentApiKey || 'agent_secret_key_change_me_123'}
MASTER_IP=
EOF

# 4. Copy agent.js file or clone repository, then start with PM2 under root:
sudo pm2 start agent.js --name "vps-agent"
sudo pm2 save
sudo pm2 startup`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl border border-slate-700/80 bg-slate-900/95 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 p-2.5 text-indigo-400 border border-indigo-500/30">
              <Server className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Add VPS Server to Fleet</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono">
                  Master Control Plane
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Connect any remote Linux VPS (Ubuntu/Debian) running the Worker Node
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mt-4 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-2 ${
              activeTab === 'form'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="h-3.5 w-3.5" />
            <span>Connect Server (IP & Key)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-2 ${
              activeTab === 'guide'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>1-Click Setup Guide (কমান্ড ও নিয়ম)</span>
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: FORM */}
        {activeTab === 'form' && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Server Display Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Production Node 01 (DigitalOcean / Hetzner)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  VPS Public IP Address
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 194.163.150.22"
                  value={formData.ip}
                  onChange={(e) => {
                    setFormData({ ...formData, ip: e.target.value });
                    setTestResult(null);
                  }}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">SSH Port</label>
                <input
                  type="number"
                  required
                  value={formData.sshPort}
                  onChange={(e) => setFormData({ ...formData, sshPort: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 text-sm text-white font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Agent Port</label>
                <input
                  type="number"
                  required
                  value={formData.agentPort}
                  onChange={(e) => setFormData({ ...formData, agentPort: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 text-sm text-white font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-500">Default: 4000</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  placeholder="frontend, eu-central"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">Agent Secret API Key</label>
                <span className="text-[11px] text-indigo-400">Must match server .env</span>
              </div>
              <input
                type="password"
                required
                value={formData.agentApiKey}
                onChange={(e) => setFormData({ ...formData, agentApiKey: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* Test Connection Button & Result */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Verify Remote Agent Ping:</span>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingPing || !formData.ip}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition border border-slate-700 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${testingPing ? 'animate-spin text-indigo-400' : ''}`} />
                  <span>{testingPing ? 'Testing Ping...' : 'Test Connection'}</span>
                </button>
              </div>

              {testResult && (
                <div
                  className={`mt-2.5 p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                    testResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-semibold">{testResult.message}</p>
                    {testResult.os && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Detected: {testResult.os} | RAM: {testResult.ram}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-600 hover:to-purple-700 transition disabled:opacity-50"
              >
                {loading ? 'Adding Server...' : 'Save & Register Server'}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: SETUP GUIDE & ONE CLICK COMMAND */}
        {activeTab === 'guide' && (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-3.5 text-xs text-indigo-300">
              <p className="font-semibold text-indigo-200">🚀 নতুন VPS সার্ভার কিভাবে কানেক্ট করবেন?</p>
              <p className="mt-1 text-slate-300 leading-relaxed">
                আপনার নতুন VPS সার্ভারে SSH দিয়ে লগইন করে নিচের কমান্ডটি রান করুন। এটি Node.js, Nginx, PM2 এবং Agent কনফিগার করে চালু করে দিবে।
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-300">Bash Setup Script for VPS:</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(bashScript, 'bash')}
                  className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-700 transition"
                >
                  {copiedId === 'bash' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedId === 'bash' ? 'Copied!' : 'Copy Script'}</span>
                </button>
              </div>
              <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs overflow-x-auto max-h-56 leading-relaxed">
                {bashScript}
              </pre>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 space-y-2 text-xs text-slate-400">
              <p className="font-semibold text-white">ধাপ অনুযায়ী নির্দেশিকা:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                <li><strong className="text-white">Step 1:</strong> আপনার প্রজেক্টের <code className="text-indigo-400">remote-agent</code> ফোল্ডারটি VPS সার্ভারের <code className="text-indigo-400">/opt/saas-agent</code> ডিরেক্টরিতে আপলোড করুন।</li>
                <li><strong className="text-white">Step 2:</strong> সার্ভারে <code className="text-indigo-400">npm install</code> এবং <code className="text-indigo-400">sudo pm2 start agent.js</code> দিয়ে চালু করুন।</li>
                <li><strong className="text-white">Step 3:</strong> এই মডালে ফিরে এসে &quot;Connect Server&quot; ট্যাবে IP ও Key দিয়ে সেভ করুন!</li>
              </ul>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('form')}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition"
              >
                Return to Connect Server
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
