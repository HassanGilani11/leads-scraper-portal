"use client";

import { 
  X, 
  Building2, 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  Linkedin, 
  Briefcase, 
  Cpu, 
  Calendar, 
  Users, 
  Star, 
  ExternalLink,
  Copy,
  Check,
  FileText,
  ShieldCheck,
  Download,
  Activity,
  AlertTriangle,
  CreditCard,
  Truck,
  Eye,
  Send,
  Loader2,
  Sparkles,
  Zap
} from "lucide-react";
import { useState, useEffect } from "react";
import { Lead, AuditReport } from "@/types";
import { getWebsiteAudit, getAuditPdfUrl } from "@/lib/api";

interface LeadModalProps {
  lead: Lead | null;
  onClose: () => void;
}

export function LeadModal({ lead, onClose }: LeadModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "audit">("profile");
  
  // Audit State
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [auditLoading, setAuditLoading] = useState<boolean>(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  useEffect(() => {
    setAuditReport(null);
    setAuditError(null);
    setActiveTab("profile");
  }, [lead]);

  if (!lead) return null;

  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleRunAudit = async () => {
    setAuditLoading(true);
    setAuditError(null);
    try {
      const data = await getWebsiteAudit(lead.id);
      setAuditReport(data);
    } catch (err: any) {
      setAuditError(err.message || "Failed to audit website");
    } finally {
      setAuditLoading(false);
    }
  };

  const industriesList = lead.industries
    ? lead.industries.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const technologiesList = lead.technologies_used
    ? lead.technologies_used.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const keywordsList = lead.keywords
    ? lead.keywords.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const abnKeyword = keywordsList.find((k) => k.startsWith("ABN:"));
  const licKeyword = keywordsList.find((k) => k.startsWith("Lic:"));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl custom-scrollbar flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-border bg-surface-raised/95 px-6 py-5 backdrop-blur-md">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400 border border-blue-500/20">
                {lead.state || "AU"}
              </span>
              {lead.niche && (
                <span className="rounded bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-400 border border-indigo-500/20">
                  {lead.niche}
                </span>
              )}
              {abnKeyword && (
                <span className="rounded bg-emerald-500/10 px-2.5 py-0.5 text-xs font-mono font-medium text-emerald-400 border border-emerald-500/20">
                  {abnKeyword}
                </span>
              )}
              {licKeyword && (
                <span className="rounded bg-amber-500/10 px-2.5 py-0.5 text-xs font-mono font-medium text-amber-400 border border-amber-500/20">
                  {licKeyword}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {lead.business_name || "Unknown Company"}
            </h2>
            {lead.office_location && (
              <p className="flex items-center gap-1.5 text-xs text-gray-400">
                <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                {lead.office_location}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-surface hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-border bg-surface-raised/40">
          <button
            onClick={() => setActiveTab("profile")}
            className={`pb-3 px-3 text-xs font-semibold transition border-b-2 flex items-center gap-2 ${
              activeTab === "profile"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            <Building2 className="h-4 w-4" />
            Company & Contact Dossier
          </button>

          <button
            onClick={() => {
              setActiveTab("audit");
              if (!auditReport && !auditLoading) handleRunAudit();
            }}
            className={`pb-3 px-3 text-xs font-semibold transition border-b-2 flex items-center gap-2 ${
              activeTab === "audit"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            Website Technical Audit & PDF Pitch
            {auditReport && (
              <span className="rounded bg-blue-500/20 text-blue-300 px-1.5 py-0.2 text-[10px] font-mono">
                {auditReport.health_score}/100
              </span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {activeTab === "profile" ? (
            <>
              {/* Quick Action Links */}
              <div className="flex flex-wrap gap-2.5">
                {lead.website && (
                  <a
                    href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg bg-surface-raised border border-border px-3.5 py-2 text-xs font-medium text-blue-400 hover:border-blue-500/50 hover:bg-surface-raised/80 transition"
                  >
                    <Globe className="h-4 w-4" />
                    Visit Website
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                )}
                {lead.linkedin_url && (
                  <a
                    href={lead.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600/10 border border-blue-600/30 px-3.5 py-2 text-xs font-medium text-blue-300 hover:bg-blue-600/20 transition"
                  >
                    <Linkedin className="h-4 w-4 text-blue-400" />
                    LinkedIn Profile
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                )}
                {lead.url && (
                  <a
                    href={lead.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg bg-surface-raised border border-border px-3.5 py-2 text-xs font-medium text-gray-300 hover:text-white transition"
                  >
                    <MapPin className="h-4 w-4 text-amber-400" />
                    Google Maps Card
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                )}
                <button
                  onClick={() => {
                    setActiveTab("audit");
                    if (!auditReport && !auditLoading) handleRunAudit();
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/40 px-3.5 py-2 text-xs font-bold text-blue-300 hover:bg-blue-600/30 transition"
                >
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Audit Website & Pitch
                </button>
              </div>

              {/* Grid 1: Key Contact Information */}
              <div className="rounded-xl border border-border bg-surface-raised/50 p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-400" />
                  Key Decision Maker & Verified Contact Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Contact Person */}
                  <div className="space-y-1">
                    <span className="text-gray-400">Decision Maker Name & Title</span>
                    <p className="font-medium text-white text-sm">
                      {lead.contact_person || <span className="text-gray-500 italic">Owner / Executive</span>}
                    </p>
                  </div>

                  {/* Direct Email */}
                  <div className="space-y-1">
                    <span className="text-gray-400">Direct / Primary Email</span>
                    <div className="flex items-center justify-between bg-surface border border-border rounded-lg px-2.5 py-1.5">
                      <span className="font-medium text-blue-400 truncate">
                        {lead.email || lead.business_email || "N/A"}
                      </span>
                      {(lead.email || lead.business_email) && (
                        <button
                          onClick={() => handleCopy(lead.email || lead.business_email || "", "email")}
                          className="text-gray-400 hover:text-white ml-2"
                          title="Copy Email"
                        >
                          {copiedField === "email" ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Business Email */}
                  <div className="space-y-1">
                    <span className="text-gray-400">Business / Crawler Email</span>
                    <div className="flex items-center justify-between bg-surface border border-border rounded-lg px-2.5 py-1.5">
                      <span className="font-medium text-gray-200 truncate">
                        {lead.business_email || "N/A"}
                      </span>
                      {lead.business_email && (
                        <button
                          onClick={() => handleCopy(lead.business_email || "", "bemail")}
                          className="text-gray-400 hover:text-white ml-2"
                        >
                          {copiedField === "bemail" ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-1">
                    <span className="text-gray-400">Phone / Office Contact</span>
                    <div className="flex items-center justify-between bg-surface border border-border rounded-lg px-2.5 py-1.5">
                      <span className="font-medium text-emerald-400">
                        {lead.phone_number || lead.office_contact || "N/A"}
                      </span>
                      {(lead.phone_number || lead.office_contact) && (
                        <button
                          onClick={() => handleCopy(lead.phone_number || lead.office_contact || "", "phone")}
                          className="text-gray-400 hover:text-white ml-2"
                        >
                          {copiedField === "phone" ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid 2: Company Intelligence */}
              <div className="rounded-xl border border-border bg-surface-raised/50 p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-indigo-400" />
                  Company Intelligence & Credentials
                </h3>

                {lead.company_description && (
                  <div className="space-y-1">
                    <span className="text-xs text-gray-400">Company Overview</span>
                    <p className="text-xs text-gray-300 leading-relaxed bg-surface/60 p-3 rounded-lg border border-border">
                      {lead.company_description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-surface border border-border p-3 rounded-lg space-y-1">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-blue-400" /> Founded / Est.
                    </span>
                    <p className="font-semibold text-white">{lead.founding_year || "Established"}</p>
                  </div>

                  <div className="bg-surface border border-border p-3 rounded-lg space-y-1">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Users className="h-3 w-3 text-indigo-400" /> Team Size
                    </span>
                    <p className="font-semibold text-white">{lead.employee_count || "1-10"}</p>
                  </div>

                  <div className="bg-surface border border-border p-3 rounded-lg space-y-1">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Star className="h-3 w-3 text-amber-400" /> Authority Rank
                    </span>
                    <p className="font-semibold text-white">{lead.company_rating || "Verified AU"}</p>
                  </div>

                  <div className="bg-surface border border-border p-3 rounded-lg space-y-1">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Briefcase className="h-3 w-3 text-emerald-400" /> Subsidiaries
                    </span>
                    <p className="font-semibold text-white">{lead.subsidiaries || "0"}</p>
                  </div>
                </div>

                {/* Technologies */}
                {technologiesList.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Cpu className="h-3.5 w-3.5 text-cyan-400" /> Tech Stack Detected
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {technologiesList.map((tech, idx) => (
                        <span
                          key={idx}
                          className="rounded bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-[11px] font-mono text-cyan-300"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Industries */}
                {industriesList.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs text-gray-400">Industries</span>
                    <div className="flex flex-wrap gap-1.5">
                      {industriesList.map((ind, idx) => (
                        <span
                          key={idx}
                          className="rounded bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[11px] text-blue-300"
                        >
                          {ind}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Tab 2: Technical Audit & PDF Generator */
            <div className="space-y-6">
              {auditLoading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
                  <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                  <p className="font-semibold text-white text-sm">Auditing {lead.website}...</p>
                  <p className="text-xs text-gray-400 max-w-sm">
                    Scanning payment gateways, shipping providers, marketing pixels, SSL, load speeds, and generating custom cold email pitch...
                  </p>
                </div>
              ) : auditError ? (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-5 text-center space-y-3">
                  <AlertTriangle className="h-8 w-8 text-rose-400 mx-auto" />
                  <p className="text-sm font-semibold text-rose-400">Audit Scan Error</p>
                  <p className="text-xs text-gray-300">{auditError}</p>
                  <button
                    onClick={handleRunAudit}
                    className="px-4 py-2 rounded-lg bg-surface border border-border text-xs text-white hover:bg-surface-raised transition"
                  >
                    Retry Audit Scan
                  </button>
                </div>
              ) : auditReport ? (
                <div className="space-y-6">
                  {/* Top Audit Action Banner */}
                  <div className="rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-900/20 to-indigo-900/20 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-2xl bg-surface border border-border flex flex-col items-center justify-center shadow-lg">
                        <span className="text-xs text-gray-400">Score</span>
                        <span className={`text-xl font-bold font-mono ${
                          auditReport.health_score >= 80 ? "text-emerald-400" : auditReport.health_score >= 60 ? "text-amber-400" : "text-rose-400"
                        }`}>
                          {auditReport.health_score}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <span>Technical & Growth Audit</span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Scan Verified
                          </span>
                        </h3>
                        <p className="text-xs text-gray-300 mt-0.5">
                          CMS: <span className="text-blue-400 font-semibold">{auditReport.cms_platform}</span> • Load: <span className="font-mono text-white">{auditReport.load_time_seconds}</span>
                        </p>
                      </div>
                    </div>

                    {/* PDF Download Button */}
                    <a
                      href={getAuditPdfUrl(lead.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-xs font-bold text-white transition shadow-lg shadow-blue-600/30 shrink-0"
                    >
                      <Download className="h-4 w-4" />
                      Download Client PDF Report
                    </a>
                  </div>

                  {/* Commercial Matrix: Payment & Shipping */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-surface-raised border border-border p-4 rounded-xl space-y-1.5">
                      <span className="text-gray-400 flex items-center gap-1.5 font-medium">
                        <CreditCard className="h-4 w-4 text-emerald-400" /> Payment Gateways
                      </span>
                      <p className="font-semibold text-white">
                        {auditReport.payment_gateways}
                      </p>
                    </div>

                    <div className="bg-surface-raised border border-border p-4 rounded-xl space-y-1.5">
                      <span className="text-gray-400 flex items-center gap-1.5 font-medium">
                        <Truck className="h-4 w-4 text-blue-400" /> Shipping & Logistics
                      </span>
                      <p className="font-semibold text-white">
                        {auditReport.shipping_carriers}
                      </p>
                    </div>

                    <div className="bg-surface-raised border border-border p-4 rounded-xl space-y-1.5">
                      <span className="text-gray-400 flex items-center gap-1.5 font-medium">
                        <Activity className="h-4 w-4 text-indigo-400" /> Tracking & Pixels
                      </span>
                      <p className="font-semibold text-white">
                        {auditReport.marketing_pixels}
                      </p>
                    </div>
                  </div>

                  {/* Outdated Issues & Gaps */}
                  <div className="rounded-xl border border-border bg-surface-raised/40 p-5 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      Technical Flags & Vulnerabilities Found
                    </h4>
                    <div className="space-y-1.5 text-xs">
                      {auditReport.outdated_issues.split(" | ").map((iss, i) => (
                        <div key={i} className="flex items-start gap-2 text-gray-300 bg-surface/60 p-2 rounded-lg border border-border/70">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            iss.includes("None Detected") ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                          }`}>
                            {iss.includes("None Detected") ? "PASS" : "FLAG"}
                          </span>
                          <span>{iss}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cold Outreach Angles & Pitch */}
                  <div className="rounded-xl border border-border bg-surface-raised/40 p-5 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                      <Zap className="h-4 w-4 text-blue-400" />
                      Recommended Sales Angles & Solution Strategy
                    </h4>
                    <div className="space-y-1.5 text-xs">
                      {auditReport.pitch_opportunities.split(" | ").map((pitch, i) => (
                        <div key={i} className="flex items-start gap-2 text-blue-200 bg-blue-900/10 p-2.5 rounded-lg border border-blue-500/20">
                          <span className="font-bold text-blue-400">#{i+1}</span>
                          <span>{pitch}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Generated Cold Email Template */}
                  <div className="rounded-xl border border-border bg-surface-raised/50 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                        <Send className="h-4 w-4 text-emerald-400" />
                        Ready-to-Send Cold Email Draft
                      </h4>
                      <button
                        onClick={() => handleCopy(auditReport.cold_email_draft, "cold_email")}
                        className="flex items-center gap-1.5 rounded-lg bg-surface border border-border px-3 py-1 text-xs text-gray-300 hover:text-white transition"
                      >
                        {copiedField === "cold_email" ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy Email</span>
                          </>
                        )}
                      </button>
                    </div>

                    <pre className="p-3.5 rounded-xl bg-[#090d14] border border-border text-xs text-gray-300 font-mono whitespace-pre-wrap leading-relaxed select-text">
                      {auditReport.cold_email_draft}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                  <p className="text-sm text-gray-300">Click below to run a technical website audit and generate a cold outreach pitch.</p>
                  <button
                    onClick={handleRunAudit}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-xs font-bold text-white transition shadow-lg shadow-blue-600/30"
                  >
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    Start Website Audit Scan
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-surface-raised px-6 py-4 flex items-center justify-between text-xs text-gray-400">
          <span>Lead ID: <span className="font-mono text-gray-300">{lead.id.slice(0, 8)}</span></span>
          <button
            onClick={onClose}
            className="rounded-lg bg-surface border border-border px-4 py-2 text-xs font-medium text-white hover:bg-surface-raised transition"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}
