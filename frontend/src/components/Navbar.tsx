"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  Radar, 
  Layers, 
  Users, 
  Settings as SettingsIcon, 
  Activity, 
  DownloadCloud,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { getSettings } from "@/lib/api";

export function Navbar() {
  const pathname = usePathname();
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [totalLeads, setTotalLeads] = useState<number>(0);

  useEffect(() => {
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
  }, [pathname]);

  const navItems = [
    { name: "Scraper Studio", href: "/", icon: Radar },
    { name: "Leads Explorer", href: "/leads", icon: Users },
    { name: "Settings & API", href: "/settings", icon: SettingsIcon },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
              <Radar className="h-5 w-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">LeadPulse</span>
                <span className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/20">AU PRO</span>
              </div>
              <p className="text-[11px] text-gray-400 hidden sm:block">Australian Scraper & Apollo Enrichment</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-surface-raised text-blue-400 border border-blue-500/30 shadow-sm"
                      : "text-gray-300 hover:bg-surface-raised/60 hover:text-white"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-blue-400" : "text-gray-400"}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Status Badges */}
        <div className="flex items-center gap-3">
          {/* Quick Leads Count */}
          <Link
            href="/leads"
            className="hidden sm:flex items-center gap-2 rounded-lg bg-surface border border-border px-3 py-1.5 text-xs text-gray-300 hover:border-gray-600 transition"
          >
            <Layers className="h-3.5 w-3.5 text-indigo-400" />
            <span>Vault:</span>
            <span className="font-semibold text-white">{totalLeads.toLocaleString()} Leads</span>
          </Link>

          {/* Backend Status Indicator */}
          <div className="flex items-center gap-2 rounded-lg bg-surface border border-border px-3 py-1.5 text-xs">
            <span className="relative flex h-2 w-2">
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
            <span className="text-gray-300 hidden sm:inline">
              {isHealthy === true ? "API Live" : isHealthy === false ? "API Offline" : "Connecting..."}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
