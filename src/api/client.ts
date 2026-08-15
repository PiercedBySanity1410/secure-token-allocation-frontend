import { Allocation, RequestItem, DashboardStats, AuditLogItem } from '../types';
import * as XLSX from 'xlsx';

let rawApiBase = (import.meta as any).env?.VITE_API_BASE_URL || '/api';

// If deployed on HTTPS (e.g. Vercel) and VITE_API_BASE_URL is set to an insecure http:// URL,
// fallback to relative '/api' so Vercel rewrite proxy handles it without Mixed Content errors.
if (typeof window !== 'undefined' && window.location.protocol === 'https:' && rawApiBase.startsWith('http://')) {
  rawApiBase = '/api';
}

export const API_BASE = rawApiBase;

export function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'idemp-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now();
}

export function getUserSessionID(): string {
  let sessionID = (typeof localStorage !== 'undefined' && localStorage.getItem('user_session_id')) ||
                  (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('user_session_id'));
  if (!sessionID) {
    sessionID = generateIdempotencyKey();
  }
  if (typeof localStorage !== 'undefined') localStorage.setItem('user_session_id', sessionID);
  if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('user_session_id', sessionID);
  return sessionID;
}

// In-Memory Fallback Store for Standalone UI Mode
let fallbackAllocations: Allocation[] = [];
let fallbackRequests: RequestItem[] = [];
let fallbackAuditLogs: AuditLogItem[] = [];

// Bug #12 fix: safeFetch surfaces real server errors instead of silently falling back.
// Fallback is ONLY used for network-level failures (no connectivity / proxy down).
async function safeFetch<T>(fetcher: () => Promise<Response>, fallbackSupplier: () => T): Promise<T> {
  try {
    const res = await fetcher();
    if (res.ok) {
      return await res.json();
    }
    const errBody = await res.json().catch(() => ({}));
    const errText = errBody?.error || `Request failed with status ${res.status}`;
    // Always re-throw real HTTP response errors (400, 401, 403, 404, 500)
    throw new Error(errText);
  } catch (e: any) {
    const msg: string = e?.message || '';
    // Only use offline fallback for actual network connection failures
    if (e instanceof TypeError || msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Network-level')) {
      return fallbackSupplier();
    }
    throw e; // Re-throw real server HTTP response errors
  }
}

// Public API
export async function getTodayAllocations(): Promise<Allocation[]> {
  return safeFetch(
    () => fetch(`${API_BASE}/public/allocations/today`),
    () => fallbackAllocations
  );
}

export async function getAllocationByID(id: string): Promise<Allocation | null> {
  try {
    const res = await fetch(`${API_BASE}/public/allocations/${id}`);
    if (res.ok) {
      return await res.json();
    }
    if (res.status === 404) {
      return null;
    }
  } catch (e) {
    // Network error
  }
  const found = fallbackAllocations.find((a) => a.id === id);
  return found || null;
}

export async function submitTokenRequest(allocationId: string, formData: Record<string, any>, idempotencyKey?: string): Promise<RequestItem> {
  const key = idempotencyKey || generateIdempotencyKey();
  const sessionID = getUserSessionID();

  return safeFetch(
    () => fetch(`${API_BASE}/public/allocations/${allocationId}/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': key,
      },
      body: JSON.stringify({
        user_session_id: sessionID,
        form_data: formData,
        idempotency_key: key,
      }),
    }),
    () => {
      const targetAlloc = fallbackAllocations.find((a) => a.id === allocationId) || fallbackAllocations[0];
      const newPos = fallbackRequests.filter((r) => r.status === 'PENDING').length + 1;
      const newReq: RequestItem = {
        id: 'req-' + Math.random().toString(36).substring(2, 9),
        allocation_id: targetAlloc.id,
        allocation_name: targetAlloc.name,
        date: targetAlloc.date,
        user_session_id: sessionID,
        form_data: formData,
        status: 'PENDING',
        queue_position: newPos,
        estimated_wait: newPos * 3,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      fallbackRequests.push(newReq);
      targetAlloc.waiting_count = (targetAlloc.waiting_count || 0) + 1;
      return newReq;
    }
  );
}

// Bug #1 fix: cancelRequest now calls the real backend endpoint.
export async function cancelRequest(requestId: string): Promise<RequestItem> {
  const res = await fetch(`${API_BASE}/public/requests/${requestId}/cancel`, {
    method: 'POST',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `Cancel failed with status ${res.status}`);
  }
  return res.json();
}

export async function getRequestStatus(requestId: string, sig?: string): Promise<RequestItem> {
  const sessionID = getUserSessionID();
  const url = sig
    ? `${API_BASE}/public/requests/${requestId}/status?sig=${encodeURIComponent(sig)}`
    : `${API_BASE}/public/requests/${requestId}/status`;
  return safeFetch(
    () => fetch(url, {
      headers: {
        'X-User-Session-ID': sessionID,
      },
    }),
    () => {
      const found = fallbackRequests.find((r) => r.id === requestId);
      if (found) return found;
      throw new Error('Ticket not found');
    }
  );
}

// Admin Auth API
export async function adminLogin(username?: string, password?: string): Promise<{ admin_id: string; username: string; role?: string }> {
  const res = await fetch(`${API_BASE}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Invalid username or password');
  }
  return data;
}

export async function getAdminProfile(): Promise<{ admin_id: string; username: string; role?: string } | null> {
  try {
    const res = await fetch(`${API_BASE}/admin/me`, { credentials: 'include' });
    if (res.ok) return await res.json();
  } catch (e) {
    // Suppress network error
  }
  return null;
}

export async function adminLogout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/admin/auth/logout`, { method: 'POST', credentials: 'include' });
  } catch (e) {
    // Ignore error
  }
}

export async function changeAdminCredentials(
  currentPassword: string,
  newUsername: string,
  newPassword: string
): Promise<{ message: string; username: string }> {
  const res = await fetch(`${API_BASE}/admin/change-credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      current_password: currentPassword,
      new_username: newUsername,
      new_password: newPassword,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update credentials');
  }
  return data;
}

