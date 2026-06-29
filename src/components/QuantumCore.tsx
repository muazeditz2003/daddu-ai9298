import React, { useState, useEffect } from "react";
import { motion } from "motion/react";

interface QuantumCoreProps {
  status: string; // "idle" | "listening" | "speaking" | "connecting" | etc.
  volume: number; // 0 to 1
  onClick?: () => void;
}

export default function QuantumCore({ status, volume, onClick }: QuantumCoreProps) {
  const [isActive, setIsActive] = useState(false);
  const [glitchTrigger, setGlitchTrigger] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [pulsePhase, setPulsePhase] = useState(0);

  // Stats
  const [coreStability, setCoreStability] = useState(99.98);
  const [resonanceFrequency, setResonanceFrequency] = useState(432.10);
  const [quantumDecay, setQuantumDecay] = useState(0.002);

  useEffect(() => {
    // Holographic flicker / glitch intervals
    const glitchInterval = setInterval(() => {
      setGlitchTrigger(true);
      setTimeout(() => setGlitchTrigger(false), 100);
    }, 4500 + Math.random() * 4000);

    // Dynamic stats fluctuation
    const statsInterval = setInterval(() => {
      setCoreStability(prev => {
        const next = prev + (Math.random() * 0.04 - 0.02);
        return Math.max(99.4, Math.min(100.0, parseFloat(next.toFixed(2))));
      });
      setResonanceFrequency(prev => {
        const next = prev + (Math.random() * 0.8 - 0.4);
        return Math.max(430.0, Math.min(435.0, parseFloat(next.toFixed(2))));
      });
      setQuantumDecay(prev => {
        const next = prev + (Math.random() * 0.0004 - 0.0002);
        return Math.max(0.0010, Math.min(0.0040, parseFloat(next.toFixed(4))));
      });
    }, 1200);

    return () => {
      clearInterval(glitchInterval);
      clearInterval(statsInterval);
    };
  }, []);

  const isSpeaking = status === "speaking";
  const isListening = status === "listening";
  const isConnecting = status === "connecting";

  // Reactivity metrics
  const voiceBoost = isSpeaking ? volume * 40 : 0;
  const glowIntensity = isSpeaking ? 15 + volume * 25 : isListening ? 18 : 8;
  const coreScale = isSpeaking ? 1 + volume * 0.35 : isListening ? 1.08 : isActive ? 1.05 : 1.0;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsActive(true)}
      onMouseLeave={() => setIsActive(false)}
      className="relative flex flex-col items-center justify-center cursor-pointer select-none group transition-all duration-500 p-8 w-full max-w-[360px] h-[360px]"
    >
      {/* Background Grid & Space-time warp texture */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden rounded-full">
        {/* Symmetrical glowing matrix grids */}
        <div className="absolute w-[280px] h-[280px] rounded-full border border-lime-500/[0.03] bg-[radial-gradient(circle_at_center,rgba(204,255,0,0.02)_0%,transparent_70%)]" />
        
        {/* Circular particle horizon field */}
        <motion.div
          animate={{
            rotate: 360,
            scale: isSpeaking ? [0.95, 1.05, 0.95] : 1,
          }}
          transition={{
            rotate: { repeat: Infinity, duration: 25, ease: "linear" },
            scale: { repeat: Infinity, duration: 2, ease: "easeInOut" }
          }}
          className="absolute w-[320px] h-[320px] rounded-full border border-dashed border-lime-500/[0.04]"
          style={{ strokeDasharray: "10 30" }}
        />
      </div>

      {/* Futuristic Telemetry HUD Labelings (Symmetrical & Clean) */}
      <div className="absolute left-1 top-6 flex flex-col space-y-1 font-mono text-[7.5px] text-[#a3e635]/40 pointer-events-none">
        <div className="flex items-center space-x-1">
          <span className="w-1 h-1 rounded-full bg-[#a3e635] animate-ping" />
          <span className="text-[#a3e635]/70 font-semibold">CORE STATUS: SECURE</span>
        </div>
        <div>STABILITY: {coreStability}%</div>
        <div>DECAY_RATE: {quantumDecay} λ</div>
      </div>

      <div className="absolute right-1 top-6 flex flex-col items-end space-y-1 font-mono text-[7.5px] text-[#a3e635]/40 pointer-events-none">
        <div>RESONANCE: {resonanceFrequency} Hz</div>
        <div>LINK_MATRIX: G_PORT_3000</div>
        <div className="text-right text-[#ccff00]/70">AMPLITUDE: {(volume * 100).toFixed(1)}%</div>
      </div>

      {/* Main Singularity Hologram Sphere */}
      <motion.div
        animate={{
          scale: coreScale,
          y: isSpeaking ? [-4, 4, -4] : [-8, 8, -8],
          skewX: glitchTrigger ? [-4, 4, -2, 3, 0] : 0,
          filter: glitchTrigger 
            ? "hue-rotate(90deg) saturate(2.5) brightness(1.5)" 
            : "hue-rotate(0deg) saturate(1) brightness(1)",
        }}
        transition={{
          y: { repeat: Infinity, duration: isSpeaking ? 1.0 : 4.0, ease: "easeInOut" },
          skewX: { duration: 0.12 },
          filter: { duration: 0.08 }
        }}
        className="relative w-full h-full flex items-center justify-center z-10"
      >
        <svg
          viewBox="0 0 200 200"
          className="w-64 h-64 drop-shadow-[0_0_25px_rgba(163,230,53,0.35)]"
        >
          <defs>
            {/* Soft Cyan Glow Filter */}
            <filter id="coreBlur" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Intense Singularity Core Glow */}
            <filter id="intenseCoreGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="12" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Radial Core Gradients */}
            <radialGradient id="plasmaGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="25%" stopColor="#ccff00" stopOpacity="0.85" />
              <stop offset="60%" stopColor="#1a2e05" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#021424" stopOpacity="0" />
            </radialGradient>

            <linearGradient id="orbitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#a3e635" stopOpacity="0.05" />
            </linearGradient>

            {/* Hexagonal grid for core mask */}
            <pattern id="coreGrid" width="8" height="13.86" patternUnits="userSpaceOnUse" patternTransform="scale(0.8)">
              <path d="M4 0 L8 2.3 L8 6.9 L4 9.2 L0 6.9 L0 2.3 Z" fill="none" stroke="#a3e635" strokeWidth="0.4" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* ================= TELEMETRY CONCENTRIC GUIDES ================= */}
          <g opacity="0.3" stroke="#a3e635" strokeWidth="0.5">
            <circle cx="100" cy="100" r="90" strokeDasharray="3 9" fill="none" />
            <circle cx="100" cy="100" r="75" strokeDasharray="1 15" fill="none" />
            <circle cx="100" cy="100" r="60" strokeDasharray="30 10" fill="none" />
            
            {/* Technical crosshairs */}
            <line x1="100" y1="5" x2="100" y2="25" />
            <line x1="100" y1="175" x2="100" y2="195" />
            <line x1="5" y1="100" x2="25" y2="100" />
            <line x1="175" y1="100" x2="195" y2="100" />
          </g>

          {/* ================= OUTER DIAGNOSTIC ORBITAL ROTORS ================= */}
          {/* Symmetrical spinning outer calibration ticks */}
          <motion.g
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
            style={{ transformOrigin: "100px 100px" }}
          >
            <circle cx="100" cy="100" r="82" stroke="#a3e635" strokeWidth="1" strokeDasharray="2 10 5 15" fill="none" opacity="0.5" />
            <circle cx="100" cy="100" r="85" stroke="#ffffff" strokeWidth="0.6" strokeDasharray="4 4" fill="none" opacity="0.3" />
            
            {/* Outer coordinate pointer notches */}
            <polygon points="100,10 103,16 97,16" fill="#a3e635" opacity="0.8" />
            <polygon points="100,190 103,184 97,184" fill="#a3e635" opacity="0.8" />
          </motion.g>

          <motion.g
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
            style={{ transformOrigin: "100px 100px" }}
          >
            <circle cx="100" cy="100" r="70" stroke="#a3e635" strokeWidth="0.8" strokeDasharray="12 18" fill="none" opacity="0.4" />
          </motion.g>

          {/* ================= VECTOR RING ORBITS (Multi-axis 3D illusion) ================= */}
          {/* Axis 1 (Angled Left-to-Right) */}
          <motion.g
            animate={{ 
              rotateX: [60, 64, 60],
              rotateY: [30, -30, 30],
              rotateZ: 360 
            }}
            transition={{ 
              rotateZ: { repeat: Infinity, duration: 12, ease: "linear" },
              rotateX: { repeat: Infinity, duration: 3, ease: "easeInOut" },
              rotateY: { repeat: Infinity, duration: 6, ease: "easeInOut" }
            }}
            style={{ transformOrigin: "100px 100px" }}
          >
            <ellipse cx="100" cy="100" rx="66" ry="16" fill="none" stroke="url(#orbitGrad)" strokeWidth="1.5" filter="url(#coreBlur)" />
            {/* Orbit Node */}
            <circle cx="166" cy="100" r="3" fill="#ffffff" filter="url(#coreBlur)" />
            <circle cx="34" cy="100" r="1.5" fill="#a3e635" />
          </motion.g>

          {/* Axis 2 (Angled Right-to-Left) */}
          <motion.g
            animate={{ 
              rotateX: [60, 56, 60],
              rotateY: [-30, 30, -30],
              rotateZ: -360 
            }}
            transition={{ 
              rotateZ: { repeat: Infinity, duration: 16, ease: "linear" },
              rotateX: { repeat: Infinity, duration: 2.5, ease: "easeInOut" },
              rotateY: { repeat: Infinity, duration: 5, ease: "easeInOut" }
            }}
            style={{ transformOrigin: "100px 100px" }}
          >
            <ellipse cx="100" cy="100" rx="66" ry="16" fill="none" stroke="url(#orbitGrad)" strokeWidth="1.2" filter="url(#coreBlur)" />
            {/* Orbit Node */}
            <circle cx="34" cy="100" r="3" fill="#00ffff" filter="url(#coreBlur)" />
            <circle cx="166" cy="100" r="1.5" fill="#ffffff" />
          </motion.g>

          {/* ================= CORE QUANTUM RESONANCE CORE ================= */}
          {/* Outer high-tech grid shield */}
          <circle cx="100" cy="100" r="46" fill="none" stroke="#a3e635" strokeWidth="1.2" opacity="0.2" />
          <circle cx="100" cy="100" r="46" fill="url(#coreGrid)" opacity="0.7" />

          {/* Dynamic rotating alignment frame (Pentagram-like or Decagram-like geometry) */}
          <motion.g
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
            style={{ transformOrigin: "100px 100px" }}
          >
            {/* Beautiful intricate technical star layout */}
            <polygon points="100,60 112,85 140,85 117,103 126,130 100,114 74,130 83,103 60,85 88,85" fill="none" stroke="#a3e635" strokeWidth="0.8" opacity="0.45" />
            <circle cx="100" cy="60" r="2" fill="#ffffff" filter="url(#coreBlur)" />
            <circle cx="140" cy="85" r="2" fill="#a3e635" />
            <circle cx="126" cy="130" r="2" fill="#a3e635" />
            <circle cx="74" cy="130" r="2" fill="#a3e635" />
            <circle cx="60" cy="85" r="2" fill="#a3e635" />
          </motion.g>

          <motion.g
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
            style={{ transformOrigin: "100px 100px" }}
          >
            <polygon points="100,66 123,100 100,134 77,100" fill="none" stroke="#ccff00" strokeWidth="0.8" opacity="0.4" />
          </motion.g>

          {/* ================= THE SINGULARITY CORE PLASMA ================= */}
          {/* Behind glowing atmospheric aura */}
          <motion.circle
            cx="100"
            cy="100"
            r={24 + voiceBoost * 0.4}
            fill="none"
            stroke="#a3e635"
            strokeWidth="2.5"
            opacity="0.4"
            animate={{ scale: [0.92, 1.18, 0.92] }}
            transition={{ repeat: Infinity, duration: isSpeaking ? 0.4 : 2.5, ease: "easeInOut" }}
          />

          {/* Symmetrical dynamic equalizer spikes (Laser beams bursting outwards symmetrically!) */}
          <g opacity={isSpeaking ? "0.95" : "0.5"} className="transition-opacity duration-300">
            {Array.from({ length: 12 }).map((_, index) => {
              const angle = (index * 360) / 12;
              const beamLength = isSpeaking ? 16 + volume * 35 : 10 + Math.sin(index + Date.now() / 100) * 4;
              return (
                <g key={index} transform={`rotate(${angle} 100 100)`}>
                  <line 
                    x1="100" 
                    y1="64" 
                    x2="100" 
                    y2={64 - beamLength} 
                    stroke={isSpeaking ? "#ffffff" : "#a3e635"} 
                    strokeWidth={isSpeaking ? "1.8" : "1"} 
                    opacity="0.7"
                    className="transition-all duration-75"
                  />
                  <circle cx="100" cy={64 - beamLength} r={isSpeaking ? 1.5 : 0.8} fill="#ffffff" filter="url(#coreBlur)" />
                </g>
              );
            })}
          </g>

          {/* Core liquid plasma gradient sphere */}
          <circle
            cx="100"
            cy="100"
            r={26 + voiceBoost * 0.25}
            fill="url(#plasmaGrad)"
            filter="url(#intenseCoreGlow)"
            className="transition-all duration-100"
          />

          {/* Central ultra-bright core focal point */}
          <motion.circle
            cx="100"
            cy="100"
            r={10 + voiceBoost * 0.15}
            fill="#ffffff"
            filter="url(#coreBlur)"
            animate={{
              opacity: [0.8, 1, 0.8]
            }}
            transition={{ repeat: Infinity, duration: 0.15 }}
          />
        </svg>
      </motion.div>

      {/* Futuristic bottom particle base emission */}
      <div className="absolute bottom-1 w-full flex flex-col items-center pointer-events-none select-none">
        <div className="text-[7.5px] font-mono tracking-[0.3em] text-[#a3e635]/50 uppercase font-bold">
          {isSpeaking ? "QUANTUM COGNITIVE STREAM ACTIVE" : isListening ? "LISTENING // SINGULARITY STABLE" : "SINGULARITY INTERFACE // STANDBY"}
        </div>
        <div className="w-1/2 h-[1px] bg-gradient-to-r from-transparent via-[#a3e635]/30 to-transparent mt-1" />
      </div>
    </div>
  );
}
