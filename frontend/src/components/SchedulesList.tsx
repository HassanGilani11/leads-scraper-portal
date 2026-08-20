"use client";

import React, { useState, useEffect } from "react";
import { Schedule } from "@/types";
import { 
  getSchedules, 
  updateSchedule, 
  deleteSchedule, 
  triggerScheduleRunNow 
} from "@/lib/api";
import { 
  CalendarClock, 
  Play, 
  Pause, 
  Trash2, 
  RefreshCw, 
  Clock, 
  MapPin, 
  Briefcase, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Zap,
  Plus
} from "lucide-react";

const DAYS_MAP: Record<number, string> = {
  0: "Mon",
  1: "Tue",
  2: "Wed",
  3: "Thu",
  4: "Fri",
  5: "Sat",
  6: "Sun",
};

interface SchedulesListProps {
  onOpenCreateModal: () => void;
  onJobTriggered?: (jobId: string) => void;
}

export function SchedulesList({ onOpenCreateModal, onJobTriggered }: SchedulesListProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 5000);
  };

  const loadSchedules = async () => {
    setIsLoading(true);
    try {
      const res = await getSchedules();
      setSchedules(res.schedules);
    } catch (err: any) {
      showError("Failed to fetch recurring automation schedules");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const handleToggleActive = async (item: Schedule) => {
    try {
      await updateSchedule(item.id, { is_active: !item.is_active });
      showSuccess(`Schedule for ${item.niche} (${item.state}) ${!item.is_active ? "resumed" : "paused"}`);
      loadSchedules();
    } catch (err: any) {
      showError(err?.message || "Failed to update schedule status");
    }
  };

  const handleDelete = async (item: Schedule) => {
    if (!confirm(`Delete automated schedule for ${item.niche} (${item.state})?`)) return;
    try {
      await deleteSchedule(item.id);
      showSuccess("Schedule deleted successfully");
      loadSchedules();
    } catch (err: any) {
      showError(err?.message || "Failed to delete schedule");
    }
  };

  const handleRunNow = async (item: Schedule) => {
    setTriggeringId(item.id);
    try {
      const job = await triggerScheduleRunNow(item.id);
      showSuccess(`Instant execution started for ${item.niche} (${item.state}) - Job #${job.id.slice(0, 8)}`);
      loadSchedules();
      if (onJobTriggered) {
        onJobTriggered(job.id);
      }
    } catch (err: any) {
      showError(err?.message || "Failed to trigger schedule execution");
    } finally {
      setTriggeringId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-blue-400" />
            <span>Recurring Scrape Automations</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {schedules.length} Active
            </span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Automated background jobs scheduled to continuously replenish your lead pipeline
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadSchedules}
            className="p-2 text-gray-400 hover:text-white rounded-xl bg-surface-raised border border-border hover:border-gray-600 transition"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-3.5 py-2 text-xs font-bold text-white transition shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Schedule</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Grid of Schedules */}
      {schedules.length === 0 && !isLoading ? (
        <div className="text-center py-10 px-4 rounded-xl border border-dashed border-border/80 bg-surface-raised/30 flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <CalendarClock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">No Automated Schedules Yet</h3>
            <p className="text-xs text-gray-400 max-w-sm mt-1">
              Set up recurring background scrapers (e.g. scrape Melbourne Dentists every Monday) to run automatically.
            </p>
          </div>
          <button
            onClick={onOpenCreateModal}
            className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Schedule</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {schedules.map((item) => {
            const nextDate = new Date(item.next_run_at);
            const isDueSoon = nextDate.getTime() - Date.now() < 1000 * 60 * 60 * 24;

            return (
              <div
                key={item.id}
                className={`rounded-xl border p-4 transition-all duration-200 flex flex-col justify-between space-y-3.5 ${
                  item.is_active
                    ? "bg-surface-raised/80 border-border/90 hover:border-blue-500/40"
                    : "bg-surface-raised/30 border-border/50 opacity-70"
                }`}
              >
                {/* Top Info */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{item.niche}</span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 font-mono text-[10px] font-bold border border-blue-500/30">
                        {item.state}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-gray-400">
                      <span className="capitalize font-medium text-gray-300">
                        {item.frequency === "weekly" || item.frequency === "biweekly"
                          ? `${item.frequency} on ${DAYS_MAP[item.day_of_week] || "Mon"}`
                          : item.frequency}
                      </span>
                      <span>•</span>
                      <span>{item.hour_of_day}:00 AEST</span>
                    </div>
                  </div>

                  {/* Active / Paused Badge */}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                      item.is_active
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}
                  >
                    {item.is_active ? "Active" : "Paused"}
                  </span>
                </div>

                {/* Next Run & Stats */}
                <div className="p-2.5 rounded-lg bg-surface/80 border border-border/60 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-blue-400" /> Next Run:
                    </span>
                    <span className={`font-medium ${isDueSoon && item.is_active ? "text-amber-300 font-semibold" : "text-gray-200"}`}>
                      {nextDate.toLocaleDateString()} {nextDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span>Total Runs:</span>
                    <span className="font-mono text-gray-300 font-medium">{item.total_runs_count}</span>
                  </div>
                </div>

                {/* Actions Bottom Bar */}
                <div className="flex items-center justify-between pt-1 border-t border-border/50">
                  <button
                    onClick={() => handleRunNow(item)}
                    disabled={triggeringId === item.id}
                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold py-1 px-2 rounded-lg hover:bg-blue-500/10 transition disabled:opacity-50"
                  >
                    {triggeringId === item.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 fill-current" />
                    )}
                    <span>Run Now</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleActive(item)}
                      className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-surface transition"
                      title={item.is_active ? "Pause schedule" : "Resume schedule"}
                    >
                      {item.is_active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="p-1.5 text-gray-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition"
                      title="Delete schedule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
