import React, { useEffect, useState } from 'react';
import { Allocation, RequestItem, DashboardStats, AuditLogItem, FormField, AdminUserItem } from '../../types';
import {
  getDashboardStats,
  getAdminRequests,
  acceptRequest,
  rejectRequest,
  getAdminAllocations,
  createAllocation,
  updateAllocationStatus,
  getAuditLogs,
  adminLogout,
  destroyAllocation,
  exportSession,
  holdRequest,
  serveRequest,
  changeAdminCredentials,
  getAdminUsers,
  createSubAdmin,
  deleteSubAdmin,
  API_BASE,
} from '../../api/client';
import {
  Users,
  CheckCircle2,
  XCircle,
  Ticket,
  Clock,
  Plus,
  LogOut,
  ShieldCheck,
  Eye,
  Settings,
  ListOrdered,
  FileSpreadsheet,
  X,
  RefreshCw,
  Trash2,
  Download,
  QrCode,
  Copy,
  Search,
  Lock,
  Sparkles,
  Pause,
  Play,
  Check,
  UserCheck,
  ShieldAlert,
  UserPlus,
  AlertCircle,
} from 'lucide-react';

interface Props {
  adminUsername: string;
  adminRole?: string;
  onLogout: () => void;
  onUsernameChanged?: (newUname: string) => void;
}

