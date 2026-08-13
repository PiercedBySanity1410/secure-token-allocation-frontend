import React, { useState } from 'react';
import { ArrowRight, ShieldCheck, Zap, Smartphone, RefreshCw, Lock, Sparkles, HelpCircle, Check, MapPin } from 'lucide-react';

interface TappyLineLandingProps {
  onCreateQueue: (data: { businessName: string; email?: string; phone?: string }) => void;
  onOpenAdmin: () => void;
}

export const TappyLineLanding: React.FC<TappyLineLandingProps> = ({ onCreateQueue, onOpenAdmin }) => {
  const [businessName, setBusinessName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) return;
    onCreateQueue({
      businessName: businessName.trim(),
      email: contactEmail.trim() || undefined,
      phone: contactPhone.trim() || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-[#111111] font-sans text-gray-100">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-xl font-black">T</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Token<span className="text-cyan-400">Flow</span></h1>
          </div>

          <div className="flex items-center gap-4">
            <a href="#how-it-works" className="text-slate-300 hover:text-cyan-400 font-semibold text-sm hidden md:inline-block transition-colors">
              How it works
            </a>
            <a href="#features" className="text-slate-300 hover:text-cyan-400 font-semibold text-sm hidden md:inline-block transition-colors">
              Features
            </a>
            <button
              onClick={onOpenAdmin}
              className="text-xs sm:text-sm bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold px-4 py-2 rounded-xl border border-slate-700 shadow-sm transition-all"
            >
              Vendor Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero */}
      <main className="container mx-auto px-4 py-10 md:py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header titles */}
          <div className="text-center mb-10">
            <div className="inline-block mb-4 px-4 py-2 bg-cyan-950/80 text-cyan-300 rounded-full text-xs sm:text-sm font-black tracking-wide border border-cyan-800">
              No apps. No accounts. Just tap and go! 🚀
            </div>
            <h2 className="text-4xl sm:text-6xl font-black text-white mb-6 leading-tight tracking-tight">
              Queue Management<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-400 to-indigo-400">
                Made Simple & Secure
              </span>
            </h2>
            <p className="text-lg sm:text-2xl text-slate-300 mb-3 max-w-2xl mx-auto font-medium">
              If it takes more than 30 seconds, it's too complicated.
            </p>
            <p className="text-sm sm:text-lg text-slate-400 max-w-2xl mx-auto">
              Create queues instantly. Customers scan and join. Everyone gets real-time updates.
            </p>
          </div>

          {/* Form Card */}
          <div id="create-queue" className="card max-w-xl mx-auto border-2 border-slate-700 bg-slate-800/90 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h3 className="text-2xl font-black text-white mb-1">Create Your Queue</h3>
                <p className="text-slate-400 text-xs">Get started in seconds. No signup required.</p>
              </div>

              <div>
                <label htmlFor="businessName" className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Business / Venue Name <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  id="businessName"
                  className="input"
                  placeholder="e.g., Mario's Gourmet Pizza"
                  required
                  maxLength={50}
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>

              {/* Security info box */}
              <div className="bg-slate-900/90 border-2 border-slate-700 rounded-xl p-3.5">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Offline-First & Cryptographically Signed</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Every queue token generated is cryptographically signed using SHA-256 HMAC and backed up to offline IndexedDB storage.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="btn-primary w-full py-4 text-base font-extrabold shadow-xl"
              >
                <span>Launch My Queue Now</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </div>

          {/* Key Selling Points */}
          <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 text-center border border-slate-700 shadow-sm">
              <div className="w-14 h-14 bg-cyan-950/80 border border-cyan-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Zap className="w-7 h-7 text-cyan-400" />
              </div>
              <h4 className="font-black text-white mb-1 text-lg">Ultra Fast Setup</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Start taking customers in under 30 seconds. No passwords or app downloads required.
              </p>
            </div>

            <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 text-center border border-slate-700 shadow-sm">
              <div className="w-14 h-14 bg-cyan-950/80 border border-cyan-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Smartphone className="w-7 h-7 text-cyan-400" />
              </div>
              <h4 className="font-black text-white mb-1 text-lg">Scan & Go</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Customers scan a QR code at your counter to get their digital token number instantly.
              </p>
            </div>

            <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 text-center border border-slate-700 shadow-sm">
              <div className="w-14 h-14 bg-cyan-950/80 border border-cyan-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <RefreshCw className="w-7 h-7 text-cyan-400" />
              </div>
              <h4 className="font-black text-white mb-1 text-lg">Real-Time Sync</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Live position updates and estimated wait times update automatically via Server-Sent Events.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* How it Works Section */}
      <section id="how-it-works" className="bg-slate-950 py-16 md:py-24 border-t border-slate-800">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-12">
            <span className="text-xs font-black text-cyan-400 uppercase tracking-widest block mb-2">Simple 3-Step Flow</span>
            <h3 className="text-3xl sm:text-4xl font-black text-white">How TokenFlow Works</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-full flex items-center justify-center mb-5 mx-auto shadow-lg">
                <span className="text-white font-black text-xl">1</span>
              </div>
              <h4 className="font-black text-white text-lg mb-2">1. Display Counter QR</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Print or show the generated session QR code at your counter desk.
              </p>
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-full flex items-center justify-center mb-5 mx-auto shadow-lg">
                <span className="text-white font-black text-xl">2</span>
              </div>
              <h4 className="font-black text-white text-lg mb-2">2. Applicants Scan & Join</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Applicants scan with phone camera to request a token number in seconds.
              </p>
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-full flex items-center justify-center mb-5 mx-auto shadow-lg">
                <span className="text-white font-black text-xl">3</span>
              </div>
              <h4 className="font-black text-white text-lg mb-2">3. Serve & Complete</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Accept applicants from the dashboard and call token numbers seamlessly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 py-8 text-center text-xs text-slate-500">
        <p className="mb-2">© 2026 TokenFlow Engine. Cryptographically secured and privacy protected.</p>
        <div className="text-xs text-slate-400 flex flex-wrap items-center justify-center gap-1.5 font-medium">
          <span>Made with <span className="text-red-500">♥</span> by <strong className="text-slate-300 font-semibold">Gurjot Singh</strong></span>
          <span>&bull;</span>
          <a
            href="https://www.gurjot.codes"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
          >
            www.gurjot.codes
          </a>
        </div>
      </footer>
    </div>
  );
};
