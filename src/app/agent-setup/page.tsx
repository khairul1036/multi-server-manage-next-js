'use client';

import React, { useState } from 'react';
import { FileCode, Terminal, Copy, Check, Shield, Server, CheckCircle2 } from 'lucide-react';

export default function AgentSetupPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const agentPort = process.env.NEXT_PUBLIC_AGENT_PORT;
  const agentApiKey = process.env.NEXT_PUBLIC_DEFAULT_AGENT_KEY;
  const masterIp = process.env.NEXT_PUBLIC_MASTER_IP;

  const agentEnvCode = `AGENT_PORT=${agentPort}
AGENT_API_KEY=${agentApiKey}
MASTER_IP=${masterIp}`;

  const installCommand = `# 1. Update and install Node.js & Nginx
sudo apt update && sudo apt install -y curl nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# 2. Clone or copy remote-agent folder to server
mkdir -p /opt/saas-agent
cd /opt/saas-agent

# 3. Install agent dependencies
npm install

# 4. Start agent with PM2 under root (to manage Nginx and useradd)
sudo pm2 start agent.js --name "vps-agent"
sudo pm2 save
sudo pm2 startup`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <FileCode className="h-6 w-6 text-indigo-400" />
          <span>Remote Worker Node (Agent) Setup</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Step-by-step instructions for deploying the background agent on remote Linux VPS instances.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-xl space-y-6">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs text-white">1</span>
            <span>Architecture & Security Overview</span>
          </h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            The worker agent is an ultra-lightweight Node.js service that runs on each remote VPS under PM2. It listens on port 4000 (configurable) and responds only to requests carrying your secure <code className="text-indigo-300">x-agent-api-key</code> header.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs text-white">2</span>
              <span>Installation Commands on Remote VPS</span>
            </h2>
            <button
              onClick={() => copyToClipboard(installCommand, 'install')}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 transition"
            >
              {copiedId === 'install' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedId === 'install' ? 'Copied' : 'Copy Bash'}</span>
            </button>
          </div>
          <pre className="mt-3 rounded-xl bg-slate-950 p-4 text-xs font-mono text-emerald-400 border border-slate-800 overflow-x-auto leading-relaxed">
            {installCommand}
          </pre>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs text-white">3</span>
              <span>Worker Node Configuration (.env)</span>
            </h2>
            <button
              onClick={() => copyToClipboard(agentEnvCode, 'env')}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 transition"
            >
              {copiedId === 'env' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedId === 'env' ? 'Copied' : 'Copy Config'}</span>
            </button>
          </div>
          <pre className="mt-3 rounded-xl bg-slate-950 p-4 text-xs font-mono text-indigo-300 border border-slate-800 overflow-x-auto">
            {agentEnvCode}
          </pre>
        </div>

        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 flex items-start gap-3">
          <Shield className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold text-indigo-200">Pre-built files included in this workspace</p>
            <p className="text-indigo-300/80 mt-1 leading-relaxed">
              We have prepared the complete agent source code in <code className="bg-indigo-950/60 px-1 py-0.5 rounded text-indigo-200 font-mono">/remote-agent/</code> including <code className="bg-indigo-950/60 px-1 py-0.5 rounded text-indigo-200 font-mono">agent.js</code>, user creation bash scripts, and Nginx reloader.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
