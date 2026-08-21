"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  Radar, 
  Layers, 
  Users, 
  Settings as SettingsIcon, 
  LogOut,
  Shield,
  ChevronDown,
  Send
} from "lucide-react";
import { getSettings } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { UserProfileModal } from "@/components/UserProfileModal";

export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [totalLeads, setTotalLeads] = useState<number>(0);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    async function checkHealth() {
      try {
        const data = await getSettings();
        setIsHealthy(true);
        setTotalLeads(data.total_leads || 0);
      } catch (err) {
        setIsHealthy(false);
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, [pathname, isAuthenticated]);

  if (pathname === "/login") {
    return (
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/login" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
              <Radar className="h-4.5 w-4.5 text-white animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white">LeadPulse</span>
              <span className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/20">AU PRO</span>
            </div>
          </Link>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Shield className="w-4 h-4 text-blue-400" />
            <span>Workspace Protected</span>
          </div>
        </div>
      </header>
    );
  }

  const navItems = [
    { name: "Scraper Studio", href: "/", icon: Radar },
    { name: "Leads Explorer", href: "/leads", icon: Users },
    { name: "Email Campaigns", href: "/campaigns", icon: Send },
    { name: "Settings & API", href: "/settings", icon: SettingsIcon },
  ];


  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 gap-4">
          {/* Left: Brand */}
          <div className="flex items-center gap-6 shrink-0">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200 shrink-0">
                <Radar className="h-4.5 w-4.5 text-white animate-pulse" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">LeadPulse</span>
                <span className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/20">AU PRO</span>
              </div>
            </Link>
          </div>

          {/* Center: Navigation Links */}
          {isAuthenticated && (
            <nav className="hidden md:flex items-center gap-1.5 shrink-0">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                      isActive
                        ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm"
                        : "text-gray-300 hover:bg-surface-raised hover:text-white border border-transparent"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-blue-400" : "text-gray-400"}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right: Status Badges & Profile */}
          {isAuthenticated && (
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Vault Lead Count */}
              <Link
                href="/leads"
                className="hidden lg:flex items-center gap-2 rounded-xl bg-surface border border-border px-3 py-1.5 text-xs text-gray-300 hover:border-gray-600 transition whitespace-nowrap"
              >
                <Layers className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                <span className="text-gray-400">Vault:</span>
                <span className="font-semibold text-white">{totalLeads.toLocaleString()} Leads</span>
              </Link>

              {/* API Status Badge */}
              <div className="hidden sm:flex items-center gap-2 rounded-xl bg-surface border border-border px-2.5 py-1.5 text-xs whitespace-nowrap">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span
                    className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${
                      isHealthy === true
                        ? "bg-emerald-400"
                        : isHealthy === false
                        ? "bg-rose-400"
                        : "bg-amber-400"
                    }`}
                  />
                  <span
                    className={`relative inline-flex h-2 w-2 rounded-full ${
                      isHealthy === true
                        ? "bg-emerald-500"
                        : isHealthy === false
                        ? "bg-rose-500"
                        : "bg-amber-500"
                    }`}
                  />
                </span>
                <span className="text-gray-300 font-medium">
                  {isHealthy === true ? "API Live" : isHealthy === false ? "API Offline" : "Connecting..."}
                </span>
              </div>

              {/* User Profile Pill Button */}
              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-border hover:border-blue-500/50 hover:bg-surface-raised transition text-xs group cursor-pointer whitespace-nowrap"
                title="Account profile & security settings"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-[10px] text-white uppercase shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  {user?.full_name ? user.full_name.charAt(0) : user?.email?.charAt(0) || "U"}
                </div>
                <div className="flex flex-col text-left leading-tight">
                  <span className="font-medium text-white max-w-[130px] truncate text-[11px] group-hover:text-blue-300 transition-colors">
                    {user?.full_name || user?.email?.split("@")[0] || "User"}
                  </span>
                  <span className={`text-[9px] uppercase font-bold tracking-wider ${
                    isAdmin ? "text-purple-400" : "text-blue-400"
                  }`}>
                    {user?.role || "Member"}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-colors shrink-0 ml-0.5" />
              </button>

              {/* Sign Out Button */}
              <button
                onClick={logout}
                title="Sign out of portal"
                className="p-2 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl border border-transparent hover:border-rose-500/20 transition-colors shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* User Profile & Security Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
}
