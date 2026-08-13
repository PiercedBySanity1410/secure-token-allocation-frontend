import React, { useEffect, useState } from 'react';
import { getRequestStatus } from '../../api/client';
import { RequestItem } from '../../types';
import { verifyQRSignature } from '../../utils/qrCrypto';
import { CheckCircle2, XCircle, ShieldCheck, Ticket, ArrowLeft, AlertTriangle, Building2, User, Calendar } from 'lucide-react';

interface Props {
  onBackToHome: () => void;
}

export const VerifyTokenPage: React.FC<Props> = ({ onBackToHome }) => {
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<RequestItem | null>(null);
  const [, setIsSigValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchParams = new URLSearchParams(window.location.search);
  const ticketId = searchParams.get('id');
  const signature = searchParams.get('sig');

  useEffect(() => {
    const verifyTicket = async () => {
      if (!ticketId) {
        setError('No ticket ID provided in QR scan URL.');
        setLoading(false);
        return;
      }

      try {
        if (!signature) {
          setIsSigValid(false);
          setError('No cryptographic signature found. This QR code is not officially issued by the system.');
          setLoading(false);
          return;
        }

        const sigValid = await verifyQRSignature(ticketId, signature);
        setIsSigValid(sigValid);

        if (!sigValid) {
          setError('CRYPTOGRAPHIC VALIDATION FAILED: This QR code has been tampered with or forged.');
          setLoading(false);
          return;
        }

        const res = await getRequestStatus(ticketId, signature || undefined);
        if (res && res.id) {
          setTicket(res);
        } else {
          setError('Ticket not found in the official queue database or has expired.');
        }
      } catch {
        setError('Unable to reach verification server. Please check your network connection.');
      } finally {
        setLoading(false);
      }
    };

    verifyTicket();
  }, [ticketId, signature]);

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-slide-up pb-12">
      {/* Back Button */}
      <button
        onClick={onBackToHome}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-cyan-400 bg-slate-800 hover:bg-slate-700 px-3.5 py-2 rounded-xl border border-slate-700 transition-all shadow-2xs"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Portal</span>
      </button>

      {/* Main Verification Card */}
      <div className="card border-2 border-slate-700 bg-slate-800/90 shadow-2xl p-6 sm:p-8 relative overflow-hidden text-slate-100">
        {/* Top Decorative Gradient */}
        <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-cyan-500 via-teal-500 to-indigo-500" />

        {loading ? (
          <div className="py-16 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <div>
              <h3 className="text-lg font-black text-white">Verifying Token Authenticity...</h3>
              <p className="text-xs text-slate-400 mt-1">Checking SHA-256 HMAC cryptographic signature against master ledger.</p>
            </div>
          </div>
        ) : error || !ticket ? (
          /* INVALID / FORGED TICKET ALERT */
          <div className="py-8 text-center space-y-4">
            <div className="w-20 h-20 bg-red-950/80 rounded-full flex items-center justify-center mx-auto text-red-400 border-4 border-red-800">
              <XCircle className="w-10 h-10" />
            </div>
            <div>
              <span className="inline-block bg-red-950 text-red-300 text-xs font-black px-4 py-1 rounded-full uppercase tracking-wider mb-2 border border-red-800">
                AUTHENTICITY VERIFICATION FAILED 🔴
              </span>
              <h2 className="text-2xl font-black text-white">Invalid or Forged QR Code</h2>
              <p className="text-xs text-red-300 max-w-md mx-auto mt-2 leading-relaxed font-medium">
                {error}
              </p>
            </div>

            <div className="bg-red-950/50 border border-red-800/80 rounded-2xl p-4 text-xs text-red-200 text-left space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-red-400">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>Security Audit Notice</span>
              </div>
              <p className="text-red-300 text-[11px]">
                Official tokens are cryptographically signed. Scanning altered URLs or unverified codes will result in automatic rejection at counter verification.
              </p>
            </div>

            <button onClick={onBackToHome} className="btn-primary text-xs py-3 px-6 mt-4">
              Return to Home Page
            </button>
          </div>
        ) : (
          /* AUTHENTIC TICKET CERTIFICATE */
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-emerald-950/80 rounded-full flex items-center justify-center mx-auto text-emerald-400 border-4 border-emerald-800 mb-3 animate-pop">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <span className="inline-block bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-black px-4 py-1 rounded-full uppercase tracking-wider mb-1">
                OFFICIAL AUTHENTIC TICKET VERIFIED 🟢
              </span>
              <h2 className="text-2xl font-black text-white">Cryptographic Certificate</h2>
              <p className="text-xs text-slate-400 mt-0.5">This ticket is authentic and registered in the PostgreSQL ledger.</p>
            </div>

            {/* Cryptographic Seal Badge */}
            <div className="flex items-center justify-center gap-2 bg-emerald-950/50 border border-emerald-800/70 text-emerald-300 rounded-xl py-2 px-3 text-xs font-bold shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>SHA-256 HMAC Signature Verified & Authorized</span>
            </div>

            {/* Ticket Information Details */}
            <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-700 space-y-3 text-xs">
              {/* Official Server Token Number Display */}
              <div className="flex items-center justify-between p-4 bg-slate-800/90 rounded-2xl border border-slate-700 shadow-inner">
                <div>
                  <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider block">Official Verified Token #</span>
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Live Database Record</span>
                  </span>
                </div>
                <div className="text-right">
                  {ticket.assigned_token ? (
                    <span className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
                      #{ticket.assigned_token}
                    </span>
                  ) : (
                    <span className="text-xs font-black bg-amber-950 text-amber-300 border border-amber-800 px-3 py-1 rounded-full uppercase">
                      Pending Verification
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  Queue Session
                </span>
                <span className="font-bold text-white">{ticket.allocation_name}</span>
              </div>
              {/* Applicant Submitted Form Information */}
              {ticket.form_data && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Verified Applicant Info
                  </span>
                  <div className="bg-slate-800/70 rounded-xl p-3.5 space-y-2 border border-slate-700/80">
                    {ticket.form_data._protected ? (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-400 font-medium text-xs">Form Data</span>
                        <span className="font-bold text-amber-400 text-xs text-right inline-flex items-center justify-end gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Protected (AES-256 Encrypted)</span>
                        </span>
                      </div>
                    ) : (
                      Object.entries(ticket.form_data).map(([key, value]) => {
                        if (!value) return null;
                        return (
                          <div key={key} className="flex justify-between items-center py-1 border-b border-slate-700/40 last:border-0">
                            <span className="text-slate-400 font-medium capitalize text-xs">
                              {key.replace(/_/g, ' ')}
                            </span>
                            <span className="font-bold text-white text-xs text-right">
                              {String(value)}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Issued Date
                </span>
                <span className="font-bold text-white">{ticket.date}</span>
              </div>

              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5 text-slate-500" />
                  Ticket Reference ID
                </span>
                <span className="font-mono text-slate-300 text-[11px]">{ticket.id}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2">
              <button onClick={onBackToHome} className="btn-primary w-full text-xs py-3">
                Return to Token Portal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
