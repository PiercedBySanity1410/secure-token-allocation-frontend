/**
 * Ticket Image Export
 * — 390px logical × 3× DPR = 1170px physical (crisp on any screen)
 * — Integer-snapped coordinates to prevent sub-pixel blur
 * — Shows: session name · website · generated-at · token# · request ID · QR
 */

export interface TicketExportOptions {
  requestId: string;
  allocationName: string;
  tokenNumber?: number | null;
  status: string;
  signedQrUrl: string;
  formData?: Record<string, unknown>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const px = (n: number) => Math.round(n); // snap to integer pixels

function statusColor(s: string): { fg: string; bg: string } {
  switch (s) {
    case 'ACCEPTED':  return { fg: '#059669', bg: '#d1fae5' };
    case 'SERVED':    return { fg: '#0d9488', bg: '#ccfbf1' };
    case 'PENDING':   return { fg: '#b45309', bg: '#fef3c7' };
    case 'CANCELLED':
    case 'REJECTED':  return { fg: '#dc2626', bg: '#fee2e2' };
    default:          return { fg: '#6b7280', bg: '#f3f4f6' };
  }
}

function arc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.arc(px(cx), px(cy), px(r), 0, Math.PI * 2);
}

function box(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  const X = px(x), Y = px(y), W = px(w), H = px(h), R = px(r);
  ctx.beginPath();
  ctx.moveTo(X + R, Y);
  ctx.lineTo(X + W - R, Y);
  ctx.quadraticCurveTo(X + W, Y, X + W, Y + R);
  ctx.lineTo(X + W, Y + H - R);
  ctx.quadraticCurveTo(X + W, Y + H, X + W - R, Y + H);
  ctx.lineTo(X + R, Y + H);
  ctx.quadraticCurveTo(X, Y + H, X, Y + H - R);
  ctx.lineTo(X, Y + R);
  ctx.quadraticCurveTo(X, Y, X + R, Y);
  ctx.closePath();
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function hline(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number) {
  ctx.beginPath();
  ctx.moveTo(px(x1), px(y));
  ctx.lineTo(px(x2), px(y));
  ctx.stroke();
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function exportTicketAsImage(opts: TicketExportOptions): Promise<Blob> {
  const DPR  = 3;        // 3× for crispness
  const W    = 390;      // logical width
  const P    = 24;       // horizontal padding
  const FONT = 'system-ui,-apple-system,"Segoe UI",sans-serif';

  // ── Fixed section heights ────────────────────────────────────────────────
  const HDR_H   = 152;
  const BADGE_H = 0;     // status badge removed
  const TOKEN_H = 166;   // token circle + label (increased for spacing around text & glow)
  const DIV_H   = 32;    // perforation divider
  const ROW_H   = 40;    // height of each info row
  const QR_SZ   = 160;   // QR image square
  const QR_PAD  = 84;    // space below QR image for labels
  const FTR_H   = 52;    // footer

  // Work out the first form-data field (label + value)
  let extraLabel = '';
  let extraValue = '';
  if (opts.formData) {
    const firstEntry = Object.entries(opts.formData).find(([, v]) => v !== undefined && v !== null && String(v).trim() !== '');
    if (firstEntry) {
      extraLabel = firstEntry[0].replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      extraValue = String(firstEntry[1]).trim();
    }
  }
  const INFO_ROWS = extraLabel ? 3 : 2;     // Request ID + Session + optional form field
  const INFO_H    = INFO_ROWS * ROW_H;
  const TOTAL_H   = HDR_H + TOKEN_H + DIV_H + INFO_H + QR_SZ + QR_PAD + FTR_H;

  // ── Canvas ───────────────────────────────────────────────────────────────
  const canvas  = document.createElement('canvas');
  canvas.width  = W * DPR;
  canvas.height = TOTAL_H * DPR;
  const ctx     = canvas.getContext('2d')!;
  ctx.scale(DPR, DPR);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // ── 1. Dark card background (#111 seed) ──────────────────────────────────
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, W, TOTAL_H);

  // ── 2. Header (Sharp Rectangular Solid Dark Black) ───────────────────────
  ctx.fillStyle = '#161616';
  ctx.fillRect(0, 0, W, HDR_H);

  // logo circle
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  arc(ctx, W / 2, 38, 24);
  ctx.fill();

  // 'T' inside circle
  ctx.fillStyle    = '#ffffff';
  ctx.font         = `900 20px ${FONT}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('T', px(W / 2), 38);

  // Session / allocation name
  ctx.fillStyle    = '#ffffff';
  ctx.font         = `700 18px ${FONT}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(
    (opts.allocationName || 'Queue Token').slice(0, 36),
    px(W / 2), 86
  );

  // Generated-at timestamp
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font      = `600 12px ${FONT}`;
  ctx.fillText(
    `Generated ${new Date().toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })}`,
    px(W / 2), 114
  );

  // ── 3. Token number circle (Dark Charcoal Theme — Borderless) ─────────────
  const tokenCY  = HDR_H + 74;
  const CR       = 54;
  const hasToken = !!(opts.tokenNumber && (opts.status === 'ACCEPTED' || opts.status === 'SERVED'));

  if (hasToken) {
    // dark gradient fill
    const tg = ctx.createRadialGradient(
      px(W/2 - 14), px(tokenCY - 14), 4,
      px(W/2), px(tokenCY), CR
    );
    tg.addColorStop(0, '#2e2e2e');
    tg.addColorStop(1, '#181818');
    ctx.fillStyle = tg;
    arc(ctx, W / 2, tokenCY, CR);
    ctx.fill();

    // Centered token number with dynamic scaling for 3-digit numbers (#300)
    const numStr = `#${opts.tokenNumber}`;
    let fontSize = 34;
    if (numStr.length >= 5) fontSize = 24;       // e.g. #1000
    else if (numStr.length === 4) fontSize = 28;  // e.g. #300, #999
    else fontSize = 34;                           // e.g. #7, #42

    ctx.fillStyle    = '#ffffff';
    ctx.font         = `900 ${fontSize}px ${FONT}`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(numStr, px(W / 2), px(tokenCY));

    // caption
    ctx.fillStyle    = '#9ca3af';
    ctx.font         = `500 12px ${FONT}`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('Your Token Number', px(W / 2), px(tokenCY + CR + 28));

  } else {
    const isRej = opts.status === 'CANCELLED' || opts.status === 'REJECTED';
    ctx.fillStyle = '#1c1c1c';
    arc(ctx, W / 2, tokenCY, CR); ctx.fill();

    ctx.font         = `400 32px ${FONT}`;
    ctx.fillStyle    = isRej ? '#f87171' : '#d1d5db';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isRej ? '✕' : '⏳', px(W / 2), px(tokenCY));

    ctx.fillStyle    = '#9ca3af';
    ctx.font         = `500 12px ${FONT}`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(
      isRej ? opts.status : 'Awaiting Token Assignment',
      px(W / 2), px(tokenCY + CR + 32)
    );
  }

  // ── 5. Perforation divider ────────────────────────────────────────────────
  const perfY  = HDR_H + TOKEN_H + 4;
  const NOTCH  = 10;   // notch punch radius

  // Notch punch-outs: filled dark semicircles without borders
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.arc(0, px(perfY), NOTCH, -Math.PI / 2, Math.PI / 2);
  ctx.fill();

  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.arc(W, px(perfY), NOTCH, Math.PI / 2, 3 * Math.PI / 2);
  ctx.fill();

  // Dashed perforation line between the notches
  ctx.strokeStyle = '#222222';
  ctx.lineWidth   = 1.5;
  ctx.setLineDash([7, 5]);
  hline(ctx, NOTCH + 4, W - NOTCH - 4, perfY);
  ctx.setLineDash([]);

  // ── 6. Info rows (Request ID only — clean & focused) ─────────────────────
  const infoTopY = perfY + 10;

  // Helper to draw a label–value row
  function drawRow(label: string, value: string, y: number) {
    ctx.textBaseline = 'middle';
    const midY = px(y + 20);

    ctx.fillStyle = '#9ca3af';
    ctx.font      = `400 12px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(label, P, midY);

    ctx.fillStyle = '#ffffff';
    ctx.font      = `600 12px ${FONT}`;
    ctx.textAlign = 'right';
    // truncate value if too long
    let v = value;
    while (ctx.measureText(v).width > W - P * 2 - ctx.measureText(label).width - 16 && v.length > 8) {
      v = v.slice(0, -4) + '…';
    }
    ctx.fillText(v, W - P, midY);
  }

  drawRow('Request ID', opts.requestId, infoTopY);
  drawRow('Session', opts.allocationName || 'Queue Token', infoTopY + ROW_H);
  if (extraLabel) {
    drawRow(extraLabel, extraValue, infoTopY + ROW_H * 2);
  }

  // ── 7. QR Code Section (Clean, box-free layout) ───────────────────────────
  const qrSectionTop = infoTopY + INFO_H + 16;
  const qrImgX       = px((W - QR_SZ) / 2);
  const qrImgY       = px(qrSectionTop);

  // QR image with clean white mat behind it so cameras scan it reliably
  try {
    const qrImg = await loadImg(opts.signedQrUrl);
    ctx.fillStyle = '#ffffff';
    box(ctx, qrImgX - 6, qrImgY - 6, QR_SZ + 12, QR_SZ + 12, 8);
    ctx.fill();

    ctx.drawImage(qrImg, qrImgX, qrImgY, QR_SZ, QR_SZ);
  } catch {
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(qrImgX, qrImgY, QR_SZ, QR_SZ);
    ctx.fillStyle = '#6b7280';
    ctx.font = `400 12px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('QR unavailable', px(W / 2), px(qrImgY + QR_SZ / 2));
  }

  // QR label lines — clean centered text below QR image on dark ticket
  const qrLabelsTop = qrImgY + QR_SZ + 16;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = '#818cf8';
  ctx.font      = `700 13px ${FONT}`;
  ctx.fillText('🔐 Scan to Verify Ticket', px(W / 2), qrLabelsTop + 14);

  ctx.fillStyle = '#f3f4f6';
  ctx.font      = `600 11px ${FONT}`;
  ctx.fillText('HMAC-SHA256 Cryptographic Signature', px(W / 2), qrLabelsTop + 32);

  ctx.fillStyle = '#9ca3af';
  ctx.font      = `400 10px ${FONT}`;
  ctx.fillText('Scan to confirm this ticket is authentic & unmodified', px(W / 2), qrLabelsTop + 48);

  // ── 8. Footer ─────────────────────────────────────────────────────────────
  const ftrY = TOTAL_H - FTR_H;

  ctx.fillStyle    = '#9ca3af';
  ctx.font         = `600 11px ${FONT}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('TokenFlow Queue System', px(W / 2), ftrY + 20);

  ctx.fillStyle = '#6b7280';
  ctx.font      = `400 10px ${FONT}`;
  ctx.fillText(`ID: ${opts.requestId}`, px(W / 2), ftrY + 38);

  // ── Produce PNG blob ──────────────────────────────────────────────────────
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      b => b ? resolve(b) : reject(new Error('toBlob failed')),
      'image/png',
      1.0
    );
  });
}
