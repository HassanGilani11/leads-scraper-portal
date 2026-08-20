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
  Layers,
  Sparkles,
  ExternalLink,
  Activity,
  Zap,
  Info
} from "lucide-react";
import { getSettings, updateSettings } from "@/lib/api";
import { SettingsResponse } from "@/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState<string>("");
  const [showKey, setShowKey] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      const data = await getSettings();
      setSettings(data);
    } catch (err: any) {
      setErrorMessage("Failed to load settings from backend");
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) {
      setErrorMessage("Please enter an Apollo API Key or keep existing");
      return;
    }

    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const updated = await updateSettings(apiKeyInput.trim());
      setSettings(updated);
      setApiKeyInput("");
      setSuccessMessage("Apollo API Key successfully updated and saved to backend/.env");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update Apollo API Key");
    } finally {
      setIsSaving(false);
    }
  };

  const isRateLimited = settings?.apollo_hourly_requests_left === 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="border-b border-border pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Key className="h-6 w-6 text-blue-400" />
          <span>System Settings & Apollo API Integration</span>
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Manage enrichment credentials, monitor Apollo.io API rate limits, and inspect backend health.
        </p>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-xs text-emerald-400 flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs text-rose-400 flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Card 1: Apollo.io API Integration & Live Quota */}
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
              Enriches Australian leads with decision-maker executive names, emails, LinkedIn URLs, tech stack, and company firmographics.
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

        {/* Live Apollo Rate Limit & Status Banner */}
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

            {isRateLimited && (
              <p className="text-[11px] text-amber-300/90 leading-relaxed">
                <Info className="h-3.5 w-3.5 inline mr-1" />
                Your Apollo free tier limit of 200 requests/hour has been reached. The scraper will automatically use our <strong>Deep Website Crawler</strong> (extracting direct email, phone, ABN, and socials) until Apollo resets.
              </p>
            )}
          </div>
        )}

        {/* Current Masked Key Display */}
        {settings?.apollo_api_key_set && (
          <div className="rounded-xl bg-surface-raised border border-border p-4 flex items-center justify-between text-xs">
            <div className="space-y-1">
              <span className="text-gray-400">Current Key in backend/.env:</span>
              <p className="font-mono text-gray-200 text-sm font-semibold tracking-wider">
                {settings.apollo_api_key_masked}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 font-medium">
                Saved & Active
              </span>
            </div>
          </div>
        )}

        {/* Update Form */}
        <form onSubmit={handleSave} className="space-y-4">
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
      </div>

      {/* Card 2: System Diagnostics & Health */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Server className="h-5 w-5 text-indigo-400" />
          Subsystem Diagnostics & Architecture
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* Diagnostic 1: Database */}
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

          {/* Diagnostic 2: Playwright */}
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

          {/* Diagnostic 3: Multi-threading */}
          <div className="rounded-xl bg-surface-raised border border-border p-4 space-y-2">
            <div className="flex items-center justify-between text-gray-400">
              <span className="font-semibold flex items-center gap-1.5 text-white">
                <Sparkles className="h-4 w-4 text-indigo-400" /> Dual-Layer Enrichment
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-gray-300">Apollo REST + Deep Web</p>
            <p className="text-[11px] text-gray-500">10 concurrent workers</p>
          </div>
        </div>
      </div>
    </div>
  );
}
