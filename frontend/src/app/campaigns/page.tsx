"use client";

import { useState, useEffect } from "react";
import { 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Mail, 
  ShieldCheck, 
  Activity, 
  Settings, 
  Loader2, 
  Calendar,
  Search,
  ExternalLink
} from "lucide-react";
import { getEmailLogs, getCampaignStats } from "@/lib/api";
import { EmailLog, CampaignStats } from "@/types";
import { AuthGuard } from "@/components/AuthGuard";
import Link from "next/link";

export default function CampaignsPage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setError(null);
    try {
      const [logsData, statsData] = await Promise.all([
        getEmailLogs(100),
        getCampaignStats(),
      ]);
      setLogs(logsData);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || "Failed to load outreach logs from server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      log.recipient_email.toLowerCase().includes(q) ||
      log.subject.toLowerCase().includes(q) ||
      log.status.toLowerCase().includes(q)
    );
  });

  return (
    <AuthGuard>
      <div className="space-y-6 animate-fadeIn pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-400 border border-blue-500/20">
                Microsoft 365 Engine
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-1.5 flex items-center gap-2.5">
              <Send className="h-6 w-6 text-blue-400" /> Cold Outreach Email Dashboard
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Track live deliverability, sent pitch dossiers, and SMTP email dispatch logs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-border text-xs font-semibold text-gray-200 hover:text-white hover:bg-surface-raised transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-blue-400" : ""}`} />
              <span>Refresh Logs</span>
            </button>

            <Link
              href="/settings"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition shadow-lg shadow-blue-600/20"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>SMTP Settings</span>
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs text-rose-400 flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Stats Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-xl space-y-1">
            <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-blue-400" /> Total Dispatches
            </span>
            <div className="text-2xl font-extrabold text-white font-mono">
              {stats ? stats.total_emails_sent : 0}
            </div>
            <p className="text-[11px] text-gray-500">Cold emails sent via M365</p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 shadow-xl space-y-1">
            <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Delivered Successfully
            </span>
            <div className="text-2xl font-extrabold text-emerald-400 font-mono">
              {stats ? stats.successful_deliveries : 0}
            </div>
            <p className="text-[11px] text-gray-500">Confirmed SMTP transfers</p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 shadow-xl space-y-1">
            <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-rose-400" /> Delivery Failures
            </span>
            <div className="text-2xl font-extrabold text-rose-400 font-mono">
              {stats ? stats.failed_deliveries : 0}
            </div>
            <p className="text-[11px] text-gray-500">SMTP auth or network errors</p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 shadow-xl space-y-1">
            <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-indigo-400" /> Deliverability Rate
            </span>
            <div className="text-2xl font-extrabold text-indigo-400 font-mono">
              {stats ? `${stats.success_rate_percentage}%` : "100%"}
            </div>
            <p className="text-[11px] text-gray-500">Overall success percentage</p>
          </div>
        </div>

        {/* Dispatch History Log Table */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="h-4.5 w-4.5 text-blue-400" /> Dispatch History & Status Logs
            </h2>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Search recipient or subject..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-surface-raised border border-border text-xs text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-gray-400 flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
              <span className="text-xs">Loading email outreach logs...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-16 text-center text-gray-400 border border-dashed border-border rounded-xl">
              <Mail className="h-8 w-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-300">No Outreach Emails Dispatched Yet</p>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                Audited leads can be emailed directly from the Leads Vault by clicking "Send Pitch Email" inside the Audit Dossier view.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-gray-400 font-semibold bg-surface-raised/40">
                    <th className="py-3 px-4">Date / Time</th>
                    <th className="py-3 px-4">Recipient Email</th>
                    <th className="py-3 px-4">Subject Line</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-gray-300">
                  {filteredLogs.map((log) => {
                    const dateStr = new Date(log.sent_at).toLocaleString("en-AU", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    });
                    return (
                      <tr key={log.id} className="hover:bg-surface-raised/50 transition">
                        <td className="py-3 px-4 text-gray-400 whitespace-nowrap font-mono text-[11px]">
                          {dateStr}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">
                          {log.recipient_email}
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-gray-300">
                          {log.subject}
                        </td>
                        <td className="py-3 px-4">
                          {log.status === "sent" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                              <CheckCircle2 className="h-3 w-3" /> Delivered
                            </span>
                          ) : log.status === "failed" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full">
                              <AlertCircle className="h-3 w-3" /> Failed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-400 max-w-xs truncate">
                          {log.error_message ? (
                            <span className="text-rose-400 font-mono text-[11px]">{log.error_message}</span>
                          ) : (
                            <span className="text-gray-500">PDF Audit Attached</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
