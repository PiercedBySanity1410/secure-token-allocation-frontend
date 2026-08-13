import React from 'react';
import { Ticket, Shield, Clock, Wifi, WifiOff } from 'lucide-react';
import { CachedToken } from '../types';

interface NavbarProps {
  viewMode: 'public' | 'admin';
  currentStep: 'allocations' | 'form' | 'status' | 'verify' | 'session_not_found';
  cachedToken: CachedToken | null;
  currentTime: string;
  isOnline?: boolean;
  onNavigateHome: () => void;
  onViewMyToken: () => void;
  onToggleViewMode: () => void;
  onOpenScanner?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  viewMode,
  currentStep,
  cachedToken,
  currentTime,
  isOnline = true,
  onNavigateHome,
  onViewMyToken,
  onToggleViewMode,
}) => {
  return (
    <header className="bg-[#161616]/95 backdrop-blur-md border-b border-[#262626] sticky top-0 z-50 shadow-md">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={onNavigateHome}>
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md">
            <Ticket className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-lg font-black text-white leading-none tracking-tight">
              Token<span className="text-indigo-400">Flow</span>
            </div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
              Queue & Token Engine
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Online / Offline status indicator */}
          <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
            isOnline ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' : 'bg-amber-950/80 text-amber-300 border border-amber-800'
          }`}>
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>Live Sync</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>Offline Mode</span>
              </>
            )}
          </div>

          {/* Live Clock */}
          <div className="hidden md:flex items-center gap-1.5 bg-[#222222] border border-[#333333] px-3 py-1 rounded-full text-xs font-mono text-gray-300">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>{currentTime}</span>
          </div>

          {/* Cached Token Button */}
          {cachedToken && currentStep !== 'status' && viewMode === 'public' && (
            <button
              onClick={onViewMyToken}
              className="flex items-center gap-1 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 px-3 py-1.5 rounded-xl text-xs font-extrabold shadow-2xs transition-all animate-pulse"
            >
              <Ticket className="w-3.5 h-3.5 text-indigo-400" />
              <span>My Ticket #{cachedToken.tokenNumber || 'Active'}</span>
            </button>
          )}

          {/* Admin / Public Switcher */}
          <button
            onClick={onToggleViewMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all border shadow-2xs ${
              viewMode === 'admin'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                : 'bg-[#222222] hover:bg-[#2a2a2a] text-indigo-400 border-[#333333]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{viewMode === 'admin' ? 'Exit Admin' : 'Admin Portal'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
