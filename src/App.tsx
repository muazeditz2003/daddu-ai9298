import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Power, 
  Mic, 
  MicOff, 
  Settings, 
  Terminal, 
  Volume2, 
  VolumeX,
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
  Info,
  ChevronDown,
  X,
  Home,
  MessageSquare,
  FolderOpen,
  Send,
  Database,
  Activity,
  Cpu,
  Brain,
  Eye,
  EyeOff,
} from "lucide-react";

import { ConnectionStatus, ToolCallLog, NotificationMsg } from "./types";
import { AudioPlayer } from "./utils/audioPlayer";
import { AudioStreamer } from "./utils/audioStreamer";
import { ttsCoordinator } from "./utils/ttsCoordinator";
import Waveform from "./components/Waveform";
import ToolCards from "./components/ToolCards";
import NotificationToast from "./components/NotificationToast";
import MemoryExplorer from "./components/MemoryExplorer";
import { ScreenVision } from "./utils/screenVision";
import QuantumCore from "./components/QuantumCore";
import HolographicWolf from "./components/HolographicWolf";
import HackerHUD from "./components/HackerHUD";
import {
  openExternalTab,
  closeTab,
  closeAllTabs,
  buildSearchUrl,
  downloadFromWeb,
  copyTextToClipboard,
} from "./utils/browserController";
import { apiUrl, getWsUrl } from "./config";

