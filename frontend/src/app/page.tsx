"use client";

import { useState, useEffect } from "react";
import { 
  Radar, 
  Play, 
  Loader2, 
  MapPin, 
  Briefcase, 
  Layers, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Users, 
  Database,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Trash2,
  CalendarClock
} from "lucide-react";
import Link from "next/link";
import { Terminal } from "@/components/Terminal";
import { SchedulesList } from "@/components/SchedulesList";
import { ScheduleModal } from "@/components/ScheduleModal";
import { startScrapeJob, getJobs, getStatsSummary, deleteJob } from "@/lib/api";
import { Job, StatsSummary } from "@/types";
import { formatDate } from "@/lib/utils";

const AUSTRALIAN_STATES = [
  { code: "NSW", name: "New South Wales", suburbsCount: 14, tag: "Primary Hub" },
  { code: "VIC", name: "Victoria", suburbsCount: 12, tag: "High Density" },
  { code: "QLD", name: "Queensland", suburbsCount: 8, tag: "Fast Growing" },
  { code: "WA", name: "Western Australia", suburbsCount: 5, tag: "Mining & Trade" },
  { code: "SA", name: "South Australia", suburbsCount: 4, tag: "Central" },
  { code: "TAS", name: "Tasmania", suburbsCount: 2, tag: "Regional" },
  { code: "ACT", name: "Canberra / ACT", suburbsCount: 3, tag: "Capital" },
];

const NICHE_PRESETS = [
  "Plumbers",
  "Electricians",
  "Accountants",
  "Dentists",
  "Real Estate Agents",
  "Solar Panel Installers",
  "Gyms & Fitness",
  "Commercial Cleaning",
  "Lawyers",
  "IT Services",
];

