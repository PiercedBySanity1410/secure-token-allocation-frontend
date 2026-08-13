import React from 'react';
import { Allocation, CachedToken } from '../../types';
import { ShieldCheck, Ticket, QrCode, Lock } from 'lucide-react';

interface TodayAllocationsProps {
  allocations: Allocation[];
  loading: boolean;
  onSelectAllocation: (alloc: Allocation) => void;
  onViewMyToken: () => void;
  hasCachedToken: boolean;
  cachedToken?: CachedToken | null;
}

export const TodayAllocations: React.FC<TodayAllocationsProps> = ({
  onViewMyToken,
  hasCachedToken,
  cachedToken,
}) => {
  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-slide-up py-6">
      {/* Hero Banner */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-cyan-950/80 text-cyan-300 rounded-full text-xs font-black tracking-wide border border-cyan-800/80 shadow-2xs">
          <Lock className="w-3.5 h-3.5 text-cyan-400" />
          <span>QR-Gated Secure Access Portal</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
          Token<span className="text-cyan-400">Flow</span><br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-400 to-indigo-400">
            Queue & Token Portal
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-300 font-medium max-w-md mx-auto leading-relaxed">
          Queue forms are protected for privacy and fairness. Please scan the official QR code displayed at your designated counter to apply for a token.
        </p>

        {hasCachedToken && (
          <div className="pt-2">
            <button
              onClick={onViewMyToken}
              className={`inline-flex items-center gap-2 font-extrabold px-6 py-3.5 rounded-2xl shadow-xl transition-all text-sm border ${
                cachedToken?.status === 'REJECTED' || cachedToken?.status === 'CANCELLED'
                  ? 'bg-rose-950/90 text-rose-200 border-rose-800 hover:bg-rose-900/90'
                  : 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white border-cyan-400/30 animate-pulse'
              }`}
            >
              <Ticket className="w-5 h-5" />
              <span>
                {cachedToken?.status === 'REJECTED' || cachedToken?.status === 'CANCELLED'
                  ? '❌ Previous Ticket Rejected → View Details & Re-apply'
                  : 'You Have an Active Ticket → View Live Status'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* QR Access Explanation Card */}
      <div className="card border-2 border-slate-700 bg-slate-800/90 p-8 text-center shadow-2xl space-y-4">
        <div className="w-20 h-20 bg-gradient-to-br from-cyan-950 to-indigo-950 rounded-3xl flex items-center justify-center mx-auto border-2 border-cyan-700/60 shadow-inner mb-2">
          <QrCode className="w-10 h-10 text-cyan-400" />
        </div>

        <h3 className="text-xl font-black text-white">QR-Gated Queue Access</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
          Queue sessions are dynamic and location-authenticated. Scan the QR code presented at the physical counter desk using your phone to unlock your application form.
        </p>
      </div>

      {/* Security Info */}
      <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-4 text-xs text-slate-300 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
        <p className="text-slate-300 leading-relaxed">
          <strong className="text-cyan-300">Privacy Protocol:</strong> All tokens and QR codes are cryptographically signed using SHA-256 HMAC and verified against the master ledger. Unscanned queues are hidden to prevent remote queue hoarding.
        </p>
      </div>
    </div>
  );
};
