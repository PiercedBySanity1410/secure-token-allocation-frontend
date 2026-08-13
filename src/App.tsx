import React, { useEffect, useState } from 'react';
import { Allocation, RequestItem, CachedToken } from './types';
import { TodayAllocations } from './pages/public/TodayAllocations';
import { RequestTokenForm } from './pages/public/RequestTokenForm';
import { TokenStatusView } from './pages/public/TokenStatusView';
import { VerifyTokenPage } from './pages/public/VerifyTokenPage';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { Navbar } from './components/Navbar';
import { getTodayAllocations, getAdminProfile, getAllocationByID, getRequestStatus, API_BASE } from './api/client';
import { getLatestTokenFromIndexedDB, removeTokenFromIndexedDB } from './db/indexedDB';

export const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<'public' | 'admin'>('public');
  const [currentStep, setCurrentStep] = useState<'allocations' | 'form' | 'status' | 'verify' | 'session_not_found'>('allocations');
  const [selectedAllocation, setSelectedAllocation] = useState<Allocation | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [activeRequest, setActiveRequest] = useState<RequestItem | null>(null);

  // Allocations list
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loadingAllocations, setLoadingAllocations] = useState(true);

  // Cached Token & Admin session
  const [cachedToken, setCachedToken] = useState<CachedToken | null>(null);
  const [adminUsername, setAdminUsername] = useState<string | null>(null);
  const [adminRole, setAdminRole] = useState<string>('ADMIN');
  const [currentTime, setCurrentTime] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [isJoiningSession, setIsJoiningSession] = useState(false);

  const syncUrlRouting = async (profileName?: string | null) => {
    const path = window.location.pathname;

    if (path.startsWith('/admin')) {
      setViewMode('admin');
      let currentAdminUser = profileName;
      if (currentAdminUser === undefined) {
        const profile = await getAdminProfile().catch(() => null);
        currentAdminUser = profile ? profile.username : null;
        if (profile?.role) setAdminRole(profile.role);
        setAdminUsername(currentAdminUser);
      }

      if (path === '/admin/login') {
        if (currentAdminUser) {
          window.history.replaceState(null, '', '/admin');
        }
      } else {
        if (!currentAdminUser) {
          window.history.replaceState(null, '', '/admin/login');
        }
      }
    } else if (path.includes('/join/')) {
      setViewMode('public');
      const allocId = path.split('/join/')[1]?.split('/')[0];
      if (allocId) {
        setIsJoiningSession(true);
        try {
          const alloc = await getAllocationByID(allocId);
          if (alloc) {
            setSelectedAllocation(alloc);
            setCurrentStep('form');
          } else {
            setSelectedAllocation(null);
            setCurrentStep('session_not_found');
          }
        } catch (e) {
          setSelectedAllocation(null);
          setCurrentStep('session_not_found');
        } finally {
          setIsJoiningSession(false);
        }
      } else {
        setSelectedAllocation(null);
        setCurrentStep('session_not_found');
      }
    } else if (path.startsWith('/verify') || path.startsWith('/status')) {
      setViewMode('public');
      setCurrentStep('verify');
    } else {
      setViewMode('public');
      setCurrentStep('allocations');
    }
  };

  useEffect(() => {
    // Load Today's Allocations from API
    const loadAllocations = async () => {
      try {
        setLoadingAllocations(true);
        const data = await getTodayAllocations();
        setAllocations(data || []);
      } catch (e) {
        console.log('API getTodayAllocations error:', e);
        setAllocations([]);
      } finally {
        setLoadingAllocations(false);
      }
    };

    loadAllocations();

    // Real-time SSE Stream for public allocations (zero polling!)
    let allocSse: EventSource | null = null;
    try {
      allocSse = new EventSource(`${API_BASE}/public/allocations/stream`);
      allocSse.onmessage = (event) => {
        try {
          const liveAllocs: Allocation[] = JSON.parse(event.data);
          setAllocations(liveAllocs || []);
          setLoadingAllocations(false);
        } catch (err) {
          console.error('Failed to parse allocations SSE message', err);
        }
      };
      allocSse.onerror = () => {
        allocSse?.close();
      };
    } catch (err) {
      console.log('Public allocations SSE connection error:', err);
    }

    // Check IndexedDB on app load for cached token & purge if entry deleted online
    getLatestTokenFromIndexedDB().then(async (token) => {
      if (token) {
        if (navigator.onLine) {
          try {
            const liveReq = await getRequestStatus(token.requestId);
            if (liveReq) {
              setCachedToken({
                ...token,
                status: liveReq.status,
                tokenNumber: liveReq.assigned_token,
              });
              return;
            }
          } catch (err: any) {
            if (err?.message?.includes('not found') || err?.message?.includes('404')) {
              console.log('Online ticket entry was deleted — purging offline IndexedDB token:', token.requestId);
              await removeTokenFromIndexedDB(token.requestId).catch(() => null);
              setCachedToken(null);
              return;
            }
          }
        }
        setCachedToken(token);
      }
    });

    // Check Admin session cookie & initialize routing
    getAdminProfile().then((profile) => {
      const uName = profile ? profile.username : null;
      setAdminUsername(uName);
      if (profile?.role) setAdminRole(profile.role);
      syncUrlRouting(uName);
    }).catch(() => {
      setAdminUsername(null);
      syncUrlRouting(null);
    });

    // Event listeners
    const handlePopState = () => syncUrlRouting();
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Live clock
    const formatTime = () =>
      new Date().toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    setCurrentTime(formatTime());
    const timer = setInterval(() => setCurrentTime(formatTime()), 1000);

    return () => {
      if (allocSse) allocSse.close();
      clearInterval(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleSelectAllocation = (alloc: Allocation) => {
    setSelectedAllocation(alloc);
    setCurrentStep('form');
    window.history.pushState(null, '', `/join/${alloc.id}`);
  };

  const handleRequestSubmitted = (req: RequestItem) => {
    setActiveRequestId(req.id);
    setActiveRequest(req);
    setCurrentStep('status');
  };

  const handleReapplyFromRejected = async (allocId: string) => {
    setIsJoiningSession(true);
    try {
      const alloc = await getAllocationByID(allocId);
      if (alloc) {
        setSelectedAllocation(alloc);
        setCurrentStep('form');
        window.history.pushState(null, '', `/join/${alloc.id}`);
      } else {
        navigateTo('/');
      }
    } catch (e) {
      navigateTo('/');
    } finally {
      setIsJoiningSession(false);
    }
  };

  const handleViewMyToken = () => {
    if (cachedToken) {
      setActiveRequestId(cachedToken.requestId);
      setCurrentStep('status');
    }
  };

  const navigateTo = (path: string) => {
    window.history.pushState(null, '', path);
    syncUrlRouting();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#111111] font-sans text-gray-100">
      {/* Top Navbar Header */}
      <Navbar
        viewMode={viewMode}
        currentStep={currentStep}
        cachedToken={cachedToken}
        currentTime={currentTime}
        isOnline={isOnline}
        onNavigateHome={() => navigateTo('/')}
        onViewMyToken={handleViewMyToken}
        onToggleViewMode={() => {
          if (viewMode === 'public') {
            navigateTo(adminUsername ? '/admin' : '/admin/login');
          } else {
            navigateTo('/');
          }
        }}
      />

      {/* Main Page Body */}
      <main className="container mx-auto px-4 py-8 flex-1">
        {viewMode === 'public' ? (
          <>
            {isJoiningSession ? (
              <div className="max-w-md mx-auto text-center py-20 space-y-4 animate-slide-up">
                <div className="w-14 h-14 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto shadow-lg shadow-cyan-500/20" />
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-white">Loading Token Application Form...</h3>
                  <p className="text-xs font-semibold text-slate-400">Retrieving queue session details and form fields</p>
                </div>
              </div>
            ) : (
              <>
                {currentStep === 'allocations' && (
                  <TodayAllocations
                    allocations={allocations}
                    loading={loadingAllocations}
                    onSelectAllocation={handleSelectAllocation}
                    onViewMyToken={handleViewMyToken}
                    hasCachedToken={!!cachedToken}
                    cachedToken={cachedToken}
                  />
                )}

                {currentStep === 'form' && selectedAllocation && (
                  <RequestTokenForm
                    allocation={selectedAllocation}
                    cachedToken={cachedToken}
                    onBack={() => navigateTo('/')}
                    onRequestSubmitted={handleRequestSubmitted}
                    onViewMyToken={handleViewMyToken}
                  />
                )}

                {currentStep === 'status' && activeRequestId && (
                  <TokenStatusView
                    requestId={activeRequestId}
                    initialRequest={activeRequest}
                    onBackToHome={() => navigateTo('/')}
                    onReapply={handleReapplyFromRejected}
                  />
                )}

                {currentStep === 'verify' && (
                  <VerifyTokenPage
                    onBackToHome={() => navigateTo('/')}
                  />
                )}

                {(currentStep === 'session_not_found' || (currentStep === 'form' && !selectedAllocation)) && (
                  <div className="max-w-md mx-auto text-center space-y-5 animate-slide-up py-12">
                    <div className="w-20 h-20 bg-red-100 border-4 border-red-200 rounded-3xl flex items-center justify-center mx-auto text-red-600 shadow-md">
                      <span className="text-3xl font-black">404</span>
                    </div>

                    <div className="space-y-2">
                      <span className="inline-block bg-red-100 text-red-800 text-xs font-black px-4 py-1 rounded-full uppercase tracking-wider">
                        SESSION CLOSED OR DELETED 🔴
                      </span>
                      <h2 className="text-2xl font-black text-gray-900">Queue Session Not Found</h2>
                      <p className="text-xs text-gray-600 font-medium leading-relaxed max-w-sm mx-auto">
                        The queue session link or QR code you scanned is no longer active because it has been closed or deleted by administration.
                      </p>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl text-xs text-gray-600 text-left space-y-1">
                      <p className="font-bold text-gray-800">Security & Purge Notice:</p>
                      <p className="text-[11px] text-gray-500">
                        When a session is destroyed, all associated application forms, token queues, and user entries are permanently purged from PostgreSQL.
                      </p>
                    </div>

                    <button onClick={() => navigateTo('/')} className="btn-primary text-xs py-3 px-6 w-full">
                      Return to Token Portal Home
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <>
            {adminUsername ? (
              <AdminDashboard
                adminUsername={adminUsername}
                adminRole={adminRole}
                onUsernameChanged={(newUname) => setAdminUsername(newUname)}
                onLogout={() => {
                  setAdminUsername(null);
                  navigateTo('/admin/login');
                }}
              />
            ) : (
              <AdminLogin onLoginSuccess={(uname, role) => {
                setAdminUsername(uname);
                if (role) setAdminRole(role);
                navigateTo('/admin');
              }} />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-6 border-t border-gray-800 text-center text-xs text-gray-400">
        <div className="container mx-auto px-4">
          <p className="font-bold text-gray-300 mb-1">
            Secure Token Allocation System &bull; Cryptographic Queue Engine
          </p>
          <p className="text-[11px] text-gray-500">
            © 2026 Secure Token Allocation &bull; All Rights Reserved
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
