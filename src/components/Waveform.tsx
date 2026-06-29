import React, { useEffect, useRef } from "react";
import { ConnectionStatus } from "../types";

interface WaveformProps {
  status: ConnectionStatus;
  volume: number; // 0 to 1
}

export default function Waveform({ status, volume }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let phase = 0;

    // Set canvas dimensions
    const resizeCanvas = () => {
      canvas.width = canvas.parentElement?.clientWidth || 320;
      canvas.height = 64; // taller height for nice waves
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      // Phase speed changes based on status
      let speed = 0.04;
      if (status === "connecting") speed = 0.06;
      else if (status === "speaking") speed = 0.09;
      else if (status === "listening") speed = 0.07;
      else if (status === "disconnected") speed = 0.012;

      phase += speed;

      // Base amplitude mapping
      let baseAmp = 1.5;
      if (status === "connecting") baseAmp = 6;
      else if (status === "listening") baseAmp = 3.5 + volume * 28;
      else if (status === "speaking") baseAmp = 5.5 + volume * 38;

      // Draw four overlapping waves for a highly premium, multi-dimensional, organic feel
      const waves = [
        {
          color: "rgba(204, 255, 0, 0.75)", // Bright Lime
          freq: 0.016,
          amp: baseAmp,
          phaseShift: 0,
          lineWidth: 2,
          harmonicFreq: 2.1,
          harmonicAmp: 0.35,
          glow: 12
        },
        {
          color: "rgba(132, 204, 22, 0.55)", // Deep Lime (lime-500)
          freq: 0.022,
          amp: baseAmp * 0.8,
          phaseShift: Math.PI / 3,
          lineWidth: 1.5,
          harmonicFreq: 2.5,
          harmonicAmp: 0.3,
          glow: 8
        },
        {
          color: "rgba(190, 242, 100, 0.40)", // Light Lime (lime-300)
          freq: 0.013,
          amp: baseAmp * 0.6,
          phaseShift: (Math.PI * 2) / 3,
          lineWidth: 1.2,
          harmonicFreq: 1.8,
          harmonicAmp: 0.25,
          glow: 6
        },
        {
          color: "rgba(163, 230, 53, 0.30)", // Soft Lime (lime-400, ambient backdrop wave)
          freq: 0.009,
          amp: baseAmp * 0.45,
          phaseShift: Math.PI,
          lineWidth: 1.0,
          harmonicFreq: 1.5,
          harmonicAmp: 0.2,
          glow: 4
        }
      ];

      waves.forEach((wave) => {
        ctx.beginPath();
        ctx.strokeStyle = wave.color;
        ctx.lineWidth = wave.lineWidth;
        
        // Premium organic glowing shadow
        ctx.shadowBlur = wave.glow;
        ctx.shadowColor = wave.color;

        for (let x = 0; x < width; x++) {
          // Fade out the wave near the left and right edges using a smooth sine curve
          const edgeFade = Math.sin((x / width) * Math.PI);
          
          // Compound wave function: primary sine + secondary harmonic for realistic sound signature
          const primary = Math.sin(x * wave.freq + phase + wave.phaseShift);
          const harmonic = Math.sin(x * wave.freq * wave.harmonicFreq - phase * 1.3 + wave.phaseShift) * wave.harmonicAmp;
          
          const y = centerY + (primary + harmonic) * wave.amp * edgeFade;
          
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });

      // Reset shadow for subsequent canvas draws
      ctx.shadowBlur = 0;

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [status, volume]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-16 block select-none pointer-events-none"
      id="cyber-spectrum-waveform-canvas"
    />
  );
}
