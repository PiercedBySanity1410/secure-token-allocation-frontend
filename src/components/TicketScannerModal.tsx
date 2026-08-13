import React, { useEffect, useRef, useState } from 'react';
import { getRequestStatus } from '../api/client';
import { RequestItem } from '../types';
import { verifyQRSignature } from '../utils/qrCrypto';
import jsQR from 'jsqr';
import { QrCode, Search, CheckCircle2, XCircle, ShieldCheck, X, Sparkles, Camera, CameraOff, AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const TicketScannerModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [scanInput, setScanInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RequestItem | null>(null);
  const [cryptoVerified, setCryptoVerified] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);

  // Camera Scanning State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      // Try rear camera first ('environment'), fallback to user camera
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: 'environment' } },
        });
      } catch (err) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsCameraActive(true);
        requestAnimationFrame(tickScan);
      }
    } catch (err: any) {
      console.log('Camera permission error:', err);
      setCameraError('Camera access denied or unavailable. You can enter or paste the ticket code manually below.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const tickScan = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          stopCamera();
          handleVerify(code.data);
          return;
        }
      }
    }
    animationFrameRef.current = requestAnimationFrame(tickScan);
  };

  const handleVerify = async (queryRaw?: string) => {
    const raw = queryRaw || scanInput;
    if (!raw.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    setResult(null);
    setCryptoVerified(null);
    setScanned(true);

    let searchId = raw.trim();
    let sig: string | null = null;

    // Extract params if raw input is a URL
    if (searchId.includes('?')) {
      try {
        const urlObj = new URL(searchId);
        searchId = urlObj.searchParams.get('id') || searchId;
        sig = urlObj.searchParams.get('sig');
      } catch (e) {
        if (searchId.includes('id=')) searchId = searchId.split('id=')[1]?.split('&')[0] || searchId;
        if (searchId.includes('sig=')) sig = searchId.split('sig=')[1]?.split('&')[0] || null;
      }
    }

    try {
      // Bug #3 fix: signature is REQUIRED — plain ID lookups without sig are rejected
      if (!sig) {
        setErrorMsg('No cryptographic signature in this QR code. Only officially issued tickets are accepted.');
        setCryptoVerified(false);
        setLoading(false);
        return;
      }

      const isSigValid = await verifyQRSignature(searchId, sig);
      setCryptoVerified(isSigValid);

      if (!isSigValid) {
        setErrorMsg('FORGED QR CODE DETECTED: Cryptographic SHA-256 HMAC signature validation failed.');
        setLoading(false);
        return;
      }

      // 2. Fetch ticket status from database with HMAC signature authorization
      const res = await getRequestStatus(searchId, sig || undefined);
      if (res && res.id) {
        setResult(res);
      } else {
        setErrorMsg('Ticket ID not found in master database or ticket has been purged.');
      }
    } catch (e) {
      setErrorMsg('Invalid ticket format or network connection issue.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay-backdrop">
      <div className="bg-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-pop border border-slate-700 relative overflow-hidden my-auto text-white">
        {/* Close Button */}
        <button
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-all z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-2 text-white shadow-md">
            <QrCode className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">Cryptographic QR Scanner</h2>
          <p className="text-xs text-slate-400 mt-0.5">Scan rear camera QR code or input ticket code for instant cryptographic verification.</p>
        </div>

        {/* Camera Live Scanner Window */}
        <div className="mb-5">
          {isCameraActive ? (
            <div className="relative bg-black rounded-2xl overflow-hidden aspect-square border-2 border-cyan-500 shadow-inner flex items-center justify-center">
              <video ref={videoRef} className="w-full h-full object-cover" />
              {/* Scanning Target Box */}
              <div className="absolute inset-8 border-2 border-cyan-400/80 rounded-xl pointer-events-none flex items-center justify-center">
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse shadow-glow" />
              </div>
              <button
                onClick={stopCamera}
                className="absolute bottom-3 bg-red-600/90 hover:bg-red-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 backdrop-blur-sm"
              >
                <CameraOff className="w-3.5 h-3.5" />
                <span>Stop Camera</span>
              </button>
            </div>
          ) : (
            <div className="bg-slate-900/80 border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center space-y-3">
              <button
                onClick={startCamera}
                className="btn-primary py-3 px-5 text-xs inline-flex items-center gap-2 shadow-md"
              >
                <Camera className="w-4 h-4" />
                <span>Open Rear Camera Scanner</span>
              </button>
              <p className="text-[11px] text-slate-400">Prompts for rear camera permission (`facingMode: environment`)</p>
            </div>
          )}

          {cameraError && (
            <div className="bg-amber-950/80 border border-amber-800 text-amber-300 p-3 rounded-xl text-xs mt-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span>{cameraError}</span>
            </div>
          )}
        </div>

        {/* Manual Input Form */}
        <div className="space-y-4 mb-5">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Manual Ticket Code / Signed URL</label>
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Paste Ticket ID or URL (e.g. req-7a723453&sig=...)"
                className="input py-2.5 pl-3 pr-24 text-xs font-mono"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              />
              <button
                onClick={() => handleVerify()}
                disabled={loading}
                className="absolute right-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-xs"
              >
                {loading ? (
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>Verify</span>
              </button>
            </div>
          </div>
        </div>

        {/* Verification Result Card */}
        {scanned && (
          <div className="animate-slide-up">
            {loading ? (
              <div className="py-6 text-center space-y-2">
                <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-300">Verifying HMAC-SHA256 Cryptographic Signature...</p>
              </div>
            ) : result ? (
              <div className="bg-emerald-950/80 border-2 border-emerald-800 rounded-2xl p-4 text-emerald-200 space-y-3">
                <div className="flex items-center gap-2 text-emerald-300 font-black text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>CRYPTOGRAPHICALLY AUTHENTIC 🟢</span>
                </div>

                <div className="bg-slate-900 p-3.5 rounded-xl border border-emerald-800/80 text-xs space-y-2">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                    <span className="text-slate-400 font-medium">Token Status</span>
                    <span className="font-extrabold text-emerald-400 uppercase">
                      {result.status === 'ACCEPTED'
                        ? `TOKEN #${result.assigned_token || 1} ISSUED`
                        : result.status === 'SERVED'
                        ? 'SERVED & COMPLETED'
                        : 'REQUEST SUBMITTED'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-800">
                    <span className="text-slate-400 font-medium">Session</span>
                    <span className="font-bold text-white text-right">{result.allocation_name}</span>
                  </div>

                  {result.form_data && (
                    <div className="flex justify-between items-center py-1 border-b border-slate-800">
                      <span className="text-slate-400 font-medium">Applicant</span>
                      <span className="font-bold text-white">
                        {result.form_data.name || result.form_data.customerName || 'Verified Applicant'}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-400 font-medium">Ticket ID</span>
                    <span className="font-mono text-slate-300 text-[11px]">{result.id}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 font-medium bg-emerald-900/60 p-2 rounded-lg border border-emerald-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Cryptographic SHA-256 HMAC signature verified.</span>
                </div>
              </div>
            ) : (
              <div className="bg-red-950/80 border-2 border-red-800 rounded-2xl p-4 text-red-200 space-y-2 text-center">
                <div className="w-10 h-10 bg-red-900 rounded-full flex items-center justify-center mx-auto text-red-400">
                  <XCircle className="w-6 h-6" />
                </div>
                <h4 className="font-black text-sm text-red-300">INVALID TICKET / TAMPERED QR 🔴</h4>
                <p className="text-xs text-red-300">{errorMsg}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer Close */}
        <div className="mt-5">
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="btn-primary w-full text-xs py-2.5"
          >
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  );
};
