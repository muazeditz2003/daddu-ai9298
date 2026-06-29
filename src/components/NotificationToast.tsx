import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, X } from "lucide-react";
import { NotificationMsg } from "../types";

interface NotificationToastProps {
  notifications: NotificationMsg[];
  onDismiss: (id: string) => void;
}

export default function NotificationToast({ notifications, onDismiss }: NotificationToastProps) {
  return (
    <div className="fixed top-6 right-6 z-50 space-y-3 w-full max-w-sm pointer-events-none" id="notification-container">
      <AnimatePresence>
        {notifications.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9, transition: { duration: 0.2 } }}
            className="pointer-events-auto flex items-start gap-3 p-4 border border-lime-500/20 bg-black/75 backdrop-blur-2xl rounded-2xl shadow-[0_10px_30px_rgba(204,255,0,0.1)]"
          >
            <div className="p-2 rounded-xl bg-lime-500/10 border border-lime-500/25">
              <Bell className="w-4 h-4 text-lime-400 animate-bounce" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-mono font-semibold text-lime-400 tracking-wide">
                {n.title}
              </h4>
              <p className="text-[12px] text-gray-200 mt-1 font-sans leading-normal">
                {n.message}
              </p>
              <p className="text-[10px] text-gray-500 font-mono mt-1.5">
                DADDU Assistant System • {n.timestamp.toLocaleTimeString("en-US", { timeZone: "Asia/Karachi" })}
              </p>
            </div>

            <button
              onClick={() => onDismiss(n.id)}
              className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors duration-200"
              id={`dismiss-notify-${n.id}`}
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