export async function changeAdminPassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  return changeAdminCredentials(currentPassword, '', newPassword);
}

export async function getAdminUsers(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/admin/users`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch admin users');
  return res.json();
}

export async function createSubAdmin(username: string, password: string): Promise<any> {
  const res = await fetch(`${API_BASE}/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create sub-admin');
  return data;
}

export async function deleteSubAdmin(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/admin/users/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to delete sub-admin');
  return data;
}

function getAdminHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
  };
}

// Admin Operations
export async function getAdminAllocations(): Promise<Allocation[]> {
  return safeFetch(
    () => fetch(`${API_BASE}/admin/allocations`, { headers: getAdminHeaders(), credentials: 'include' }),
    () => fallbackAllocations
  );
}

export async function createAllocation(data: any): Promise<Allocation> {
  return safeFetch(
    () => fetch(`${API_BASE}/admin/allocations`, {
      method: 'POST',
      headers: getAdminHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    }),
    () => {
      const newAlloc: Allocation = {
        id: 'alloc-' + Math.random().toString(36).substring(2, 8),
        name: data.name || 'New Session',
        description: data.description || '',
        date: new Date().toISOString().split('T')[0],
        opening_time: data.opening_time || '09:00',
        closing_time: data.closing_time || '17:00',
        max_tokens: data.max_tokens,
        additional_instructions: 'No app required.',
        status: 'ACTIVE',
        current_sequence: 0,
        waiting_count: 0,
        form_fields: data.form_fields,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      fallbackAllocations.unshift(newAlloc);
      fallbackAuditLogs.unshift({
        id: 'log-' + Date.now(),
        event: 'ALLOCATION_CREATED',
        ip_address: '127.0.0.1',
        metadata: { name: newAlloc.name },
        created_at: new Date().toLocaleString(),
      });
      return newAlloc;
    }
  );
}

export async function updateAllocationStatus(id: string, status: string): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/admin/allocations/${id}`, {
      method: 'PATCH',
      headers: getAdminHeaders(),
      credentials: 'include',
      body: JSON.stringify({ status }),
    });
    if (res.ok) return;
  } catch (e) {
    // Ignore error
  }
  const alloc = fallbackAllocations.find((a) => a.id === id);
  if (alloc) alloc.status = status as any;
}

export async function getAdminRequests(allocationId?: string, status?: string, search?: string): Promise<RequestItem[]> {
  return safeFetch(
    () => {
      const params = new URLSearchParams();
      if (allocationId) params.append('allocation_id', allocationId);
      if (status) params.append('status', status);
      if (search) params.append('search', search);
      return fetch(`${API_BASE}/admin/requests?${params.toString()}`, { headers: getAdminHeaders(), credentials: 'include' });
    },
    () => {
      let filtered = [...fallbackRequests];
      if (allocationId) filtered = filtered.filter((r) => r.allocation_id === allocationId);
      if (status) filtered = filtered.filter((r) => r.status === status);
      if (search && search.trim()) {
        const q = search.toLowerCase().trim();
        filtered = filtered.filter((r) => {
          const idMatch = r.id.toLowerCase().includes(q);
          const tokenMatch = (r.assigned_token || '').toString().includes(q);
          const allocMatch = (r.allocation_name || '').toLowerCase().includes(q);
          const formDataMatch = r.form_data ? Object.values(r.form_data).some((v) => String(v || '').toLowerCase().includes(q)) : false;
          return idMatch || tokenMatch || allocMatch || formDataMatch;
        });
      }
      return filtered;
    }
  );
}

export async function acceptRequest(requestId: string): Promise<RequestItem> {
  return safeFetch(
    () => fetch(`${API_BASE}/admin/requests/${requestId}/accept`, {
      method: 'POST',
      headers: getAdminHeaders(),
      credentials: 'include',
    }),
    () => {
      const req = fallbackRequests.find((r) => r.id === requestId);
      if (req) {
        req.status = 'ACCEPTED';
        req.assigned_token = (req.assigned_token || 1);
        req.accepted_at = new Date().toISOString();
      }
      return req || fallbackRequests[0];
    }
  );
}

export async function rejectRequest(requestId: string): Promise<RequestItem> {
  return safeFetch(
    () => fetch(`${API_BASE}/admin/requests/${requestId}/reject`, {
      method: 'POST',
      headers: getAdminHeaders(),
      credentials: 'include',
    }),
    () => {
      const req = fallbackRequests.find((r) => r.id === requestId);
      if (req) {
        req.status = 'REJECTED';
      }
      return req || fallbackRequests[0];
    }
  );
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return safeFetch(
    () => fetch(`${API_BASE}/admin/dashboard/stats`, { headers: getAdminHeaders(), credentials: 'include' }),
    () => {
      const pending = fallbackRequests.filter((r) => r.status === 'PENDING').length;
      const accepted = fallbackRequests.filter((r) => r.status === 'ACCEPTED').length;
      const rejected = fallbackRequests.filter((r) => r.status === 'REJECTED').length;
      return {
        today_date: new Date().toISOString().split('T')[0],
        total_allocations: fallbackAllocations.length,
        pending_requests: pending,
        accepted_requests: accepted,
        rejected_requests: rejected,
        tokens_issued: accepted,
        currently_serving: accepted > 0 ? 1 : 0,
      };
    }
  );
}

export async function getAuditLogs(): Promise<AuditLogItem[]> {
  return safeFetch(
    () => fetch(`${API_BASE}/admin/audit-logs`, { headers: getAdminHeaders(), credentials: 'include' }),
    () => fallbackAuditLogs
  );
}

export async function destroyAllocation(id: string): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/admin/allocations/${id}/destroy`, {
      method: 'DELETE',
      headers: getAdminHeaders(),
      credentials: 'include',
    });
    if (res.ok) return;
  } catch (e) {
    // Ignore error
  }
  fallbackAllocations = fallbackAllocations.filter((a) => a.id !== id);
}

