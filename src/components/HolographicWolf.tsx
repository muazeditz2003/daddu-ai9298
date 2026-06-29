import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

interface HolographicWolfProps {
  status: string;
  volume: number; // Real-time voice intensity (0 to 1)
  onClick?: () => void;
}

export default function HolographicWolf({ status, volume, onClick }: HolographicWolfProps) {
  const idleRef = useRef<HTMLVideoElement>(null);
  const listeningRef = useRef<HTMLVideoElement>(null);
  const talkingRef = useRef<HTMLVideoElement>(null);

  // Play a specific video ref safely with fallback
  const playVideoSafely = (video: HTMLVideoElement | null) => {
    if (video) {
      video.muted = true;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Autoplay or programmatic play was prevented:", err);
          // Retry playing on any click or touch inside the app
          const retryPlay = () => {
            video.play().catch(() => { });
            document.removeEventListener("click", retryPlay);
            document.removeEventListener("touchstart", retryPlay);
          };
          document.addEventListener("click", retryPlay);
          document.addEventListener("touchstart", retryPlay);
        });
      }
    }
  };

  // Sync play states on mount and on state changes
  useEffect(() => {
    playVideoSafely(idleRef.current);
    playVideoSafely(listeningRef.current);
    playVideoSafely(talkingRef.current);
  }, [status]);

  // Determine active video status
  const isSpeaking = status === "speaking";
  const isListening = status === "listening";
  const isIdle = !isSpeaking && !isListening;

  // Safe ref assignment that forces muted state directly on the DOM element immediately
  const assignRef = (el: HTMLVideoElement | null, refObj: React.RefObject<HTMLVideoElement | null>) => {
    (refObj as any).current = el;
    if (el) {
      el.muted = true;
      el.defaultMuted = true;
      el.setAttribute("muted", "muted");
      el.setAttribute("playsinline", "true");
      // Try to play immediately when DOM node is bound
      if (el.paused) {
        el.play().catch(() => { });
      }
    }
  };

  return (
    <div
      onClick={onClick}
      className={`relative w-[65vw] h-[65vw] max-w-[380px] max-h-[380px] md:w-[52vh] md:h-[52vh] md:max-w-[480px] md:max-h-[480px] lg:w-[58vh] lg:h-[58vh] lg:max-w-[560px] lg:max-h-[560px] flex items-center justify-center select-none transition-all duration-300 ${onClick ? "cursor-pointer hover:scale-[1.02] active:scale-[0.98]" : ""
        }`}
      id="cyber-hologram-wolf"
    >
      {/* Responsive AI Assistant Video Container */}
      <motion.div
        animate={{
          scale: isSpeaking ? 1.0 + volume * 0.12 : isListening ? 1.03 : 1.0,
        }}
        transition={{ type: "spring", stiffness: 100, damping: 25 }}
        className="absolute w-full h-full flex items-center justify-center z-10 pointer-events-none"
      >
        {/* IDLE VIDEO LAYER */}
        <video
          ref={(el) => assignRef(el, idleRef)}
          src="/Idle.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onCanPlay={(e) => {
            e.currentTarget.play().catch(() => { });
          }}
          onTimeUpdate={(e) => {
            if (e.currentTarget.currentTime >= 4) {
              e.currentTarget.currentTime = 0;
            }
          }}
          style={{ transform: "translate3d(0,0,0)" }}
          className={`absolute w-[90%] h-[90%] object-cover transition-opacity duration-700 ease-in-out will-change-opacity ${isIdle ? "opacity-100" : "opacity-0"
            }`}
        />

        {/* LISTENING VIDEO LAYER */}
        <video
          ref={(el) => assignRef(el, listeningRef)}
          src="/Listening.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onCanPlay={(e) => {
            e.currentTarget.play().catch(() => { });
          }}
          style={{ transform: "translate3d(0,0,0)" }}
          className={`absolute w-[90%] h-[90%] object-cover transition-opacity duration-700 ease-in-out will-change-opacity ${isListening ? "opacity-100" : "opacity-0"
            }`}
        />

        {/* TALKING VIDEO LAYER */}
        <video
          ref={(el) => assignRef(el, talkingRef)}
          src="/Talking.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onCanPlay={(e) => {
            e.currentTarget.play().catch(() => { });
          }}
          style={{ transform: "translate3d(0,0,0)" }}
          className={`absolute w-[90%] h-[90%] object-cover transition-opacity duration-700 ease-in-out will-change-opacity ${isSpeaking ? "opacity-100" : "opacity-0"
            }`}
        />
      </motion.div>
    </div>
  );
}
