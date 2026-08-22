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
  Sliders,
  GitBranch,
  ArrowRight,
  Trash2,
  Pause,
  UserCheck,
  CheckSquare,
  MessageSquare
} from "lucide-react";
import { 
  getEmailLogs, 
  getCampaignStats, 
  listCampaigns, 
  createAndDispatchCampaign, 
  cancelCampaign,
  getCampaignDetail,
  listSequences,
  createSequence,
  updateSequence,
  deleteSequence,
  getSequenceDetail,
  enrollLeadsInSequence,
  updateEnrollmentStatus
} from "@/lib/api";
import { 
  EmailLog, 
  CampaignStats, 
  Campaign, 
  CampaignDetail, 
  Sequence, 
  SequenceDetail, 
  SequenceStep, 
  SequenceEnrollment 
} from "@/types";
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

const PREMADE_SEQUENCE_TEMPLATES = [
  {
    name: "3-Step High-Converting Website Audit Funnel",
    description: "Step 1: Technical Audit & PDF Dossier -> Step 2: Specific Issue Breakdown -> Step 3: Final Growth Offer",
    steps: [
      {
        step_number: 1,
        delay_days: 0,
        delay_hours: 0,
        subject_template: "Technical Audit & Performance Insights for {{company_name}}",
        body_template: `<p>Hi {{first_name}},</p>
<p>I was reviewing leading <strong>{{niche}}</strong> providers in <strong>{{city}}</strong> and analyzed <strong>{{company_name}}</strong>.</p>
<p>Our team ran a technical scan on <strong>{{website}}</strong> (Platform: <strong>{{cms}}</strong>, Load Speed: <strong>{{load_time}}</strong>) and generated a complimentary <strong>Technical Website Audit Dossier</strong> (attached as PDF).</p>
<p>Your current website health score is <strong>{{audit_score}}/100</strong>. We identified key optimization opportunities around <strong>{{top_issue}}</strong> that could noticeably increase your inbound quote inquiries.</p>
<p>Would you have 5 minutes this Thursday for a brief chat to walk through the fixes?</p>
<p>Best regards,<br>SyntexDev Growth Team<br>dev@syntexdev.com</p>`,
        attach_pdf: true
      },
      {
        step_number: 2,
        delay_days: 3,
        delay_hours: 0,
        subject_template: "Quick follow-up re: {{company_name}} speed & {{top_issue}}",
        body_template: `<p>Hi {{first_name}},</p>
<p>Following up on the technical audit dossier I sent over earlier this week for <strong>{{company_name}}</strong>.</p>
<p>In particular, I wanted to highlight that resolving <strong>{{top_issue}}</strong> on your <strong>{{cms}}</strong> setup usually drops page load time below 1.2s and prevents mobile visitors from bouncing.</p>
<p>Did you get a chance to review the recommendations for <strong>{{website}}</strong>?</p>
<p>I'd love to share two quick examples of how we solved this for similar {{niche}} businesses in {{state}}.</p>
<p>Are you open to a brief 5-minute call tomorrow afternoon?</p>
<p>Best regards,<br>SyntexDev Team</p>`,
        attach_pdf: false
      },
      {
        step_number: 3,
        delay_days: 7,
        delay_hours: 0,
        subject_template: "Final check-in regarding {{company_name}} digital growth",
        body_template: `<p>Hi {{first_name}},</p>
<p>I know you're busy running operations for <strong>{{company_name}}</strong> in <strong>{{city}}</strong>, so this will be my final note.</p>
<p>If modernizing your website infrastructure and capturing more qualified {{niche}} inquiries is on your radar this quarter, our team is ready to assist.</p>
<p>Whenever you're ready, feel free to reply directly to this email or book a quick intro call.</p>
<p>Wishing you and the {{company_name}} team great success!</p>
<p>Best regards,<br>SyntexDev Growth Team<br>dev@syntexdev.com</p>`,
        attach_pdf: false
      }
    ]
  }
];

