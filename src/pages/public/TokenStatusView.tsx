import React, { useEffect, useState, useCallback } from 'react';
import { RequestItem, Allocation, CachedToken } from '../../types';
import { getRequestStatus, getAllocationByID, cancelRequest, API_BASE, getUserSessionID } from '../../api/client';
import { saveTokenToIndexedDB, getTokenFromIndexedDB, removeTokenFromIndexedDB } from '../../db/indexedDB';
import { TicketCard } from '../../components/TicketCard';

interface TokenStatusViewProps {
  requestId: string;
  initialRequest?: RequestItem | null;
  onBackToHome: () => void;
  onReapply?: (allocationId: string) => void;
}

export const TokenStatusView: React.FC<TokenStatusViewProps> = ({
  requestId,
  initialRequest,
  onBackToHome,
  onReapply,
}) => {
  const [request, setRequest] = useState<RequestItem | null>(initialRequest || null);
  const [allocation, setAllocation] = useState<Allocation | null>(null);
  const [cachedToken, setCachedToken] = useState<CachedToken | null>(null);
  const [loading, setLoading] = useState(!initialRequest);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const saveCache = useCallback(async (reqData: RequestItem) => {
    const tokenCache: CachedToken = {
      requestId: reqData.id,
      allocationId: reqData.allocation_id,
      allocationName: reqData.allocation_name,
      tokenNumber: reqData.assigned_token,
      date: reqData.date,
      status: reqData.status,
      submittedAt: reqData.submitted_at,
      syncTimestamp: Date.now(),
    };
    await saveTokenToIndexedDB(tokenCache).catch(() => null);
    setCachedToken(tokenCache);
  }, []);

  useEffect(() => {
    let sse: EventSource | null = null;

    const fetchInitialStatus = async () => {
      try {
        const reqData = await getRequestStatus(requestId);
        setRequest(reqData);
        await saveCache(reqData);

        if (reqData.allocation_id && !allocation) {
          const allocData = await getAllocationByID(reqData.allocation_id).catch(() => null);
          if (allocData) setAllocation(allocData);
        }
      } catch (e: any) {
        // If ticket entry was deleted online, delete offline token from IndexedDB
        if (e?.message?.includes('not found') || e?.message?.includes('404')) {
          console.log('Online ticket entry was deleted — purging offline IndexedDB token:', requestId);
          await removeTokenFromIndexedDB(requestId).catch(() => null);
          setCachedToken(null);
          setRequest(null);
          onBackToHome();
          return;
        }

        console.log('API status fetch offline fallback:', e);
        const cached = await getTokenFromIndexedDB(requestId).catch(() => null);
        if (cached) {
          setCachedToken(cached);
          setRequest((prev) => prev || {
            id: cached.requestId,
            allocation_id: cached.allocationId,
            allocation_name: cached.allocationName,
            date: cached.date,
            user_session_id: 'offline',
            form_data: { name: 'Active Token Holder' },
            status: cached.status,
            assigned_token: cached.tokenNumber,
            queue_position: 1,
            estimated_wait: 3,
            submitted_at: cached.submittedAt,
            updated_at: new Date().toISOString(),
          });
        } else if (!request && initialRequest) {
          setRequest(initialRequest);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchInitialStatus();

    // Bug #15 fix: SSE only — no concurrent 3-second polling.
    // The initial fetch above handles the first load; SSE handles all subsequent updates.
    try {
      const sessionID = getUserSessionID();
      sse = new EventSource(`${API_BASE}/public/requests/${requestId}/stream?user_session_id=${encodeURIComponent(sessionID)}`);

      sse.onmessage = (event) => {
        try {
          const updatedReq: RequestItem = JSON.parse(event.data);
          setRequest(updatedReq);
          saveCache(updatedReq);
        } catch (e) {
          console.error('Failed to parse SSE message', e);
        }
      };

      sse.onerror = () => {
        sse?.close();
      };
    } catch (e) {
      console.log('SSE connection error:', e);
    }

    return () => {
      if (sse) sse.close();
    };
  }, [requestId]);

  // Bug #1 fix: real cancel — calls the backend cancel endpoint
  const handleCancelRequest = useCallback(async () => {
    setCancelError(null);
    try {
      const updated = await cancelRequest(requestId);
      setRequest(updated);
      await saveCache(updated);
    } catch (e: any) {
      setCancelError(e?.message || 'Failed to cancel request');
    }
  }, [requestId, saveCache]);

  const handleReapply = useCallback(() => {
    if (onReapply && request?.allocation_id) {
      onReapply(request.allocation_id);
    } else {
      onBackToHome();
    }
  }, [onReapply, request?.allocation_id, onBackToHome]);

  if (loading && !request) {
    return (
      <div className="text-center py-20">
        <div className="w-14 h-14 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-semibold text-slate-300">Retrieving queue ticket status...</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="card max-w-md mx-auto text-center py-12 border-2 border-slate-700 bg-slate-800/90 shadow-xl text-slate-100">
        <h3 className="text-xl font-bold text-white mb-2">Ticket Not Found</h3>
        <p className="text-xs text-slate-400 mb-6">Could not find a valid queue token for ID: {requestId}</p>
        <button onClick={onBackToHome} className="btn-primary text-xs mx-auto">
          Back to Allocations
        </button>
      </div>
    );
  }

  return (
    <>
      {cancelError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 mb-3 text-xs text-red-700 font-medium">
          ⚠ {cancelError}
        </div>
      )}
      <TicketCard
        request={request}
        allocation={allocation}
        cachedToken={cachedToken}
        onCancelRequest={handleCancelRequest}
        onBackHome={onBackToHome}
        onReapply={handleReapply}
      />
    </>
  );
};
