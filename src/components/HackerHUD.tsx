import React, { useEffect, useState } from "react";
import { ConnectionStatus } from "../types";

interface HackerHUDProps {
  status: ConnectionStatus;
  volume: number;
  screenVisionActive?: boolean;
}

export default function HackerHUD({ status, volume, screenVisionActive = false }: HackerHUDProps) {
  const [clock, setClock] = useState("");
  const [uptimeSeconds, setUptimeSeconds] = useState(0);

  // Live clock & uptime ticker
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setClock(
        now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setUptimeSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (secs: number) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, "0");
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const statusLabel =
    status === "listening"
      ? "RECV"
      : status === "speaking"
      ? "XMIT"
      : status === "connecting"
      ? "SYNC"
      : "IDLE";

  const statusColor =
    status === "listening" || status === "speaking"
      ? "text-lime-400"
      : status === "connecting"
      ? "text-lime-600"
      : "text-lime-900";

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden select-none" id="hacker-hud-overlay">

      {/* ═══════════ CORNER BRACKETS ═══════════ */}
      {/* Top-Left corner bracket */}
      <div className="absolute top-5 left-5 md:top-8 md:left-8">
        <div className="w-8 h-8 md:w-10 md:h-10 border-l border-t border-lime-500/20" />
        <span className="absolute top-10 md:top-12 left-0 text-[7px] font-mono text-lime-800 tracking-wider">
          X:0.00 Y:0.00
        </span>
      </div>

      {/* Top-Right corner bracket */}
      <div className="absolute top-5 right-5 md:top-8 md:right-8">
        <div className="w-8 h-8 md:w-10 md:h-10 border-r border-t border-lime-500/20" />
        <span className="absolute top-10 md:top-12 right-0 text-[7px] font-mono text-lime-800 tracking-wider text-right">
          Z:1.00 W:1.00
        </span>
      </div>

      {/* Bottom-Left corner bracket */}
      <div className="absolute bottom-5 left-5 md:bottom-8 md:left-8">
        <div className="w-8 h-8 md:w-10 md:h-10 border-l border-b border-lime-500/20" />
        <span className="absolute bottom-10 md:bottom-12 left-0 text-[7px] font-mono text-lime-800 tracking-wider">
          SYS:OK
        </span>
      </div>

      {/* Bottom-Right corner bracket */}
      <div className="absolute bottom-5 right-5 md:bottom-8 md:right-8">
        <div className="w-8 h-8 md:w-10 md:h-10 border-r border-b border-lime-500/20" />
        <span className="absolute bottom-10 md:bottom-12 right-0 text-[7px] font-mono text-lime-800 tracking-wider text-right">
          NET:SEC
        </span>
      </div>

      {/* ═══════════ LEFT EDGE DATA READOUT ═══════════ */}
      <div className="absolute left-5 md:left-8 top-1/2 -translate-y-1/2 flex flex-col gap-3">
        {/* Live clock */}
        <div className="flex flex-col">
          <span className="text-[6px] font-mono text-lime-700 tracking-[0.3em] uppercase">LOCAL</span>
          <span className="text-[9px] font-mono text-lime-500/60 tracking-widest">{clock}</span>
        </div>

        {/* Uptime */}
        <div className="flex flex-col">
          <span className="text-[6px] font-mono text-lime-700 tracking-[0.3em] uppercase">UPTIME</span>
          <span className="text-[9px] font-mono text-lime-500/60 tracking-widest">{formatUptime(uptimeSeconds)}</span>
        </div>

        {/* Status indicator */}
        <div className="flex flex-col">
          <span className="text-[6px] font-mono text-lime-700 tracking-[0.3em] uppercase">STATUS</span>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${status === "disconnected" ? "bg-lime-900" : "bg-lime-400 shadow-[0_0_6px_rgba(204,255,0,0.8)]"}`} />
            <span className={`text-[9px] font-mono tracking-widest ${statusColor}`}>{statusLabel}</span>
          </div>
        </div>

        {/* Audio level bar */}
        <div className="flex flex-col gap-1">
          <span className="text-[6px] font-mono text-lime-700 tracking-[0.3em] uppercase">AUDIO</span>
          <div className="w-[3px] h-16 bg-lime-950/30 rounded-full relative overflow-hidden">
            <div
              className="absolute bottom-0 left-0 w-full bg-lime-500/50 rounded-full transition-all duration-150"
              style={{ height: `${Math.min(volume * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* ═══════════ RIGHT EDGE SYSTEM METRICS ═══════════ */}
      <div className="absolute right-5 md:right-8 top-1/2 -translate-y-1/2 flex flex-col gap-3 items-end">
        {/* Signal strength bars */}
        <div className="flex flex-col items-end">
          <span className="text-[6px] font-mono text-lime-700 tracking-[0.3em] uppercase">SIGNAL</span>
          <div className="flex items-end gap-[2px] mt-1">
            {[0.3, 0.5, 0.7, 0.85, 1.0].map((h, i) => (
              <div
                key={i}
                className={`w-[2px] rounded-sm transition-all duration-300 ${
                  status !== "disconnected" && i < 4
                    ? "bg-lime-500/50"
                    : "bg-lime-950/30"
                }`}
                style={{ height: `${h * 14}px` }}
              />
            ))}
          </div>
        </div>

        {/* Encryption indicator */}
        <div className="flex flex-col items-end">
          <span className="text-[6px] font-mono text-lime-700 tracking-[0.3em] uppercase">ENCRYPT</span>
          <span className="text-[8px] font-mono text-lime-600/50 tracking-wider hud-data-pulse">AES-256</span>
        </div>

        {/* Protocol */}
        <div className="flex flex-col items-end">
          <span className="text-[6px] font-mono text-lime-700 tracking-[0.3em] uppercase">PROTO</span>
          <span className="text-[8px] font-mono text-lime-600/50 tracking-wider">WSS/TLS</span>
        </div>

        {/* Screen vision */}
        <div className="flex flex-col items-end">
          <span className="text-[6px] font-mono text-lime-700 tracking-[0.3em] uppercase">VISION</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                screenVisionActive
                  ? "bg-lime-400 shadow-[0_0_6px_rgba(204,255,0,0.8)] animate-pulse"
                  : "bg-lime-900"
              }`}
            />
            <span className={`text-[9px] font-mono tracking-widest ${screenVisionActive ? "text-lime-400" : "text-lime-900"}`}>
              {screenVisionActive ? "LIVE" : "OFF"}
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════ BOTTOM DATA TICKER ═══════════ */}
      <div className="absolute bottom-2 md:bottom-4 left-16 right-16 h-4 overflow-hidden">
        <div className="hud-ticker whitespace-nowrap flex items-center">
          <span className="text-[7px] font-mono text-lime-800 tracking-wider">
            SYS.KERNEL.DADDU.v3.1.7 // NEURAL_CORE ACTIVE // MEM.ALLOC 847MB // THREAD_POOL 24 // LATENCY 12ms // AUDIO.CODEC OPUS/48KHz // VOICE.ENGINE GEMINI_3.1_TTS // ENCRYPT.LAYER TLS_1.3 // SOCKET.STATE {statusLabel} // FREQ 48000Hz // BIT_DEPTH 16 // CHANNELS 1 // BUFFER 4096 //&nbsp;&nbsp;&nbsp;&nbsp;
            SYS.KERNEL.DADDU.v3.1.7 // NEURAL_CORE ACTIVE // MEM.ALLOC 847MB // THREAD_POOL 24 // LATENCY 12ms // AUDIO.CODEC OPUS/48KHz // VOICE.ENGINE GEMINI_3.1_TTS // ENCRYPT.LAYER TLS_1.3 // SOCKET.STATE {statusLabel} // FREQ 48000Hz // BIT_DEPTH 16 // CHANNELS 1 // BUFFER 4096 //
          </span>
        </div>
      </div>

      {/* ═══════════ CENTER CROSSHAIR RETICLE ═══════════ */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 md:w-24 md:h-24">
        {/* Horizontal line */}
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-lime-500/10 to-transparent" />
        {/* Vertical line */}
        <div className="absolute left-1/2 top-0 h-full w-[1px] bg-gradient-to-b from-transparent via-lime-500/10 to-transparent" />
        {/* Center dot */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-lime-500/20" />
      </div>

      {/* ═══════════ HORIZONTAL EDGE ACCENTS ═══════════ */}
      {/* Top edge line */}
      <div className="absolute top-0 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-lime-500/8 to-transparent" />
      {/* Bottom edge line */}
      <div className="absolute bottom-0 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-lime-500/8 to-transparent" />

      {/* ═══════════ TINY CORNER COORDINATE TICKS ═══════════ */}
      {/* Top ruler ticks */}
      <div className="absolute top-5 md:top-8 left-1/2 -translate-x-1/2 flex items-start gap-6">
        {[-3, -2, -1, 0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center">
            <div className={`w-[1px] ${i === 0 ? "h-2 bg-lime-500/20" : "h-1 bg-lime-800/20"}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
