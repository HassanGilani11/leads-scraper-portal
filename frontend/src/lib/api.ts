import {
  Job,
  Lead,
  LeadsPaginationResponse,
  SettingsResponse,
  StatsSummary,
  AuditReport,
  AuthResponse,
  User,
  UserListResponse,
  UserRole
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000/api";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("leadpulse_token");
}

export function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem("leadpulse_token", token);
  } else {
    localStorage.removeItem("leadpulse_token");
  }
}

export function getAuthHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    ...customHeaders,
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = getAuthHeaders((options.headers as Record<string, string>) || {});
  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 401 && typeof window !== "undefined") {
    // If not already on login page, signal unauthorized
    if (!window.location.pathname.startsWith("/login")) {
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }
  }

  return res;
}

// ----------------- Auth API Methods -----------------

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Invalid login credentials");
  }
  const data: AuthResponse = await res.json();
  setStoredToken(data.access_token);
  return data;
}

export async function getCurrentUser(): Promise<User> {
  const res = await authFetch(`${API_BASE}/auth/me`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to load user profile");
  }
  return res.json();
}

export async function updateProfile(data: { full_name?: string; email?: string }): Promise<User> {
  const res = await authFetch(`${API_BASE}/auth/me`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to update profile");
  }
  return res.json();
}

export async function changePassword(current_password: string, new_password: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ current_password, new_password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to change password");
  }
}

export async function getUsers(limit = 100, offset = 0): Promise<UserListResponse> {
  const res = await authFetch(`${API_BASE}/auth/users?limit=${limit}&offset=${offset}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to fetch users");
  }
  return res.json();
}

export async function createUser(data: {
  email: string;
  full_name?: string;
  password: string;
  role: UserRole;
  is_active?: boolean;
}): Promise<User> {
  const res = await authFetch(`${API_BASE}/auth/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to create user");
  }
  return res.json();
}

export async function updateUser(
  userId: string,
  data: { full_name?: string; role?: UserRole; is_active?: boolean; password?: string }
): Promise<User> {
  const res = await authFetch(`${API_BASE}/auth/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to update user");
  }
  return res.json();
}

export async function deleteUser(userId: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/auth/users/${userId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to delete user");
  }
}

// ----------------- Scrapes API Methods -----------------

export async function startScrapeJob(niche: string, state: string): Promise<Job> {
  const res = await authFetch(`${API_BASE}/scrapes/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ niche, state }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to start scraping job");
  }
  return res.json();
}

export async function getJobs(limit: number = 50, offset: number = 0): Promise<{ jobs: Job[]; total: number }> {
  const res = await authFetch(`${API_BASE}/scrapes/?limit=${limit}&offset=${offset}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch jobs history");
  return res.json();
}

export async function getJob(jobId: string): Promise<Job> {
  const res = await authFetch(`${API_BASE}/scrapes/${jobId}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch job details");
  return res.json();
}

export async function deleteJob(jobId: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/scrapes/${jobId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete job");
}

// ----------------- Leads API Methods -----------------

export interface GetLeadsParams {
  job_id?: string;
  state?: string;
  niche?: string;
  search?: string;
  has_email?: boolean;
  has_phone?: boolean;
  has_linkedin?: boolean;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export async function getLeads(params: GetLeadsParams = {}): Promise<LeadsPaginationResponse> {
  const query = new URLSearchParams();
  if (params.job_id) query.append("job_id", params.job_id);
  if (params.state) query.append("state", params.state);
  if (params.niche) query.append("niche", params.niche);
  if (params.search) query.append("search", params.search);
  if (params.has_email !== undefined) query.append("has_email", String(params.has_email));
  if (params.has_phone !== undefined) query.append("has_phone", String(params.has_phone));
  if (params.has_linkedin !== undefined) query.append("has_linkedin", String(params.has_linkedin));
  if (params.sort_by) query.append("sort_by", params.sort_by);
  if (params.sort_order) query.append("sort_order", params.sort_order);
  if (params.page) query.append("page", String(params.page));
  if (params.limit) query.append("limit", String(params.limit));

  const res = await authFetch(`${API_BASE}/leads/?${query.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch leads");
  return res.json();
}

export function getExportCsvUrl(params: { job_id?: string; state?: string; niche?: string; search?: string } = {}): string {
  const query = new URLSearchParams();
  if (params.job_id) query.append("job_id", params.job_id);
  if (params.state) query.append("state", params.state);
  if (params.niche) query.append("niche", params.niche);
  if (params.search) query.append("search", params.search);
  const token = getStoredToken();
  if (token) query.append("token", token);
  return `${API_BASE}/leads/export?${query.toString()}`;
}

// ----------------- Audit & Settings API Methods -----------------

export async function getWebsiteAudit(leadId: string): Promise<AuditReport> {
  const res = await authFetch(`${API_BASE}/audit/${leadId}`, { cache: "no-store" });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to audit website");
  }
  return res.json();
}

export function getAuditPdfUrl(leadId: string): string {
  const token = getStoredToken();
  const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${API_BASE}/audit/${leadId}/pdf${tokenQuery}`;
}

export async function getSettings(): Promise<SettingsResponse> {
  const res = await authFetch(`${API_BASE}/settings/`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch settings");
  return res.json();
}

export async function updateSettings(apolloApiKey: string): Promise<SettingsResponse> {
  const res = await authFetch(`${API_BASE}/settings/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apollo_api_key: apolloApiKey }),
  });
  if (!res.ok) throw new Error("Failed to update settings");
  return res.json();
}

export async function getStatsSummary(): Promise<StatsSummary> {
  const res = await authFetch(`${API_BASE}/settings/stats`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch analytics summary");
  return res.json();
}

export function getWsUrl(jobId: string): string {
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const defaultHost = "127.0.0.1:8000";
  return `${wsProtocol}//${defaultHost}/api/ws/${jobId}`;
}

// ----------------- Schedules API Methods -----------------

export async function getSchedules(): Promise<import("@/types").ScheduleListResponse> {
  const res = await authFetch(`${API_BASE}/schedules/`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch recurring schedules");
  return res.json();
}

export async function createSchedule(data: {
  niche: string;
  state: string;
  frequency: import("@/types").ScheduleFrequency;
  day_of_week?: number;
  hour_of_day?: number;
  is_active?: boolean;
}): Promise<import("@/types").Schedule> {
  const res = await authFetch(`${API_BASE}/schedules/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to create schedule");
  }
  return res.json();
}

export async function updateSchedule(
  scheduleId: string,
  data: {
    frequency?: import("@/types").ScheduleFrequency;
    day_of_week?: number;
    hour_of_day?: number;
    is_active?: boolean;
  }
): Promise<import("@/types").Schedule> {
  const res = await authFetch(`${API_BASE}/schedules/${scheduleId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to update schedule");
  }
  return res.json();
}

export async function deleteSchedule(scheduleId: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/schedules/${scheduleId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to delete schedule");
  }
}

export async function triggerScheduleRunNow(scheduleId: string): Promise<Job> {
  const res = await authFetch(`${API_BASE}/schedules/${scheduleId}/run-now`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to trigger schedule execution");
  }
  return res.json();
}

