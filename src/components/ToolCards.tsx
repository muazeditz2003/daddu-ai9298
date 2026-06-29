import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Globe, Clock, Sparkles, MessageSquare, ExternalLink, Search, Download, Copy, XCircle, Monitor } from "lucide-react";
import { ToolCallLog } from "../types";

interface ToolCardsProps {
  logs: ToolCallLog[];
}

export default function ToolCards({ logs }: ToolCardsProps) {
  if (logs.length === 0) {
    return (
      <div className="text-center p-6 border border-white/5 bg-white/[0.02] rounded-2xl backdrop-blur-md">
        <Sparkles className="w-6 h-6 text-gray-500 mx-auto mb-2 animate-pulse" />
        <p className="text-xs text-gray-400 font-sans">Active tools executed by DADDU will appear here</p>
      </div>
    );
  }

  const getToolIcon = (name: string) => {
    switch (name) {
      case "openWebsite":
      case "searchInternet":
        return <Globe className="w-4 h-4 text-lime-400" />;
      case "seeScreen":
        return <Monitor className="w-4 h-4 text-lime-400" />;
      case "webSearch":
      case "fetchWebContent":
        return <Search className="w-4 h-4 text-lime-400" />;
      case "downloadFromWeb":
        return <Download className="w-4 h-4 text-lime-400" />;
      case "copyToClipboard":
        return <Copy className="w-4 h-4 text-lime-400" />;
      case "closeWebsite":
        return <XCircle className="w-4 h-4 text-lime-400" />;
      case "getDateTime":
        return <Clock className="w-4 h-4 text-lime-300" />;
      case "triggerUIAnimation":
        return <Sparkles className="w-4 h-4 text-lime-500" />;
      case "showNotification":
        return <MessageSquare className="w-4 h-4 text-lime-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-gray-400" />;
    }
  };

  const getToolTitle = (log: ToolCallLog) => {
    if (log.name === "openWebsite") return `Navigate: ${log.args.siteName || "Web"}`;
    if (log.name === "searchInternet") return `Search: ${log.args.query || "Web"}`;
    if (log.name === "seeScreen") return `Screen: ${log.args.focus || "Full view"}`;
    if (log.name === "downloadFromWeb") return `Download: ${log.args.url || "File"}`;
    return log.name;
  };

  const formatArgs = (args: any) => {
    if (!args || Object.keys(args).length === 0) return "None";
    return Object.entries(args)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  };

  return (
    <div className="space-y-3 max-h-72 overflow-y-auto pr-1" id="tool-execution-logs">
      <AnimatePresence initial={false}>
        {logs.map((log) => (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="p-3.5 border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] rounded-2xl backdrop-blur-xl transition-all duration-300"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/[0.04] border border-white/5">
                  {getToolIcon(log.name)}
                </div>
                <div>
                  <h4 className="text-xs font-mono font-medium text-white tracking-wide">
                    {getToolTitle(log)}
                  </h4>
                  <p className="text-[10px] text-gray-400 font-sans mt-0.5">
                    {log.timestamp.toLocaleTimeString("en-US", { timeZone: "Asia/Karachi" })} • {log.status}
                  </p>
                </div>
              </div>

              {(log.name === "openWebsite" || log.name === "searchInternet") && log.args.url && (
                <a
                  href={log.args.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] font-medium text-lime-400 hover:text-lime-300 bg-lime-500/10 hover:bg-lime-500/20 px-2.5 py-1 rounded-lg border border-lime-500/15 transition-all duration-200"
                  id={`link-visit-${log.id}`}
                >
                  <span className="font-sans">Visit</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Tool Detail Output */}
            <div className="mt-2.5 pt-2 border-t border-white/[0.05] text-[11px] font-mono leading-relaxed">
              {log.name === "getDateTime" && log.result ? (
                <span className="text-lime-300">{log.result}</span>
              ) : log.name === "triggerUIAnimation" ? (
                <span className="text-lime-200">
                  Triggered {log.args.animationType} atmospheric lighting effect.
                </span>
              ) : log.name === "showNotification" ? (
                <span className="text-lime-300">
                  [{log.args.title}]: "{log.args.message}"
                </span>
              ) : (
                <span className="text-gray-300 break-all">
                  Parameters: <span className="text-gray-400">{formatArgs(log.args)}</span>
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