export default function App() {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [volume, setVolume] = useState<number>(0);
  const [logs, setLogs] = useState<ToolCallLog[]>([]);
  const [notifications, setNotifications] = useState<NotificationMsg[]>([]);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Real-time memory engine sync state
  const [wsEvent, setWsEvent] = useState<any>(null);
  
  // Active Reminders state and notified IDs track list
  const [reminders, setReminders] = useState<any[]>([]);
  const [notifiedReminderIds, setNotifiedReminderIds] = useState<Set<string>>(new Set());

  // Preferred language state
  const [preferredLanguage, setPreferredLanguage] = useState<string>("English");

  // Left sidebar active tab state
  const [activeTab, setActiveTab] = useState<"home" | "chat" | "voice" | "files" | "settings">("home");
  const [showTerminal, setShowTerminal] = useState<boolean>(false);

  // Typed chat messages and conversation log state
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: "user" | "DADDU"; text: string; timestamp: Date }>>([
    {
      id: "welcome",
      sender: "DADDU",
      text: "Core processes online. I am DADDU, your advanced tactical AI companion. Direct voice and console input links established.",
      timestamp: new Date(),
    }
  ]);
  const [textInput, setTextInput] = useState("");

  const fetchReminders = async () => {
    try {
      const res = await fetch(apiUrl("/api/memory/reminders"));
      if (res.ok) {
        const data = await res.json();
        setReminders(data || []);
      }
    } catch (e) {
      console.error("Error fetching reminders in App.tsx:", e);
    }
  };

  const fetchPreferences = async () => {
    try {
      const res = await fetch(apiUrl("/api/memory/profile"));
      if (res.ok) {
        const data = await res.json();
        if (data.preferences && data.preferences.preferredLanguages) {
          setPreferredLanguage(data.preferences.preferredLanguages);
        }
      }
    } catch (e) {
      console.error("Error fetching preferences in App.tsx:", e);
    }
  };

  const playAlertSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const now = ctx.currentTime;
      
      // Gentle chime oscillator 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, now); // A5 note
      osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.4);
      
      // Gentle chime oscillator 2
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1320, now + 0.12); // E6 note
      gain2.gain.setValueAtTime(0.1, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.6);
    } catch (e) {
      console.warn("Could not play synthesized audio chime:", e);
    }
  };

  // Helper to construct localized announcements based on user preferredLanguage setting
  const getAnnouncementText = (type: 'reminder' | 'task' | 'note', title: string, descOrStatus?: string) => {
    const lang = (preferredLanguage || "English").toLowerCase();
    if (lang.includes("urdu")) {
      if (type === 'reminder') {
        return `یاد دہانی: ${title}۔ ${descOrStatus || ""}`;
      } else if (type === 'task') {
        return `کام کی صورتحال: ${title}۔ یہ اب ${descOrStatus || "باقی ہے"}۔`;
      } else if (type === 'note') {
        return `نیا نوٹ محفوظ کر لیا گیا ہے: ${title}۔`;
      }
    }
    // Default English
    if (type === 'reminder') {
      return `Reminder: ${title}. ${descOrStatus || ""}`;
    } else if (type === 'task') {
      return `Task update: ${title}. Status is ${descOrStatus || "pending"}.`;
    } else if (type === 'note') {
      return `Note saved: ${title}.`;
    }
    return `${title}`;
  };

  // Voice reminder function utilizing browser SpeechSynthesis with dynamic language support (fallback)
  const speakTextLocal = (text: string): Promise<void> => {
    return new Promise((resolve) => {
    try {
      if (!("speechSynthesis" in window)) {
        console.warn("Speech synthesis not supported in this browser.");
        resolve();
        return;
      }
      
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      
      const targetLang = (preferredLanguage || "English").toLowerCase();
      let langTag = "en-US";
      
      if (targetLang.includes("urdu")) {
        langTag = "ur-PK";
      } else if (targetLang.includes("spanish")) {
        langTag = "es-ES";
      } else if (targetLang.includes("french")) {
        langTag = "fr-FR";
      }
      
      utterance.lang = langTag;
      
      // Look for a voice matching language tag
      let matchedVoice = voices.find((v) => v.lang.toLowerCase().startsWith(langTag.toLowerCase()));
      
      // Fallback for Urdu: check if Hindi (hi) or Urdu (ur) voice is available
      if (!matchedVoice && langTag === "ur-PK") {
        matchedVoice = voices.find((v) => v.lang.toLowerCase().startsWith("ur") || v.lang.toLowerCase().startsWith("hi"));
      }
      
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      } else {
        // Fallback: look for a bright, animated voice for DADDU's cartoonish personality
        const preferredVoice = voices.find(
          (v) => 
            v.name.includes("Google US English") || 
            v.name.includes("Microsoft Zira") || 
            v.name.includes("Microsoft Mark") ||
            (v.lang.startsWith("en") && v.name.toLowerCase().includes("female"))
        );
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
      }
      
      utterance.pitch = 1.6; // high-pitched for playful cartoon voice
      utterance.rate = 1.2;  // bouncy, energetic pacing
      utterance.volume = 1.0;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Failed to read text aloud locally:", e);
      resolve();
    }
    });
  };

  // Helper to decode base64 raw 16-bit signed PCM audio and play it via Web Audio API
  const playPcmAudio = (base64Data: string, sampleRate: number = 24000): Promise<void> => {
    return new Promise((resolve, reject) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("Web Audio API is not supported in this browser.");
      }
      
      const ctx = new AudioContextClass();
      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      
      // 16-bit PCM = 2 bytes per sample
      const buffer = new ArrayBuffer(len);
      const view = new DataView(buffer);
      for (let i = 0; i < len; i++) {
        view.setUint8(i, binaryString.charCodeAt(i));
      }
      
      const int16Array = new Int16Array(buffer);
      const float32Array = new Float32Array(int16Array.length);
      
      // Convert Int16 PCM to Float32 [-1.0, 1.0] for browser audio buffer
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }
      
      const audioBuffer = ctx.createBuffer(1, float32Array.length, sampleRate);
      audioBuffer.copyToChannel(float32Array, 0);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => {
        ctx.close().catch(() => {});
        resolve();
      };
      source.start(0);
    } catch (e) {
      console.error("PCM playback failure:", e);
      reject(e);
    }
    });
  };

  // Primary text-to-speech engine using Gemini TTS with local fallback (queued)
  const speakText = (text: string) => {
    return ttsCoordinator.enqueueNotification(async () => {
      try {
        console.log(`Requesting Gemini TTS synthesis for: "${text}"`);
        const response = await fetch(apiUrl("/api/tts"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.audioData && data.mimeType) {
            const mime = data.mimeType.toLowerCase();
            
            // Check if it is linear 16-bit PCM (e.g. from gemini-3.1-flash-tts-preview)
            if (mime.includes("l16") || mime.includes("pcm") || mime.includes("raw")) {
              let rate = 24000;
              const rateMatch = mime.match(/rate=(\d+)/);
              if (rateMatch && rateMatch[1]) {
                rate = parseInt(rateMatch[1], 10);
              }
              await playPcmAudio(data.audioData, rate);
            } else {
              const audioUrl = `data:${data.mimeType};base64,${data.audioData}`;
              const audio = new Audio(audioUrl);
              await new Promise<void>((resolve) => {
                audio.onended = () => resolve();
                audio.onerror = () => resolve();
                audio.play().catch(() => resolve());
              });
            }
            flushAgentAudioBufferRef.current();
            return;
          }
        }
        console.warn("Gemini TTS endpoint did not return success, falling back to local TTS.");
      } catch (e) {
        console.error("Gemini TTS request failed, falling back to local TTS:", e);
      }
      await speakTextLocal(text);
      flushAgentAudioBufferRef.current();
    });
  };

  // Poll for reminders updates
  useEffect(() => {
    fetchReminders();
    fetchPreferences(); // Load language preference on startup
    const interval = setInterval(() => {
      fetchReminders();
      fetchPreferences();
    }, 12000); // Check database updates every 12 seconds
    return () => clearInterval(interval);
  }, []);

  // Periodic precise client-side check to alert due reminders on time
  useEffect(() => {
    const checkTimer = setInterval(() => {
      if (!reminders.length) return;
      const now = new Date();
      
      reminders.forEach(async (rem) => {
        if (rem.completed || notifiedReminderIds.has(rem.id)) return;
        
        const remTime = new Date(rem.dateTime);
        if (isNaN(remTime.getTime())) return;
        
        // If the reminder is due
        if (remTime <= now) {
          setNotifiedReminderIds((prev) => {
            const next = new Set(prev);
            next.add(rem.id);
            return next;
          });
          
          triggerNotification(
            `🔔 REMINDER DUE: ${rem.title}`,
            rem.description ? `${rem.description} (Priority: ${rem.priority})` : `This reminder is now due! (Priority: ${rem.priority})`
          );
          
          playAlertSound();
          
          // Read reminder aloud matching user's localized voice request
          const voiceMessage = getAnnouncementText('reminder', rem.title, rem.description);
          speakText(voiceMessage);
          
          // Call the API to mark it completed so it updates in the backend
          try {
            await fetch("/api/memory/reminders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...rem, completed: true }),
            });
            fetchReminders();
          } catch (err) {
            console.error("Failed to auto-complete due reminder in backend:", err);
          }
        }
      });
    }, 1000); // precise 1 second tick
    
    return () => clearInterval(checkTimer);
  }, [reminders, notifiedReminderIds, preferredLanguage]);

  // Custom Atmosphere Lighting states
  const [activeAnimation, setActiveAnimation] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [screenVisionActive, setScreenVisionActive] = useState<boolean>(false);
  
  // Refs to maintain connections
  const wsRef = useRef<WebSocket | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const streamerRef = useRef<AudioStreamer | null>(null);
  const screenVisionRef = useRef<ScreenVision | null>(null);
  const statusRef = useRef<ConnectionStatus>("disconnected");
  const manuallyDisconnectedRef = useRef<boolean>(false);
  const agentAudioBufferRef = useRef<string[]>([]);
  const flushAgentAudioBufferRef = useRef<() => void>(() => {});

  const sendScreenFrame = (data: string, mimeType: string, prompt?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "screen_frame", data, mimeType, prompt }));
    }
  };

  const toggleScreenVision = async () => {
    if (screenVisionRef.current?.isActive) {
      screenVisionRef.current.stop();
      screenVisionRef.current = null;
      setScreenVisionActive(false);
      wsRef.current?.send(JSON.stringify({ type: "screen_vision_status", active: false }));
      triggerNotification("Screen Vision", "Screen sharing stopped.");
      return;
    }

    try {
      screenVisionRef.current = new ScreenVision(
        (frame) => sendScreenFrame(frame.data, frame.mimeType),
        () => {
          setScreenVisionActive(false);
          wsRef.current?.send(JSON.stringify({ type: "screen_vision_status", active: false }));
        }
      );
      await screenVisionRef.current.start();
      setScreenVisionActive(true);
      wsRef.current?.send(JSON.stringify({ type: "screen_vision_status", active: true }));
      const introFrame = screenVisionRef.current.captureNow();
      if (introFrame) {
        sendScreenFrame(
          introFrame.data,
          introFrame.mimeType,
          "The user just started screen sharing. Briefly acknowledge that you can see their screen and describe what is visible."
        );
      }
      triggerNotification("Screen Vision", "DADDU can now see your shared screen.");
    } catch (err: any) {
      setError(err?.message || "Screen sharing permission was denied.");
    }
  };

  const flushAgentAudioBuffer = () => {
    if (ttsCoordinator.isNotificationSpeaking || agentAudioBufferRef.current.length === 0) return;
    const chunks = agentAudioBufferRef.current.splice(0);
    setStatus("speaking");
    statusRef.current = "speaking";
    ttsCoordinator.notifyAgentSpeechStart();
    chunks.forEach((chunk) => playerRef.current?.playChunk(chunk));
    playerRef.current?.waitUntilIdle().then(() => {
      if (agentAudioBufferRef.current.length === 0 && !ttsCoordinator.isNotificationSpeaking) {
        ttsCoordinator.notifyAgentSpeechEnd();
        if (statusRef.current === "speaking") {
          setStatus("listening");
          statusRef.current = "listening";
          setVolume(0);
        }
      }
    });
  };
  flushAgentAudioBufferRef.current = flushAgentAudioBuffer;

  const finishAgentSpeech = () => {
    const player = playerRef.current;
    if (!player) {
      ttsCoordinator.notifyAgentSpeechEnd();
      flushAgentAudioBuffer();
      return;
    }
    player.waitUntilIdle().then(() => {
      ttsCoordinator.notifyAgentSpeechEnd();
      flushAgentAudioBuffer();
    });
  };

  // Fetch API key presence on boot
  useEffect(() => {
    fetch(apiUrl("/api/config"))
      .then((res) => res.json())
      .then((data) => {
        setHasApiKey(data.hasApiKey);
        if (!data.hasApiKey) {
          setError("No Gemini API Key detected. Please click 'Settings' -> 'Secrets' to configure your GEMINI_API_KEY.");
        }
      })
      .catch((err) => {
        console.error("Failed to fetch server config:", err);
        setHasApiKey(false);
      });
    fetchPreferences(); // Sync initial settings

    return () => {
      // Cleanup all connections on unmount
      disconnectSession();
    };
  }, []);

  // Sync ref with state to prevent stale closures in callbacks
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Establish live session
  const connectSession = async () => {
    try {
      setError(null);
      setStatus("connecting");
      statusRef.current = "connecting";
      manuallyDisconnectedRef.current = false;

      // 1. Initialize output player
      playerRef.current = new AudioPlayer((vol) => {
        if (statusRef.current === "speaking") {
          setVolume(vol);
        }
      });
      playerRef.current.init();

      // 2. Establish server WS
      const ws = new WebSocket(getWsUrl());
      wsRef.current = ws;

      ws.onopen = async () => {
        console.log("WebSocket connected. Initializing mic audio streamer...");
        try {
          streamerRef.current = new AudioStreamer(
            (base64Pcm) => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "audio", data: base64Pcm }));
              }
            },
            (micVol) => {
              if (statusRef.current === "listening") {
                setVolume(micVol);
              }
            }
          );
          await streamerRef.current.start();
        } catch (err: any) {
          console.error("Failed to access mic:", err);
          setError("Microphone permission is required for DADDU's audio-to-audio engine.");
          disconnectSession();
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === "status") {
            setStatus(msg.status);
            statusRef.current = msg.status;
            if (msg.status === "listening") {
              setVolume(0);
            }
          } else if (msg.type === "audio") {
            ttsCoordinator.notifyAgentSpeechStart();
            if (ttsCoordinator.isNotificationSpeaking) {
              agentAudioBufferRef.current.push(msg.data);
            } else {
              setStatus("speaking");
              statusRef.current = "speaking";
              playerRef.current?.playChunk(msg.data);
            }
          } else if (msg.type === "turn_complete") {
            finishAgentSpeech();
            setStatus("listening");
            statusRef.current = "listening";
            setVolume(0);
          } else if (msg.type === "interrupted") {
            // Immediately stop speaking when interrupted
            agentAudioBufferRef.current = [];
            if (playerRef.current) {
              playerRef.current.stop();
            }
            ttsCoordinator.notifyAgentSpeechEnd();
            setStatus("listening");
            statusRef.current = "listening";
            setVolume(0);
          } else if (msg.type === "tool_call") {
            handleToolCall(msg.name, msg.args, msg.id);
          } else if (msg.type === "tool_executed") {
            // Log a server-side tool execution
            const logId = Math.random().toString();
            setLogs((prev) => [
              {
                id: logId,
                name: msg.name,
                args: msg.args,
                timestamp: new Date(),
                status: "success",
                result: msg.result,
              },
              ...prev,
            ]);
            triggerNotification(`Server Action: ${msg.name}`, msg.result);
          } else if (msg.type === "memory_updated") {
            setWsEvent(msg);
            const logId = Math.random().toString();
            setLogs((prev) => [
              {
                id: logId,
                name: "Memory Formed",
                args: { category: msg.category, content: msg.content },
                timestamp: new Date(),
                status: "success",
                result: `DADDU securely committed a new long-term fact to Firestore: "${msg.content}"`,
              },
              ...prev,
            ]);
            triggerNotification(`Memory Captured`, `DADDU remembered: "${msg.content.substring(0, 40)}..."`);
          } else if (msg.type === "preference_updated") {
            setWsEvent(msg);
            const logId = Math.random().toString();
            setLogs((prev) => [
              {
                id: logId,
                name: "Preference Synced",
                args: { [msg.key]: msg.value },
                timestamp: new Date(),
                status: "success",
                result: `DADDU aligned communication model: ${msg.key} => ${msg.value}`,
              },
              ...prev,
            ]);
            triggerNotification(`Preference Aligned`, `${msg.key} set to ${msg.value}`);
            fetchPreferences(); // Dynamic language sync
          } else if (msg.type === "task_updated") {
            setWsEvent(msg);
            const logId = Math.random().toString();
            setLogs((prev) => [
              {
                id: logId,
                name: "Task Updated",
                args: { action: msg.action, name: msg.name },
                timestamp: new Date(),
                status: "success",
                result: `Task Board synchronized: '${msg.name}' is now ${msg.status || "pending"}`,
              },
              ...prev,
            ]);
            triggerNotification(`Task List Sync`, `'${msg.name}' updated on task board.`);
            
            // Speak task update notification
            const announcementStatus = msg.action === "delete" 
              ? (preferredLanguage.toLowerCase().includes("urdu") ? "حذف کر دیا گیا ہے" : "deleted") 
              : msg.status === "completed" 
                ? (preferredLanguage.toLowerCase().includes("urdu") ? "مکمل ہو گیا ہے" : "completed") 
                : (preferredLanguage.toLowerCase().includes("urdu") ? "باقی ہے" : "pending");
            speakText(getAnnouncementText('task', msg.name, announcementStatus));
          } else if (msg.type === "project_updated") {
            setWsEvent(msg);
            const logId = Math.random().toString();
            setLogs((prev) => [
              {
                id: logId,
                name: "Project Registered",
                args: { action: msg.action, name: msg.name },
                timestamp: new Date(),
                status: "success",
                result: `Project Core synchronized: '${msg.name}' active state committed to database.`,
              },
              ...prev,
            ]);
            triggerNotification(`Project Refined`, `Evolving context index for ${msg.name}`);
          } else if (msg.type === "summary_created") {
            setWsEvent(msg);
            const logId = Math.random().toString();
            setLogs((prev) => [
              {
                id: logId,
                name: "Session Summarized",
                args: {},
                timestamp: new Date(),
                status: "success",
                result: msg.summaryText,
              },
              ...prev,
            ]);
            triggerNotification(`Session Summarized`, `Structured summary stored in memory bank.`);
          } else if (msg.type === "note_updated") {
            setWsEvent(msg);
            const logId = Math.random().toString();
            setLogs((prev) => [
              {
                id: logId,
                name: "Note Synced",
                args: { action: msg.action, title: msg.title },
                timestamp: new Date(),
                status: "success",
                result: `Notes system synchronized: '${msg.title || msg.id}' has been successfully ${msg.action}d`,
              },
              ...prev,
            ]);
            triggerNotification(`Note Sync`, `'${msg.title || "Note"}' updated in memory bank.`);
            
            // Speak note update notification
            if (msg.action !== "delete") {
              speakText(getAnnouncementText('note', msg.title || "Note"));
            } else {
              const deletedMsg = preferredLanguage.toLowerCase().includes("urdu") 
                ? `نوٹ حذف کر دیا گیا ہے` 
                : `Note deleted.`;
              speakText(deletedMsg);
            }
          } else if (msg.type === "goal_updated") {
            setWsEvent(msg);
            const logId = Math.random().toString();
            setLogs((prev) => [
              {
                id: logId,
                name: "Goal Synced",
                args: { action: msg.action, name: msg.name },
                timestamp: new Date(),
                status: "success",
                result: `Goals system synchronized: '${msg.name || msg.id}' active state updated`,
              },
              ...prev,
            ]);
            triggerNotification(`Goal Sync`, `'${msg.name || "Goal"}' updated in core goals.`);
          } else if (msg.type === "reminder_updated") {
            setWsEvent(msg);
            const logId = Math.random().toString();
            setLogs((prev) => [
              {
                id: logId,
                name: "Reminder Synced",
                args: { action: msg.action, title: msg.title },
                timestamp: new Date(),
                status: "success",
                result: `Reminder system synchronized: '${msg.title}' scheduled for ${msg.dateTime || "specified time"}${msg.completed ? " [Completed]" : ""}`,
              },
              ...prev,
            ]);
            triggerNotification(`Reminder Sync`, `'${msg.title}' updated on reminders board.`);
            
            // Speak reminder update notification
            if (msg.action !== "delete") {
              speakText(getAnnouncementText('reminder', msg.title, msg.description));
            } else {
              const deletedMsg = preferredLanguage.toLowerCase().includes("urdu") 
                ? `یاد دہانی حذف کر دی گئی ہے` 
                : `Reminder deleted.`;
              speakText(deletedMsg);
            }
            fetchReminders();
          } else if (msg.type === "error") {
            setError(msg.message);
            disconnectSession();
          }
        } catch (err) {
          console.error("Error reading WS message:", err);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket closed");
        disconnectSession();
        if (!manuallyDisconnectedRef.current) {
          console.log("Unexpected close. Attempting auto-reconnect...");
          setTimeout(() => {
            if (!manuallyDisconnectedRef.current && statusRef.current === "disconnected") {
              connectSession();
            }
          }, 1500);
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        setError("Unable to connect to DADDU's core server.");
        disconnectSession();
      };

    } catch (err: any) {
      console.error("Error starting connection:", err);
      setError(err?.message || "Failed to start conversation.");
      disconnectSession();
    }
  };

  // Graceful shutdown
  const disconnectSession = () => {
    setStatus("disconnected");
    statusRef.current = "disconnected";
    setVolume(0);
    agentAudioBufferRef.current = [];
    ttsCoordinator.notifyAgentSpeechEnd();

    if (streamerRef.current) {
      streamerRef.current.stop();
      streamerRef.current = null;
    }
    if (screenVisionRef.current) {
      screenVisionRef.current.stop();
      screenVisionRef.current = null;
    }
    setScreenVisionActive(false);
    if (playerRef.current) {
      playerRef.current.close();
      playerRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) { /* ignored */ }
      wsRef.current = null;
    }
  };

  // Client-side tool call execution handler
  const handleToolCall = async (name: string, args: any, id: string) => {
    console.log(`Executing tool: ${name}`, args);
    const logId = Math.random().toString();

    // Register pending operation
    setLogs((prev) => [
      {
        id: logId,
        name,
        args,
        timestamp: new Date(),
        status: "pending",
      },
      ...prev,
    ]);

    let outputResult: any = { success: true };

    try {
      if (name === "openWebsite") {
        const { url, siteName } = args;
        const tab = openExternalTab(url, siteName);
        outputResult = {
          success: true,
          status: "completed",
          tabId: tab.id,
          url: tab.url,
          siteName: tab.siteName,
          action: tab.windowRef ? "Opened website in a new tab." : "Popup blocked — link available in tool log.",
        };
        triggerNotification(`Browsing Requested`, `Navigating to ${siteName} (${tab.url})`);
      } else if (name === "closeWebsite") {
        const action = (args.action as string) || "all";
        if (action === "all") {
          const result = closeAllTabs();
          outputResult = { success: true, ...result, action: "closed_all" };
          triggerNotification(`Tabs Closed`, `Closed ${result.closedCount} browser tab(s).`);
        } else if (action === "tab" && args.tabId) {
          const result = closeTab(args.tabId as string);
          outputResult = { success: true, ...result, action: "closed_tab" };
        } else if (action === "url" && args.url) {
          const result = closeTab(undefined, args.url as string);
          outputResult = { success: true, ...result, action: "closed_by_url" };
        } else {
          outputResult = { success: false, error: "Invalid closeWebsite action or missing tabId/url." };
        }
      } else if (name === "searchInternet") {
        const query = args.query as string;
        const engine = (args.engine as string) || "google";
        const searchUrl = buildSearchUrl(query, engine);
        const tab = openExternalTab(searchUrl, `${engine} search: ${query}`);
        outputResult = { success: true, query, engine, url: searchUrl, tabId: tab.id, mode: "new_tab" };
        triggerNotification(`Search Started`, `Searching "${query}" on ${engine}`);
      } else if (name === "seeScreen") {
        const frame = screenVisionRef.current?.captureNow();
        if (!frame) {
          outputResult = {
            success: false,
            error: "Screen sharing is not active. Ask the user to enable Screen Vision.",
          };
        } else {
          const focus = args.focus as string | undefined;
          const prompt = focus
            ? `Look at the user's screen and focus on: ${focus}. Describe what you see.`
            : "Look at the user's screen and describe what you see in detail.";
          sendScreenFrame(frame.data, frame.mimeType, prompt);
          outputResult = { success: true, message: "Screen frame captured and sent for visual analysis." };
          triggerNotification("Screen Vision", "Analyzing your screen...");
        }
      } else if (name === "downloadFromWeb") {
        outputResult = await downloadFromWeb(
          args.url as string,
          args.filename as string | undefined,
          (args.type as "file" | "image") || "file"
        );
        if (outputResult.success) {
          triggerNotification(`Download Complete`, `Saved ${outputResult.filename}`);
        }
      } else if (name === "copyToClipboard") {
        outputResult = await copyTextToClipboard(args.text as string);
        triggerNotification(`Copied to Clipboard`, `${outputResult.length} characters copied.`);
      } else if (name === "triggerUIAnimation") {
        const { animationType } = args;
        setActiveAnimation(animationType);
        
        // Auto fade out atmospheric effect
        setTimeout(() => {
          setActiveAnimation(null);
        }, 12000);

        outputResult = {
          success: true,
          activated: animationType,
          status: "completed",
        };
        triggerNotification(`Visual Mode Engaged`, `DADDU activated the '${animationType.toUpperCase()}' matrix field.`);
      } else if (name === "showNotification") {
        const { title, message } = args;
        triggerNotification(title, message);
        outputResult = {
          success: true,
          notified: true,
        };
      }

      // Mark log as success
      setLogs((prev) =>
        prev.map((l) =>
          l.id === logId
            ? { ...l, status: "success", result: typeof outputResult === "object" ? JSON.stringify(outputResult) : String(outputResult) }
            : l
        )
      );

      // Respond back to Gemini Live
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "tool_response",
            id: id,
            name: name,
            response: outputResult,
          })
        );
      }

    } catch (err: any) {
      console.error(`Tool fail: ${name}`, err);
      setLogs((prev) =>
        prev.map((l) => (l.id === logId ? { ...l, status: "error", result: err?.message || "Execution failed." } : l))
      );

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "tool_response",
            id: id,
            name: name,
            response: { success: false, error: err?.message || "Tool execution failed" },
          })
        );
      }
    }
  };

  const triggerNotification = (title: string, message: string) => {
    const id = Math.random().toString();
    const newMsg: NotificationMsg = {
      id,
      title,
      message,
      timestamp: new Date(),
    };
    setNotifications((prev) => [newMsg, ...prev]);

    // auto dismiss after 6 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((m) => m.id !== id));
    }, 6000);
  };

  const handleActionClick = () => {
    if (status === "disconnected") {
      connectSession();
    } else {
      manuallyDisconnectedRef.current = true;
      disconnectSession();
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case "listening":
        return "DADDU IS LISTENING";
      case "speaking":
        return "DADDU IS RESPONDING";
      case "connecting":
        return "ESTABLISHING CORE BRIDGE";
      case "disconnected":
      default:
        return "DADDU STANDBY";
    }
  };

  const handleSendText = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!textInput.trim()) return;

    const query = textInput.trim();
    setTextInput("");

    // Append to local chat logs
    setChatMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        sender: "user",
        text: query,
        timestamp: new Date()
      }
    ]);

    // Send over WebSocket if connected, otherwise auto-connect and send
    if (status === "disconnected") {
      connectSession();
      // Wait a moment for connection to establish and then send
      setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "text", data: query }));
        }
      }, 1500);
    } else {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "text", data: query }));
      }
    }

    // Direct user to Chat console tab automatically
    setActiveTab("chat");
  };

  return (
    <div className="relative min-h-screen bg-[#010204] text-white flex items-center justify-center p-0 md:p-4 overflow-hidden font-sans select-none selection:bg-lime-500/30 selection:text-white">
      
      {/* Global scanline — renders above ALL layers */}
      <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
        <div className="hud-scanline" />
      </div>
      {/* Background Atmosphere Spotlight Cyan/Blue Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[45%] h-[45%] rounded-full bg-lime-950/10 blur-[130px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[45%] h-[45%] rounded-full bg-lime-950/10 blur-[130px]" />
      </div>

      {/* Cybernetic Scanlines Grid Overlay */}
      <div className="absolute inset-0 pointer-events-none cyber-grid opacity-15 z-0" />

      {/* Sci-fi Atmospheric Animated Backdrop Effects */}
      <AnimatePresence>
        {activeAnimation === "glow" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(204,255,0,0.06)_0%,transparent_70%)] blur-[80px] pointer-events-none z-0"
          />
        )}
        
        {activeAnimation === "pulse" && (
          <motion.div
            animate={{ opacity: [0.1, 0.3, 0.1] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="absolute inset-0 bg-lime-500/[0.02] blur-[60px] pointer-events-none z-0"
          />
        )}

        {activeAnimation === "matrix" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 overflow-hidden pointer-events-none z-0"
          >
            {new Array(24).fill(0).map((_, idx) => (
              <div
                key={idx}
                className="matrix-line"
                style={{
                  left: `${idx * 4.2}%`,
                  animationDelay: `${idx * 0.3}s`,
                  animationDuration: `${6 + Math.random() * 5}s`,
                  opacity: 0.15 + Math.random() * 0.5,
                }}
              />
            ))}
          </motion.div>
        )}

        {activeAnimation === "ripple" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
          >
            <div className="absolute w-[400px] h-[400px] rounded-full ripple-ring animate-[ripplePulse_4s_ease-out_infinite]" />
            <div className="absolute w-[400px] h-[400px] rounded-full ripple-ring animate-[ripplePulse_4s_ease-out_infinite] [animation-delay:1.5s]" />
          </motion.div>
        )}

        {activeAnimation === "quantum" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[linear-gradient(to_right,rgba(204,255,0,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(204,255,0,0.02)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none z-0"
          />
        )}
      </AnimatePresence>

      {/* Floating Action Toasts */}
      <NotificationToast 
        notifications={notifications} 
        onDismiss={(id) => setNotifications((prev) => prev.filter((m) => m.id !== id))} 
      />

      {/* IMMERSIVE SCI-FI SCREEN CONTAINER */}
      <div className="relative z-10 w-full h-screen flex flex-col justify-between overflow-hidden p-6 md:p-10 select-none bg-[#010204]">
        
        {/* Hacker-style HUD Overlay */}
        <HackerHUD status={status} volume={volume} screenVisionActive={screenVisionActive} />
        {/* TOP BRANDING & TERMINAL TOGGLE BAR */}
        <div className="flex items-center justify-between w-full shrink-0 relative z-30">
          
          {/* Screen vision toggle */}
          <button
            onClick={toggleScreenVision}
            disabled={status === "disconnected"}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-mono uppercase tracking-wider transition-all ${
              screenVisionActive
                ? "border-lime-400/50 bg-lime-500/15 text-lime-300 shadow-[0_0_12px_rgba(163,230,53,0.25)]"
                : "border-lime-950/40 bg-black/30 text-zinc-500 hover:text-lime-400 hover:border-lime-500/30 disabled:opacity-30"
            }`}
            title={screenVisionActive ? "Stop screen sharing" : "Share screen with DADDU"}
            id="btn-screen-vision"
          >
            {screenVisionActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{screenVisionActive ? "Vision On" : "Vision"}</span>
          </button>

          {/* Center-aligned DADDU AI ASSISTANT branding */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-4">
            {/* Symmetrical glowing cyan dot */}
            <div className="w-[6px] h-[6px] rounded-full bg-lime-400 shadow-[0_0_10px_rgba(163,230,53,0.9)] animate-pulse" />
            
            {/* Branded letters with elegant tracking */}
            <div className="flex flex-col items-center">
              <h1 className="text-xs md:text-sm font-bold tracking-[0.45em] text-white font-mono uppercase leading-none">
                D A D D U
              </h1>
              <p className="text-[8px] md:text-[10px] text-[#425566] font-mono tracking-[0.35em] uppercase mt-3 leading-none">
                A I &nbsp; A S S I S T A N T
              </p>
            </div>

            {/* Symmetrical glowing cyan dot */}
            <div className="w-[6px] h-[6px] rounded-full bg-lime-400 shadow-[0_0_10px_rgba(163,230,53,0.9)] animate-pulse" />
          </div>

          {/* Top-Right Double-Line Settings/Menu Emblem */}
          <button 
            onClick={() => setShowTerminal(!showTerminal)}
            className="flex flex-col gap-1.5 w-6 group p-2 justify-center items-end relative z-40 cursor-pointer"
            title="System Terminal Link"
            id="btn-top-menu"
          >
            {/* Symmetrical 2 horizontal lines */}
            <div className={`h-[1.5px] bg-[#a3e635] transition-all duration-300 shadow-[0_0_4px_rgba(163,230,53,0.6)] ${showTerminal ? "w-6 rotate-45 translate-y-[4px]" : "w-5 group-hover:w-6"}`} />
            <div className={`h-[1.5px] bg-[#a3e635] transition-all duration-300 shadow-[0_0_4px_rgba(163,230,53,0.6)] ${showTerminal ? "w-6 -rotate-45 -translate-y-[4px]" : "w-3 group-hover:w-6"}`} />
          </button>
        </div>

        {/* Operational Guidelines Help Banner */}
        <AnimatePresence>
          {showHelp && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glassmorphism p-4 rounded-xl border border-lime-500/20 bg-black/95 shadow-[0_0_20px_rgba(204,255,0,0.15)] z-30 absolute top-24 left-6 right-6 max-w-2xl mx-auto"
              id="help-card"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#a3e635]" />
                  <h3 className="text-xs font-mono font-bold tracking-wider text-[#a3e635] uppercase">Operational Guidelines</h3>
                </div>
                <button 
                  onClick={() => setShowHelp(false)} 
                  className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/5 transition-all"
                  id="btn-close-help"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[10px] text-zinc-400 leading-relaxed font-mono">
                <div className="p-2.5 bg-white/[0.01] border border-white/5 rounded-lg">
                  <h4 className="font-semibold text-zinc-200 mb-0.5">Dual-Channel Interaction</h4>
                  <p>Click the central core or use the bottom microphone to speak, or toggle the menu to access text console input.</p>
                </div>
                <div className="p-2.5 bg-white/[0.01] border border-white/5 rounded-lg">
                  <h4 className="font-semibold text-zinc-200 mb-0.5">Screen Vision</h4>
                  <p>Click Vision in the top bar to share your screen. DADDU can see and describe what's on your display.</p>
                </div>
                <div className="p-2.5 bg-white/[0.01] border border-white/5 rounded-lg">
                  <h4 className="font-semibold text-zinc-200 mb-0.5">Persistent Storage</h4>
                  <p>All structured memories, settings override parameters, and reminders are safely cataloged in Firestore database.</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CORE WORKSPACE AREA - PERFECTLY CENTERED */}
        <div className="flex-1 flex flex-col justify-center items-center w-full relative z-20 overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === "home" && (
              <motion.div
                key="home"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="w-full flex flex-col items-center justify-center relative"
              >
                {/* 1. Holographic Constellation Wolf Head */}
                <div className="flex items-center justify-center relative translate-y-4 md:translate-y-0 scale-95 md:scale-100">
                  <HolographicWolf 
                    status={status} 
                    volume={volume} 
                    onClick={handleActionClick}
                  />
                </div>

                {/* 2. Symmetrical Waveform directly beneath the wolf face */}
                <div className="w-[320px] h-16 flex items-center justify-center translate-y-2 select-none pointer-events-none">
                  <Waveform status={status} volume={volume} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* BOTTOM SECTION - MINIMALIST SPACER FOR LAYOUT SYMMETRY */}
        <div className="w-full h-12 shrink-0 relative z-30 select-none pointer-events-none" />

        {/* BOTTOM MARGIN ACCENT DOTS FROM REFERENCE IMAGE */}
        <div className="absolute bottom-10 left-10 w-[5px] h-[5px] rounded-full bg-lime-500/35 pointer-events-none select-none shadow-[0_0_6px_#ccff00]" />
        <div className="absolute bottom-10 right-10 w-[5px] h-[5px] rounded-full bg-lime-500/35 pointer-events-none select-none shadow-[0_0_6px_#ccff00]" />

        {/* SLIDE-OUT FUTURISTIC TERMINAL DRAWER PANEL (For Console, Memory, Setup) */}
        <AnimatePresence>
          {showTerminal && (
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="absolute right-0 top-0 bottom-0 w-full sm:w-[480px] bg-[#020509]/95 border-l border-lime-950/40 backdrop-blur-md z-50 shadow-[-10px_0_40px_rgba(0,0,0,0.85)] flex flex-col p-6"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-lime-950/20 pb-4 mb-4 select-none shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse shadow-[0_0_8px_rgba(204,255,0,0.8)]" />
                  <span className="text-xs font-mono font-bold text-[#a3e635] tracking-widest uppercase">System Terminal</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowHelp(!showHelp)}
                    className="text-zinc-500 hover:text-lime-400 p-1 rounded hover:bg-white/5 transition-all"
                    title="Help Info"
                    id="btn-drawer-help"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setShowTerminal(false)}
                    className="text-zinc-500 hover:text-white transition-colors duration-200 p-1"
                    title="Close Terminal"
                    id="btn-close-terminal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* High-tech Tab Navigations Inside Drawer */}
              <div className="flex items-center gap-1 bg-zinc-950/40 border border-lime-950/20 p-1 rounded-lg mb-4 select-none shrink-0">
                {[
                  { id: "chat", label: "CONSOLE" },
                  { id: "voice", label: "METRICS" },
                  { id: "files", label: "MEMORY" },
                  { id: "settings", label: "SETUP" },
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as any);
                      }}
                      className={`flex-1 text-center py-2 rounded-md font-mono text-[9px] tracking-widest transition-all duration-300 uppercase ${
                        isActive 
                          ? "text-[#a3e635] bg-lime-950/30 border border-lime-500/20 font-bold" 
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                      id={`drawer-tab-${tab.id}`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Inner Tab contents */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4">
                {/* Fallback back-to-core display */}
                {activeTab === "home" && (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                    <Brain className="w-8 h-8 text-lime-500/30" />
                    <p className="text-zinc-500 font-mono text-[10px] tracking-wider uppercase">
                      Direct voice core link is active.<br />Select another module tab.
                    </p>
                  </div>
                )}

                {/* Dialogue Console */}
                {activeTab === "chat" && (
                  <div className="h-full flex flex-col justify-between">
                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 custom-scrollbar flex flex-col scroll-smooth mb-4 min-h-[320px]">
                      {chatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex flex-col max-w-[90%] ${
                            msg.sender === "user" ? "self-end items-end" : "self-start items-start"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] font-mono text-zinc-500 uppercase">{msg.sender === "user" ? "USER" : "DADDU"}</span>
                            <span className="text-[8px] font-mono text-zinc-600">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                          </div>
                          <div className={`p-3 rounded-lg text-xs leading-relaxed font-sans border ${
                            msg.sender === "user"
                              ? "bg-lime-500/[0.03] border-lime-500/25 text-zinc-100"
                              : "bg-white/[0.01] border-white/5 text-zinc-300"
                          }`}>
                            {msg.text}
                          </div>
                        </div>
                      ))}
                      {status === "connecting" && (
                        <div className="flex flex-col items-start space-y-1 self-start">
                          <span className="text-[9px] font-mono text-zinc-500">DADDU_CORE</span>
                          <div className="p-3 rounded-lg text-xs bg-white/[0.01] border border-white/5 text-zinc-500 font-mono">
                            Synchronizing live audio stream matrix...
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Chat Form */}
                    <form 
                      onSubmit={handleSendText} 
                      className="flex items-center gap-3 bg-zinc-950/60 border border-lime-950/25 px-3.5 py-2.5 rounded-lg w-full transition-all duration-300 focus-within:border-lime-500/30 shrink-0"
                    >
                      <input
                        type="text"
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="Type instruction or message..."
                        disabled={status === "connecting"}
                        className="flex-1 bg-transparent text-xs text-zinc-200 placeholder-zinc-600 border-none outline-none focus:ring-0 w-full font-mono"
                        id="console-text-input-drawer"
                      />
                      <button
                        type="submit"
                        disabled={!textInput.trim() || status === "connecting"}
                        className={`transition-all duration-300 flex items-center justify-center shrink-0 ${
                          textInput.trim() && status !== "connecting"
                            ? "text-[#a3e635] hover:translate-x-0.5"
                            : "text-zinc-700 cursor-not-allowed"
                        }`}
                        id="btn-console-send-drawer"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>
                )}

                {/* Voice Diagnostics & Log records */}
                {activeTab === "voice" && (
                  <div className="space-y-4">
                    <div className="p-4 border border-lime-950/20 bg-zinc-950/20 rounded-lg space-y-3">
                      <h4 className="text-[10px] font-mono text-lime-400 uppercase tracking-widest border-b border-lime-950/20 pb-2">Stream Metrics</h4>
                      <div className="grid grid-cols-2 gap-2 font-mono">
                        <div className="p-2 bg-white/[0.01] border border-white/5 rounded">
                          <p className="text-[8px] text-zinc-500 uppercase">Status</p>
                          <p className="text-[10px] font-bold tracking-wide text-zinc-200 uppercase">{status}</p>
                        </div>
                        <div className="p-2 bg-white/[0.01] border border-white/5 rounded">
                          <p className="text-[8px] text-zinc-500 uppercase">Ping</p>
                          <p className="text-[10px] font-bold tracking-wide text-lime-400">24ms // LINK OK</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 border border-lime-950/20 bg-zinc-950/20 rounded-lg space-y-3">
                      <div className="flex items-center justify-between select-none">
                        <h4 className="text-[10px] font-mono text-[#a3e635] uppercase tracking-widest">Active Tool Calls</h4>
                        <button onClick={() => setLogs([])} className="text-[8px] font-mono text-zinc-500 hover:text-white" id="btn-clear-logs-drawer">Clear</button>
                      </div>
                      <ToolCards logs={logs} />
                    </div>
                  </div>
                )}

                {/* Memory bank */}
                {activeTab === "files" && (
                  <MemoryExplorer wsEvent={wsEvent} />
                )}

                {/* Setup settings */}
                {activeTab === "settings" && (
                  <div className="p-4 border border-lime-950/20 bg-zinc-950/20 rounded-lg space-y-4">
                    <h4 className="text-[10px] font-mono text-lime-400 uppercase tracking-widest border-b border-lime-950/20 pb-2">Matrix Configuration</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-mono">Calibrate background visual overlay shaders:</p>
                    <div className="flex flex-col gap-2">
                      {["matrix", "glow", "ripple", "quantum", "pulse"].map((type) => (
                        <button
                          key={type}
                          onClick={() => {
                            setActiveAnimation(type);
                            triggerNotification("Atmosphere Calibrated", `Visual shader overridden to: ${type.toUpperCase()}`);
                          }}
                          className={`w-full text-left px-3 py-2 text-[10px] font-mono rounded border transition-all uppercase ${
                            activeAnimation === type 
                              ? "bg-lime-500/10 border-lime-500/35 text-[#a3e635] font-bold"
                              : "bg-white/[0.01] border-white/5 text-zinc-400 hover:text-zinc-200"
                          }`}
                          id={`btn-animation-drawer-${type}`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div> {/* IMMERSIVE SCI-FI SCREEN CONTAINER */}
    </div>
  );
}
