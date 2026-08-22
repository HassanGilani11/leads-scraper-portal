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
  CalendarClock,
  Compass,
  Globe,
  Sliders,
  Flame
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
  "Dentists",
  "Solar Panel Installers",
  "Plumbers",
  "Electricians",
  "Roofers",
  "Lawyers",
  "Accountants",
  "Real Estate Agents",
  "Commercial Cleaning",
  "Car Detailing"
];

const RADIUS_OPTIONS = [
  { label: "Auto", value: 0 },
  { label: "5 km", value: 5 },
  { label: "10 km", value: 10 },
  { label: "25 km", value: 25 },
  { label: "50 km", value: 50 },
  { label: "100 km", value: 100 }
];

export default function DashboardPage() {
  const [niche, setNiche] = useState<string>("Dentists");
  const [customNiche, setCustomNiche] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("NSW");
  const [suburb, setSuburb] = useState<string>("");
  const [radiusKm, setRadiusKm] = useState<number>(25);
  const [noWebsiteOnly, setNoWebsiteOnly] = useState<boolean>(false);

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
      const job = await startScrapeJob({
        niche: finalNiche,
        state: selectedState,
        suburb: suburb.trim() || undefined,
        radius_km: radiusKm > 0 ? radiusKm : 25,
        no_website_only: noWebsiteOnly
      });
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
    <div className="space-y-8 animate-fadeIn">
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
              <span>{activeJob.niche} • {activeJob.suburb ? `${activeJob.suburb}, ${activeJob.state}` : activeJob.state} ({activeJob.radius_km || 25}km)</span>
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
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Radar className="h-5 w-5 text-blue-400" />
                  Precision Scraper Engine
                </h2>
                <p className="text-xs text-gray-400">
                  Target local niches across Australian suburbs with exact radius & geo-grids.
                </p>
              </div>

              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Live Geocoding
              </span>
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
                    <Briefcase className="h-3.5 w-3.5 text-blue-400" /> Business Category / Niche
                  </span>
                  <span className="text-[11px] text-gray-500 font-normal">Click preset or type custom</span>
                </label>

                {/* Popular Presets Pills */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {NICHE_PRESETS.map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => {
                        setNiche(preset);
                        setCustomNiche("");
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition ${
                        niche === preset && !customNiche
                          ? "bg-blue-600 text-white shadow-sm font-semibold"
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

              {/* Suburb / City & Search Radius Section */}
              <div className="space-y-3 p-4 rounded-xl bg-surface-raised/60 border border-border">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                    <Compass className="h-3.5 w-3.5 text-emerald-400" /> Search Radius
                  </label>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {radiusKm === 0 ? "Auto" : `${radiusKm} km`}
                  </span>
                </div>

                {/* Radius Pills */}
                <div className="grid grid-cols-6 gap-1.5">
                  {RADIUS_OPTIONS.map((opt) => (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => setRadiusKm(opt.value)}
                      className={`py-1.5 rounded-lg text-[11px] font-bold transition text-center ${
                        radiusKm === opt.value
                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 border border-emerald-500"
                          : "bg-surface text-gray-400 hover:text-white border border-border"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Specific Suburb / City Input */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-semibold text-gray-400 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-blue-400" /> Specific Suburb / Postcode (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Parramatta, Bondi Beach, Southport, Fortitude Valley..."
                    value={suburb}
                    onChange={(e) => setSuburb(e.target.value)}
                    className="w-full rounded-xl bg-surface border border-border px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* State Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-blue-400" /> Australian State / Territory
                  </span>
                  <span className="text-[11px] text-gray-500 font-normal">
                    {AUSTRALIAN_STATES.find(s => s.code === selectedState)?.suburbsCount || 0} Key Hubs
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
                          <span className="text-[10px] text-gray-400">{state.suburbsCount} Hubs</span>
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

              {/* No-Website Leads Hot Pitch Toggle */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 flex items-center justify-between">
                <div className="space-y-0.5 pr-2">
                  <div className="flex items-center gap-1.5">
                    <Flame className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs font-bold text-white">Target "No-Website" Leads Only</span>
                  </div>
                  <p className="text-[11px] text-amber-200/70">
                    High-converting local businesses on Maps with phone & reviews but zero website.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={noWebsiteOnly}
                    onChange={(e) => setNoWebsiteOnly(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
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
                      <span>Scan Local Territory ({radiusKm === 0 ? "Auto" : `${radiusKm}km`})</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-2 px-4 text-xs font-semibold text-gray-300 hover:text-white bg-surface-raised hover:bg-surface-raised/80 border border-border transition"
                >
                  <CalendarClock className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Set Recurring Autonomous Schedule</span>
                </button>
              </div>
            </form>
          </div>

          {/* Active Job Progress Widget */}
          {activeJob && (
            <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-b from-blue-900/10 to-transparent p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                  </span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    Live Progress #{activeJob.id.slice(0, 8)}
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                  {activeJob.status}
                </span>
              </div>

              {/* Counters Grid */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-surface border border-border p-2.5">
                  <span className="text-[10px] text-gray-400 uppercase">Found</span>
                  <p className="text-lg font-bold text-white font-mono">{foundCount}</p>
                </div>
                <div className="rounded-lg bg-surface border border-border p-2.5">
                  <span className="text-[10px] text-gray-400 uppercase">Enriched</span>
                  <p className="text-lg font-bold text-emerald-400 font-mono">{enrichedCount}</p>
                </div>
                <div className="rounded-lg bg-surface border border-border p-2.5">
                  <span className="text-[10px] text-gray-400 uppercase">Errors</span>
                  <p className="text-lg font-bold text-rose-400 font-mono">{errorCount}</p>
                </div>
              </div>

              {/* Action link */}
              <div className="pt-2 flex justify-end">
                <Link
                  href={`/leads?job_id=${activeJob.id}`}
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <span>Explore Leads from this Job</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Real-Time Terminal Output & Schedules */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-400" />
                  Live Execution Terminal
                </h3>
                <p className="text-[11px] text-gray-400">
                  Real-time headless scraper events, Apollo enrichment payloads & WebSocket logs.
                </p>
              </div>
            </div>

            <Terminal 
              jobId={activeJob?.id || null} 
              onJobComplete={handleJobCompleted}
            />
          </div>

          {/* Autonomous Schedules Manager */}
          <SchedulesList 
            onOpenCreateModal={() => setIsScheduleModalOpen(true)} 
            onJobTriggered={handleScheduledJobTriggered} 
          />
        </div>
      </div>

      {/* Bottom Section: Scrape Jobs History Table */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="h-4.5 w-4.5 text-blue-400" />
              Scraping Jobs History
            </h2>
            <p className="text-xs text-gray-400">
              Audit log of all manual and scheduled scraping operations.
            </p>
          </div>

          <button
            onClick={fetchDashboardData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-raised border border-border text-xs font-semibold text-gray-300 hover:text-white transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {jobsHistory.length === 0 ? (
          <div className="py-12 text-center text-gray-500 border border-dashed border-border rounded-xl">
            <Database className="h-8 w-8 mx-auto mb-2 text-gray-600" />
            <p className="text-sm font-medium">No scraping jobs recorded yet</p>
            <p className="text-xs text-gray-500 mt-0.5">Launch your first scrape above to populate your vault.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-gray-400 font-semibold bg-surface-raised/50">
                  <th className="py-3 px-4">Job ID</th>
                  <th className="py-3 px-4">Niche</th>
                  <th className="py-3 px-4">Location / Radius</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Leads Found</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-gray-300">
                {jobsHistory.map((j) => (
                  <tr key={j.id} className="hover:bg-surface-raised/50 transition">
                    <td className="py-3 px-4 font-mono text-gray-400">
                      {j.id.slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {j.niche}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                        {j.suburb ? `${j.suburb}, ${j.state}` : j.state} ({j.radius_km || 25}km)
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded text-[11px] ${
                          j.status === "completed"
                            ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                            : j.status === "running"
                            ? "text-blue-400 bg-blue-500/10 border border-blue-500/20 animate-pulse"
                            : j.status === "failed"
                            ? "text-rose-400 bg-rose-500/10 border border-rose-500/20"
                            : "text-amber-400 bg-amber-500/10 border border-amber-500/20"
                        }`}
                      >
                        {j.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {j.total_leads} leads
                    </td>
                    <td className="py-3 px-4 text-gray-400">
                      {formatDate(j.created_at)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/leads?job_id=${j.id}`}
                          className="px-2.5 py-1 rounded bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 font-semibold transition"
                        >
                          View Leads
                        </Link>
                        <button
                          onClick={() => handleDeleteJob(j.id)}
                          className="p-1 rounded text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          title="Delete Job"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
