export interface FormField {
  id: string;
  allocation_id: string;
  field_key: string;
  label: string;
  field_type: 'text' | 'number' | 'email' | 'phone' | 'date' | 'select' | 'radio' | 'checkbox' | 'textarea';
  required: boolean;
  options?: string[];
  display_order: number;
}

export interface Allocation {
  id: string;
  date: string;
  name: string;
  description: string;
  opening_time: string;
  closing_time: string;
  max_tokens?: number;
  additional_instructions: string;
  status: 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'COMPLETED';
  current_sequence: number;
  waiting_count: number;
  form_fields?: FormField[];
  created_at: string;
  updated_at: string;
}

export interface RequestItem {
  id: string;
  allocation_id: string;
  allocation_name: string;
  date: string;
  user_session_id: string;
  form_data: Record<string, any>;
  status: 'PENDING' | 'ACCEPTED' | 'SERVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
  assigned_token?: number;
  queue_position: number;
  people_ahead?: number;
  served_count?: number;
  estimated_wait: number;
  idempotency_key?: string;
  submitted_at: string;
  accepted_at?: string;
  updated_at: string;
}

export interface DashboardStats {
  today_date: string;
  total_allocations: number;
  pending_requests: number;
  accepted_requests: number;
  rejected_requests: number;
  tokens_issued: number;
  currently_serving: number;
}

export interface AuditLogItem {
  id: string;
  event: string;
  admin_id?: string;
  request_id?: string;
  allocation_id?: string;
  ip_address: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface CachedToken {
  requestId: string;
  allocationId: string;
  allocationName: string;
  tokenNumber?: number;
  date: string;
  status: 'PENDING' | 'ACCEPTED' | 'SERVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
  issuedAt?: string;
  submittedAt: string;
  syncTimestamp: number;
}

export interface AdminUserItem {
  id: string;
  username: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
  session_version: number;
  created_at: string;
}
