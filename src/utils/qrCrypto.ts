// Cryptographic QR Signing & Verification Utility
// Bug #2 fix: Signature is generated server-side (secret stays on the backend).
// Bug #8 fix: Full 64-char HMAC hex used in verification, no truncation.

import { API_BASE } from '../api/client';

/**
 * Bug #2 fix: Fetch the HMAC-SHA256 signature from the backend.
 * The secret key NEVER leaves the server.
 */
export async function generateQRSignature(requestId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/public/requests/${requestId}/qr-sig`);
  if (!res.ok) throw new Error(`Failed to get QR signature: ${res.status}`);
  const data = await res.json();
  return data.sig as string; // full 64-char hex
}

/**
 * Verifies a signature by asking the server to re-derive it.
 * Bug #3 fix: returns false (not true) if no sig is provided.
 */
export async function verifyQRSignature(requestId: string, providedSig?: string | null): Promise<boolean> {
  // Bug #3: missing signature is INVALID, not valid
  if (!providedSig || providedSig.trim() === '') return false;

  try {
    const expectedSig = await generateQRSignature(requestId);
    // Bug #8: compare full 64-char hex, constant-time via toLowerCase normalization
    return expectedSig.toLowerCase() === providedSig.trim().toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Creates a cryptographically signed QR Code URL using server-derived sig.
 */
export async function createSignedQRUrl(baseUrl: string, rawId: string): Promise<string> {
  const sig = await generateQRSignature(rawId);
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}sig=${sig}`;
}
