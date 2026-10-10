'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Folder,
  FileText,
  Plus,
  RefreshCw,
  FolderLock,
  HardDrive,
  ShieldCheck,
  Server,
  FileCode,
  ArrowLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { formatBytes } from '@/lib/utils';

interface FileItem {
  name: string;
  path: string;
  sizeBytes: number;
  isDir: boolean;
  modifiedAt: string;
  permissions: string;
}

export default function FilesPage() {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [subPath, setSubPath] = useState('');
  const [homePath, setHomePath] = useState('');
  const [serverName, setServerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New item modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [isFolder, setIsFolder] = useState(false);
  const [fileContent, setFileContent] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchFiles = async (targetSubPath = subPath) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/files?subPath=${encodeURIComponent(targetSubPath)}`);
      const data = await res.json();
      if (data.success) {
        setFiles(data.files || []);
        setHomePath(data.homePath || `/home/${user?.linuxUsername || 'user'}`);
        setServerName(data.serverName || 'Assigned Node');
        setSubPath(targetSubPath);
      } else {
        setError(data.error || 'Failed to load directory');
      }
    } catch {
      setError('Could not connect to VPS agent to fetch files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles('');
  }, []);

  const handleNavigateFolder = (folderName: string) => {
    const nextPath = subPath ? `${subPath}/${folderName}` : folderName;
    fetchFiles(nextPath);
  };

  const handleNavigateUp = () => {
    if (!subPath) return;
    const parts = subPath.split('/');
    parts.pop();
    const parentPath = parts.join('/');
    fetchFiles(parentPath);
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const fullRelativeName = subPath ? `${subPath}/${newItemName}` : newItemName;
      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: fullRelativeName,
          isDirectory: isFolder,
          content: fileContent,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCreateModalOpen(false);
        setNewItemName('');
        setFileContent('');
        fetchFiles(subPath);
      } else {
        alert(data.error || 'Failed to create item');
      }
    } catch {
      alert('Error creating item');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Privacy Guarantee Header Banner */}
      <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent p-5 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="rounded-xl bg-indigo-500/20 p-2.5 text-indigo-400 border border-indigo-500/30">
            <FolderLock className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Tenant Isolated File Space</span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                chmod 700 Enforced
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              You are browsing your private Linux sandbox at <code className="text-indigo-300 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">{homePath || `/home/${user?.linuxUsername || 'user'}`}</code> on node <span className="text-slate-200 font-semibold">{serverName || 'Assigned Server'}</span>. Other tenants are blocked from reading or viewing your files.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchFiles(subPath)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/60 px-3.5 py-2.5 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition"
          >
            <Plus className="h-4 w-4" />
            <span>New File / Folder</span>
          </button>
        </div>
      </div>

      {/* Path Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-mono bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-slate-400">
        <span className="text-indigo-400 font-semibold">{homePath || '~'}</span>
        {subPath && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
            <span className="text-slate-200">{subPath}</span>
          </>
        )}
        {subPath && (
          <button
            onClick={handleNavigateUp}
            className="ml-auto flex items-center gap-1 text-[11px] font-sans text-indigo-400 hover:text-indigo-300"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Go Back</span>
          </button>
        )}
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-center text-xs text-rose-300 space-y-3">
          <AlertCircle className="h-8 w-8 text-rose-400 mx-auto" />
          <p className="font-semibold text-sm">{error}</p>
          <p className="text-rose-400/80">Make sure your assigned VPS server is online and running the worker agent.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-4">Name</th>
                  <th className="px-5 py-4">Size</th>
                  <th className="px-5 py-4">Type</th>
                  <th className="px-5 py-4">Security Permission</th>
                  <th className="px-5 py-4 text-right">Modified Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {files.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                      Directory is empty. Click &quot;New File / Folder&quot; to create items.
                    </td>
                  </tr>
                ) : (
                  files.map((item) => (
                    <tr
                      key={item.name}
                      onClick={() => item.isDir && handleNavigateFolder(item.name)}
                      className={`hover:bg-slate-800/30 transition ${
                        item.isDir ? 'cursor-pointer' : ''
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          {item.isDir ? (
                            <Folder className="h-4 w-4 text-amber-400" />
                          ) : (
                            <FileText className="h-4 w-4 text-indigo-400" />
                          )}
                          <span className={`font-medium ${item.isDir ? 'text-amber-300' : 'text-slate-200'}`}>
                            {item.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-400">
                        {item.isDir ? '--' : formatBytes(item.sizeBytes)}
                      </td>
                      <td className="px-5 py-4 text-slate-400">
                        {item.isDir ? 'Directory' : 'File'}
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-500/20">
                          chmod {item.permissions}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right text-slate-500 font-mono text-[11px]">
                        {new Date(item.modifiedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white">Create in Private Directory</h3>
            <p className="text-xs text-slate-400 mt-1">
              Add a new file or folder in {homePath}/{subPath}
            </p>

            <form onSubmit={handleCreateItem} className="mt-4 space-y-4">
              <div className="flex items-center gap-4 text-xs text-slate-300">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    checked={!isFolder}
                    onChange={() => setIsFolder(false)}
                    className="text-indigo-600"
                  />
                  <span>File</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    checked={isFolder}
                    onChange={() => setIsFolder(true)}
                    className="text-indigo-600"
                  />
                  <span>Folder / Directory</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  placeholder={isFolder ? 'src' : 'index.js'}
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {!isFolder && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Initial Content (Optional)
                  </label>
                  <textarea
                    rows={4}
                    placeholder="// write code or notes"
                    value={fileContent}
                    onChange={(e) => setFileContent(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs font-mono text-emerald-400 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
