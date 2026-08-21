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
  Plus,
  Zap,
  Play,
  Square,
  FileText,
  Clock,
  ChevronRight,
  Sparkles,
  Layers,
  Filter,
  Eye,
  Sliders
} from "lucide-react";
import { 
  getEmailLogs, 
  getCampaignStats, 
  listCampaigns, 
  createAndDispatchCampaign, 
  cancelCampaign,
  getCampaignDetail
} from "@/lib/api";
import { EmailLog, CampaignStats, Campaign, CampaignDetail } from "@/types";
import { AuthGuard } from "@/components/AuthGuard";
import Link from "next/link";

const PREMADE_TEMPLATES = [
  {
    name: "Website Technical Audit & Speed Optimization",
    subject: "Technical Audit & Performance Insights for {{company_name}}",
    body: `<p>Hi {{first_name}},</p>
<p>I was analyzing top service providers in <strong>{{city}}</strong> and came across <strong>{{company_name}}</strong>.</p>
<p>Our team ran a comprehensive technical audit on your website (<strong>{{website}}</strong>) and generated a detailed <strong>Technical Website Audit Dossier</strong> for you.</p>
<p>Your current website technical score is <strong>{{audit_score}}/100</strong>. We identified 3 key optimization areas that could significantly increase your organic lead conversion and mobile speed.</p>
<p>I have attached the complete PDF Audit Report to this email for your review.</p>
<p>Would you have 10 minutes this Thursday for a brief chat to walk through the fixes?</p>
<p>Best regards,<br>SyntexDev Growth Team<br>dev@syntexdev.com</p>`
  },
  {
    name: "B2B Lead Acquisition & Modernization Pitch",
    subject: "Quick question regarding lead acquisition at {{company_name}}",
    body: `<p>Hi {{first_name}},</p>
<p>I hope your week in <strong>{{city}}</strong> is going well.</p>
<p>We recently helped similar businesses in {{state}} scale their inbound client pipeline by modernizing their digital infrastructure.</p>
<p>I noticed a few quick high-impact improvements on <strong>{{website}}</strong> that could help you capture more qualified commercial inquiries.</p>
<p>I've attached a complimentary technical benchmark dossier to give your team a transparent overview.</p>
<p>Are you open to a 5-minute call next week to see how we can help {{company_name}} grow?</p>
<p>Best regards,<br>SyntexDev Growth Team</p>`
  }
];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignDetail | null>(null);
  const [isLoadingCampaignDetail, setIsLoadingCampaignDetail] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New Campaign Wizard State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [isSubmittingCampaign, setIsSubmittingCampaign] = useState<boolean>(false);
  const [campaignName, setCampaignName] = useState<string>("");
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState<number>(0);
  const [subjectTemplate, setSubjectTemplate] = useState<string>(PREMADE_TEMPLATES[0].subject);
  const [bodyTemplate, setBodyTemplate] = useState<string>(PREMADE_TEMPLATES[0].body);
  const [stateFilter, setStateFilter] = useState<string>("ALL");
  const [nicheFilter, setNicheFilter] = useState<string>("");
  const [minScore, setMinScore] = useState<number>(0);
  const [attachPdf, setAttachPdf] = useState<boolean>(true);
  const [delayMin, setDelayMin] = useState<number>(45);
  const [delayMax, setDelayMax] = useState<number>(90);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  const loadData = async () => {
    setError(null);
    try {
      const [campaignsData, logsData, statsData] = await Promise.all([
        listCampaigns(50),
        getEmailLogs(100),
        getCampaignStats(),
      ]);
      setCampaigns(campaignsData);
      setLogs(logsData);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || "Failed to load campaign data from server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      listCampaigns(50).then(setCampaigns).catch(() => {});
      getCampaignStats().then(setStats).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSelectTemplate = (idx: number) => {
    setSelectedTemplateIndex(idx);
    setSubjectTemplate(PREMADE_TEMPLATES[idx].subject);
    setBodyTemplate(PREMADE_TEMPLATES[idx].body);
  };

  const insertTag = (tag: string) => {
    setBodyTemplate((prev) => prev + ` ${tag} `);
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName.trim()) {
      setError("Please give your campaign a descriptive name.");
      return;
    }
    if (!subjectTemplate.trim() || !bodyTemplate.trim()) {
      setError("Subject and email body template cannot be empty.");
      return;
    }

    setIsSubmittingCampaign(true);
    setError(null);

    try {
      const newCampaign = await createAndDispatchCampaign({
        name: campaignName.trim(),
        subject_template: subjectTemplate.trim(),
        body_template: bodyTemplate.trim(),
        state_filter: stateFilter !== "ALL" ? stateFilter : undefined,
        niche_filter: nicheFilter.trim() || undefined,
        min_score: minScore > 0 ? minScore : undefined,
        attach_pdf: attachPdf,
        delay_min_seconds: delayMin,
        delay_max_seconds: delayMax,
      });

      setSuccessMessage(`Campaign '${newCampaign.name}' created! Background worker is now pacing dispatches.`);
      setShowCreateModal(false);
      setCampaignName("");
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to create and dispatch campaign.");
    } finally {
      setIsSubmittingCampaign(false);
    }
  };

  const handleCancelCampaign = async (campaignId: string) => {
    try {
      await cancelCampaign(campaignId);
      setSuccessMessage("Campaign cancelled.");
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to cancel campaign.");
    }
  };

  const handleViewCampaignDetail = async (campaignId: string) => {
    setIsLoadingCampaignDetail(true);
    try {
      const detail = await getCampaignDetail(campaignId);
      setSelectedCampaign(detail);
    } catch (err: any) {
      setError(err.message || "Failed to load campaign details.");
    } finally {
      setIsLoadingCampaignDetail(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      log.recipient_email.toLowerCase().includes(q) ||
      log.subject.toLowerCase().includes(q) ||
      log.status.toLowerCase().includes(q) ||
      (log.business_name && log.business_name.toLowerCase().includes(q))
    );
  });

  return (
    <AuthGuard>
      <div className="space-y-6 animate-fadeIn pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
                <Zap className="h-3 w-3" /> Microsoft Graph OAuth2 Active
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-1.5 flex items-center gap-2.5">
              <Send className="h-6 w-6 text-blue-400" /> Cold Outreach Email Dashboard
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Launch domain-protected cold outreach campaigns with randomized jitter pacing & PDF technical audit dossiers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface border border-border text-xs font-semibold text-gray-200 hover:text-white hover:bg-surface-raised transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-blue-400" : ""}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => {
                setCampaignName(`Outreach Batch ${new Date().toLocaleDateString("en-AU")}`);
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition shadow-lg shadow-blue-600/20"
            >
              <Plus className="h-4 w-4" />
              <span>New Campaign</span>
            </button>

            <Link
              href="/settings"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface border border-border text-xs font-semibold text-gray-400 hover:text-white hover:bg-surface-raised transition"
            >
              <Settings className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs text-rose-300 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-white text-xs">✕</button>
          </div>
        )}

        {successMessage && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-xs text-emerald-300 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-white text-xs">✕</button>
          </div>
        )}

        {/* Stats Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-xl space-y-1">
            <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-blue-400" /> Total Campaigns
            </span>
            <div className="text-2xl font-extrabold text-white font-mono">
              {stats ? stats.total_campaigns : 0}
            </div>
            <p className="text-[11px] text-gray-500">Active and completed runs</p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 shadow-xl space-y-1">
            <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Delivered Emails
            </span>
            <div className="text-2xl font-extrabold text-emerald-400 font-mono">
              {stats ? stats.successful_deliveries : 0}
            </div>
            <p className="text-[11px] text-gray-500">Via M365 Graph / SMTP</p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 shadow-xl space-y-1">
            <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-rose-400" /> Failed Transfers
            </span>
            <div className="text-2xl font-extrabold text-rose-400 font-mono">
              {stats ? stats.failed_deliveries : 0}
            </div>
            <p className="text-[11px] text-gray-500">Bad addresses or rejections</p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 shadow-xl space-y-1">
            <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-indigo-400" /> Deliverability Health
            </span>
            <div className="text-2xl font-extrabold text-indigo-400 font-mono">
              {stats && stats.total_emails_sent > 0 ? `${stats.success_rate_percentage}%` : "100%"}
            </div>
            <p className="text-[11px] text-gray-500">Domain reputation status</p>
          </div>
        </div>

        {/* Active & Historical Campaigns Section */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Play className="h-4 w-4 text-blue-400" /> Multi-Lead Outreach Campaigns
              </h2>
              <p className="text-xs text-gray-400">
                Live background batches dispatched with domain-safe randomized interval timing.
              </p>
            </div>

            <button
              onClick={() => {
                setCampaignName(`Outreach Batch ${new Date().toLocaleDateString("en-AU")}`);
                setShowCreateModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/10 border border-blue-500/20 text-xs font-semibold text-blue-400 hover:text-blue-300 transition"
            >
              <Plus className="h-3.5 w-3.5" /> Launch Batch
            </button>
          </div>

          {campaigns.length === 0 ? (
            <div className="py-10 text-center text-gray-400 border border-dashed border-border rounded-xl">
              <Layers className="h-8 w-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-300">No Multi-Lead Campaigns Launched Yet</p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Create a campaign to automatically pace cold emails across your vault of Australian leads.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaigns.map((camp) => {
                const total = camp.total_leads || 1;
                const progressPct = Math.min(100, Math.round(((camp.sent_count + camp.failed_count) / total) * 100));

                return (
                  <div
                    key={camp.id}
                    className="rounded-xl bg-surface-raised border border-border p-4 space-y-3.5 hover:border-blue-500/40 transition flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-xs font-bold text-white truncate max-w-[200px]">
                          {camp.name}
                        </h3>
                        {camp.status === "running" ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full animate-pulse">
                            <Clock className="h-2.5 w-2.5 animate-spin" /> Pacing ({camp.delay_min_seconds}-{camp.delay_max_seconds}s)
                          </span>
                        ) : camp.status === "completed" ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Completed
                          </span>
                        ) : camp.status === "cancelled" ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-gray-500/10 border border-gray-500/20 px-2 py-0.5 rounded-full">
                            Cancelled
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                            Queued
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-gray-400 truncate">
                        {camp.subject_template}
                      </p>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-gray-400">
                          <span>Progress</span>
                          <span className="font-mono">{camp.sent_count} / {camp.total_leads} ({progressPct}%)</span>
                        </div>
                        <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden border border-border">
                          <div
                            className={`h-full transition-all duration-500 ${
                              camp.status === "completed" ? "bg-emerald-500" : "bg-blue-500"
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px]">
                      <span className="text-gray-500 font-mono">
                        {new Date(camp.created_at).toLocaleDateString("en-AU")}
                      </span>

                      <div className="flex items-center gap-2">
                        {camp.status === "running" && (
                          <button
                            type="button"
                            onClick={() => handleCancelCampaign(camp.id)}
                            className="text-rose-400 hover:text-rose-300 font-semibold text-[10px] flex items-center gap-1"
                          >
                            <Square className="h-2.5 w-2.5" /> Stop
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleViewCampaignDetail(camp.id)}
                          className="text-blue-400 hover:text-blue-300 font-semibold text-[10px] flex items-center gap-0.5"
                        >
                          Logs <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Global Dispatch History Log Table */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="h-4.5 w-4.5 text-blue-400" /> Live Deliverability & Email Logs
            </h2>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Filter by business, email, status..."
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
            <div className="py-14 text-center text-gray-400 border border-dashed border-border rounded-xl">
              <Mail className="h-8 w-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-300">No Outreach Emails Found</p>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                Dispatched emails and audit pitch dossiers will show here with real-time delivery logs.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-gray-400 font-semibold bg-surface-raised/40">
                    <th className="py-3 px-4">Date / Time</th>
                    <th className="py-3 px-4">Business / Lead</th>
                    <th className="py-3 px-4">Recipient Email</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Attachment</th>
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
                          {log.business_name || "Lead Record"}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-blue-300">
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
                              Queued
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[11px] text-gray-400">
                          {log.attached_pdf ? (
                            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                              <FileText className="h-3 w-3" /> PDF Dossier
                            </span>
                          ) : (
                            <span className="text-gray-500">None</span>
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

        {/* Create Campaign Modal / Wizard */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-3xl rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-400" /> Launch Multi-Lead Outreach Campaign
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateCampaign} className="space-y-5 text-xs">
                {/* Campaign Name & Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-gray-300 mb-1">Campaign Name</label>
                    <input
                      type="text"
                      required
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      placeholder="e.g. Solar Contractors Sydney - Batch 1"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-raised border border-border text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-300 mb-1">Target State / Region</label>
                    <select
                      value={stateFilter}
                      onChange={(e) => setStateFilter(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-raised border border-border text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="ALL">All States (Australia-wide)</option>
                      <option value="NSW">NSW (New South Wales)</option>
                      <option value="VIC">VIC (Victoria)</option>
                      <option value="QLD">QLD (Queensland)</option>
                      <option value="WA">WA (Western Australia)</option>
                      <option value="SA">SA (South Australia)</option>
                      <option value="TAS">TAS (Tasmania)</option>
                      <option value="ACT">ACT (Australian Capital Territory)</option>
                    </select>
                  </div>
                </div>

                {/* Pre-made Templates */}
                <div className="space-y-2">
                  <label className="block font-semibold text-gray-300">Choose Pitch Strategy</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PREMADE_TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectTemplate(idx)}
                        className={`text-left p-3 rounded-xl border transition ${
                          selectedTemplateIndex === idx
                            ? "bg-blue-600/10 border-blue-500 text-white"
                            : "bg-surface-raised border-border text-gray-300 hover:border-gray-600"
                        }`}
                      >
                        <p className="font-bold text-xs">{tmpl.name}</p>
                        <p className="text-[11px] text-gray-400 mt-1 truncate">{tmpl.subject}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject Line */}
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Email Subject Line</label>
                  <input
                    type="text"
                    required
                    value={subjectTemplate}
                    onChange={(e) => setSubjectTemplate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-raised border border-border text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Merge Tags Quick Chips */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-gray-400">Insert Dynamic Personalization Tag:</span>
                    <div className="flex items-center gap-1 bg-surface-raised p-0.5 rounded-lg border border-border">
                      <button
                        type="button"
                        onClick={() => setActiveTab("edit")}
                        className={`px-2.5 py-1 rounded text-[10px] font-semibold transition ${
                          activeTab === "edit" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
                        }`}
                      >
                        HTML Code
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("preview")}
                        className={`px-2.5 py-1 rounded text-[10px] font-semibold transition ${
                          activeTab === "preview" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
                        }`}
                      >
                        Live Preview
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "{{company_name}}",
                      "{{first_name}}",
                      "{{contact_name}}",
                      "{{city}}",
                      "{{state}}",
                      "{{website}}",
                      "{{audit_score}}",
                      "{{phone}}",
                    ].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => insertTag(tag)}
                        className="px-2 py-0.5 rounded-md bg-surface-raised border border-border text-[10px] font-mono text-blue-400 hover:bg-blue-500/20 transition"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Body Content / Preview */}
                {activeTab === "edit" ? (
                  <div>
                    <textarea
                      rows={8}
                      required
                      value={bodyTemplate}
                      onChange={(e) => setBodyTemplate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-raised border border-border text-white font-mono text-xs focus:border-blue-500 focus:outline-none custom-scrollbar"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-white p-5 text-gray-900 min-h-[160px] prose prose-sm max-w-none">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: bodyTemplate
                          .replace(/{{company_name}}/g, "Apex Solar Solutions")
                          .replace(/{{first_name}}/g, "Mark")
                          .replace(/{{contact_name}}/g, "Mark Stevens")
                          .replace(/{{city}}/g, "Brisbane")
                          .replace(/{{state}}/g, "QLD")
                          .replace(/{{website}}/g, "apexsolar.com.au")
                          .replace(/{{audit_score}}/g, "78")
                          .replace(/{{phone}}/g, "(07) 3100 4500"),
                      }}
                    />
                  </div>
                )}

                {/* Domain Protection Timing & PDF Attachment */}
                <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-blue-400" />
                      <span className="font-bold text-white text-xs">Domain Safety & Pacing (Jitter)</span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={attachPdf}
                        onChange={(e) => setAttachPdf(e.target.checked)}
                        className="rounded bg-surface-raised border-border text-blue-600 focus:ring-0"
                      />
                      <span className="font-semibold text-gray-300 text-xs">Auto-Attach PDF Audit Dossier</span>
                    </label>
                  </div>

                  <p className="text-[11px] text-blue-200/80 leading-relaxed">
                    To keep <code>syntexdev.com</code> off spam blacklists, the engine waits a randomized interval between consecutive emails.
                  </p>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-300 mb-1">Min Delay (Seconds)</label>
                      <input
                        type="number"
                        min={10}
                        max={180}
                        value={delayMin}
                        onChange={(e) => setDelayMin(Number(e.target.value))}
                        className="w-full px-3 py-1.5 rounded-lg bg-surface border border-border text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-300 mb-1">Max Delay (Seconds)</label>
                      <input
                        type="number"
                        min={delayMin}
                        max={300}
                        value={delayMax}
                        onChange={(e) => setDelayMax(Number(e.target.value))}
                        className="w-full px-3 py-1.5 rounded-lg bg-surface border border-border text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-xs text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingCampaign}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-6 py-2.5 text-xs font-bold text-white transition disabled:opacity-50 shadow-lg shadow-blue-600/20"
                  >
                    {isSubmittingCampaign ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {isSubmittingCampaign ? "Dispatching..." : "Launch Campaign"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Campaign Detail Modal */}
        {selectedCampaign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-400" /> {selectedCampaign.name}
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedCampaign(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="rounded-xl bg-surface-raised p-3 border border-border">
                  <p className="text-gray-400 text-[10px]">Total Leads</p>
                  <p className="text-base font-extrabold text-white mt-0.5">{selectedCampaign.total_leads}</p>
                </div>
                <div className="rounded-xl bg-surface-raised p-3 border border-border">
                  <p className="text-gray-400 text-[10px]">Delivered</p>
                  <p className="text-base font-extrabold text-emerald-400 mt-0.5">{selectedCampaign.sent_count}</p>
                </div>
                <div className="rounded-xl bg-surface-raised p-3 border border-border">
                  <p className="text-gray-400 text-[10px]">Failed</p>
                  <p className="text-base font-extrabold text-rose-400 mt-0.5">{selectedCampaign.failed_count}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-300">Recipient Dispatch History</h4>
                {selectedCampaign.logs.length === 0 ? (
                  <p className="text-xs text-gray-500 py-4 text-center">No emails dispatched yet in this campaign.</p>
                ) : (
                  <div className="divide-y divide-border/60 max-h-60 overflow-y-auto custom-scrollbar">
                    {selectedCampaign.logs.map((log) => (
                      <div key={log.id} className="py-2 flex items-center justify-between text-xs">
                        <div className="truncate max-w-xs">
                          <p className="font-semibold text-white truncate">{log.business_name || log.recipient_email}</p>
                          <p className="text-[11px] text-gray-400 truncate">{log.subject}</p>
                        </div>
                        <div>
                          {log.status === "sent" ? (
                            <span className="text-emerald-400 font-semibold text-[10px]">Delivered</span>
                          ) : (
                            <span className="text-rose-400 font-semibold text-[10px]">Failed</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
