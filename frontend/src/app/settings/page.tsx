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
  Calendar,
  Pencil,
  KeyRound,
  Send,
  Zap
} from "lucide-react";
import { 
  getSettings, 
  updateSettings, 
  getUsers, 
  createUser, 
  updateUser, 
  deleteUser, 
  changePassword,
  updateProfile,
  testSmtpConnection
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

  // Email Outreach Settings state
  const [emailProvider, setEmailProvider] = useState<"GRAPH" | "SMTP">("GRAPH");
  const [azureTenantId, setAzureTenantId] = useState<string>("");
  const [azureClientId, setAzureClientId] = useState<string>("");
  const [azureClientSecret, setAzureClientSecret] = useState<string>("");
  const [smtpHost, setSmtpHost] = useState<string>("smtp.office365.com");
  const [smtpPort, setSmtpPort] = useState<number>(587);
  const [smtpEncryption, setSmtpEncryption] = useState<string>("STARTTLS");
  const [smtpUsername, setSmtpUsername] = useState<string>("sales@syntexdev.com");
  const [smtpPassword, setSmtpPassword] = useState<string>("");
  const [senderEmail, setSenderEmail] = useState<string>("dev@syntexdev.com");
  const [senderName, setSenderName] = useState<string>("SyntexDev Dev");
  const [isSavingSmtp, setIsSavingSmtp] = useState<boolean>(false);

  // Test SMTP Modal state
  const [showTestSmtpModal, setShowTestSmtpModal] = useState<boolean>(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState<string>("sales@syntexdev.com");
  const [isTestingSmtp, setIsTestingSmtp] = useState<boolean>(false);
  const [testModalError, setTestModalError] = useState<string | null>(null);
  const [testModalSuccess, setTestModalSuccess] = useState<string | null>(null);

  
  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);
  const [isCreatingUser, setIsCreatingUser] = useState<boolean>(false);
  const [newUserEmail, setNewUserEmail] = useState<string>("");
  const [newUserName, setNewUserName] = useState<string>("");
  const [newUserPassword, setNewUserPassword] = useState<string>("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("member");
  const [showUserModal, setShowUserModal] = useState<boolean>(false);


  // Edit User modal state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editFullName, setEditFullName] = useState<string>("");
  const [editRole, setEditRole] = useState<UserRole>("member");
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editPassword, setEditPassword] = useState<string>("");
  const [isUpdatingUser, setIsUpdatingUser] = useState<boolean>(false);
  
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
      if (data) {
        if (data.email_provider) setEmailProvider((data.email_provider as any) || "GRAPH");
        if (data.azure_tenant_id) setAzureTenantId(data.azure_tenant_id);
        if (data.azure_client_id) setAzureClientId(data.azure_client_id);
        if (data.smtp_host) setSmtpHost(data.smtp_host);
        if (data.smtp_port) setSmtpPort(data.smtp_port);
        if (data.smtp_encryption) setSmtpEncryption(data.smtp_encryption);
        if (data.smtp_username) setSmtpUsername(data.smtp_username);
        if (data.sender_email) setSenderEmail(data.sender_email);
        if (data.sender_name) setSenderName(data.sender_name);
      }
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
      const updated = await updateSettings({ apollo_api_key: apiKeyInput.trim() });
      setSettings(updated);
      setApiKeyInput("");
      showSuccess("Apollo API Key successfully updated and saved to backend/.env");
    } catch (err: any) {
      showError(err.message || "Failed to update Apollo API Key");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyM365Presets = () => {
    setEmailProvider("GRAPH");
    setSenderEmail("dev@syntexdev.com");
    setSenderName("SyntexDev Dev");
    setAzureTenantId("d16c3f82-4193-4a50-a248-f61b0b66046f");
    setSmtpHost("smtp.office365.com");
    setSmtpPort(587);
    setSmtpEncryption("STARTTLS");
    setSmtpUsername("yasir.noor@syntexdev.com");
    showSuccess("Applied Microsoft 365 default connection presets.");
  };

  const handleSaveSmtpSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSmtp(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const updated = await updateSettings({
        email_provider: emailProvider,
        azure_tenant_id: azureTenantId.trim(),
        azure_client_id: azureClientId.trim(),
        azure_client_secret: azureClientSecret.trim() || undefined,
        smtp_host: smtpHost.trim(),
        smtp_port: Number(smtpPort),
        smtp_encryption: smtpEncryption.trim(),
        smtp_username: smtpUsername.trim(),
        smtp_password: smtpPassword.trim() || undefined,
        sender_email: senderEmail.trim(),
        sender_name: senderName.trim(),
      });
      setSettings(updated);
      setSmtpPassword("");
      setAzureClientSecret("");
      showSuccess("Email Outreach Engine settings updated & saved successfully!");
    } catch (err: any) {
      showError(err.message || "Failed to update outreach settings");
    } finally {
      setIsSavingSmtp(false);
    }
  };

  const handleTestSmtpConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestModalError(null);
    setTestModalSuccess(null);
    if (!testEmailRecipient.trim()) {
      setTestModalError("Please enter a recipient email for testing.");
      return;
    }
    setIsTestingSmtp(true);
    try {
      const res = await testSmtpConnection(testEmailRecipient.trim());
      setTestModalSuccess(res.message || `Test email sent successfully to ${testEmailRecipient}`);
      showSuccess(res.message || `Test email sent successfully to ${testEmailRecipient}`);
      setTimeout(() => {
        setShowTestSmtpModal(false);
      }, 2000);
    } catch (err: any) {
      const errorMsg = err.message || "SMTP test failed. Please verify password and M365 settings.";
      setTestModalError(errorMsg);
      showError(errorMsg);
    } finally {
      setIsTestingSmtp(false);
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

  const handleOpenEditModal = (targetUser: User) => {
    setEditingUser(targetUser);
    setEditFullName(targetUser.full_name || "");
    setEditRole(targetUser.role);
    setEditIsActive(targetUser.is_active);
    setEditPassword("");
    setShowEditModal(true);
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsUpdatingUser(true);
    try {
      const payload: {
        full_name?: string;
        role?: UserRole;
        is_active?: boolean;
        password?: string;
      } = {
        full_name: editFullName.trim() || undefined,
        role: editRole,
        is_active: editIsActive,
      };

      if (editPassword.trim()) {
        if (editPassword.length < 6) {
          showError("New password must be at least 6 characters.");
          setIsUpdatingUser(false);
          return;
        }
        payload.password = editPassword.trim();
      }

      await updateUser(editingUser.id, payload);
      showSuccess(`User account ${editingUser.email} updated successfully.`);
      setShowEditModal(false);
      setEditingUser(null);
      loadUsers();
      if (editingUser.id === currentUser?.id) {
        refreshUser();
      }
    } catch (err: any) {
      showError(err.message || "Failed to update user account");
    } finally {
      setIsUpdatingUser(false);
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

          {/* Outreach Email Engine Settings */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Mail className="h-5 w-5 text-blue-400" /> Microsoft 365 Outreach Email Engine
                  </h2>
                  {(emailProvider === "GRAPH" ? (settings?.azure_client_secret_set && settings?.azure_client_id) : settings?.smtp_password_set) ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="h-3 w-3" /> {emailProvider === "GRAPH" ? "Graph API Ready" : "SMTP Connected"}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                      Setup Required
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  Sends automated cold outreach pitches & PDF audit reports directly via your Microsoft 365 account or shared mailbox.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleApplyM365Presets}
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-xl transition"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Apply M365 Presets
                </button>
              </div>
            </div>

            {/* Protocol Selector Tabs */}
            <div className="flex items-center gap-2 p-1 bg-surface-raised border border-border rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setEmailProvider("GRAPH")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  emailProvider === "GRAPH"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Zap className="h-3.5 w-3.5" /> Microsoft Graph API (Modern & Recommended)
              </button>
              <button
                type="button"
                onClick={() => setEmailProvider("SMTP")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  emailProvider === "SMTP"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Mail className="h-3.5 w-3.5" /> Classic SMTP
              </button>
            </div>

            <form onSubmit={handleSaveSmtpSettings} className="space-y-4 text-xs">
              {emailProvider === "GRAPH" ? (
                <>
                  <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3.5 text-xs text-blue-300 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" /> Microsoft Graph OAuth2 Active
                    </p>
                    <p className="text-[11px] text-blue-200/80 leading-relaxed">
                      Sends cold emails and attached PDF dossiers directly through your shared mailbox (e.g. <code>dev@syntexdev.com</code>) without password restrictions or Security Defaults blocks.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Directory (Tenant) ID
                      </label>
                      <input
                        type="text"
                        value={azureTenantId}
                        onChange={(e) => setAzureTenantId(e.target.value)}
                        placeholder="d16c3f82-4193-4a50-a248-f61b0b66046f"
                        className="w-full px-3.5 py-2 rounded-xl bg-surface-raised border border-border text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Application (Client) ID
                      </label>
                      <input
                        type="text"
                        value={azureClientId}
                        onChange={(e) => setAzureClientId(e.target.value)}
                        placeholder="Paste Application (client) ID from App Overview..."
                        className="w-full px-3.5 py-2 rounded-xl bg-surface-raised border border-border text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Client Secret {settings?.azure_client_secret_set && <span className="text-[10px] text-emerald-400 font-normal">(Secret Saved)</span>}
                      </label>
                      <input
                        type="password"
                        value={azureClientSecret}
                        onChange={(e) => setAzureClientSecret(e.target.value)}
                        placeholder={settings?.azure_client_secret_set ? "•••••••••••• (Leave blank to keep)" : "Enter Azure Client Secret Value..."}
                        className="w-full px-3.5 py-2 rounded-xl bg-surface-raised border border-border text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Sender Mailbox</label>
                      <input
                        type="email"
                        value={senderEmail}
                        onChange={(e) => setSenderEmail(e.target.value)}
                        placeholder="dev@syntexdev.com"
                        className="w-full px-3.5 py-2 rounded-xl bg-surface-raised border border-border text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Sender Display Name</label>
                      <input
                        type="text"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder="SyntexDev Dev"
                        className="w-full px-3.5 py-2 rounded-xl bg-surface-raised border border-border text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">SMTP Host</label>
                      <input
                        type="text"
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        placeholder="smtp.office365.com"
                        className="w-full px-3.5 py-2 rounded-xl bg-surface-raised border border-border text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Port</label>
                      <input
                        type="number"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(Number(e.target.value))}
                        placeholder="587"
                        className="w-full px-3.5 py-2 rounded-xl bg-surface-raised border border-border text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Encryption</label>
                      <select
                        value={smtpEncryption}
                        onChange={(e) => setSmtpEncryption(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-surface-raised border border-border text-white focus:border-blue-500 focus:outline-none font-mono"
                      >
                        <option value="STARTTLS">STARTTLS (Port 587)</option>
                        <option value="SSL">SSL / TLS (Port 465)</option>
                        <option value="NONE">None (Plain)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">SMTP Username / M365 Email</label>
                      <input
                        type="email"
                        value={smtpUsername}
                        onChange={(e) => setSmtpUsername(e.target.value)}
                        placeholder="yasir.noor@syntexdev.com"
                        className="w-full px-3.5 py-2 rounded-xl bg-surface-raised border border-border text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        SMTP Password {settings?.smtp_password_set && <span className="text-[10px] text-emerald-400 font-normal">(Password Saved)</span>}
                      </label>
                      <input
                        type="password"
                        value={smtpPassword}
                        onChange={(e) => setSmtpPassword(e.target.value)}
                        placeholder={settings?.smtp_password_set ? "•••••••••••• (Leave blank to keep)" : "Enter M365 Password or App Password..."}
                        className="w-full px-3.5 py-2 rounded-xl bg-surface-raised border border-border text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">From Sender Email</label>
                      <input
                        type="email"
                        value={senderEmail}
                        onChange={(e) => setSenderEmail(e.target.value)}
                        placeholder="dev@syntexdev.com"
                        className="w-full px-3.5 py-2 rounded-xl bg-surface-raised border border-border text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">From Sender Name</label>
                      <input
                        type="text"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder="SyntexDev Dev"
                        className="w-full px-3.5 py-2 rounded-xl bg-surface-raised border border-border text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setShowTestSmtpModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-raised hover:bg-border border border-border text-xs font-semibold text-gray-200 transition"
                >
                  <Send className="h-3.5 w-3.5 text-blue-400" /> Send Test Email
                </button>

                <button
                  type="submit"
                  disabled={isSavingSmtp}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-xs font-bold text-white transition disabled:opacity-40 shadow-lg shadow-blue-600/20"
                >
                  {isSavingSmtp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Email Settings
                </button>
              </div>
            </form>
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
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Edit Button */}
                            <button
                              onClick={() => handleOpenEditModal(u)}
                              className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
                              title="Edit user details, role & password"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            {/* Delete Button */}
                            {!isSelf && (
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                                title="Delete user"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
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

      {/* Modal: Edit User Details, Role & Password */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#0f172a] border border-border p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-400" />
                <span>Edit User: {editingUser.email}</span>
              </h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                }}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-raised border border-border text-xs text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Access Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  disabled={editingUser.id === currentUser?.id}
                  className={`w-full px-4 py-2.5 rounded-xl bg-surface-raised border border-border text-xs text-white focus:border-blue-500 focus:outline-none transition ${
                    editingUser.id === currentUser?.id ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                >
                  <option value="member">Member (Can Scrape & Export Leads)</option>
                  <option value="viewer">Viewer (Can View Leads & Audits)</option>
                  <option value="admin">Super Admin (Full CRUD & Settings Access)</option>
                </select>
                {editingUser.id === currentUser?.id && (
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    You cannot change your own admin role.
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Account Status
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={editingUser.id === currentUser?.id}
                    onClick={() => setEditIsActive(true)}
                    className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      editIsActive
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-sm"
                        : "bg-surface-raised border-border text-gray-400 hover:text-white"
                    } ${editingUser.id === currentUser?.id ? "cursor-not-allowed opacity-80" : ""}`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Active</span>
                  </button>

                  <button
                    type="button"
                    disabled={editingUser.id === currentUser?.id}
                    onClick={() => setEditIsActive(false)}
                    className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      !editIsActive
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-sm"
                        : "bg-surface-raised border-border text-gray-400 hover:text-white"
                    } ${editingUser.id === currentUser?.id ? "cursor-not-allowed opacity-80" : ""}`}
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Deactivated</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center justify-between">
                  <span>Reset Password (Optional)</span>
                  <span className="text-[10px] text-gray-500 font-normal">Leave blank to keep unchanged</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <KeyRound className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Enter new password (min 6 characters)..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface-raised border border-border text-xs text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 text-xs text-gray-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingUser}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-5 py-2 text-xs font-bold text-white transition shadow-lg shadow-blue-500/25"
                >
                  {isUpdatingUser ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Test SMTP Connection Modal */}
      {showTestSmtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Send className="h-4 w-4 text-blue-400" /> Send Test Diagnostic Email
              </h3>
              <button
                type="button"
                onClick={() => setShowTestSmtpModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-300">
              Verify your Microsoft 365 SMTP connection by sending a diagnostic test email.
            </p>

            {testModalSuccess && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
                <div>
                  <p className="font-semibold">Connection Verified!</p>
                  <p className="mt-0.5 text-[11px] text-emerald-300/80">{testModalSuccess}</p>
                </div>
              </div>
            )}

            {testModalError && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                <div className="space-y-1">
                  <p className="font-semibold">SMTP Connection Failed</p>
                  <p className="text-[11px] text-rose-200/90 leading-relaxed break-words">{testModalError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleTestSmtpConnection} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Recipient Email Address
                </label>
                <input
                  type="email"
                  required
                  value={testEmailRecipient}
                  onChange={(e) => setTestEmailRecipient(e.target.value)}
                  placeholder="sales@syntexdev.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-raised border border-border text-xs text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTestSmtpModal(false)}
                  className="px-4 py-2 text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isTestingSmtp}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-xs font-bold text-white transition disabled:opacity-50"
                >
                  {isTestingSmtp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isTestingSmtp ? "Dispatching..." : "Send Test Email"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

