export interface Job {
  id: string;
  niche: string;
  state: string;
  status: "pending" | "running" | "completed" | "failed";
  total_leads: number;
  found_count: number;
  enriched_count: number;
  error_count: number;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  job_id: string;
  niche?: string;
  state?: string;
  
  // 18 fields
  business_name?: string;
  url?: string;
  website?: string;
  business_email?: string;
  office_location?: string;
  office_contact?: string;
  contact_person?: string;
  email?: string;
  phone_number?: string;
  linkedin_url?: string;
  company_description?: string;
  industries?: string;
  keywords?: string;
  founding_year?: string;
  employee_count?: string;
  technologies_used?: string;
  company_rating?: string;
  subsidiaries?: string;

  created_at: string;
}

export interface AuditReport {
  id: string;
  lead_id: string;
  website_url: string;
  health_score: number;
  ssl_active: string;
  mobile_optimized: string;
  load_time_seconds: string;
  cms_platform: string;
  payment_gateways: string;
  shipping_carriers: string;
  marketing_pixels: string;
  technologies_used: string;
  outdated_issues: string;
  pitch_opportunities: string;
  cold_email_draft: string;
  created_at: string;
}

export interface LeadsPaginationResponse {
  items: Lead[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface SettingsResponse {
  apollo_api_key_set: boolean;
  apollo_api_key_masked: string;
  database_url: string;
  playwright_ready: boolean;
  total_jobs: number;
  total_leads: number;
  apollo_hourly_requests_left?: number | null;
  apollo_hourly_limit?: number | null;
  apollo_rate_limit_status?: string | null;
}

export interface StatsSummary {
  total_leads: number;
  total_jobs: number;
  completed_jobs: number;
  running_jobs: number;
  failed_jobs: number;
  leads_with_email: number;
  leads_with_phone: number;
  leads_with_linkedin: number;
  leads_with_company_info: number;
  state_breakdown: Record<string, number>;
}

export interface LogMessage {
  job_id: string;
  timestamp: string;
  level: "info" | "progress" | "success" | "warning" | "error";
  message: string;
  data?: any;
}

export type UserRole = "admin" | "member" | "viewer";

export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface UserListResponse {
  users: User[];
  total: number;
}

export type ScheduleFrequency = "daily" | "weekly" | "biweekly" | "monthly";

export interface Schedule {
  id: string;
  niche: string;
  state: string;
  frequency: ScheduleFrequency;
  day_of_week: number;
  hour_of_day: number;
  is_active: boolean;
  last_run_at?: string | null;
  next_run_at: string;
  total_runs_count: number;
  created_by?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface ScheduleListResponse {
  schedules: Schedule[];
  total: number;
}