export default function CampaignsPage() {
  const [hubTab, setHubTab] = useState<"campaigns" | "sequences">("campaigns");

  // Single-send campaigns state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignDetail | null>(null);

  // Sequences state
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [selectedSequence, setSelectedSequence] = useState<SequenceDetail | null>(null);
  const [showCreateSequenceModal, setShowCreateSequenceModal] = useState<boolean>(false);
  const [showEnrollModal, setShowEnrollModal] = useState<string | null>(null);
  const [enrollStateFilter, setEnrollStateFilter] = useState<string>("ALL");
  const [enrollNicheFilter, setEnrollNicheFilter] = useState<string>("");
  const [isEnrolling, setIsEnrolling] = useState<boolean>(false);

  // Sequence creation wizard state
  const [seqName, setSeqName] = useState<string>("");
  const [seqDescription, setSeqDescription] = useState<string>("");
  const [seqSteps, setSeqSteps] = useState<SequenceStep[]>(PREMADE_SEQUENCE_TEMPLATES[0].steps);
  const [isSubmittingSeq, setIsSubmittingSeq] = useState<boolean>(false);

  // Single-send Campaign Wizard State
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

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = async () => {
    setError(null);
    try {
      const [campaignsData, logsData, statsData, sequencesData] = await Promise.all([
        listCampaigns(50),
        getEmailLogs(100),
        getCampaignStats(),
        listSequences(),
      ]);
      setCampaigns(campaignsData);
      setLogs(logsData);
      setStats(statsData);
      setSequences(sequencesData);
    } catch (err: any) {
      setError(err.message || "Failed to load outreach data from server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      listCampaigns(50).then(setCampaigns).catch(() => {});
      listSequences().then(setSequences).catch(() => {});
      getCampaignStats().then(setStats).catch(() => {});
    }, 12000);
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

  const insertSeqTag = (stepIdx: number, tag: string) => {
    setSeqSteps((prev) => {
      const copy = [...prev];
      copy[stepIdx].body_template += ` ${tag} `;
      return copy;
    });
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName.trim()) {
      setError("Please give your campaign a descriptive name.");
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

      setSuccessMessage(`Campaign '${newCampaign.name}' created! Background worker is pacing dispatches.`);
      setShowCreateModal(false);
      setCampaignName("");
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to create campaign.");
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

  const handleCreateSequence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seqName.trim()) {
      setError("Sequence name is required.");
      return;
    }
    setIsSubmittingSeq(true);
    setError(null);

    try {
      await createSequence({
        name: seqName.trim(),
        description: seqDescription.trim() || undefined,
        steps: seqSteps.map((s, idx) => ({
          step_number: idx + 1,
          delay_days: Number(s.delay_days) || 0,
          delay_hours: Number(s.delay_hours) || 0,
          subject_template: s.subject_template.trim(),
          body_template: s.body_template.trim(),
          attach_pdf: Boolean(s.attach_pdf),
        }))
      });

      setSuccessMessage("Multi-step automated sequence created successfully!");
      setShowCreateSequenceModal(false);
      setSeqName("");
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to create sequence.");
    } finally {
      setIsSubmittingSeq(false);
    }
  };

  const handleDeleteSequence = async (sequenceId: string) => {
    if (!confirm("Are you sure you want to delete this sequence and all its enrollments?")) return;
    try {
      await deleteSequence(sequenceId);
      setSuccessMessage("Sequence deleted.");
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to delete sequence.");
    }
  };

  const handleEnrollLeads = async (sequenceId: string) => {
    setIsEnrolling(true);
    setError(null);
    try {
      const res = await enrollLeadsInSequence(sequenceId, {
        state_filter: enrollStateFilter !== "ALL" ? enrollStateFilter : undefined,
        niche_filter: enrollNicheFilter.trim() || undefined,
      });
      setSuccessMessage(res.message);
      setShowEnrollModal(null);
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to enroll leads in sequence.");
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleUpdateEnrollmentStatus = async (enrollmentId: string, newStatus: string) => {
    try {
      await updateEnrollmentStatus(enrollmentId, newStatus);
      if (selectedSequence) {
        const updated = await getSequenceDetail(selectedSequence.id);
        setSelectedSequence(updated);
      }
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to update prospect status.");
    }
  };

  const handleViewSequenceDetail = async (sequenceId: string) => {
    try {
      const detail = await getSequenceDetail(sequenceId);
      setSelectedSequence(detail);
    } catch (err: any) {
      setError(err.message || "Failed to load sequence details.");
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
              <Send className="h-6 w-6 text-blue-400" /> Cold Outreach & Automated Drip Hub
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Launch domain-protected cold outreach batches or multi-step automated drip funnels with randomized jitter pacing.
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

            {hubTab === "campaigns" ? (
              <button
                onClick={() => {
                  setCampaignName(`Outreach Batch ${new Date().toLocaleDateString("en-AU")}`);
                  setShowCreateModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition shadow-lg shadow-blue-600/20"
              >
                <Plus className="h-4 w-4" />
                <span>New Batch</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setSeqName("3-Step Website Audit Funnel");
                  setSeqSteps(PREMADE_SEQUENCE_TEMPLATES[0].steps);
                  setShowCreateSequenceModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition shadow-lg shadow-indigo-600/20"
              >
                <GitBranch className="h-4 w-4" />
                <span>New Drip Sequence</span>
              </button>
            )}

            <Link
              href="/settings"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface border border-border text-xs font-semibold text-gray-400 hover:text-white hover:bg-surface-raised transition"
            >
              <Settings className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Tab Navigation Switcher */}
        <div className="flex items-center gap-2 border-b border-border pb-1">
          <button
            onClick={() => setHubTab("campaigns")}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-xs font-bold transition border-b-2 ${
              hubTab === "campaigns"
                ? "border-blue-500 text-white bg-surface"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Send className="h-3.5 w-3.5 text-blue-400" />
            <span>Single-Send Outreach Batches</span>
          </button>

          <button
            onClick={() => setHubTab("sequences")}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-xs font-bold transition border-b-2 ${
              hubTab === "sequences"
                ? "border-indigo-500 text-white bg-surface"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <GitBranch className="h-3.5 w-3.5 text-indigo-400" />
            <span>Automated Multi-Step Drip Sequences</span>
            <span className="rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] px-1.5 py-0.2 font-mono font-bold">
              {sequences.length}
            </span>
          </button>
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

        {/* Deliverability Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-xl space-y-1">
            <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-blue-400" /> Total Dispatches
            </span>
            <div className="text-2xl font-extrabold text-white font-mono">
              {stats ? stats.total_emails_sent : 0}
            </div>
            <p className="text-[11px] text-gray-500">Sent via Graph API / M365</p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 shadow-xl space-y-1">
            <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Delivered Successfully
            </span>
            <div className="text-2xl font-extrabold text-emerald-400 font-mono">
              {stats ? stats.successful_deliveries : 0}
            </div>
            <p className="text-[11px] text-gray-500">Confirmed inbox deliveries</p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 shadow-xl space-y-1">
            <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
              <GitBranch className="h-4 w-4 text-indigo-400" /> Active Drip Funnels
            </span>
            <div className="text-2xl font-extrabold text-indigo-400 font-mono">
              {sequences.filter(s => s.status === "active").length}
            </div>
            <p className="text-[11px] text-gray-500">Multi-step sequences live</p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 shadow-xl space-y-1">
            <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-amber-400" /> Deliverability Health
            </span>
            <div className="text-2xl font-extrabold text-amber-400 font-mono">
              {stats && stats.total_emails_sent > 0 ? `${stats.success_rate_percentage}%` : "100%"}
            </div>
            <p className="text-[11px] text-gray-500">Domain safety verified</p>
          </div>
        </div>

        {/* TAB 1: SINGLE-SEND OUTREACH BATCHES */}
        {hubTab === "campaigns" && (
          <div className="space-y-6">
            {/* Active & Historical Campaigns */}
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Play className="h-4 w-4 text-blue-400" /> Multi-Lead Outreach Batches
                  </h2>
                  <p className="text-xs text-gray-400">
                    Live background batches dispatched with domain-safe randomized jitter timing.
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
                              onClick={async () => {
                                const detail = await getCampaignDetail(camp.id);
                                setSelectedCampaign(detail);
                              }}
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
          </div>
        )}

        {/* TAB 2: AUTOMATED DRIP SEQUENCES */}
        {hubTab === "sequences" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-indigo-400" /> Automated Multi-Step Drip Funnels
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Prospects automatically receive follow-ups (e.g. Step 1 &rarr; Day 3 &rarr; Day 7) until they reply or complete the sequence.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setSeqName("3-Step Website Audit Funnel");
                    setSeqSteps(PREMADE_SEQUENCE_TEMPLATES[0].steps);
                    setShowCreateSequenceModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition shadow-lg shadow-indigo-600/20"
                >
                  <Plus className="h-3.5 w-3.5" /> New Sequence
                </button>
              </div>

              {sequences.length === 0 ? (
                <div className="py-12 text-center text-gray-400 border border-dashed border-border rounded-xl">
                  <GitBranch className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-300">No Multi-Step Sequences Created Yet</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                    Create an automated sequence with custom follow-up delays (e.g. Day 3 and Day 7 gentle nudges) to maximize client replies.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {sequences.map((seq) => (
                    <div
                      key={seq.id}
                      className="rounded-xl bg-surface-raised border border-border p-5 space-y-4 hover:border-indigo-500/40 transition flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-bold text-white">{seq.name}</h3>
                            {seq.description && (
                              <p className="text-xs text-gray-400 mt-0.5">{seq.description}</p>
                            )}
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            seq.status === "active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                          }`}>
                            {seq.status.toUpperCase()}
                          </span>
                        </div>

                        {/* Step Timeline Pills */}
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-semibold text-gray-400">Sequence Funnel Steps ({seq.steps.length}):</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {seq.steps.map((st, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <div className="rounded-lg bg-surface border border-border px-2.5 py-1 text-[11px] font-medium text-gray-200">
                                  <span className="font-bold text-indigo-400 mr-1">#{st.step_number}</span>
                                  {st.step_number === 1 ? "Immediate" : `+${st.delay_days}d`}
                                  {st.attach_pdf && <span className="ml-1 text-emerald-400 font-bold">• PDF</span>}
                                </div>
                                {i < seq.steps.length - 1 && (
                                  <ArrowRight className="h-3 w-3 text-gray-600" />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Stats Bar */}
                        <div className="grid grid-cols-4 gap-2 text-center text-xs pt-1">
                          <div className="rounded-lg bg-surface p-2 border border-border">
                            <span className="text-[10px] text-gray-400">Enrolled</span>
                            <p className="font-bold text-white font-mono">{seq.total_enrolled}</p>
                          </div>
                          <div className="rounded-lg bg-surface p-2 border border-border">
                            <span className="text-[10px] text-gray-400">In Progress</span>
                            <p className="font-bold text-amber-400 font-mono">{seq.active_count}</p>
                          </div>
                          <div className="rounded-lg bg-surface p-2 border border-border">
                            <span className="text-[10px] text-gray-400">Completed</span>
                            <p className="font-bold text-emerald-400 font-mono">{seq.completed_count}</p>
                          </div>
                          <div className="rounded-lg bg-surface p-2 border border-border">
                            <span className="text-[10px] text-gray-400">Replied</span>
                            <p className="font-bold text-blue-400 font-mono">{seq.replied_count}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-border/60 text-xs">
                        <button
                          onClick={() => setShowEnrollModal(seq.id)}
                          className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300"
                        >
                          <UserCheck className="h-3.5 w-3.5" /> Enroll Leads
                        </button>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleViewSequenceDetail(seq.id)}
                            className="text-xs font-semibold text-gray-300 hover:text-white"
                          >
                            View Prospects
                          </button>
                          <button
                            onClick={() => handleDeleteSequence(seq.id)}
                            className="text-rose-400 hover:text-rose-300"
                            title="Delete Sequence"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Create Multi-Step Sequence */}
        {showCreateSequenceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-3xl rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-indigo-400" /> Build Multi-Step Drip Funnel
                </h3>
                <button onClick={() => setShowCreateSequenceModal(false)} className="text-gray-400 hover:text-white">✕</button>
              </div>

              <form onSubmit={handleCreateSequence} className="space-y-5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-gray-300 mb-1">Sequence Name</label>
                    <input
                      type="text"
                      required
                      value={seqName}
                      onChange={(e) => setSeqName(e.target.value)}
                      placeholder="e.g. 3-Step Solar Contractor Audit Funnel"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-raised border border-border text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-300 mb-1">Description / Goal</label>
                    <input
                      type="text"
                      value={seqDescription}
                      onChange={(e) => setSeqDescription(e.target.value)}
                      placeholder="e.g. Cold pitch with follow-up nudges on day 3 and 7"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-raised border border-border text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Steps Accordion / List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">Sequence Steps & Follow-Up Timing:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSeqSteps(prev => [
                          ...prev,
                          {
                            step_number: prev.length + 1,
                            delay_days: 3,
                            delay_hours: 0,
                            subject_template: "Quick follow up regarding {{company_name}}",
                            body_template: "<p>Hi {{first_name}},</p><p>Following up on my previous note.</p>",
                            attach_pdf: false
                          }
                        ]);
                      }}
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Step
                    </button>
                  </div>

                  {seqSteps.map((step, idx) => (
                    <div key={idx} className="rounded-xl bg-surface-raised border border-border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-indigo-600 text-white font-bold px-2 py-0.5 text-[11px]">
                            Step {idx + 1}
                          </span>
                          <span className="font-semibold text-gray-300 text-xs">
                            {idx === 0 ? "Trigger Immediately (Day 0)" : `Follow-up after ${step.delay_days} Days`}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          {idx > 0 && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-gray-400">Delay:</span>
                              <input
                                type="number"
                                min={1}
                                max={60}
                                value={step.delay_days}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setSeqSteps(prev => {
                                    const copy = [...prev];
                                    copy[idx].delay_days = val;
                                    return copy;
                                  });
                                }}
                                className="w-14 px-2 py-1 rounded bg-surface border border-border text-white text-center font-mono"
                              />
                              <span className="text-[11px] text-gray-400">days</span>
                            </div>
                          )}

                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={step.attach_pdf}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setSeqSteps(prev => {
                                  const copy = [...prev];
                                  copy[idx].attach_pdf = checked;
                                  return copy;
                                });
                              }}
                              className="rounded bg-surface border-border text-indigo-600 focus:ring-0"
                            />
                            <span className="text-[11px] text-gray-300">Attach PDF Audit</span>
                          </label>

                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => setSeqSteps(prev => prev.filter((_, i) => i !== idx))}
                              className="text-rose-400 hover:text-rose-300 ml-2"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Subject */}
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-400 mb-1">Subject Line</label>
                        <input
                          type="text"
                          required
                          value={step.subject_template}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSeqSteps(prev => {
                              const copy = [...prev];
                              copy[idx].subject_template = val;
                              return copy;
                            });
                          }}
                          className="w-full px-3 py-1.5 rounded-lg bg-surface border border-border text-white font-mono text-xs focus:border-indigo-500 focus:outline-none"
                        />
                      </div>

                      {/* Body */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-semibold text-gray-400">HTML Pitch Content</label>
                          <div className="flex items-center gap-1 flex-wrap">
                            {[
                              "{{company_name}}", 
                              "{{first_name}}", 
                              "{{city}}", 
                              "{{website}}", 
                              "{{niche}}", 
                              "{{cms}}", 
                              "{{load_time}}", 
                              "{{audit_score}}", 
                              "{{top_issue}}"
                            ].map(tag => (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => insertSeqTag(idx, tag)}
                                className="px-1.5 py-0.2 rounded bg-surface border border-border text-[9px] font-mono text-indigo-300 hover:bg-indigo-600/20"
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>
                        <textarea
                          rows={4}
                          required
                          value={step.body_template}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSeqSteps(prev => {
                              const copy = [...prev];
                              copy[idx].body_template = val;
                              return copy;
                            });
                          }}
                          className="w-full px-3 py-1.5 rounded-lg bg-surface border border-border text-white font-mono text-xs focus:border-indigo-500 focus:outline-none custom-scrollbar"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                  <button type="button" onClick={() => setShowCreateSequenceModal(false)} className="px-4 py-2 text-xs text-gray-400 hover:text-white">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingSeq}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-2.5 text-xs font-bold text-white transition disabled:opacity-50 shadow-lg shadow-indigo-600/20"
                  >
                    {isSubmittingSeq ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
                    {isSubmittingSeq ? "Creating..." : "Save & Activate Sequence"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Enroll Leads into Sequence */}
        {showEnrollModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-indigo-400" /> Enroll Prospects into Sequence
                </h3>
                <button onClick={() => setShowEnrollModal(null)} className="text-gray-400 hover:text-white">✕</button>
              </div>

              <p className="text-xs text-gray-300">
                Choose the target audience of leads to enroll. They will start at <strong>Step 1</strong> immediately and receive automated follow-ups.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-gray-400 mb-1">Filter by State</label>
                  <select
                    value={enrollStateFilter}
                    onChange={(e) => setEnrollStateFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-raised border border-border text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="ALL">All States (Australia-wide)</option>
                    <option value="NSW">NSW</option>
                    <option value="VIC">VIC</option>
                    <option value="QLD">QLD</option>
                    <option value="WA">WA</option>
                    <option value="SA">SA</option>
                    <option value="TAS">TAS</option>
                    <option value="ACT">ACT</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-400 mb-1">Filter by Niche Keyword (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Solar, Real Estate, Plumbing..."
                    value={enrollNicheFilter}
                    onChange={(e) => setEnrollNicheFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-raised border border-border text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button type="button" onClick={() => setShowEnrollModal(null)} className="px-4 py-2 text-xs text-gray-400 hover:text-white">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleEnrollLeads(showEnrollModal)}
                  disabled={isEnrolling}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-bold text-white transition disabled:opacity-50"
                >
                  {isEnrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                  {isEnrolling ? "Enrolling..." : "Enroll Prospects"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Sequence Prospects / Enrollments Inspector */}
        {selectedSequence && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-3xl rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-indigo-400" /> {selectedSequence.name} - Enrolled Leads
                </h3>
                <button onClick={() => setSelectedSequence(null)} className="text-gray-400 hover:text-white">✕</button>
              </div>

              <div className="space-y-3">
                {selectedSequence.enrollments.length === 0 ? (
                  <p className="text-xs text-gray-500 py-6 text-center">No leads are currently enrolled in this sequence.</p>
                ) : (
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border text-gray-400 font-semibold bg-surface-raised/40">
                          <th className="py-2.5 px-3">Business / Email</th>
                          <th className="py-2.5 px-3">Current Step</th>
                          <th className="py-2.5 px-3">Next Scheduled Run</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60 text-gray-300">
                        {selectedSequence.enrollments.map((enr) => (
                          <tr key={enr.id} className="hover:bg-surface-raised/40 transition">
                            <td className="py-2.5 px-3">
                              <p className="font-semibold text-white truncate max-w-[180px]">{enr.business_name || "Lead Record"}</p>
                              <p className="text-[11px] text-blue-400 font-mono truncate">{enr.recipient_email}</p>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="rounded bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 text-[10px]">
                                Step {enr.current_step_number} / {selectedSequence.steps.length}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-gray-400 font-mono text-[11px]">
                              {enr.status === "active" ? new Date(enr.next_run_at).toLocaleString("en-AU", { dateStyle: "short", timeStyle: "short" }) : "-"}
                            </td>
                            <td className="py-2.5 px-3">
                              {enr.status === "active" ? (
                                <span className="text-emerald-400 font-semibold text-[10px]">Active</span>
                              ) : enr.status === "completed" ? (
                                <span className="text-blue-400 font-semibold text-[10px]">Completed</span>
                              ) : enr.status === "replied" ? (
                                <span className="text-amber-400 font-semibold text-[10px]">Replied</span>
                              ) : (
                                <span className="text-gray-400 font-semibold text-[10px]">{enr.status}</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {enr.status === "active" && (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleUpdateEnrollmentStatus(enr.id, "replied")}
                                    className="text-[10px] font-bold text-amber-400 hover:text-amber-300"
                                    title="Mark as Replied (Stops sequence)"
                                  >
                                    Mark Replied
                                  </button>
                                  <button
                                    onClick={() => handleUpdateEnrollmentStatus(enr.id, "cancelled")}
                                    className="text-[10px] font-bold text-rose-400 hover:text-rose-300"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal: Single-Send Campaign Detail */}
        {selectedCampaign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-400" /> {selectedCampaign.name}
                </h3>
                <button onClick={() => setSelectedCampaign(null)} className="text-gray-400 hover:text-white">✕</button>
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