export const AdminDashboard: React.FC<Props> = ({ adminUsername, adminRole = 'SUPER_ADMIN', onLogout, onUsernameChanged }) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'allocations' | 'audit' | 'users'>('queue');
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Queue state
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [selectedAllocFilter, setSelectedAllocFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('PENDING');
  const [searchQuery, setSearchQuery] = useState('');

  // Allocations state
  const [allocations, setAllocations] = useState<Allocation[]>([]);

  // Sub-Admins Management State
  const [adminUsersList, setAdminUsersList] = useState<AdminUserItem[]>([]);
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [subAdminUsername, setSubAdminUsername] = useState('');
  const [subAdminPassword, setSubAdminPassword] = useState('');
  const [adminUserError, setAdminUserError] = useState('');
  const [adminUserSuccess, setAdminUserSuccess] = useState('');
  const [adminSubmitting, setAdminSubmitting] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRequestModal, setSelectedRequestModal] = useState<RequestItem | null>(null);
  const [qrModalAlloc, setQrModalAlloc] = useState<Allocation | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Password & Credentials Change States
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newUsernameInput, setNewUsernameInput] = useState(adminUsername);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [passwordStatusMsg, setPasswordStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // New allocation form
  const [newAllocName, setNewAllocName] = useState('');
  const [newAllocDesc, setNewAllocDesc] = useState('');
  const [newAllocMaxTokens, setNewAllocMaxTokens] = useState<number | undefined>(undefined);
  const [newAllocFields, setNewAllocFields] = useState<Partial<FormField>[]>([
    { field_key: 'name', label: 'Full Name', field_type: 'text', required: true, display_order: 1 },
    { field_key: 'phone', label: 'Phone Number', field_type: 'phone', required: true, display_order: 2 },
  ]);

  // Audit state
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Custom Confirmation Modal State (replaces browser native window.confirm)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  const isSuperAdmin = adminRole === 'SUPER_ADMIN';

  const loadData = async () => {
    try {
      setLoading(true);
      const [sData, allocData] = await Promise.all([
        getDashboardStats().catch((err) => {
          if (err?.message?.includes('401') || err?.message?.includes('Unauthorized')) {
            onLogout();
          }
          return null;
        }),
        getAdminAllocations().catch(() => []),
      ]);

      if (sData) setStats(sData);
      const sortedAllocations = allocData || [];
      setAllocations(sortedAllocations);

      // Default filter to the latest session added if none selected or invalid
      let activeFilter = selectedAllocFilter;
      if (sortedAllocations.length > 0) {
        if (!activeFilter || !sortedAllocations.some((a) => a.id === activeFilter)) {
          activeFilter = sortedAllocations[0].id;
          setSelectedAllocFilter(activeFilter);
        }
      }

      if (activeFilter) {
        const reqData = await getAdminRequests(activeFilter, '').catch(() => []);
        setRequests(reqData || []);
      } else {
        setRequests([]);
      }
    } catch (err: any) {
      console.log('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadAdminUsers = async () => {
    setActiveTab('users');
    setAdminUserError('');
    setAdminUserSuccess('');
    try {
      const users = await getAdminUsers();
      setAdminUsersList(users || []);
    } catch (err: any) {
      setAdminUserError(err.message || 'Failed to fetch admin users');
    }
  };

  useEffect(() => {
    loadData();

    let sse: EventSource | null = null;
    try {
      sse = new EventSource(`${API_BASE}/admin/dashboard/stream`);
      sse.onmessage = () => {
        loadData();
      };
      sse.onerror = () => {
        sse?.close();
      };
    } catch (err) {
      console.log('Admin dashboard SSE connection error:', err);
    }

    return () => {
      if (sse) sse.close();
    };
  }, [selectedAllocFilter]);

  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.15);
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.log('Audio chime error:', e);
    }
  };

  const handleAccept = async (id: string) => {
    playChime();
    try {
      await acceptRequest(id);
    } catch (err: any) {
      console.log('Fallback local accept:', err);
    }
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'ACCEPTED', assigned_token: (r.assigned_token || 1) } : r))
    );
    loadData();
  };

  const handleReject = async (id: string) => {
    try {
      await rejectRequest(id);
    } catch (err: any) {
      console.log('Fallback local reject:', err);
    }
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'REJECTED' } : r)));
    loadData();
  };

  const handleHold = async (id: string) => {
    try {
      await holdRequest(id);
    } catch (err: any) {
      console.log('Fallback local hold:', err);
    }
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'CANCELLED' } : r)));
    loadData();
  };

  const handleServe = async (id: string) => {
    playChime();
    try {
      await serveRequest(id);
    } catch (err: any) {
      console.log('Fallback local serve:', err);
    }
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'SERVED' } : r)));
    loadData();
  };

  const handleCreateAllocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAllocation({
        name: newAllocName,
        description: newAllocDesc,
        opening_time: '00:00',
        closing_time: '23:59',
        max_tokens: newAllocMaxTokens,
        form_fields: newAllocFields,
      });
    } catch (err: any) {
      console.log('Fallback local create allocation:', err);
      const newAlloc: Allocation = {
        id: 'alloc-' + Math.random().toString(36).substring(2, 7),
        name: newAllocName,
        description: newAllocDesc,
        date: new Date().toISOString().split('T')[0],
        opening_time: '00:00',
        closing_time: '23:59',
        max_tokens: newAllocMaxTokens,
        additional_instructions: 'No app required.',
        status: 'ACTIVE',
        current_sequence: 0,
        waiting_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setAllocations((prev) => [newAlloc, ...prev]);
      setSelectedAllocFilter(newAlloc.id);
    }
    setShowCreateModal(false);
    setNewAllocName('');
    setNewAllocDesc('');
    loadData();
  };

  const handleToggleAllocStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await updateAllocationStatus(id, nextStatus);
    } catch (err: any) {
      console.log('Fallback status update:', err);
    }
    setAllocations((prev) => prev.map((a) => (a.id === id ? { ...a, status: nextStatus } : a)));
  };

  const handleCompleteAllocSession = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Complete Session',
      message: 'Are you sure you want to COMPLETE this session? Public access to request new tokens for this session will end.',
      confirmText: 'Complete Session',
      isDanger: false,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await updateAllocationStatus(id, 'COMPLETED');
        } catch (err: any) {
          console.log('Fallback status update:', err);
        }
        setAllocations((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'COMPLETED' } : a)));
      },
    });
  };

  const handleCreateSubAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminUserError('');
    setAdminUserSuccess('');
    setAdminSubmitting(true);

    try {
      const created = await createSubAdmin(subAdminUsername, subAdminPassword);
      setAdminUserSuccess(`Admin user "${subAdminUsername}" created successfully!`);
      setSubAdminUsername('');
      setSubAdminPassword('');
      setShowCreateAdminModal(false);
      handleLoadAdminUsers();
    } catch (err: any) {
      setAdminUserError(err.message || 'Failed to create sub-admin user');
    } finally {
      setAdminSubmitting(false);
    }
  };

  const handleDeleteSubAdminClick = (id: string, uname: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remove Admin Account',
      message: `Are you sure you want to remove admin account "${uname}"? This action cannot be undone.`,
      confirmText: 'Remove Admin',
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal(null);
        setAdminUserError('');
        setAdminUserSuccess('');
        try {
          await deleteSubAdmin(id);
          setAdminUserSuccess(`Admin user "${uname}" removed.`);
          handleLoadAdminUsers();
        } catch (err: any) {
          setAdminUserError(err.message || 'Failed to remove admin user');
        }
      },
    });
  };

  const handleDestroy = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Destroy Queue Session',
      message: 'Are you sure you want to DESTROY this session? This will permanently wipe all PII data and queue requests from PostgreSQL.',
      confirmText: 'Destroy Session (Wipe PII)',
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await destroyAllocation(id);
        } catch (err: any) {
          console.log('Fallback destroy:', err);
        }
        setAllocations((prev) => prev.filter((a) => a.id !== id));
        loadData();
      },
    });
  };

  const handleExport = async (id: string) => {
    try {
      await exportSession(id);
    } catch (err: any) {
      console.log('Fallback export:', err);
    }
  };

  const handleLoadAudit = async () => {
    setActiveTab('audit');
    const logs = await getAuditLogs().catch(() => []);
    setAuditLogs(logs);
  };

  const handleAddField = () => {
    setNewAllocFields((prev) => [
      ...prev,
      { field_key: '', label: '', field_type: 'text', required: false, display_order: prev.length + 1 },
    ]);
  };

  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const acceptedRequests = requests.filter((r) => r.status === 'ACCEPTED');

  return (
    <div className="space-y-6 animate-slide-up pb-12 max-w-6xl mx-auto text-slate-100">
      {/* Top Header Bar */}
      <div className="card bg-[#1a1a1a] border border-[#2e2e2e] shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white leading-none">Console & Admin Hub</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${isSuperAdmin ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}>
                {isSuperAdmin ? '⚡ SUPER ADMIN' : '👤 SUB-ADMIN'}
              </span>
              <button
                onClick={loadData}
                className="flex items-center gap-1 bg-[#222222] hover:bg-[#2a2a2a] text-indigo-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-[#333333] transition-all ml-1"
              >
                <RefreshCw className="w-3 h-3 text-indigo-400" />
                <span>Sync</span>
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Signed in as <strong className="text-indigo-400 font-bold">{adminUsername}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={() => {
              setPasswordStatusMsg(null);
              setCurrentPasswordInput('');
              setNewUsernameInput(adminUsername);
              setNewPasswordInput('');
              setShowPasswordModal(true);
            }}
            className="flex items-center gap-1.5 bg-[#222222] hover:bg-[#2a2a2a] text-gray-200 px-3.5 py-2 rounded-xl text-xs font-extrabold border border-[#333333] transition-all shadow-2xs"
          >
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            <span>My Credentials</span>
          </button>

          <button
            onClick={async () => { await adminLogout(); onLogout(); }}
            className="flex items-center gap-1.5 bg-red-950/60 hover:bg-red-900/60 text-red-300 px-4 py-2 rounded-xl text-xs font-extrabold border border-red-800 transition-all"
          >
            <LogOut className="w-4 h-4 text-red-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Today', value: `${stats.total_allocations} Sessions`, color: 'text-white', bg: 'bg-[#1a1a1a]' },
            { label: 'Pending Queue', value: stats.pending_requests, color: 'text-amber-400', bg: 'bg-[#1a1a1a]' },
            { label: 'Accepted', value: stats.accepted_requests, color: 'text-emerald-400', bg: 'bg-[#1a1a1a]' },
            { label: 'Rejected', value: stats.rejected_requests, color: 'text-rose-400', bg: 'bg-[#1a1a1a]' },
            { label: 'Last Token #', value: stats.tokens_issued > 0 ? `#${stats.tokens_issued}` : '—', color: 'text-indigo-400', bg: 'bg-[#1a1a1a]' },
            { label: 'Serving', value: `${stats.currently_serving}`, color: 'text-white', bg: 'bg-[#1a1a1a]' },
          ].map((m, i) => (
            <div key={i} className={`card ${m.bg} border border-[#2e2e2e] p-3.5 text-center shadow-xs`}>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">{m.label}</span>
              <span className={`text-xl font-black block mt-0.5 ${m.color}`}>{m.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#2e2e2e] pb-2">
        <button
          onClick={() => setActiveTab('queue')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'queue' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-[#1a1a1a] text-gray-300 hover:bg-[#222222]'
            }`}
        >
          <ListOrdered className="w-4 h-4" />
          <span>Queue Requests ({requests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('allocations')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'allocations' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-[#1a1a1a] text-gray-300 hover:bg-[#222222]'
            }`}
        >
          <Settings className="w-4 h-4" />
          <span>Daily Sessions ({allocations.length})</span>
        </button>

        <button
          onClick={handleLoadAudit}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'audit' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-[#1a1a1a] text-gray-300 hover:bg-[#222222]'
            }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Audit Log</span>
        </button>

        {isSuperAdmin && (
          <button
            onClick={handleLoadAdminUsers}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-[#1a1a1a] text-gray-300 hover:bg-[#222222]'
              }`}
          >
            <UserCheck className="w-4 h-4 text-indigo-400" />
            <span>Admin Users</span>
          </button>
        )}
      </div>

      {/* TAB 1: QUEUE REQUESTS */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {/* Queue Filter Bar */}
          <div className="card bg-[#1a1a1a] border border-[#2e2e2e] p-4 space-y-4 shadow-sm">
            {/* Top Bar: Search + Single Session Dropdown */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search Input */}
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                  <Search className="w-4 h-4 text-indigo-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search applicant name, phone, token #, or ID..."
                  className="w-full text-xs !pl-10 !pr-9 !py-2.5 rounded-xl bg-[#141414] hover:bg-[#181818] focus:bg-[#181818] transition-all border-2 border-[#2e2e2e] focus:border-indigo-500 outline-none text-white font-semibold shadow-2xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-all z-10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Single Session Selector (No "All Sessions" option) */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Active Session View:</span>
                <select
                  className="input py-2 text-xs font-bold bg-[#141414] border border-[#2e2e2e] rounded-xl cursor-pointer text-white max-w-xs"
                  value={selectedAllocFilter}
                  onChange={(e) => setSelectedAllocFilter(e.target.value)}
                >
                  {allocations.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status Filter Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#262626] text-xs font-bold">
              <button
                onClick={() => setSelectedStatusFilter('')}
                className={`px-3 py-1.5 rounded-xl transition-all border ${selectedStatusFilter === ''
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                    : 'bg-[#222222] text-gray-300 hover:bg-[#2a2a2a] border-[#333333]'
                  }`}
              >
                All Requests ({requests.length})
              </button>

              <button
                onClick={() => setSelectedStatusFilter('PENDING')}
                className={`px-3 py-1.5 rounded-xl transition-all border flex items-center gap-1.5 ${selectedStatusFilter === 'PENDING'
                    ? 'bg-amber-600 text-white border-amber-500 shadow-xs'
                    : 'bg-[#222222] text-amber-400 hover:bg-[#2a2a2a] border-[#333333]'
                  }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Pending Approval ({pendingRequests.length})</span>
              </button>

              <button
                onClick={() => setSelectedStatusFilter('ACCEPTED')}
                className={`px-3 py-1.5 rounded-xl transition-all border flex items-center gap-1.5 ${selectedStatusFilter === 'ACCEPTED'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                    : 'bg-[#222222] text-indigo-400 hover:bg-[#2a2a2a] border-[#333333]'
                  }`}
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>Tokens Issued ({acceptedRequests.length})</span>
              </button>

              <button
                onClick={() => setSelectedStatusFilter('SERVED')}
                className={`px-3 py-1.5 rounded-xl transition-all border flex items-center gap-1.5 ${selectedStatusFilter === 'SERVED'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                    : 'bg-[#222222] text-emerald-400 hover:bg-[#2a2a2a] border-[#333333]'
                  }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Served & Completed ({requests.filter(r => r.status === 'SERVED').length})</span>
              </button>

              <button
                onClick={() => setSelectedStatusFilter('REJECTED')}
                className={`px-3 py-1.5 rounded-xl transition-all border flex items-center gap-1.5 ${selectedStatusFilter === 'REJECTED'
                    ? 'bg-rose-600 text-white border-rose-500 shadow-xs'
                    : 'bg-[#222222] text-rose-400 hover:bg-[#2a2a2a] border-[#333333]'
                  }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Rejected / Cancelled ({requests.filter(r => r.status === 'REJECTED' || r.status === 'CANCELLED').length})</span>
              </button>
            </div>
          </div>

          {/* Queue Table */}
          <div className="card bg-[#1a1a1a] border border-[#2e2e2e] p-0 overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#141414] border-b border-[#262626] text-gray-300 font-bold uppercase">
                    <th className="p-3">#</th>
                    <th className="p-3">Session</th>
                    <th className="p-3">Applicant Data</th>
                    <th className="p-3">Submitted</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {(() => {
                    const filtered = requests.filter((r) => {
                      if (selectedStatusFilter) {
                        if (selectedStatusFilter === 'REJECTED') {
                          if (r.status !== 'REJECTED' && r.status !== 'CANCELLED') return false;
                        } else if (r.status !== selectedStatusFilter) {
                          return false;
                        }
                      }
                      if (!searchQuery.trim()) return true;
                      const q = searchQuery.toLowerCase().trim();
                      const name = (r.form_data?.name || r.form_data?.customerName || '').toString().toLowerCase();
                      const phone = (r.form_data?.phone || r.form_data?.phoneNumber || '').toString().toLowerCase();
                      const id = r.id.toLowerCase();
                      const token = (r.assigned_token || '').toString();
                      return name.includes(q) || phone.includes(q) || id.includes(q) || token.includes(q);
                    });

                    const sorted = [...filtered].sort((a, b) => {
                      if (a.assigned_token && b.assigned_token) {
                        return a.assigned_token - b.assigned_token;
                      }
                      if (a.assigned_token) return -1;
                      if (b.assigned_token) return 1;
                      return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
                    });

                    if (sorted.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="text-center py-10 text-gray-400 font-medium">
                            No requests match the selected filters or search query.
                          </td>
                        </tr>
                      );
                    }

                    return sorted.map((r, idx) => (
                      <tr key={r.id} className="hover:bg-[#222222] transition-colors">
                        <td className="p-3 font-mono font-bold text-indigo-400">#{idx + 1}</td>
                        <td className="p-3 font-bold text-white">{r.allocation_name}</td>
                        <td className="p-3">
                          <div className="font-semibold text-white">
                            {(() => {
                              const fd = r.form_data || {};
                              for (const k of ['name', 'full_name', 'your_full_name', 'customer_name', 'applicant_name', 'customerName', 'fullName']) {
                                if (fd[k] && String(fd[k]).trim()) return String(fd[k]).trim();
                              }
                              for (const [k, v] of Object.entries(fd)) {
                                if (k.toLowerCase().includes('name') && v && String(v).trim()) return String(v).trim();
                              }
                              const firstVal = Object.values(fd).find((v) => v && typeof v === 'string' && String(v).trim());
                              return firstVal ? String(firstVal).trim() : 'Applicant';
                            })()}
                          </div>
                          {(() => {
                            const fd = r.form_data || {};
                            for (const k of ['phone', 'phone_number', 'mobile', 'contact', 'phoneNumber']) {
                              if (fd[k] && String(fd[k]).trim()) return <div className="text-[11px] text-gray-400">📞 {String(fd[k]).trim()}</div>;
                            }
                            for (const [k, v] of Object.entries(fd)) {
                              if ((k.toLowerCase().includes('phone') || k.toLowerCase().includes('mobile')) && v && String(v).trim()) {
                                return <div className="text-[11px] text-gray-400">📞 {String(v).trim()}</div>;
                              }
                            }
                            return null;
                          })()}
                          {Object.entries(r.form_data || {}).filter(([k]) => !k.toLowerCase().includes('name') && !k.toLowerCase().includes('phone')).length > 0 && (
                            <div className="text-[10px] text-gray-400 font-mono truncate max-w-xs mt-0.5">
                              {Object.entries(r.form_data || {})
                                .filter(([k]) => !k.toLowerCase().includes('name') && !k.toLowerCase().includes('phone'))
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(' • ')}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-gray-400">
                          {new Date(r.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3">
                          {r.status === 'SERVED' ? (
                            <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full font-black text-[10px]">
                              SERVED (COMPLETED)
                            </span>
                          ) : r.status === 'ACCEPTED' ? (
                            <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full font-black text-[10px]">
                              TOKEN #{r.assigned_token || '1'} (ISSUED)
                            </span>
                          ) : r.status === 'REJECTED' ? (
                            <span className="px-2 py-0.5 bg-red-950 text-red-300 border border-red-800 rounded-full font-black text-[10px]">
                              REJECTED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 rounded-full font-black text-[10px]">
                              PENDING
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            {r.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleAccept(r.id)}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg font-bold text-[11px] shadow-2xs"
                                >
                                  Accept & Issue Token
                                </button>
                                <button
                                  onClick={() => handleHold(r.id)}
                                  className="bg-[#222222] hover:bg-[#2a2a2a] text-amber-400 border border-[#333333] px-2.5 py-1 rounded-lg font-bold text-[11px]"
                                >
                                  Hold
                                </button>
                                <button
                                  onClick={() => handleReject(r.id)}
                                  className="bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800 px-2.5 py-1 rounded-lg font-bold text-[11px]"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {r.status === 'ACCEPTED' && (
                              <button
                                onClick={() => handleServe(r.id)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-lg font-extrabold text-[11px] shadow-sm flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Mark Served 🎯</span>
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedRequestModal(r)}
                              className="p-1 text-gray-400 hover:text-white bg-[#222222] hover:bg-[#2a2a2a] rounded-lg border border-[#333333]"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DAILY SESSIONS */}
      {activeTab === 'allocations' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-black text-white">Session Allocations</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary text-xs py-2 px-3"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Session</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allocations.map((a) => (
              <div key={a.id} className="card bg-[#1a1a1a] border border-[#2e2e2e] p-5 space-y-3 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-black text-base text-white">{a.name}</h3>
                    <p className="text-xs text-gray-400">{a.description || 'No description provided.'}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full font-black text-[10px] uppercase ${a.status === 'ACTIVE'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : a.status === 'COMPLETED'
                        ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                    {a.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-gray-400 border-t border-[#262626]">
                  <span>Date: {a.date}</span>
                  <span>Tokens Issued: {a.current_sequence}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {a.status !== 'COMPLETED' ? (
                    <>
                      <button
                        onClick={() => handleToggleAllocStatus(a.id, a.status)}
                        className="flex-1 min-w-[130px] py-2 px-3 bg-[#222222] hover:bg-[#2a2a2a] text-gray-100 border border-[#333333] rounded-xl font-bold text-xs transition-all inline-flex items-center justify-center gap-2 text-center shadow-2xs"
                      >
                        {a.status === 'ACTIVE' ? (
                          <Pause className="w-4 h-4 shrink-0 text-amber-400" />
                        ) : (
                          <Play className="w-4 h-4 shrink-0 text-emerald-400" />
                        )}
                        <span className="whitespace-nowrap">{a.status === 'ACTIVE' ? 'Pause Session' : 'Resume Session'}</span>
                      </button>

                      <button
                        onClick={() => handleCompleteAllocSession(a.id)}
                        className="py-2 px-3 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 rounded-xl font-bold text-xs transition-all inline-flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <Check className="w-4 h-4 shrink-0 text-indigo-400" />
                        <span className="whitespace-nowrap">Complete Session</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex-1 py-2 px-3 bg-[#141414] text-indigo-400 border border-[#262626] rounded-xl font-bold text-xs text-center inline-flex items-center justify-center gap-1.5">
                      <Check className="w-4 h-4 text-indigo-400" />
                      <span>Session Completed</span>
                    </div>
                  )}

                  <button
                    onClick={() => { setQrModalAlloc(a); setCopiedLink(false); }}
                    className="py-2 px-3 bg-[#222222] hover:bg-[#2a2a2a] text-indigo-400 border border-[#333333] rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1"
                    title="Get QR Code & Join Link"
                  >
                    <QrCode className="w-4 h-4 text-indigo-400" />
                    <span>Get QR</span>
                  </button>

                  {isSuperAdmin && (
                    <button
                      onClick={() => handleExport(a.id)}
                      className="py-2 px-3 bg-[#222222] hover:bg-[#2a2a2a] text-gray-300 border border-[#333333] rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1"
                      title="Export to Excel/CSV (Super Admin Only)"
                    >
                      <Download className="w-4 h-4 text-indigo-400" />
                      <span>Export Excel</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleDestroy(a.id)}
                    className="py-2 px-3 bg-red-950/60 hover:bg-red-900/60 text-red-400 border border-red-800 rounded-xl font-bold text-xs transition-all flex items-center justify-center"
                    title="Destroy Session (Wipe PII)"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOG */}
      {activeTab === 'audit' && (
        <div className="card bg-[#1a1a1a] border border-[#2e2e2e] p-4 shadow-sm">
          <h2 className="text-base font-black text-white mb-3">Audit Trail</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#141414] text-gray-300 font-bold uppercase border-b border-[#262626]">
                  <th className="p-2.5">Event</th>
                  <th className="p-2.5">IP Address</th>
                  <th className="p-2.5">Timestamp</th>
                  <th className="p-2.5">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#222222] transition-colors">
                    <td className="p-2.5 font-mono font-bold text-indigo-400">{log.event}</td>
                    <td className="p-2.5 text-gray-300">{log.ip_address || 'System'}</td>
                    <td className="p-2.5 text-gray-400">{log.created_at}</td>
                    <td className="p-2.5 font-mono text-gray-400 text-[10px] truncate max-w-xs">
                      {JSON.stringify(log.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: ADMIN USERS MANAGEMENT (SUPER ADMIN ONLY) */}
      {activeTab === 'users' && isSuperAdmin && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-400" />
                <span>Admin Users Management</span>
              </h2>
              <p className="text-xs text-gray-400">Manage sub-admins and access hierarchy rules.</p>
            </div>

            {isSuperAdmin && (
              <button
                onClick={() => { setAdminUserError(''); setAdminUserSuccess(''); setShowCreateAdminModal(true); }}
                className="btn-primary text-xs py-2 px-3"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Sub-Admin</span>
              </button>
            )}
          </div>

          {adminUserError && (
            <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span>{adminUserError}</span>
            </div>
          )}

          {adminUserSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{adminUserSuccess}</span>
            </div>
          )}

          <div className="card bg-[#1a1a1a] border border-[#2e2e2e] p-0 overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#141414] border-b border-[#262626] text-gray-300 font-bold uppercase">
                    <th className="p-3">Username</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Created At</th>
                    <th className="p-3">Actions & Hierarchy Rules</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {adminUsersList.map((u) => {
                    const isSuper = u.role === 'SUPER_ADMIN';
                    return (
                      <tr key={u.id} className="hover:bg-[#222222] transition-colors">
                        <td className="p-3 font-bold text-white flex items-center gap-2">
                          <span className="w-7 h-7 bg-[#222222] border border-[#333333] rounded-lg flex items-center justify-center text-xs font-black text-indigo-400">
                            {u.username[0].toUpperCase()}
                          </span>
                          <span>{u.username}</span>
                        </td>
                        <td className="p-3">
                          {isSuper ? (
                            <span className="px-2.5 py-1 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full font-black text-[10px]">
                              ⚡ SUPER ADMIN
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full font-black text-[10px]">
                              👤 SUB-ADMIN
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-gray-400 font-mono text-[11px]">
                          {new Date(u.created_at || Date.now()).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="p-3">
                          {isSuper ? (
                            <span className="text-[11px] text-gray-500 font-bold italic">
                              🔒 Primary Super Admin (Cannot Be Removed)
                            </span>
                          ) : isSuperAdmin ? (
                            <button
                              onClick={() => handleDeleteSubAdminClick(u.id, u.username)}
                              className="bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800 px-3 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              <span>Remove Admin</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-gray-500 font-medium">
                              Sub-admins cannot delete other admins
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Create Sub-Admin Modal */}
      {showCreateAdminModal && (
        <div className="modal-overlay-backdrop">
          <div className="bg-[#1a1a1a] rounded-2xl p-6 max-w-md w-full shadow-2xl border border-[#2e2e2e] animate-pop text-white text-xs space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#262626]">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <h3 className="font-black text-base text-white">Add New Sub-Admin User</h3>
              </div>
              <button onClick={() => setShowCreateAdminModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubAdminSubmit} className="space-y-4">
              <div>
                <label className="block font-bold text-gray-300 uppercase mb-1">Username *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. counter_operator1"
                  className="input py-2 text-xs"
                  value={subAdminUsername}
                  onChange={(e) => setSubAdminUsername(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-bold text-gray-300 uppercase mb-1">Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  className="input py-2 text-xs"
                  value={subAdminPassword}
                  onChange={(e) => setSubAdminPassword(e.target.value)}
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateAdminModal(false)}
                  className="py-2.5 bg-[#222222] hover:bg-[#2a2a2a] text-gray-300 border border-[#333333] font-bold rounded-xl flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminSubmitting}
                  className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-1.5"
                >
                  {adminSubmitting ? <Sparkles className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  <span>Create Admin</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Allocation Modal */}
      {showCreateModal && (
        <div className="modal-overlay-backdrop">
          <div className="bg-[#1a1a1a] rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#2e2e2e] animate-pop text-white">
            <div className="flex justify-between items-center pb-3 border-b border-[#262626] mb-4">
              <h3 className="text-lg font-black text-white">New Queue Session</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAllocationSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-300 uppercase mb-1">Session Name *</label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="e.g. General Consultation"
                  value={newAllocName}
                  onChange={(e) => setNewAllocName(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-bold text-gray-300 uppercase mb-1">Description</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Daily consultation queue"
                  value={newAllocDesc}
                  onChange={(e) => setNewAllocDesc(e.target.value)}
                />
              </div>

              {/* Dynamic Form Fields Creator */}
              <div className="pt-3 border-t border-[#262626] space-y-2">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-gray-300 uppercase">Custom Form Fields</label>
                  <button type="button" onClick={handleAddField} className="text-xs bg-[#222222] hover:bg-[#2a2a2a] text-indigo-400 border border-[#333333] px-2.5 py-1 rounded-lg font-bold">
                    + Add Field
                  </button>
                </div>

                {newAllocFields.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-[#141414] p-2 rounded-xl border border-[#262626]">
                    <input
                      type="text"
                      className="input py-1 text-xs"
                      placeholder="Field Label"
                      value={f.label}
                      onChange={(e) => {
                        const updated = [...newAllocFields];
                        updated[i].label = e.target.value;
                        updated[i].field_key = e.target.value.toLowerCase().replace(/\s+/g, '_');
                        setNewAllocFields(updated);
                      }}
                    />
                    <select
                      className="input py-1 text-xs w-28 bg-[#141414] text-white"
                      value={f.field_type}
                      onChange={(e) => {
                        const updated = [...newAllocFields];
                        updated[i].field_type = e.target.value as any;
                        setNewAllocFields(updated);
                      }}
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="phone">Phone</option>
                      <option value="email">Email</option>
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-2.5 bg-[#222222] hover:bg-[#2a2a2a] text-gray-300 border border-[#333333] font-bold rounded-xl">
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary py-2.5">
                  Create Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Modal */}
      {selectedRequestModal && (
        <div className="modal-overlay-backdrop">
          <div className="bg-[#1a1a1a] rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-[#2e2e2e] animate-pop text-xs text-white">
            <div className="flex justify-between items-center pb-2 border-b border-[#262626] mb-3">
              <h3 className="font-black text-sm text-white">Request Details</h3>
              <button onClick={() => setSelectedRequestModal(null)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-gray-300">
              <div><strong className="text-white">Session:</strong> {selectedRequestModal.allocation_name}</div>
              <div><strong className="text-white">Status:</strong> {selectedRequestModal.status}</div>
              <div>
                <strong className="text-white">Submitted Data:</strong>
                <pre className="bg-[#141414] p-2.5 rounded-xl border border-[#262626] text-[11px] font-mono mt-1 overflow-x-auto text-indigo-300">
                  {JSON.stringify(selectedRequestModal.form_data, null, 2)}
                </pre>
              </div>
            </div>
            <button onClick={() => setSelectedRequestModal(null)} className="btn-primary w-full text-xs py-2 mt-4">
              Close
            </button>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrModalAlloc && (
        <div className="modal-overlay-backdrop">
          <div className="bg-[#1a1a1a] rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-[#2e2e2e] animate-pop text-center space-y-4 text-white">
            <div className="flex justify-between items-center pb-2 border-b border-[#262626]">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-indigo-400" />
                <h3 className="font-black text-sm text-white">Session QR Code</h3>
              </div>
              <button onClick={() => setQrModalAlloc(null)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h4 className="font-black text-base text-white">{qrModalAlloc.name}</h4>
              <p className="text-[11px] text-gray-400 font-mono">ID: {qrModalAlloc.id}</p>
            </div>

            {/* Generated QR Code Image */}
            <div className="bg-white p-4 rounded-2xl inline-block mx-auto shadow-inner border border-[#333333]">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  `${window.location.origin}/join/${qrModalAlloc.id}`
                )}`}
                alt={`QR Code for ${qrModalAlloc.name}`}
                className="w-44 h-44 rounded-lg shadow-xs mx-auto"
              />
            </div>

            {/* Direct Join Link Box */}
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Direct Counter Join URL</label>
              <div className="flex items-center gap-1 bg-[#141414] p-2 rounded-xl border border-[#262626]">
                <input
                  type="text"
                  readOnly
                  className="bg-transparent text-[11px] font-mono text-gray-300 flex-1 outline-none truncate"
                  value={`${window.location.origin}/join/${qrModalAlloc.id}`}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/join/${qrModalAlloc.id}`);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="px-2.5 py-1 btn-primary text-white rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <button onClick={() => setQrModalAlloc(null)} className="btn-primary w-full text-xs py-2.5">
              Close QR Window
            </button>
          </div>
        </div>
      )}

      {/* Change Credentials Modal */}
      {showPasswordModal && (
        <div className="modal-overlay-backdrop">
          <div className="bg-[#1a1a1a] rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#2e2e2e] animate-pop text-xs space-y-4 text-white">
            <div className="flex justify-between items-center pb-2 border-b border-[#262626]">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-indigo-400" />
                <h3 className="font-black text-base text-white">Change Admin Credentials</h3>
              </div>
              <button onClick={() => setShowPasswordModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#141414] border border-[#262626] text-gray-300 p-3.5 rounded-2xl text-[11px] space-y-1 font-medium">
              <div className="font-extrabold flex items-center gap-1.5 text-indigo-300">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Multi-Device Session Security</span>
              </div>
              <p>
                Updating your admin username or password increments your session version and <strong>logs out all other active devices immediately</strong>.
              </p>
            </div>

            {passwordStatusMsg && (
              <div
                className={`p-3 rounded-xl border text-xs font-bold ${passwordStatusMsg.isError
                    ? 'bg-red-950/80 border-red-800 text-red-300'
                    : 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                  }`}
              >
                {passwordStatusMsg.text}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setPasswordSubmitting(true);
                setPasswordStatusMsg(null);
                try {
                  const res = await changeAdminCredentials(currentPasswordInput, newUsernameInput, newPasswordInput);
                  setPasswordStatusMsg({ text: res.message, isError: false });
                  if (res.username && onUsernameChanged) {
                    onUsernameChanged(res.username);
                  }
                  setCurrentPasswordInput('');
                  setNewPasswordInput('');
                } catch (err: any) {
                  setPasswordStatusMsg({ text: err.message || 'Failed to update credentials', isError: true });
                } finally {
                  setPasswordSubmitting(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block font-bold text-gray-300 uppercase mb-1">Current Password</label>
                <input
                  type="password"
                  placeholder="Enter current password (if set)"
                  className="input py-2 text-xs"
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-bold text-gray-300 uppercase mb-1">New Username</label>
                <input
                  type="text"
                  required
                  placeholder="Enter new admin username"
                  className="input py-2 text-xs"
                  value={newUsernameInput}
                  onChange={(e) => setNewUsernameInput(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-bold text-gray-300 uppercase mb-1">New Password (Optional)</label>
                <input
                  type="password"
                  placeholder="Enter new password (min 6 characters)"
                  className="input py-2 text-xs"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="py-2.5 bg-[#222222] hover:bg-[#2a2a2a] text-gray-300 border border-[#333333] font-bold rounded-xl flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordSubmitting}
                  className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-1.5"
                >
                  {passwordSubmitting ? <Sparkles className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  <span>Save Credentials</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal (replaces browser native window.confirm to prevent browser suppression) */}
      {confirmModal && confirmModal.isOpen && (
        <div className="modal-overlay-backdrop">
          <div className="bg-[#1a1a1a] rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-[#2e2e2e] animate-pop text-white text-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#262626]">
              <AlertCircle className={`w-5 h-5 ${confirmModal.isDanger ? 'text-red-400' : 'text-indigo-400'}`} />
              <h3 className="font-black text-base text-white">{confirmModal.title}</h3>
            </div>
            <p className="text-gray-300 leading-relaxed font-medium">
              {confirmModal.message}
            </p>
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="py-2.5 bg-[#222222] hover:bg-[#2a2a2a] text-gray-300 border border-[#333333] font-bold rounded-xl flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`flex-1 py-2.5 font-bold rounded-xl text-white transition-all shadow-sm ${
                  confirmModal.isDanger
                    ? 'bg-red-600 hover:bg-red-500 border border-red-500'
                    : 'btn-primary'
                }`}
              >
                {confirmModal.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
