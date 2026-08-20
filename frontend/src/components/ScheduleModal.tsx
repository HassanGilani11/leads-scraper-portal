"use client";

import React, { useState } from "react";
import { ScheduleFrequency } from "@/types";
import { createSchedule } from "@/lib/api";
import { 
  CalendarClock, 
  MapPin, 
  Briefcase, 
  Clock, 
  AlertCircle, 
  Loader2, 
  X, 
  Sparkles,
  Calendar,
  Layers
} from "lucide-react";

const AUSTRALIAN_STATES = [
  { code: "NSW", name: "New South Wales" },
  { code: "VIC", name: "Victoria" },
  { code: "QLD", name: "Queensland" },
  { code: "WA", name: "Western Australia" },
  { code: "SA", name: "South Australia" },
  { code: "TAS", name: "Tasmania" },
  { code: "ACT", name: "Canberra / ACT" },
];

const NICHE_PRESETS = [
  "Plumbers",
  "Electricians",
  "Accountants",
  "Dentists",
  "Real Estate Agents",
  "Solar Panel Installers",
  "Commercial Cleaning",
  "Lawyers",
];

const DAYS_OF_WEEK = [
  { value: 0, label: "Monday", short: "Mon" },
  { value: 1, label: "Tuesday", short: "Tue" },
  { value: 2, label: "Wednesday", short: "Wed" },
  { value: 3, label: "Thursday", short: "Thu" },
  { value: 4, label: "Friday", short: "Fri" },
  { value: 5, label: "Saturday", short: "Sat" },
  { value: 6, label: "Sunday", short: "Sun" },
];

const FREQUENCY_OPTIONS: { value: ScheduleFrequency; label: string; desc: string }[] = [
  { value: "daily", label: "Daily", desc: "Every 24h" },
  { value: "weekly", label: "Weekly", desc: "Once / week" },
  { value: "biweekly", label: "Bi-Weekly", desc: "Every 14d" },
  { value: "monthly", label: "Monthly", desc: "Every 30d" },
];

const TIME_OPTIONS = [
  { value: 6, label: "6:00 AM AEST (Early Morning)" },
  { value: 8, label: "8:00 AM AEST (Business Opening)" },
  { value: 10, label: "10:00 AM AEST (Mid-Morning)" },
  { value: 14, label: "2:00 PM AEST (Afternoon)" },
  { value: 20, label: "8:00 PM AEST (Overnight Batch)" },
];

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduleCreated: () => void;
}

export function ScheduleModal({ isOpen, onClose, onScheduleCreated }: ScheduleModalProps) {
  const [niche, setNiche] = useState<string>("Plumbers");
  const [customNiche, setCustomNiche] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("NSW");
  const [frequency, setFrequency] = useState<ScheduleFrequency>("weekly");
  const [dayOfWeek, setDayOfWeek] = useState<number>(0);
  const [hourOfDay, setHourOfDay] = useState<number>(8);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const targetNiche = customNiche.trim() || niche;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetNiche) {
      setErrorMsg("Please specify a target industry or niche");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await createSchedule({
        niche: targetNiche,
        state: selectedState,
        frequency,
        day_of_week: dayOfWeek,
        hour_of_day: hourOfDay,
        is_active: true,
      });
      onScheduleCreated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to create recurring schedule");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isWeeklyType = frequency === "weekly" || frequency === "biweekly";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl bg-[#0f172a] border border-border/80 shadow-2xl shadow-black/70 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 border-b border-border/60 bg-gradient-to-r from-blue-900/20 via-indigo-900/20 to-purple-900/20 flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
              <CalendarClock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Automate Recurring Scrape</h3>
              <p className="text-xs text-gray-400 mt-0.5">Set scheduled extraction and Apollo enrichment on autopilot</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-surface-raised transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Target Niche Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-blue-400" /> Target Industry / Niche
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {NICHE_PRESETS.slice(0, 6).map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => {
                    setNiche(item);
                    setCustomNiche("");
                  }}
                  className={`text-xs px-2.5 py-1 rounded-lg transition ${
                    niche === item && !customNiche
                      ? "bg-blue-600 text-white font-medium shadow-sm"
                      : "bg-surface-raised text-gray-400 hover:text-white border border-border/80"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Or custom niche (e.g. Roof Painters, Solar Installers)..."
              value={customNiche}
              onChange={(e) => setCustomNiche(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface-raised border border-border rounded-xl text-white placeholder-gray-500 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 2. State Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-400" /> Australian State / Territory
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {AUSTRALIAN_STATES.map((st) => (
                <button
                  type="button"
                  key={st.code}
                  onClick={() => setSelectedState(st.code)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition flex flex-col items-center ${
                    selectedState === st.code
                      ? "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 border border-blue-400/40"
                      : "bg-surface-raised border border-border/80 text-gray-300 hover:text-white hover:border-gray-600"
                  }`}
                >
                  <span>{st.code}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Frequency Pill Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Pipeline Frequency
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FREQUENCY_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setFrequency(opt.value)}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col ${
                    frequency === opt.value
                      ? "bg-blue-600/15 border-blue-500 text-white shadow-sm"
                      : "bg-surface-raised border-border text-gray-400 hover:text-white hover:border-gray-600"
                  }`}
                >
                  <span className={`text-xs font-bold ${frequency === opt.value ? "text-blue-400" : "text-gray-300"}`}>
                    {opt.label}
                  </span>
                  <span className="text-[10px] text-gray-500 mt-0.5">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Timing & Weekday Config (Clean Full-Width Rows) */}
          <div className="space-y-3.5 pt-1">
            {isWeeklyType && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Scheduled Day of Week
                  </span>
                  <span className="text-[11px] text-blue-400 font-medium">{DAYS_OF_WEEK[dayOfWeek].label}s</span>
                </label>
                <div className="grid grid-cols-7 gap-1.5">
                  {DAYS_OF_WEEK.map((d) => (
                    <button
                      type="button"
                      key={d.value}
                      onClick={() => setDayOfWeek(d.value)}
                      className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center ${
                        dayOfWeek === d.value
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 border border-blue-400"
                          : "bg-surface-raised border border-border text-gray-400 hover:text-white hover:border-gray-600"
                      }`}
                    >
                      <span>{d.short}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Execution Hour */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> Execution Time (AEST)
              </label>
              <div className="relative">
                <select
                  value={hourOfDay}
                  onChange={(e) => setHourOfDay(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-surface-raised border border-border rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none font-medium"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-gray-400 text-xs">
                  ▼
                </div>
              </div>
            </div>
          </div>

          {/* 5. Summary Preview Pill */}
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
            <span className="leading-relaxed">
              Pipeline will scrape <strong>{targetNiche}</strong> in <strong>{selectedState}</strong>{" "}
              {frequency === "daily"
                ? "every single day"
                : frequency === "weekly"
                ? `every ${DAYS_OF_WEEK[dayOfWeek].label}`
                : frequency === "biweekly"
                ? `every 2 weeks on ${DAYS_OF_WEEK[dayOfWeek].label}`
                : "every 30 days"}{" "}
              at <strong>{hourOfDay}:00 AEST</strong>.
            </span>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs text-gray-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-5 py-2.5 text-xs font-bold text-white transition shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarClock className="w-4 h-4" />}
              <span>Save & Activate Schedule</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