export async function exportSession(id: string): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/admin/allocations/${id}/export`, {
      method: 'GET',
      headers: getAdminHeaders(),
      credentials: 'include',
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session_${id}_export.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }
  } catch (e) {
    // Ignore network error and fall back to XLSX generation below
  }

  // Standalone / Offline XLSX fallback using SheetJS
  try {
    const sessionReqs = fallbackRequests.filter((r) => r.allocation_id === id);
    const dataRows = sessionReqs.map((r) => ({
      'Request ID': r.id,
      'Assigned Token Number': r.assigned_token ? `#${r.assigned_token}` : '',
      'Queue Status': r.status,
      'Session Name': r.allocation_name,
      Date: r.date,
      'Submitted At': r.submitted_at,
      'User Session Device ID': r.user_session_id,
      ...r.form_data,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataRows.length > 0 ? dataRows : [{ Note: 'No requests for this session' }]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Session Requests');
    XLSX.writeFile(workbook, `session_${id}_export.xlsx`);
  } catch (e) {
    console.error('Offline XLSX export failed', e);
  }
}

export async function holdRequest(requestId: string): Promise<RequestItem> {
  return safeFetch(
    () => fetch(`${API_BASE}/admin/requests/${requestId}/hold`, {
      method: 'POST',
      headers: getAdminHeaders(),
      credentials: 'include',
    }),
    () => {
      const req = fallbackRequests.find((r) => r.id === requestId);
      if (req) {
        req.status = 'CANCELLED';
      }
      return req || fallbackRequests[0];
    }
  );
}

export async function serveRequest(requestId: string): Promise<RequestItem> {
  return safeFetch(
    () => fetch(`${API_BASE}/admin/requests/${requestId}/serve`, {
      method: 'POST',
      headers: getAdminHeaders(),
      credentials: 'include',
    }),
    () => {
      const req = fallbackRequests.find((r) => r.id === requestId);
      if (req) {
        req.status = 'SERVED';
      }
      return req || fallbackRequests[0];
    }
  );
}
