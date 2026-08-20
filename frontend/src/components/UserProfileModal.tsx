"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { updateProfile, changePassword } from "@/lib/api";
import { 
  User as UserIcon, 
  Mail, 
  Shield, 
  Lock, 
  Save, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Calendar,
  KeyRound,
  Users,
  LogOut
} from "lucide-react";
import Link from "next/link";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { user, isAdmin, refreshUser, logout } = useAuth();
  
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");
  
  // Profile edit fields
  const [fullName, setFullName] = useState<string>(user?.full_name || "");
  const [email, setEmail] = useState<string>(user?.email || "");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState<boolean>(false);
  
  // Password change fields
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);
  
  // Messages
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg(null);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      showError("Email cannot be empty.");
      return;
    }

    setIsUpdatingProfile(true);
    try {
      await updateProfile({
        full_name: fullName.trim() || undefined,
        email: email.trim().toLowerCase(),
      });
      await refreshUser();
      showSuccess("Profile details updated successfully!");
    } catch (err: any) {
      showError(err?.message || "Failed to update profile.");
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
      showSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      showError(err?.message || "Failed to change password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-[#0f172a] border border-border/80 shadow-2xl shadow-black/60 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-border/60 bg-gradient-to-r from-blue-900/20 via-indigo-900/20 to-purple-900/20 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-blue-500/20">
              {user.full_name ? user.full_name.charAt(0) : user.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">
                  {user.full_name || "Account Profile"}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  isAdmin 
                    ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" 
                    : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                }`}>
                  {user.role}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-surface-raised transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center border-b border-border/60 px-6 bg-surface-raised/40">
          <button
            onClick={() => setActiveTab("profile")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "profile"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Profile Information</span>
          </button>
          <button
            onClick={() => setActiveTab("password")}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "password"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Change Password</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: Profile Details & Edit */}
          {activeTab === "profile" && (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Display Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Super Admin"
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-raised border border-border rounded-xl text-white placeholder-gray-500 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Account Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-raised border border-border rounded-xl text-white placeholder-gray-500 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              {/* Account Metadata Box */}
              <div className="p-3.5 rounded-xl bg-surface-raised/70 border border-border/80 text-xs text-gray-400 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-gray-300">
                    <Shield className="w-3.5 h-3.5 text-blue-400" /> Allocated Role:
                  </span>
                  <span className="font-semibold text-white uppercase">{user.role}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-gray-300">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Member Since:
                  </span>
                  <span className="text-gray-200">{new Date(user.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-400">User ID:</span>
                  <span className="font-mono text-gray-400 truncate max-w-[200px]">{user.id}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-xs font-bold text-white transition shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  {isUpdatingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Change Password */}
          {activeTab === "password" && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-raised border border-border rounded-xl text-white placeholder-gray-500 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  New Password (min 6 characters)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-raised border border-border rounded-xl text-white placeholder-gray-500 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-raised border border-border rounded-xl text-white placeholder-gray-500 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-xs font-bold text-white transition shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  {isChangingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer Quick Shortcuts */}
        <div className="p-4 border-t border-border/60 bg-surface/80 flex items-center justify-between text-xs">
          {isAdmin ? (
            <Link
              href="/settings"
              onClick={onClose}
              className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-medium"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Allocated Team Users</span>
            </Link>
          ) : (
            <span className="text-gray-500">LeadPulse AU Enterprise</span>
          )}

          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 font-medium px-3 py-1.5 rounded-lg hover:bg-rose-500/10 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
