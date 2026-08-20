"use client";

import { useEffect, useRef, useState } from "react";
import { 
  Terminal as TerminalIcon, 
  Play, 
  Square, 
  Trash2, 
  Copy, 
  Check, 
  Maximize2, 
  ArrowDownCircle, 
  Sparkles,
  Layers,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { LogMessage } from "@/types";
import { getWsUrl } from "@/lib/api";

interface TerminalProps {
  jobId: string | null;
  jobStatus?: string;
  niche?: string;
  state?: string;
  onJobComplete?: () => void;
}

export function Terminal({ jobId, jobStatus, niche, state, onJobComplete }: TerminalProps) {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Connect to WebSocket when jobId changes
  useEffect(() => {
    if (!jobId) {
      setWsConnected(false);
      return;
    }

    const wsUrl = getWsUrl(jobId);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as LogMessage;
        setLogs((prev) => [...prev, parsed]);
        if (parsed.level === "success" && parsed.data?.status === "completed") {
          if (onJobComplete) onJobComplete();
        }
      } catch (err) {
        console.error("WS Parse error:", err);
      }
    };

    ws.onerror = (err) => {
      console.error("WS error:", err);
      setWsConnected(false);
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [jobId, onJobComplete]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const handleClear = () => {
    setLogs([]);
  };

  const handleCopyLogs = () => {
    const text = logs
      .map((l) => `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.level.toUpperCase()}] ${l.message}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLevelBadge = (level: LogMessage["level"]) => {
    switch (level) {
      case "success":
        return <span className="text-emerald-400 font-bold">[SUCCESS]</span>;
      case "progress":
        return <span className="text-amber-400 font-bold">[PROGRESS]</span>;
      case "warning":
        return <span className="text-yellow-400 font-bold">[WARN]</span>;
      case "error":
        return <span className="text-rose-400 font-bold">[ERROR]</span>;
      case "info":
      default:
        return <span className="text-cyan-400 font-bold">[INFO]</span>;
    }
  };

  return (
    <div className="flex flex-col h-[520px] rounded-xl border border-border bg-[#0d1117] shadow-2xl overflow-hidden">
      {/* Terminal Titlebar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-[#161b22]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <div className="h-4 w-px bg-border mx-1" />
          <div className="flex items-center gap-2 text-xs font-mono text-gray-300">
            <TerminalIcon className="h-4 w-4 text-blue-400" />
            <span className="text-white font-medium">Live Execution Terminal</span>
            {jobId && (
              <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[11px] text-blue-400 border border-blue-500/20 font-mono">
                Job #{jobId.slice(0, 8)}
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Connection Status */}
          {jobId && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-surface border border-border">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  wsConnected ? "bg-emerald-400 animate-pulse" : "bg-gray-500"
                }`}
              />
              <span className={wsConnected ? "text-emerald-400" : "text-gray-400"}>
                {wsConnected ? "WS Live" : "Offline"}
              </span>
            </div>
          )}

          {/* Auto Scroll Toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            title={autoScroll ? "Disable Auto-scroll" : "Enable Auto-scroll"}
            className={`p-1.5 rounded text-xs transition ${
              autoScroll ? "text-blue-400 bg-blue-500/10" : "text-gray-400 hover:text-white"
            }`}
          >
            <ArrowDownCircle className="h-4 w-4" />
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopyLogs}
            disabled={logs.length === 0}
            title="Copy Logs"
            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-surface-raised transition disabled:opacity-30"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          </button>

          {/* Clear Button */}
          <button
            onClick={handleClear}
            disabled={logs.length === 0}
            title="Clear Terminal"
            className="p-1.5 rounded text-gray-400 hover:text-rose-400 hover:bg-surface-raised transition disabled:opacity-30"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Terminal Logs Area */}
      <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-gray-300 space-y-1.5 select-text custom-scrollbar bg-[#090d14]">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500 space-y-3">
            <div className="p-3 rounded-full bg-surface border border-border">
              <TerminalIcon className="h-6 w-6 text-gray-400" />
            </div>
            <div>
              <p className="text-gray-300 font-medium text-sm">Terminal Idle</p>
              <p className="text-xs text-gray-500 max-w-sm mt-1">
                Select a target Niche & Australian State from the left panel and click &ldquo;Launch Scrape Job&rdquo; to stream real-time execution logs.
              </p>
            </div>
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="flex items-start gap-2.5 leading-relaxed hover:bg-white/[0.02] py-0.5 px-1 rounded">
              <span className="text-gray-600 shrink-0 select-none">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className="shrink-0 select-none">{getLevelBadge(log.level)}</span>
              <span
                className={`break-all ${
                  log.level === "error"
                    ? "text-rose-300"
                    : log.level === "success"
                    ? "text-emerald-300"
                    : log.level === "progress"
                    ? "text-amber-200"
                    : log.level === "warning"
                    ? "text-yellow-300"
                    : "text-gray-200"
                }`}
              >
                {log.message}
              </span>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Terminal Footer Info */}
      <div className="px-4 py-2 border-t border-border bg-[#161b22] flex items-center justify-between text-[11px] font-mono text-gray-400">
        <div className="flex items-center gap-4">
          <span>Engine: <span className="text-gray-200">Playwright + Apollo GraphQL/REST</span></span>
          {jobStatus && (
            <span>
              Status:{" "}
              <span
                className={`font-semibold capitalize ${
                  jobStatus === "completed"
                    ? "text-emerald-400"
                    : jobStatus === "running"
                    ? "text-blue-400"
                    : jobStatus === "failed"
                    ? "text-rose-400"
                    : "text-amber-400"
                }`}
              >
                {jobStatus}
              </span>
            </span>
          )}
        </div>
        <div>
          <span>Lines: <span className="text-gray-200">{logs.length}</span></span>
        </div>
      </div>
    </div>
  );
}
