import React, { useState } from 'react';
import { Allocation, RequestItem } from '../../types';
import {
  Users,
  CheckCircle2,
  Volume2,
  Pause,
  Play,
  QrCode,
  LogOut,
  Sparkles,
  UserCheck,
  Trash2,
  Copy,
  Check,
} from 'lucide-react';

interface VendorDashboardProps {
  allocation: Allocation;
  requests: RequestItem[];
  onServeNext: () => void;
  onServeSpecific: (requestId: string) => void;
  onRemoveCustomer: (requestId: string) => void;
  onToggleQueueStatus: () => void;
  onLogout: () => void;
}

export const VendorDashboard: React.FC<VendorDashboardProps> = ({
  allocation,
  requests,
  onServeNext,
  onServeSpecific,
  onRemoveCustomer,
  onToggleQueueStatus,
  onLogout,
}) => {
  const [showQRModal, setShowQRModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const waitingCustomers = requests.filter((r) => r.status === 'PENDING' || r.status === 'ACCEPTED');
  const servedCustomers = requests.filter((r) => r.status === 'SERVED');

  const customerJoinUrl = `${window.location.origin}/join/${allocation.id}`;
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(customerJoinUrl)}`;

  const playChimeSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.15); // E5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.3); // G5

      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.log('Audio playback unavailable', e);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(customerJoinUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleServeNextWithSound = () => {
    playChimeSound();
    onServeNext();
  };

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-100 pb-16">
      {/* Navbar Header */}
      <header className="bg-slate-900/90 border-b border-slate-800 shadow-xs sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-sm">
              T
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white leading-none">{allocation.name}</h1>
                <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-full tracking-wider ${allocation.status === 'ACTIVE' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'}`}>
                  {allocation.status === 'ACTIVE' ? '● LIVE QUEUE' : 'PAUSED'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Vendor Control Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowQRModal(true)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-700 transition-all shadow-2xs"
            >
              <QrCode className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">QR Code</span>
            </button>

            <button
              onClick={onLogout}
              className="flex items-center gap-1 text-slate-400 hover:text-red-400 px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-950/60 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Vendor Body */}
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Top Control Bar & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          {/* Main Big Serve Button Card */}
          <div className="md:col-span-2 card bg-gradient-to-r from-cyan-900 via-slate-900 to-indigo-900 text-white border border-slate-700 shadow-xl flex flex-col justify-between p-6 relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="inline-flex items-center gap-1 bg-cyan-500/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-cyan-300 border border-cyan-500/30 mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  Quick Action
                </span>
                <h2 className="text-2xl font-black">Serve Customers</h2>
                <p className="text-xs text-slate-300 mt-1">
                  {waitingCustomers.length > 0
                    ? `Next in line: ${waitingCustomers[0].form_data?.customerName || waitingCustomers[0].form_data?.name || "Customer #1"}`
                    : "No customers currently waiting"}
                </p>
              </div>

              <button
                onClick={onToggleQueueStatus}
                className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-600 transition-all shadow-2xs"
              >
                {allocation.status === 'ACTIVE' ? (
                  <Pause className="w-4 h-4 shrink-0 text-amber-400" />
                ) : (
                  <Play className="w-4 h-4 shrink-0 text-emerald-400" />
                )}
                <span className="whitespace-nowrap">{allocation.status === 'ACTIVE' ? 'Pause Queue' : 'Resume Queue'}</span>
              </button>
            </div>

            <button
              onClick={handleServeNextWithSound}
              disabled={waitingCustomers.length === 0}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-black text-lg shadow-xl flex items-center justify-center gap-2 transition-all border border-cyan-400/30"
            >
              <Volume2 className="w-5 h-5 text-white animate-bounce" />
              <span>SERVE NEXT CUSTOMER →</span>
            </button>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-rows-2 gap-4">
            <div className="card bg-slate-800/90 border border-slate-700 flex items-center justify-between p-4 shadow-sm">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Waiting</div>
                <div className="text-3xl font-black text-cyan-400 mt-0.5">{waitingCustomers.length}</div>
              </div>
              <div className="w-12 h-12 bg-cyan-950/80 border border-cyan-800 rounded-xl flex items-center justify-center text-cyan-400">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="card bg-slate-800/90 border border-slate-700 flex items-center justify-between p-4 shadow-sm">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Served Today</div>
                <div className="text-3xl font-black text-emerald-400 mt-0.5">{servedCustomers.length}</div>
              </div>
              <div className="w-12 h-12 bg-emerald-950/80 border border-emerald-800 rounded-xl flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Customer Queue List Section */}
        <div className="card bg-slate-800/90 border border-slate-700 shadow-md">
          <div className="flex items-center justify-between border-b border-slate-700 pb-4 mb-4">
            <div>
              <h3 className="text-lg font-black text-white">Waiting Customers Line</h3>
              <p className="text-xs text-slate-400">Live queue sorted by arrival position</p>
            </div>
            <span className="text-xs font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 px-3 py-1 rounded-full">
              {waitingCustomers.length} Waiting
            </span>
          </div>

          {waitingCustomers.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 bg-slate-900 border border-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="w-8 h-8 text-slate-500" />
              </div>
              <h4 className="text-base font-bold text-white mb-1">Queue is Currently Empty</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                Share your QR Code or display it on a screen so customers can join the line.
              </p>
              <button
                onClick={() => setShowQRModal(true)}
                className="btn-primary text-xs py-2.5 px-4"
              >
                <QrCode className="w-4 h-4" />
                <span>Show Customer QR Code</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {waitingCustomers.map((cust, idx) => {
                const isNextInLine = idx === 0;
                return (
                  <div
                    key={cust.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isNextInLine
                        ? 'bg-slate-900/90 border-2 border-cyan-500 shadow-md'
                        : 'bg-slate-800/70 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {/* Left Customer Info */}
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-lg shadow-sm ${
                        isNextInLine ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white animate-pulse' : 'bg-slate-700 text-slate-200'
                      }`}>
                        #{cust.queue_position}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-white text-sm">
                            {cust.form_data?.customerName || cust.form_data?.name || `Customer #${cust.queue_position}`}
                          </h4>
                          {isNextInLine && (
                            <span className="text-[10px] font-black uppercase bg-cyan-500 text-white px-2 py-0.5 rounded-full tracking-wider animate-bounce">
                              NEXT IN LINE
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-0.5">
                          {cust.form_data?.customerPhone && (
                            <span>📞 {cust.form_data.customerPhone}</span>
                          )}
                          {cust.form_data?.customerMessage && (
                            <span className="bg-slate-900 text-cyan-300 px-2 py-0.5 rounded border border-slate-700 font-medium">
                              📝 {cust.form_data.customerMessage}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          playChimeSound();
                          onServeSpecific(cust.id);
                        }}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Serve Now</span>
                      </button>

                      <button
                        onClick={() => onRemoveCustomer(cust.id)}
                        className="flex items-center justify-center p-2 text-slate-400 hover:text-red-400 hover:bg-red-950/60 rounded-xl transition-all"
                        title="Remove from queue"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* QR Display Modal */}
      {showQRModal && (
        <div className="modal-overlay-backdrop">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl animate-pop border border-slate-700 text-white">
            <h3 className="font-black text-xl text-white mb-1">{allocation.name}</h3>
            <p className="text-xs text-slate-400 mb-4">Display or print this QR Code for customers to scan and join your line.</p>

            <div className="bg-white p-6 rounded-2xl inline-block border-2 border-slate-600 mb-4 shadow-inner">
              <img src={qrCodeImageUrl} alt="Vendor QR Code" className="w-56 h-56 mx-auto rounded-lg shadow-md" />
              <div className="mt-3 text-[11px] font-bold text-slate-900 uppercase tracking-widest">
                Scan to Join Queue
              </div>
            </div>

            <div className="flex gap-2 mb-3">
              <button
                onClick={handleCopyLink}
                className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 py-2.5 rounded-xl font-bold text-xs border border-slate-600 transition-all"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Copied Link!' : 'Copy Join Link'}</span>
              </button>
            </div>

            <button
              onClick={() => setShowQRModal(false)}
              className="btn-primary w-full text-xs py-2.5"
            >
              Close Window
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
