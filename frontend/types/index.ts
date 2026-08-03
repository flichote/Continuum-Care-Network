/** 与 backend/app/schemas 对齐的共享类型定义 */

export type Role = "patient" | "therapist" | "admin";

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface User {
  id: string;
  phone?: string | null;
  email?: string | null;
  role: Role;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export interface PatientProfile {
  id: string;
  user_id: string;
  gender?: string | null;
  birth_date?: string | null;
  contact_phone?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  medical_history?: string | null;
  discharge_summary?: string | null;
  allergies?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TherapistProfile {
  id: string;
  user_id: string;
  organization?: string | null;
  license_type?: string | null;
  license_number?: string | null;
  license_docs?: string | null;
  specialties?: string | null;
  bio?: string | null;
  status: "pending" | "approved" | "rejected";
  review_note?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeOut {
  user: User;
  patient_profile?: PatientProfile | null;
  therapist_profile?: TherapistProfile | null;
}

export interface TherapistPublic {
  id: string;
  user_id: string;
  full_name: string;
  organization?: string | null;
  license_type?: string | null;
  specialties?: string | null;
  bio?: string | null;
  status: string;
}

export type MatchStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "pending_unbind"
  | "terminated";

export interface Match {
  id: string;
  patient_id: string;
  therapist_id: string;
  status: MatchStatus;
  requested_by: string;
  request_note?: string | null;
  review_note?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type HealthRecordType =
  | "blood_pressure"
  | "heart_rate"
  | "temperature"
  | "spo2"
  | "blood_glucose"
  | "weight";

export interface HealthRecord {
  id: string;
  patient_id: string;
  record_type: HealthRecordType;
  value?: number | null;
  systolic?: number | null;
  diastolic?: number | null;
  unit: string;
  recorded_at: string;
  note?: string | null;
  created_at: string;
}

export interface HealthRecordPage {
  total: number;
  page: number;
  size: number;
  items: HealthRecord[];
}

export interface TrendPoint {
  date: string;
  avg?: number | null;
  min?: number | null;
  max?: number | null;
  count: number;
}

export interface TrendOut {
  record_type: string;
  field: string;
  unit: string;
  points: TrendPoint[];
}

export interface PlanTask {
  id: string;
  plan_id: string;
  title: string;
  description?: string | null;
  frequency?: string | null;
  duration_minutes?: number | null;
  order_index: number;
  created_at: string;
}

export type PlanStatus = "active" | "completed" | "archived";

export interface Plan {
  id: string;
  patient_id: string;
  therapist_id: string;
  title: string;
  goal?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status: PlanStatus;
  tasks: PlanTask[];
  created_at: string;
  updated_at: string;
}

export interface Checkin {
  id: string;
  task_id: string;
  patient_id: string;
  checkin_date: string;
  completed: boolean;
  note?: string | null;
  created_at: string;
}

export interface PlanProgress {
  plan_id: string;
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  checkins: Checkin[];
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

export interface Conversation {
  peer_id: string;
  peer_name: string;
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count: number;
}

export interface UnreadCount {
  unread_count: number;
}

export type AlertSeverity = "info" | "warning" | "critical";
export type AlertStatus = "open" | "handled";

export interface Alert {
  id: string;
  patient_id: string;
  health_record_id?: string | null;
  alert_type: string;
  severity: AlertSeverity;
  message: string;
  status: AlertStatus;
  handled_by?: string | null;
  handled_at?: string | null;
  handler_note?: string | null;
  created_at: string;
}

export interface PatientLite {
  id: string;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AdminTherapist {
  user_id: string;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  organization?: string | null;
  license_type?: string | null;
  license_number?: string | null;
  specialties?: string | null;
  bio?: string | null;
  status: string;
  review_note?: string | null;
  created_at: string;
}

export interface AdminMatch {
  id: string;
  patient_id: string;
  patient_name?: string | null;
  therapist_id: string;
  therapist_name?: string | null;
  status: MatchStatus;
  requested_by: string;
  request_note?: string | null;
  review_note?: string | null;
  created_at: string;
}

export interface Threshold {
  key: string;
  metric: string;
  direction: "gt" | "lt";
  value: number;
  severity: AlertSeverity;
  message: string;
}

export interface Statistics {
  users: Record<string, number>;
  matches: Record<string, number>;
  health_records: number;
  alerts: Record<string, number>;
  messages: number;
  plans: number;
}

export interface AuditLog {
  id: string;
  actor_id?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  detail?: string | null;
  ip?: string | null;
  created_at: string;
}
