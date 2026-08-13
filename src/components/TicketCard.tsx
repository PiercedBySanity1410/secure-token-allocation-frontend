import React, { useState } from 'react';
import { RequestItem, Allocation, CachedToken } from '../types';
import { Bell, BellOff, QrCode, LogOut, CheckCircle2, Clock, Users, Sparkles, MapPin, AlertCircle, HardDrive, Download, Share2, Loader2, XCircle, RotateCcw, ShieldCheck } from 'lucide-react';
import { generateQRSignature } from '../utils/qrCrypto';
import { exportTicketAsImage } from '../utils/ticketExport';

interface TicketCardProps {
  request: RequestItem;
  allocation?: Allocation | null;
  cachedToken?: CachedToken | null;
  onCancelRequest?: () => void;
  onBackHome?: () => void;
  onReapply?: () => void;
}

export const TicketCard: React.FC<TicketCardProps> = ({
  request,
  allocation,
  cachedToken,
  onCancelRequest,
  onBackHome,
  onReapply,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const status = request.status;
  const isServed = status === 'SERVED';
  const isAccepted = status === 'ACCEPTED';
  const isRejected = status === 'REJECTED' || status === 'CANCELLED';
  const tokenNumber = request.assigned_token || cachedToken?.tokenNumber;
  const position = request.queue_position || 1;
  const peopleAhead = Math.max(0, position - 1);
  const estimatedWait = request.estimated_wait || peopleAhead * 10 || 10;

  // Generate Cryptographically Signed QR Code URL for ticket
  const [signedQrUrl, setSignedQrUrl] = useState('');

  React.useEffect(() => {
    generateQRSignature(request.id).then((sig) => {
      const ticketUrl = `${window.location.origin}/verify?id=${request.id}&sig=${sig}`;
      // 320×320 — drawn at 320px physical (160px × 2× DPR) in the exported image
      setSignedQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=6&ecc=H&data=${encodeURIComponent(ticketUrl)}`);
    });
  }, [request.id]);

  const buildExportOptions = () => ({
    requestId: request.id,
    allocationName: request.allocation_name || allocation?.name || 'Queue Token',
    tokenNumber: tokenNumber,
    status: request.status,
    signedQrUrl,
    formData: request.form_data as Record<string, unknown> | undefined,
  });

  const handleExportImage = async () => {
    if (downloading || sharing || !signedQrUrl) return;
    setDownloading(true);
    try {
      const blob = await exportTicketAsImage(buildExportOptions());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket-${request.id.slice(0, 12)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      console.error('Export failed', e);
    } finally {
      setDownloading(false);
    }
  };

  const handleShareImage = async () => {
    if (downloading || sharing || !signedQrUrl) return;
    setSharing(true);
    try {
      const blob = await exportTicketAsImage(buildExportOptions());
      const file = new File([blob], `ticket-${request.id.slice(0, 12)}.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'My Queue Ticket',
          text: `Queue ticket for ${request.allocation_name || 'Queue Token'} — ${request.date}`,
          files: [file],
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ticket-${request.id.slice(0, 12)}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') console.error('Share failed', e);
    } finally {
      setSharing(false);
    }
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    if (!soundEnabled) {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } catch (e) {
        console.log('Audio error:', e);
      }
    }
  };

  return (
    <div className="max-w-md mx-auto w-full animate-slide-up">
      {/* Top Banner */}
      <div className="flex items-center justify-between bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-2.5 mb-4 text-xs text-slate-200 font-medium shadow-2xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span>Real-time Live Token Status</span>
        </div>
        <button
          onClick={toggleSound}
          className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-cyan-300 px-3 py-1 rounded-lg text-xs font-semibold border border-slate-600 transition-all shadow-2xs"
        >
          {soundEnabled ? (
            <>
              <Bell className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sound ON</span>
            </>
          ) : (
            <>
              <BellOff className="w-3.5 h-3.5 text-slate-400" />
              <span>Sound OFF</span>
            </>
          )}
        </button>
      </div>

      {/* IndexedDB Offline Cache Indicator */}
      {cachedToken && (
        <div className="flex items-center gap-2 bg-indigo-950/60 text-indigo-300 rounded-xl px-3.5 py-2 mb-4 text-xs font-medium">
          <HardDrive className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          <span>Ticket saved to offline storage (IndexedDB) for offline access.</span>
        </div>
      )}

      {/* Main Perforated Ticket Card */}
      <div className="ticket-card shadow-2xl bg-[#1a1a1a]">
        {/* Ticket Header (Dark Black) */}
        <div className="bg-[#161616] text-white p-6 text-center relative overflow-hidden">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <span className="text-white text-2xl font-black">T</span>
          </div>

          <h2 className="text-2xl font-black tracking-tight text-white mb-1 drop-shadow-sm">
            {request.allocation_name || allocation?.name || 'Queue Token'}
          </h2>
          <p className="text-xs font-medium text-gray-400 flex items-center justify-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            <span>Official Queue Ticket</span>
          </p>
        </div>

        {/* Perforated Side Notches Section */}
        <div className="ticket-notch-container p-6 text-center bg-[#1a1a1a]">
          {/* 3-State Display Logic */}
          {isServed ? (
            /* State 3: SERVED / COMPLETED */
            <div className="my-4 animate-pop">
              <div className="w-24 h-24 bg-gradient-to-br from-[#2a2a2a] to-[#161616] rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-2xl">
                <CheckCircle2 className="w-12 h-12 text-white" />
              </div>
              <span className="inline-block bg-[#222222] text-gray-200 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider mb-2">
                Token Served & Completed
              </span>
              <h3 className="text-2xl font-black text-white mb-1">Service Complete!</h3>
              <p className="text-xs text-gray-400 max-w-xs mx-auto">
                Your turn has been completed. Thank you for using TokenFlow!
              </p>
            </div>
          ) : isAccepted ? (
            /* State 2: ACCEPTED / TOKEN ISSUED */
            <div className="my-4 animate-pop">
              <div className="w-32 h-32 bg-gradient-to-br from-[#2a2a2a] to-[#161616] rounded-full flex items-center justify-center text-center mx-auto mb-4 text-white shadow-2xl p-2 overflow-hidden">
                <span className={`${(tokenNumber || '1').toString().length >= 3 ? 'text-3xl' : 'text-4xl'} font-black font-mono leading-none tracking-tight text-white flex items-center justify-center text-center`}>
                  #{tokenNumber || '1'}
                </span>
              </div>
              <span className="inline-block bg-[#222222] text-gray-200 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider mb-2">
                Token Issued
              </span>
              <h3 className="text-2xl font-black text-white mb-1">Token #{tokenNumber} Ready</h3>
              <p className="text-xs text-gray-400 max-w-xs mx-auto">
                Your token is issued and active! Please proceed to the verification counter when called.
              </p>
            </div>
          ) : isRejected ? (
            /* REJECTED / CANCELLED */
            <div className="my-4 animate-pop space-y-3">
              <div className="w-20 h-20 bg-rose-950/80 border-2 border-rose-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg">
                <XCircle className="w-10 h-10 text-rose-400" />
              </div>

              <span className="inline-block bg-rose-950 text-rose-300 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider border border-rose-700 shadow-sm">
                ❌ REQUEST {status === 'REJECTED' ? 'REJECTED BY ADMIN' : 'CANCELLED'}
              </span>

              <div className="bg-rose-950/40 border border-rose-800/80 p-3.5 rounded-2xl text-xs text-rose-200 font-medium text-center space-y-1">
                <p className="font-extrabold text-white text-sm">
                  {status === 'REJECTED' ? 'Request Declined by Administration' : 'Request Cancelled'}
                </p>
                <p className="text-[11px] text-rose-300">
                  {status === 'REJECTED'
                    ? 'Your token request was declined. You may click below to fill out the application form again.'
                    : 'This token request was cancelled.'}
                </p>
              </div>

              {onReapply && (
                <button
                  type="button"
                  onClick={onReapply}
                  className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-black text-xs rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 border border-indigo-400/40 animate-pulse mt-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Fill Form Again / Re-Apply for Token</span>
                </button>
              )}
            </div>
          ) : (
            /* State 1: PENDING */
            <div className="my-4 space-y-4">
              <div className="w-24 h-24 bg-gradient-to-br from-[#2a2a2a] to-[#161616] rounded-full flex items-center justify-center mx-auto text-white shadow-lg">
                <Clock className="w-12 h-12 text-white" />
              </div>

              <span className="inline-block bg-[#222222] text-gray-200 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider">
                Request Submitted
              </span>

              <div>
                <h3 className="text-xl font-black text-white mb-1">Request Pending Verification</h3>
                <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
                  Your request is logged in the system. An admin will review and issue your official token number shortly.
                </p>
              </div>

              <div className="bg-[#141414] p-3 rounded-xl text-xs text-slate-300 font-medium">
                🔒 <strong className="text-cyan-300">Privacy & Security Note:</strong> Token numbers are assigned only after admin acceptance to prevent queue manipulation.
              </div>
            </div>
          )}

          {/* Live Queue Status Metrics */}
          {!isServed && !isRejected && (
            <div className="grid grid-cols-3 gap-2 my-4 bg-[#141414] rounded-2xl p-3 text-center">
              {/* Metric 1: Persons Ahead */}
              <div className="bg-[#222222] p-2 rounded-xl shadow-2xs">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-0.5">Ahead of You</span>
                <span className="text-base font-black text-cyan-400 flex items-center justify-center gap-1">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  {request.people_ahead !== undefined ? request.people_ahead : Math.max(0, position - 1)}
                </span>
                <span className="text-[9px] font-bold text-slate-400">Unserved Tokens</span>
              </div>

              {/* Metric 2: Total Persons Served */}
              <div className="bg-[#222222] p-2 rounded-xl shadow-2xs">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-0.5">Total Served</span>
                <span className="text-base font-black text-emerald-400 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  {request.served_count || 0}
                </span>
                <span className="text-[9px] font-bold text-slate-400">Persons Completed</span>
              </div>

              {/* Metric 3: Expected Wait Time */}
              <div className="bg-[#222222] p-2 rounded-xl shadow-2xs">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-0.5">Est. Service</span>
                <span className="text-base font-black text-amber-400 flex items-center justify-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  {(request.people_ahead ?? Math.max(0, position - 1)) === 0 ? 'Now!' : `~${request.estimated_wait || ((request.people_ahead ?? Math.max(0, position - 1)) * 10)}m`}
                </span>
                <span className="text-[9px] font-bold text-slate-400">Expected Time</span>
              </div>
            </div>
          )}

          {/* Perforation Line */}
          <div className="ticket-perforation" />

          {/* Submitted Form Data */}
          <div className="py-3 text-left space-y-2 text-xs">
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400 font-medium">Date</span>
              <span className="font-bold text-white">{request.date}</span>
            </div>

            {request.form_data && request.form_data._protected ? (
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60 pb-2 mb-1">
                <span className="text-slate-400 font-medium">Form Data</span>
                <span className="font-bold text-amber-400 text-xs text-right inline-flex items-center justify-end gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Protected (AES-256 Encrypted)</span>
                </span>
              </div>
            ) : (
              request.form_data && Object.entries(request.form_data).map(([key, val]) => (
                <div key={key} className="flex justify-between items-center py-1">
                  <span className="text-slate-400 font-medium capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="font-bold text-white text-right">{String(val)}</span>
                </div>
              ))
            )}

            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400 font-medium">Request ID</span>
              <span className="font-mono text-slate-400 text-[10px]">{request.id.slice(0, 14)}</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-3 space-y-2">
            {/* Row 1: QR + Cancel/Back */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowQRModal(true)}
                className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-cyan-300 py-2.5 px-3 rounded-xl font-bold text-xs transition-all border border-slate-600"
              >
                <QrCode className="w-4 h-4 text-cyan-400" />
                <span>Show QR Code</span>
              </button>

              {!isAccepted && !isRejected && onCancelRequest ? (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="flex items-center justify-center gap-2 bg-red-950/60 hover:bg-red-900/80 text-red-300 py-2.5 px-3 rounded-xl font-bold text-xs transition-all border border-red-800/80"
                >
                  <LogOut className="w-4 h-4 text-red-400" />
                  <span>Cancel Token</span>
                </button>
              ) : (
                <button
                  onClick={onBackHome}
                  className="btn-primary text-xs py-2.5"
                >
                  <span>Back to Home</span>
                </button>
              )}
            </div>

            {/* Row 2: Download + Share */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleExportImage}
                disabled={downloading || sharing || !signedQrUrl}
                className="flex items-center justify-center gap-2 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 py-2.5 px-3 rounded-xl font-bold text-xs transition-all border border-cyan-800/80 disabled:opacity-50"
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>{downloading ? 'Saving…' : 'Save Ticket'}</span>
              </button>

              <button
                onClick={handleShareImage}
                disabled={downloading || sharing || !signedQrUrl}
                className="flex items-center justify-center gap-2 bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 py-2.5 px-3 rounded-xl font-bold text-xs transition-all border border-indigo-800/80 disabled:opacity-50"
              >
                {sharing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
                <span>{sharing ? 'Sharing…' : 'Share Ticket'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="modal-overlay-backdrop">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-xs w-full text-center shadow-2xl animate-pop border border-slate-700 text-white">
            <h3 className="font-bold text-lg text-white mb-1">Ticket QR Code</h3>
            <p className="text-xs text-slate-400 mb-4">Scan with phone camera to open or verify this token.</p>

            <div className="bg-white p-4 rounded-xl inline-block border border-slate-600 mb-4">
              <img src={signedQrUrl} alt="Signed Ticket QR Code" className="w-48 h-48 mx-auto" />
            </div>

            <button
              onClick={() => setShowQRModal(false)}
              className="btn-primary w-full text-xs py-2.5"
            >
              Close QR Code
            </button>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="modal-overlay-backdrop">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-xs w-full text-center shadow-2xl animate-pop border border-red-800 text-white">
            <div className="w-12 h-12 bg-red-950 rounded-full flex items-center justify-center mx-auto mb-3 border border-red-800">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="font-bold text-lg text-white mb-1">Cancel Token Request?</h3>
            <p className="text-xs text-slate-400 mb-6">
              You will forfeit your position #{position} in line.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-bold text-xs"
              >
                Keep My Spot
              </button>
              <button
                onClick={() => {
                  setShowCancelConfirm(false);
                  if (onCancelRequest) onCancelRequest();
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs shadow-md"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
