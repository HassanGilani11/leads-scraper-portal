"use client";

import { useState, useEffect } from "react";
import { 
  Key, 
  ShieldCheck, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Eye, 
  EyeOff, 
  Cpu, 
  Server,
  Sparkles, 
  ExternalLink, 
  Activity, 
  Users,
  UserPlus,
  Trash2,
  Lock,
  UserCheck,
  Shield,
  UserX,
  Loader2,
  RefreshCw,
  User as UserIcon,
  Mail,
  Calendar
} from "lucide-react";
import { 
  getSettings, 
  updateSettings, 
  getUsers, 
  createUser, 
  updateUser, 
  deleteUser, 
  changePassword,
  updateProfile
} from "@/lib/api";
import { SettingsResponse, User, UserRole } from "@/types";
import { useAuth } from "@/context/AuthContext";

export default function SettingsPage() {
  const { user: currentUser, isAdmin, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"api" | "users" | "security">("api");
  
  // Settings API Key state
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState<string>("");
  const [showKey, setShowKey] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);
  const [isCreatingUser, setIsCreatingUser] = useState<boolean>(false);
  const [newUserEmail, setNewUserEmail] = useState<string>("");
  const [newUserName, setNewUserName] = useState<string>("");
  const [newUserPassword, setNewUserPassword] = useState<string>("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("member");
  const [showUserModal, setShowUserModal] = useState<boolean>(false);
  
  // Profile update state
  const [profileName, setProfileName] = useState<string>(currentUser?.full_name || "");
  const [profileEmail, setProfileEmail] = useState<string>(currentUser?.email || "");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState<boolean>(false);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);
  
  // Alerts
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 5000);
  };

  const loadSettings = async () => {
    try {
      const data = await getSettings();
      setSettings(data);
    } catch (err: any) {
      showError("Failed to load system settings from backend");
    }
  };

  const loadUsers = async () => {
    if (!isAdmin) return;
    setIsLoadingUsers(true);
    try {
      const res = await getUsers();
      setUsers(res.users);
    } catch (err: any) {
      showError("Failed to load user list");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadSettings();
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.full_name || "");
      setProfileEmail(currentUser.email || "");
    }
  }, [currentUser]);

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) {
      showError("Please enter an Apollo API Key");
      return;
    }

    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const updated = await updateSettings(apiKeyInput.trim());
      setSettings(updated);
      setApiKeyInput("");
      showSuccess("Apollo API Key successfully updated and saved to backend/.env");
    } catch (err: any) {
      showError(err.message || "Failed to update Apollo API Key");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim() || !newUserPassword.trim()) {
      showError("Email and password are required.");
      return;
    }
    if (newUserPassword.length < 6) {
      showError("Password must be at least 6 characters.");
      return;
    }

    setIsCreatingUser(true);
    try {
      await createUser({
        email: newUserEmail.trim().toLowerCase(),
        full_name: newUserName.trim() || undefined,
        password: newUserPassword,
        role: newUserRole,
        is_active: true,
      });
      showSuccess(`Allocated account created for ${newUserEmail}`);
      setNewUserEmail("");
      setNewUserName("");
      setNewUserPassword("");
      setNewUserRole("member");
      setShowUserModal(false);
      loadUsers();
    } catch (err: any) {
      showError(err.message || "Failed to allocate new user");
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleToggleUserActive = async (targetUser: User) => {
    try {
      await updateUser(targetUser.id, {
        is_active: !targetUser.is_active,
      });
      showSuccess(`User ${targetUser.email} ${!targetUser.is_active ? "activated" : "deactivated"}`);
      loadUsers();
    } catch (err: any) {
      showError(err.message || "Failed to update user status");
    }
  };

  const handleDeleteUser = async (targetUser: User) => {
    if (!confirm(`Are you sure you want to remove user ${targetUser.email}?`)) return;
    try {
      await deleteUser(targetUser.id);
      showSuccess(`User ${targetUser.email} removed.`);
      loadUsers();
    } catch (err: any) {
      showError(err.message || "Failed to delete user");
    }
  };

  const handleUpdateProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileEmail.trim()) {
      showError("Email address cannot be empty.");
      return;
    }

    setIsUpdatingProfile(true);
    try {
      await updateProfile({
        full_name: profileName.trim() || undefined,
        email: profileEmail.trim().toLowerCase(),
      });
      await refreshUser();
      showSuccess("Profile details updated successfully!");
    } catch (err: any) {
      showError(err.message || "Failed to update profile");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      showError("Please fill out both password fields.");
      return;
    }
    if (newPassword.length < 6) {
      showError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showError("New password and confirmation do not match.");
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      showSuccess("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      showError(err.message || "Failed to update password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const isRateLimited = settings?.apollo_hourly_requests_left === 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="border-b border-border pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Key className="h-6 w-6 text-blue-400" />
            <span>Settings & Access Control</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage enrichment credentials, allocated team access, and portal security.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-surface-raised p-1 rounded-xl border border-border">
          <button
            onClick={() => setActiveTab("api")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              activeTab === "api"
                ? "bg-blue-600 text-white shadow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>API & System</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab("users")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                activeTab === "users"
                  ? "bg-blue-600 text-white shadow"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Allocated Users</span>
              <span className="ml-1 px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
                {users.length}
              </span>
            </button>
          )}
          <button
            onClick={() => setActiveTab("security")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              activeTab === "security"
                ? "bg-blue-600 text-white shadow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Account & Security</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-xs text-emerald-400 flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs text-rose-400 flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* TAB 1: API & System Diagnostics */}
      {activeTab === "api" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">Apollo.io Master API Key</h2>
                  {settings?.apollo_api_key_set ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="h-3 w-3" /> Connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                      Not Configured
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  Enriches Australian leads with decision-maker executive names, emails, LinkedIn URLs, and company firmographics.
                </p>
              </div>

              <a
                href="https://app.apollo.io/#/settings/integrations/api"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium"
              >
                Apollo Console <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {settings?.apollo_api_key_set && (
              <div className={`rounded-xl p-4 border text-xs space-y-3 ${
                isRateLimited 
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  : "bg-surface-raised border-border text-gray-300"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className={`h-4 w-4 ${isRateLimited ? "text-amber-400 animate-pulse" : "text-emerald-400"}`} />
                    <span className="font-semibold text-white">Apollo API Live Quota Status</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                    isRateLimited ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-400"
                  }`}>
                    {settings.apollo_rate_limit_status || "Active"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="bg-surface/70 border border-border/60 p-2.5 rounded-lg">
                    <span className="text-gray-400 text-[11px] block">Hourly Requests Left:</span>
                    <span className="font-bold text-sm text-white font-mono">
                      {settings.apollo_hourly_requests_left !== null ? `${settings.apollo_hourly_requests_left} / ${settings.apollo_hourly_limit || 200}` : "200"}
                    </span>
                  </div>
                  <div className="bg-surface/70 border border-border/60 p-2.5 rounded-lg">
                    <span className="text-gray-400 text-[11px] block">Tier / Free Limit:</span>
                    <span className="font-bold text-sm text-white font-mono">200 req / hour</span>
                  </div>
                  <div className="bg-surface/70 border border-border/60 p-2.5 rounded-lg">
                    <span className="text-gray-400 text-[11px] block">Fallback Mode:</span>
                    <span className="font-bold text-sm text-blue-400">Deep Web Crawler</span>
                  </div>
                </div>
              </div>
            )}

            {settings?.apollo_api_key_set && (
              <div className="rounded-xl bg-surface-raised border border-border p-4 flex items-center justify-between text-xs">
                <div className="space-y-1">
                  <span className="text-gray-400">Current Key in backend/.env:</span>
                  <p className="font-mono text-gray-200 text-sm font-semibold tracking-wider">
                    {settings.apollo_api_key_masked}
                  </p>
                </div>
                <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 font-medium">
                  Saved & Active
                </span>
              </div>
            )}

            {isAdmin ? (
              <form onSubmit={handleSaveApiKey} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300">
                    {settings?.apollo_api_key_set ? "Update / Replace Apollo API Key" : "Set New Apollo API Key"}
                  </label>
                  <div className="relative">
                    <input
                      type={showKey ? "text" : "password"}
                      placeholder="Paste your Apollo API key here..."
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-surface-raised border border-border text-xs text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving || !apiKeyInput.trim()}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-xs font-bold text-white transition disabled:opacity-40 shadow-lg shadow-blue-600/20"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? "Saving..." : "Save & Update Key"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="rounded-xl bg-surface-raised border border-border p-4 text-xs text-gray-400 flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400 shrink-0" />
                <span>API Key configuration is restricted to Super Admin accounts.</span>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Server className="h-5 w-5 text-indigo-400" />
              Subsystem Diagnostics & Architecture
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="rounded-xl bg-surface-raised border border-border p-4 space-y-2">
                <div className="flex items-center justify-between text-gray-400">
                  <span className="font-semibold flex items-center gap-1.5 text-white">
                    <Database className="h-4 w-4 text-blue-400" /> Storage Engine
                  </span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="text-gray-300 font-mono">SQLite (leads.db)</p>
                <p className="text-[11px] text-gray-500">
                  {settings?.total_leads || 0} leads across {settings?.total_jobs || 0} jobs
                </p>
              </div>

              <div className="rounded-xl bg-surface-raised border border-border p-4 space-y-2">
                <div className="flex items-center justify-between text-gray-400">
                  <span className="font-semibold flex items-center gap-1.5 text-white">
                    <Cpu className="h-4 w-4 text-amber-400" /> Browser Engine
                  </span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="text-gray-300">Playwright Chromium</p>
                <p className="text-[11px] text-gray-500">Fast Google Maps search feed</p>
              </div>

              <div className="rounded-xl bg-surface-raised border border-border p-4 space-y-2">
                <div className="flex items-center justify-between text-gray-400">
                  <span className="font-semibold flex items-center gap-1.5 text-white">
                    <Sparkles className="h-4 w-4 text-indigo-400" /> Dual Enrichment
                  </span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="text-gray-300">Apollo REST + Deep Web</p>
                <p className="text-[11px] text-gray-500">Auto decision-maker matching</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Allocated Users Management (Admin Only) */}
      {activeTab === "users" && isAdmin && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  <span>Allocated Team Users</span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Allocate specific user accounts who can access the dashboard. Unallocated users cannot sign in.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={loadUsers}
                  className="p-2 text-gray-400 hover:text-white rounded-xl bg-surface-raised border border-border hover:border-gray-600 transition"
                  title="Refresh users"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingUsers ? "animate-spin" : ""}`} />
                </button>
                <button
                  onClick={() => setShowUserModal(true)}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-4 py-2 text-xs font-bold text-white transition shadow-lg shadow-blue-500/20"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Allocate New User</span>
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto rounded-xl border border-border bg-surface-raised/40">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-surface-raised/80 text-gray-400 font-semibold border-b border-border uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">User / Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {users.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    return (
                      <tr key={u.id} className="hover:bg-surface-raised/60 transition">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                              {u.full_name ? u.full_name.charAt(0) : u.email.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-white flex items-center gap-1.5">
                                <span>{u.full_name || u.email.split("@")[0]}</span>
                                {isSelf && (
                                  <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="text-gray-400 text-[11px]">{u.email}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            u.role === "admin"
                              ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                              : u.role === "member"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                          }`}>
                            {u.role}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <button
                            onClick={() => !isSelf && handleToggleUserActive(u)}
                            disabled={isSelf}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                              u.is_active
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20"
                            } ${isSelf ? "cursor-default opacity-80" : "cursor-pointer"}`}
                            title={isSelf ? "You cannot deactivate yourself" : "Click to toggle active/deactivated status"}
                          >
                            {u.is_active ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                            <span>{u.is_active ? "Active" : "Deactivated"}</span>
                          </button>
                        </td>

                        <td className="px-4 py-3.5 text-gray-400">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          {!isSelf && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {users.length === 0 && !isLoadingUsers && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-400">
                        No allocated users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Account Profile & Password Management */}
      {activeTab === "security" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Details Card */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-5">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-blue-400" />
                <span>My Profile Details</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Update your account display name and email address
              </p>
            </div>

            <form onSubmit={handleUpdateProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Display Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Super Admin"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-raised border border-border text-xs text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-raised border border-border text-xs text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Account Meta */}
              <div className="p-3.5 rounded-xl bg-surface-raised/70 border border-border/80 text-xs text-gray-400 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-gray-300">
                    <Shield className="w-3.5 h-3.5 text-blue-400" /> Account Role:
                  </span>
                  <span className="font-semibold text-white uppercase">{currentUser?.role}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-gray-300">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Registered On:
                  </span>
                  <span className="text-gray-200">
                    {currentUser?.created_at ? new Date(currentUser.created_at).toLocaleDateString() : "Active"}
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-xs font-bold text-white transition disabled:opacity-40 shadow-lg shadow-blue-600/20"
                >
                  {isUpdatingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Save Profile</span>
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Card */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-5">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-400" />
                <span>Change Password</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Update login credentials for {currentUser?.email}
              </p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-raised border border-border text-xs text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  New Password (min 6 characters)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-raised border border-border text-xs text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-raised border border-border text-xs text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-xs font-bold text-white transition disabled:opacity-40 shadow-lg shadow-blue-600/20"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Allocate New User */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#0f172a] border border-border p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-400" />
                <span>Allocate New Portal User</span>
              </h3>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="analyst@agency.com"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-raised border border-border text-xs text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Sarah Jenkins"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-raised border border-border text-xs text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Temporary Password *
                </label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-raised border border-border text-xs text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Access Role
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-raised border border-border text-xs text-white focus:border-blue-500 focus:outline-none transition"
                >
                  <option value="member">Member (Can Scrape & Export Leads)</option>
                  <option value="viewer">Viewer (Can View Leads & Audits)</option>
                  <option value="admin">Super Admin (Full CRUD & Settings Access)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 text-xs text-gray-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-5 py-2 text-xs font-bold text-white transition shadow-lg shadow-blue-500/25"
                >
                  {isCreatingUser ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  <span>Allocate Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