export default function DashboardPage() {
  const [niche, setNiche] = useState<string>("Plumbers");
  const [customNiche, setCustomNiche] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("NSW");
  const [isLaunching, setIsLaunching] = useState<boolean>(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [jobsHistory, setJobsHistory] = useState<Job[]>([]);
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Metrics counters for active scrape or totals
  const [foundCount, setFoundCount] = useState<number>(0);
  const [enrichedCount, setEnrichedCount] = useState<number>(0);
  const [errorCount, setErrorCount] = useState<number>(0);

  const fetchDashboardData = async () => {
    try {
      const [jobsData, statsData] = await Promise.all([
        getJobs(10, 0),
        getStatsSummary(),
      ]);
      setJobsHistory(jobsData.jobs);
      setStats(statsData);

      // If there's a currently running job, lock activeJob to it
      const running = jobsData.jobs.find((j) => j.status === "running" || j.status === "pending");
      if (running && (!activeJob || activeJob.id !== running.id)) {
        setActiveJob(running);
        setFoundCount(running.found_count);
        setEnrichedCount(running.enriched_count);
        setErrorCount(running.error_count);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const timer = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalNiche = (customNiche.trim() || niche).trim();
    if (!finalNiche) {
      setErrorMessage("Please enter or select a target niche.");
      return;
    }

    setErrorMessage(null);
    setIsLaunching(true);

    try {
      const job = await startScrapeJob(finalNiche, selectedState);
      setActiveJob(job);
      setFoundCount(0);
      setEnrichedCount(0);
      setErrorCount(0);
      fetchDashboardData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to trigger scraping job");
    } finally {
      setIsLaunching(false);
    }
  };

  const handleJobCompleted = () => {
    fetchDashboardData();
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this job and its scraped leads?")) return;
    try {
      await deleteJob(jobId);
      if (activeJob?.id === jobId) {
        setActiveJob(null);
      }
      fetchDashboardData();
    } catch (err) {
      alert("Failed to delete job");
    }
  };

  const handleScheduledJobTriggered = (jobId: string) => {
    fetchDashboardData();
    const target = jobsHistory.find((j) => j.id === jobId);
    if (target) {
      setActiveJob(target);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Analytics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Leads */}
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Total Leads in Vault</span>
            <Database className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-white mt-2">
            {(stats?.total_leads || 0).toLocaleString()}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-2">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            <span>Across Australia (All States)</span>
          </div>
          <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition" />
        </div>

        {/* Metric 2: Leads with Verified Email */}
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Decision-Maker Emails</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-400 mt-2">
            {(stats?.leads_with_email || 0).toLocaleString()}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-2">
            <span>Enriched via Apollo & Web</span>
          </div>
          <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition" />
        </div>

        {/* Metric 3: Decision Makers with LinkedIn */}
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">LinkedIn Identified</span>
            <Users className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-indigo-400 mt-2">
            {(stats?.leads_with_linkedin || 0).toLocaleString()}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-2">
            <span>Owners, Directors & Execs</span>
          </div>
          <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition" />
        </div>

        {/* Metric 4: Active Job Status */}
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Active Job Status</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xl font-bold capitalize text-white">
              {activeJob ? activeJob.status : "Idle"}
            </span>
            {activeJob?.status === "running" && (
              <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-2">
            {activeJob ? (
              <span>{activeJob.niche} • {activeJob.state}</span>
            ) : (
              <span>Ready to trigger new scrape</span>
            )}
          </div>
          <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition" />
        </div>
      </div>

      {/* Main Interactive Grid: Launcher & Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Scrape Configuration Form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Radar className="h-5 w-5 text-blue-400" />
                Launch Scraper Engine
              </h2>
              <p className="text-xs text-gray-400">
                Configure your target commercial niche and Australian territory.
              </p>
            </div>

            {errorMessage && (
              <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleLaunch} className="space-y-5">
              {/* Niche Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-blue-400" /> Target Niche / Industry
                  </span>
                  <span className="text-[11px] text-gray-500 font-normal">Preset or Custom</span>
                </label>

                {/* Popular Presets Pills */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {NICHE_PRESETS.slice(0, 6).map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => {
                        setNiche(preset);
                        setCustomNiche("");
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition ${
                        niche === preset && !customNiche
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-surface-raised text-gray-300 hover:text-white hover:bg-surface-raised/80 border border-border"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {/* Custom input */}
                <input
                  type="text"
                  placeholder="Or enter custom niche (e.g. Roof Painters, Physiotherapists)..."
                  value={customNiche}
                  onChange={(e) => setCustomNiche(e.target.value)}
                  className="w-full rounded-xl bg-surface-raised border border-border px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition"
                />
              </div>

              {/* State Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-blue-400" /> Australian State / Territory
                  </span>
                  <span className="text-[11px] text-gray-500 font-normal">
                    {AUSTRALIAN_STATES.find(s => s.code === selectedState)?.suburbsCount || 0} Suburbs queued
                  </span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {AUSTRALIAN_STATES.map((state) => {
                    const isSelected = selectedState === state.code;
                    return (
                      <button
                        type="button"
                        key={state.code}
                        onClick={() => setSelectedState(state.code)}
                        className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition relative overflow-hidden ${
                          isSelected
                            ? "bg-blue-600/10 border-blue-500 text-blue-400 shadow-md shadow-blue-500/10"
                            : "bg-surface-raised border-border text-gray-300 hover:border-gray-600"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold text-sm text-white">{state.code}</span>
                          <span className="text-[10px] text-gray-400">{state.suburbsCount} Suburbs</span>
                        </div>
                        <span className="text-[11px] text-gray-400 truncate w-full mt-1">
                          {state.name}
                        </span>
                        {isSelected && (
                          <div className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Buttons: Launch & Schedule Automation */}
              <div className="space-y-2.5">
                <button
                  type="submit"
                  disabled={isLaunching || activeJob?.status === "running"}
                  className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-bold text-white shadow-xl transition duration-200 ${
                    activeJob?.status === "running"
                      ? "bg-gray-700 cursor-not-allowed opacity-80"
                      : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-600/25 active:scale-[0.99]"
                  }`}
                >
                  {isLaunching ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Initializing Engine...</span>
                    </>
                  ) : activeJob?.status === "running" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Job in Progress (#{activeJob.id.slice(0, 6)})...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-white" />
                      <span>Launch Scrape & Enrichment Job</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-semibold text-blue-300 bg-blue-500/10 border border-blue-500/25 hover:bg-blue-500/20 hover:text-white transition"
                >
                  <CalendarClock className="w-4 h-4 text-blue-400" />
                  <span>Schedule Automated Recurring Scrape</span>
                </button>
              </div>
            </form>
          </div>

          {/* Quick Stats Helper */}
          <div className="rounded-xl border border-border bg-surface-raised/40 p-4 text-xs space-y-2">
            <div className="flex items-center gap-2 text-gray-300 font-semibold">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>Full 18-Field Data Pipeline</span>
            </div>
            <p className="text-gray-400 leading-relaxed">
              Google Maps Playwright scraper collects business phone, address, website & name, followed by automated multi-threaded website crawl and Apollo.io executive enrichment.
            </p>
          </div>
        </div>

        {/* Right Column: Live Dark Terminal */}
        <div className="lg:col-span-7 space-y-6">
          <Terminal
            jobId={activeJob?.id || null}
            jobStatus={activeJob?.status}
            niche={activeJob?.niche}
            state={activeJob?.state}
            onJobComplete={handleJobCompleted}
          />
        </div>
      </div>

      {/* Recurring Schedules Manager Card */}
      <SchedulesList
        onOpenCreateModal={() => setIsScheduleModalOpen(true)}
        onJobTriggered={handleScheduledJobTriggered}
      />

      {/* Recent Scrapes History Table */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-400" />
            <h3 className="font-bold text-sm text-white">Recent Scraping Operations</h3>
          </div>
          <Link
            href="/leads"
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
          >
            View All Leads <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-raised text-gray-400 uppercase tracking-wider font-semibold border-b border-border">
              <tr>
                <th className="px-6 py-3">Job ID</th>
                <th className="px-6 py-3">Target Niche</th>
                <th className="px-6 py-3">State</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Leads Extracted</th>
                <th className="px-6 py-3">Created</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {jobsHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No scraping jobs recorded yet. Launch your first job above!
                  </td>
                </tr>
              ) : (
                jobsHistory.map((job) => (
                  <tr key={job.id} className="hover:bg-surface-raised/40 transition">
                    <td className="px-6 py-3.5 font-mono text-gray-300">
                      {job.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-3.5 font-medium text-white">
                      {job.niche}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="rounded bg-surface-raised border border-border px-2 py-0.5 text-[11px] font-semibold text-blue-400">
                        {job.state}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${
                          job.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : job.status === "running"
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse"
                            : job.status === "failed"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            job.status === "completed"
                              ? "bg-emerald-400"
                              : job.status === "running"
                              ? "bg-blue-400"
                              : job.status === "failed"
                              ? "bg-rose-400"
                              : "bg-amber-400"
                          }`}
                        />
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-gray-200">
                      {job.total_leads || job.found_count || 0} leads
                    </td>
                    <td className="px-6 py-3.5 text-gray-400">
                      {formatDate(job.created_at)}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setActiveJob(job)}
                          className="rounded px-2.5 py-1 text-xs bg-surface-raised text-blue-400 hover:text-blue-300 border border-border transition"
                        >
                          View Logs
                        </button>
                        <Link
                          href={`/leads?job_id=${job.id}`}
                          className="rounded px-2.5 py-1 text-xs bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 border border-blue-600/30 transition"
                        >
                          View Leads
                        </Link>
                        <button
                          onClick={() => handleDeleteJob(job.id)}
                          className="p-1 rounded text-gray-500 hover:text-rose-400 transition"
                          title="Delete Job"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Automation Modal */}
      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onScheduleCreated={() => {
          fetchDashboardData();
        }}
      />
    </div>
  );
}
