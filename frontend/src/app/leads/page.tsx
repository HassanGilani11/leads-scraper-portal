"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Users, 
  Search, 
  Download, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink, 
  Mail, 
  Phone, 
  Linkedin, 
  Building2, 
  RefreshCw,
  MapPin,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  ShieldCheck
} from "lucide-react";
import { getLeads, getExportCsvUrl, getJobs } from "@/lib/api";
import { Lead, Job } from "@/types";
import { LeadModal } from "@/components/LeadModal";
import { formatDate, truncateText } from "@/lib/utils";

const AUSTRALIAN_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT"];

function LeadsExplorerContent() {
  const searchParams = useSearchParams();
  const initialJobId = searchParams.get("job_id") || "";

  // Query & Filter States
  const [search, setSearch] = useState<string>("");
  const [selectedJobId, setSelectedJobId] = useState<string>(initialJobId);
  const [selectedState, setSelectedState] = useState<string>("");
  const [hasEmail, setHasEmail] = useState<boolean>(false);
  const [hasPhone, setHasPhone] = useState<boolean>(false);
  const [hasLinkedin, setHasLinkedin] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);

  // Data & Modal States
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const fetchLeadsData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLeads({
        search: search.trim() || undefined,
        job_id: selectedJobId || undefined,
        state: selectedState || undefined,
        has_email: hasEmail ? true : undefined,
        has_phone: hasPhone ? true : undefined,
        has_linkedin: hasLinkedin ? true : undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        limit,
      });
      setLeads(data.items);
      setTotal(data.total);
      setTotalPages(data.pages);
    } catch (err) {
      console.error("Error fetching leads:", err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedJobId, selectedState, hasEmail, hasPhone, hasLinkedin, sortBy, sortOrder, page, limit]);

  useEffect(() => {
    fetchLeadsData();
  }, [fetchLeadsData]);

  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await getJobs(50, 0);
        setJobs(res.jobs);
      } catch (err) {
        console.error("Error fetching jobs list:", err);
      }
    }
    loadJobs();
  }, []);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const handleExportCsv = () => {
    const url = getExportCsvUrl({
      job_id: selectedJobId || undefined,
      state: selectedState || undefined,
      search: search.trim() || undefined,
    });
    window.open(url, "_blank");
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedJobId("");
    setSelectedState("");
    setHasEmail(false);
    setHasPhone(false);
    setHasLinkedin(false);
    setPage(1);
  };

  const activeFiltersCount = 
    (selectedJobId ? 1 : 0) + 
    (selectedState ? 1 : 0) + 
    (hasEmail ? 1 : 0) + 
    (hasPhone ? 1 : 0) + 
    (hasLinkedin ? 1 : 0) + 
    (search ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Users className="h-6 w-6 text-blue-400" />
            <span>Leads Explorer & Intelligence Vault</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Displaying {total.toLocaleString()} enriched local business listings across Australia with 18 data points.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchLeadsData}
            className="flex items-center gap-2 rounded-lg bg-surface border border-border px-3.5 py-2 text-xs font-medium text-gray-300 hover:text-white hover:bg-surface-raised transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition shadow-lg shadow-emerald-600/20"
          >
            <Download className="h-4 w-4" />
            Export CSV (18 Columns)
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-border bg-surface p-4 space-y-4 shadow-xl">
        {/* Row 1: Search & Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-5 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search company, contact person, email, location..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-raised border border-border text-xs text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition"
            />
          </div>

          {/* State Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-3 rounded-xl bg-surface-raised border border-border text-xs text-gray-300 focus:border-blue-500 focus:outline-none transition"
            >
              <option value="">All Australian States</option>
              {AUSTRALIAN_STATES.map((st) => (
                <option key={st} value={st}>
                  {st} State
                </option>
              ))}
            </select>
          </div>

          {/* Job ID Filter */}
          <div className="sm:col-span-4">
            <select
              value={selectedJobId}
              onChange={(e) => {
                setSelectedJobId(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-3 rounded-xl bg-surface-raised border border-border text-xs text-gray-300 focus:border-blue-500 focus:outline-none transition truncate"
            >
              <option value="">All Scraping Jobs</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.niche} ({j.state}) - {formatDate(j.created_at)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Quick Filter Toggles & Row Count */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-gray-400 font-medium mr-1 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5 text-blue-400" /> Filters:
            </span>

            <button
              onClick={() => {
                setHasEmail(!hasEmail);
                setPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition ${
                hasEmail
                  ? "bg-blue-600/20 text-blue-300 border-blue-500/50"
                  : "bg-surface-raised text-gray-400 border-border hover:text-white"
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              Has Email
            </button>

            <button
              onClick={() => {
                setHasPhone(!hasPhone);
                setPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition ${
                hasPhone
                  ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/50"
                  : "bg-surface-raised text-gray-400 border-border hover:text-white"
              }`}
            >
              <Phone className="h-3.5 w-3.5" />
              Has Phone
            </button>

            <button
              onClick={() => {
                setHasLinkedin(!hasLinkedin);
                setPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition ${
                hasLinkedin
                  ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/50"
                  : "bg-surface-raised text-gray-400 border-border hover:text-white"
              }`}
            >
              <Linkedin className="h-3.5 w-3.5" />
              Has LinkedIn
            </button>

            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-gray-400 hover:text-rose-400 underline ml-2 transition"
              >
                Reset All Filters ({activeFiltersCount})
              </button>
            )}
          </div>

          {/* Page Limit Selector */}
          <div className="flex items-center gap-2 text-gray-400">
            <span>Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="py-1 px-2 rounded bg-surface-raised border border-border text-xs text-white focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Interactive Table */}
      <div className="rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-surface-raised text-gray-400 uppercase tracking-wider font-semibold border-b border-border whitespace-nowrap select-none">
              <tr>
                <th className="px-4 py-3.5">#</th>
                <th
                  onClick={() => handleSort("business_name")}
                  className="px-4 py-3.5 cursor-pointer hover:text-white transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Business Name</span>
                    {sortBy === "business_name" ? (
                      sortOrder === "asc" ? <ArrowUp className="h-3 w-3 text-blue-400" /> : <ArrowDown className="h-3 w-3 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-30" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3.5">Contact Person</th>
                <th className="px-4 py-3.5">Email Addresses</th>
                <th className="px-4 py-3.5">Phone / Office</th>
                <th className="px-4 py-3.5">Location</th>
                <th className="px-4 py-3.5">Credentials / Tech</th>
                <th className="px-4 py-3.5">Links</th>
                <th className="px-4 py-3.5 text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
                      <span>Loading enriched leads...</span>
                    </div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <Building2 className="h-8 w-8 text-gray-600" />
                      <p className="text-gray-300 font-semibold">No Leads Found</p>
                      <p className="text-xs text-gray-500">
                        Try adjusting your search query, clearing active filters, or launching a new scraping job from the Dashboard.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map((lead, index) => {
                  const emailDisplay = lead.email || lead.business_email;
                  const phoneDisplay = lead.phone_number || lead.office_contact;
                  const creds = lead.keywords || lead.technologies_used || lead.industries || "";
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className="hover:bg-surface-raised/50 cursor-pointer transition"
                    >
                      {/* Index */}
                      <td className="px-4 py-3 text-gray-600 font-mono">
                        {(page - 1) * limit + index + 1}
                      </td>

                      {/* Business Name */}
                      <td className="px-4 py-3 font-semibold text-white max-w-[220px]">
                        <div className="flex flex-col">
                          <span className="truncate">{lead.business_name || "Unnamed"}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-blue-400 font-normal">
                              {lead.state || "AU"}
                            </span>
                            {lead.niche && (
                              <span className="text-[10px] text-gray-500 font-normal truncate">
                                • {lead.niche}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact Person */}
                      <td className="px-4 py-3 text-gray-300 max-w-[160px]">
                        {lead.contact_person ? (
                          <div className="flex items-center gap-1.5 text-blue-300 font-medium truncate">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                            <span className="truncate">{lead.contact_person}</span>
                          </div>
                        ) : (
                          <span className="text-gray-500 italic">Executive / Owner</span>
                        )}
                      </td>

                      {/* Emails */}
                      <td className="px-4 py-3 text-gray-300 max-w-[200px]">
                        {emailDisplay ? (
                          <div className="flex flex-col">
                            <span className="text-blue-400 font-mono truncate font-medium">{emailDisplay}</span>
                            {lead.business_email && lead.email && lead.business_email !== lead.email && (
                              <span className="text-[10px] text-gray-500 truncate">
                                Alt: {lead.business_email}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-600 font-mono">-</span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="px-4 py-3 text-emerald-400 font-mono whitespace-nowrap font-medium">
                        {phoneDisplay || <span className="text-gray-600">-</span>}
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3 text-gray-400 max-w-[170px] truncate" title={lead.office_location || ""}>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-gray-500 shrink-0" />
                          <span className="truncate">{lead.office_location || `${lead.state}, Australia`}</span>
                        </span>
                      </td>

                      {/* Credentials / Tech */}
                      <td className="px-4 py-3 max-w-[190px] truncate">
                        {creds ? (
                          <span className="rounded bg-surface-raised border border-border px-2 py-0.5 text-[10px] text-gray-300 font-mono truncate inline-block max-w-full">
                            {truncateText(creds, 26)}
                          </span>
                        ) : (
                          <span className="text-gray-600 font-mono">-</span>
                        )}
                      </td>

                      {/* Links */}
                      <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          {lead.website && (
                            <a
                              href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-blue-400 transition p-1 hover:bg-surface-raised rounded"
                              title="Website"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {lead.linkedin_url && (
                            <a
                              href={lead.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-blue-400 transition p-1 hover:bg-surface-raised rounded"
                              title="LinkedIn"
                            >
                              <Linkedin className="h-3.5 w-3.5 text-blue-400" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Action Button */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLead(lead);
                          }}
                          className="rounded px-2.5 py-1 text-[11px] font-medium bg-surface-raised hover:bg-blue-600/20 text-gray-300 hover:text-blue-300 border border-border transition"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-6 py-4 border-t border-border bg-surface-raised/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <div>
            Showing <span className="font-semibold text-white">{leads.length > 0 ? (page - 1) * limit + 1 : 0}</span> to{" "}
            <span className="font-semibold text-white">{Math.min(page * limit, total)}</span> of{" "}
            <span className="font-semibold text-white">{total.toLocaleString()}</span> entries
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 rounded-lg bg-surface border border-border px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-surface-raised disabled:opacity-40 transition"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </button>
            <span className="px-2 font-mono text-gray-300">
              Page {page} of {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 rounded-lg bg-surface border border-border px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-surface-raised disabled:opacity-40 transition"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Lead Dossier Detail Modal */}
      <LeadModal
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
      />
    </div>
  );
}

export default function LeadsExplorerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      }
    >
      <LeadsExplorerContent />
    </Suspense>
  );
}
