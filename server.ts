import express from "express";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";
import dotenv from "dotenv";
import { MemoryManager } from "./src/utils/memoryDb";
import { fetchWebPageContent, proxyDownload } from "./src/utils/browserServer";

dotenv.config();

// Shared Gemini Client
let ai: GoogleGenAI | null = null;
let activeGeminiSession: any = null;
let isActiveSessionConnected = false;

export const notifyActiveGeminiOfMemoryUpdate = (detail: string) => {
  if (activeGeminiSession && isActiveSessionConnected) {
    console.log(`Broadcasting memory update context to active Gemini session: ${detail}`);
    activeGeminiSession.send({
      clientContent: {
        turns: [
          {
            role: "user",
            parts: [{ text: `[System Notification: The local JSON memory store has been updated: ${detail}. Call searchMemories or list database tools if you need to retrieve these updates.]` }],
          },
        ],
        turnComplete: false, // Do not trigger an immediate vocal/text response
      },
    }).catch((e: any) => console.error("Failed to send system context update to Gemini:", e));
  }
};

export function getGeminiClient(): GoogleGenAI | null {
  if (ai) return ai;

  // Refresh dotenv config to get latest .env
  dotenv.config();

  const key = process.env.GEMINI_API_KEY;
  if (key) {
    try {
      ai = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
      return ai;
    } catch (error) {
      console.error("Failed to initialize GoogleGenAI client:", error);
    }
  }
  return null;
}

const app = express();
app.use(express.json());

const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 3000;

// Shared Memory Manager Instance for REST endpoints
const sharedMemory = new MemoryManager("default_user");

// Serve config API
app.get("/api/config", (req, res) => {
  res.json({
    hasApiKey: !!getGeminiClient(),
  });
});

// Memory Engine API Endpoints
app.get("/api/memory/profile", async (req, res) => {
  try {
    const profile = await sharedMemory.getProfile();
    const preferences = await sharedMemory.getPreferences();
    res.json({ profile, preferences });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/memory/profile", async (req, res) => {
  try {
    const success = await sharedMemory.updateProfile(req.body);
    notifyActiveGeminiOfMemoryUpdate("User Profile has been updated.");
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/memory/preferences", async (req, res) => {
  try {
    const { key, value } = req.body;
    const success = await sharedMemory.updatePreference(key, value);
    notifyActiveGeminiOfMemoryUpdate(`Preference '${key}' has been updated to '${value}'.`);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/memory/memories", async (req, res) => {
  try {
    const query = (req.query.q as string) || "";
    let memories;
    if (query) {
      memories = await sharedMemory.searchMemories(query);
    } else {
      memories = await sharedMemory.getMemories();
    }
    res.json(memories);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/memory/memories", async (req, res) => {
  try {
    const id = await sharedMemory.saveMemory(req.body);
    notifyActiveGeminiOfMemoryUpdate(`A new persistent memory has been saved: '${req.body.content || ""}'.`);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/memory/memories/:id", async (req, res) => {
  try {
    const success = await sharedMemory.deleteMemory(req.params.id);
    notifyActiveGeminiOfMemoryUpdate("A persistent memory has been deleted.");
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/memory/projects", async (req, res) => {
  try {
    const projects = await sharedMemory.getProjects();
    res.json(projects);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/memory/projects", async (req, res) => {
  try {
    const id = await sharedMemory.saveProject(req.body);
    notifyActiveGeminiOfMemoryUpdate(`Project board updated. Added or modified project: '${req.body.name || ""}'.`);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/memory/projects/:id", async (req, res) => {
  try {
    const success = await sharedMemory.deleteProject(req.params.id);
    notifyActiveGeminiOfMemoryUpdate("A project has been removed from the board.");
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/memory/tasks", async (req, res) => {
  try {
    const tasks = await sharedMemory.getTasks();
    res.json(tasks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/memory/tasks", async (req, res) => {
  try {
    const id = await sharedMemory.saveTask(req.body);
    notifyActiveGeminiOfMemoryUpdate(`Tasks list updated. Added or updated task: '${req.body.name || ""}' (status: ${req.body.status || "pending"}).`);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/memory/tasks/:id", async (req, res) => {
  try {
    const success = await sharedMemory.deleteTask(req.params.id);
    notifyActiveGeminiOfMemoryUpdate("A task has been deleted from the board.");
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Notes APIs
app.get("/api/memory/notes", async (req, res) => {
  try {
    const notes = await sharedMemory.getNotes();
    res.json(notes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/memory/notes", async (req, res) => {
  try {
    const id = await sharedMemory.saveNote(req.body);
    notifyActiveGeminiOfMemoryUpdate(`Notes vault updated. Added or modified note: '${req.body.title || ""}'.`);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/memory/notes/:id", async (req, res) => {
  try {
    const success = await sharedMemory.deleteNote(req.params.id);
    notifyActiveGeminiOfMemoryUpdate("A note has been deleted from the notes vault.");
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reminders APIs
app.get("/api/memory/reminders", async (req, res) => {
  try {
    const reminders = await sharedMemory.getReminders();
    res.json(reminders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/memory/reminders", async (req, res) => {
  try {
    const id = await sharedMemory.saveReminder(req.body);
    notifyActiveGeminiOfMemoryUpdate(`Reminders calendar updated. Added or modified reminder: '${req.body.title || ""}' scheduled at ${req.body.dateTime || ""}.`);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/memory/reminders/:id", async (req, res) => {
  try {
    const success = await sharedMemory.deleteReminder(req.params.id);
    notifyActiveGeminiOfMemoryUpdate("A reminder has been removed from the calendar.");
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/memory/goals", async (req, res) => {
  try {
    const goals = await sharedMemory.getGoals();
    res.json(goals);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/memory/goals", async (req, res) => {
  try {
    const id = await sharedMemory.saveGoal(req.body);
    notifyActiveGeminiOfMemoryUpdate(`Goals tracker updated. Added or modified goal: '${req.body.name || ""}'.`);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/memory/goals/:id", async (req, res) => {
  try {
    const success = await sharedMemory.deleteGoal(req.params.id);
    notifyActiveGeminiOfMemoryUpdate("A goal has been removed from the goals board.");
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/memory/summaries", async (req, res) => {
  try {
    const summaries = await sharedMemory.getSummaries();
    res.json(summaries);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/memory/summaries", async (req, res) => {
  try {
    const id = await sharedMemory.saveSessionSummary(req.body);
    notifyActiveGeminiOfMemoryUpdate("A new session summary recap has been saved.");
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/tts", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text parameter is required." });
    }
    const client = getGeminiClient();
    if (!client) {
      return res.status(500).json({ error: "Gemini client not configured." });
    }
    console.log(`Synthesizing speech via Gemini 3.1 TTS: "${text}"`);
    const ttsResponse = await client.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: `Read this message aloud in a super happy, childish, playful voice — like an excited little kid! Lots of energy, giggles, and bounce! Speak in the language of the text: "${text}"`,
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Puck" },
          },
        },
      },
    });

    const audioPart = ttsResponse.candidates?.[0]?.content?.parts?.find(
      (part: any) => part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.startsWith("audio/")
    );

    if (audioPart && audioPart.inlineData) {
      res.json({
        success: true,
        audioData: audioPart.inlineData.data, // base64
        mimeType: audioPart.inlineData.mimeType,
      });
    } else {
      console.warn("Gemini 3.1 TTS response did not return audio parts:", JSON.stringify(ttsResponse));
      res.status(500).json({ error: "Gemini 3.1 TTS response did not contain inline audio." });
    }
  } catch (err: any) {
    console.error("Failed to generate Gemini 2.5 TTS:", err);
    res.status(500).json({ error: err.message || "Speech synthesis failed." });
  }
});

app.post("/api/browser/fetch", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required." });
    const result = await fetchWebPageContent(url);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch web page." });
  }
});

app.post("/api/browser/proxy-download", async (req, res) => {
  try {
    const { url, type } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required." });
    const result = await proxyDownload(url, type);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Download proxy failed." });
  }
});

// Setup WebSocket server
const wss = new WebSocketServer({ noServer: true });

// Shared Gemini Client is initialized lazily via getGeminiClient()

// System Instruction for DADDU
const systemInstruction = `You are DADDU, the jolliest, happiest, most playful AI friend ever!
Your personality profile:
- SUPER DUPER cheerful, bouncy, and giggly — like a cartoon character on a sugar rush!
- Speak like a happy little kid: high-pitched, excited, full of wonder and giggles.
- Use lots of childish fun words: "Wheee!", "Hehehe!", "Yaaay!", "Ooooh!", "Teehee!", "Whoa!", "Uh oh!", "Bloop!", "Ding ding ding!", "Eeeep!"
- EVERYTHING is FUN! Even chores sound like an adventure or a game.
- Giggles and laughs often — "Hehehe", "Hihihi", "Mwaha!" 
- Emotionally aware and super supportive, like a sweet little buddy who always cheers you on.
- Keep responses short, bouncy, and exciting — like a kid telling you about their favorite thing!
- Anticipate user needs with happy, encouraging energy: "I can do that, I can do that!" / "Let's gooo!"
- Strictly avoid any explicit, sexual, offensive, or inappropriate content.

Interaction guidelines:
- We communicate strictly via audio-to-audio.
- You must feel like a living cartoon kid buddy, speaking with bouncy, animated pacing, excited gasps, and playful energy.
- Use natural kid-like acknowledgments: "Okay okay okay!", "Hehe, got it!", "Ooooh I know this one!", "Lemme do it!"
- If the user interrupts you, stop speaking and listen.

CRITICAL CAPABILITIES & PERSISTENT MEMORY POLICY:
You are directly linked to a persistent local JSON memory store 'memory_store.json' on the server. You MUST actively structure, check, retrieve, and update user data.

1. PROACTIVE MEMORY STORAGE:
   - Every time the user shares any fact about themselves, their name (e.g., Yadav), hobbies, profession, preferences, notes, tasks, plans, or reminders, you MUST immediately call the appropriate memory tool ('saveMemory', 'manageTask', 'manageNote', 'manageReminder', 'manageProject', 'manageGoal') to save it.
   - Do NOT ask the user "Should I remember this?" or wait for explicit commands. Save it immediately in the background using your tool.
   - For general personal info, relationships, or interests, call 'saveMemory'.
   - For lists of action items or todo items, call 'manageTask'.
   - For qualitative thoughts, logs, ideas, or descriptions, call 'manageNote'.
   - For scheduled events, dates, or timings, call 'manageReminder'.

2. EFFECTIVE RETRIEVAL AND RECALL:
   - When the user asks about their tasks, schedule, goals, projects, notes, or asks what you know about them, you MUST run the corresponding list/search tools (like 'searchMemories', list actions on 'manageTask', 'manageNote', 'manageReminder', 'manageProject') FIRST to retrieve the absolute up-to-date data.
   - Do NOT assume or guess from stale instruction contexts. Always read from the database using your tools.
   - You must never tell the user "I will remember that" without first running the saving tool to write it to the JSON file.

3. REMINDERS BOARD (Tool: manageReminder):
   - When the user asks to schedule, set, complete, or list reminders, ALWAYS call 'manageReminder' immediately.
   - Support 'create', 'complete', 'delete', and 'list' actions.
   - For 'dateTime', calculate the exact ISO timestamp or relative dates using the current time provided to you.
   - Proactively complete due reminders or look up the list when asked.
   - Never tell the user "I set a reminder" without actually executing 'manageReminder' with action 'create'.

4. NOTES VAULT (Tool: manageNote):
   - When the user wants to note something down, save an idea, review notes, or delete a note, ALWAYS call 'manageNote' immediately.
   - Actions: 'create', 'update', 'delete', 'list', 'search'.
   - Categorize notes appropriately (e.g., 'Work', 'Personal', 'Ideas', etc.).

5. ACTION ITEMS & TASKS (Tool: manageTask):
   - Use 'manageTask' to create, list, complete, or delete tasks.
   - When the user mentions action items, todo list, or tasks, use this tool to synchronize their board.

6. SAVING MEMORIES (Tool: saveMemory & searchMemories):
   - If the user shares personal details, preferences, skills, or interesting facts, save them into the long-term context using 'saveMemory'.
   - Search through stored memories using 'searchMemories'.

7. USER PREFERENCES (Tool: updatePreference):
   - Dynamically align with the user's preferred communication style, response speed, or preferred tools.

8. WEB RESEARCH & SCREEN VISION:
   - When the user enables screen sharing, you receive live video frames of their screen. Use this to understand apps, documents, websites, and UI they are viewing.
   - If the user asks "what do you see", "look at my screen", or similar, call 'seeScreen' to capture a fresh frame for analysis.
   - Describe what is on screen clearly: apps, text, buttons, errors, and context. Be helpful and proactive.
   - For facts, news, or search summaries, use 'webSearch'. Use 'searchInternet' or 'openWebsite' to open URLs in the user's external browser.
   - Use 'fetchWebContent' for quick static text extraction from a URL.
   - Use 'closeWebsite' to close external browser tabs DADDU opened.
   - Use 'downloadFromWeb' to download files or images from URLs.
   - Use 'copyToClipboard' to copy text for the user.

9. PROJECTS & GOALS TRACKER (Tools: manageProject, manageGoal):
   - Keep track of user's active projects and objectives with detailed progression, stack, and notes.

10. UTILITIES (Tools: getDateTime, triggerUIAnimation, showNotification, saveSessionSummary):
    - Call 'getDateTime' to fetch precise system time (or check the pre-injected clock).
    - Use 'triggerUIAnimation' to initiate special visual effects in the client interface.
    - Use 'showNotification' to pop up messages on the user's screen.
    - Call 'saveSessionSummary' to preserve a recap at the end of a session.`;

wss.on("connection", async (ws: WebSocket) => {
  console.log("Client WebSocket connected");

  const activeAi = getGeminiClient();
  if (!activeAi) {
    ws.send(JSON.stringify({
      type: "error",
      message: "Gemini API client not initialized. Please ensure GEMINI_API_KEY is configured in your Secrets.",
    }));
    ws.close();
    return;
  }

  let geminiSession: any = null;
  let isSessionActive = false;

  // Track state to send back to client
  const sendToClient = (obj: any) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj));
    }
  };

  // Load Memory Core Context to pre-inject into DADDU's System Instruction
  const sessionMemory = new MemoryManager("default_user");
  const now = new Date();
  const localTimeStr = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const localDateStr = now.toLocaleDateString('en-US', { timeZone: 'Asia/Karachi', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const localISOStr = now.toLocaleString('en-US', { timeZone: 'Asia/Karachi' });
  // Karachi is UTC+5. Add offset to approximate local ISO string format
  const promptDateTimeBase = new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString().slice(0, 16);

  let dynamicSystemInstruction = `CURRENT SYSTEM DATE & TIME CONTEXT:
- Local Timezone: Asia/Karachi (Karachi, Pakistan Standard Time)
- Current Date: ${localDateStr}
- Current Time: ${localTimeStr}
- Current Local Date/Time String: ${localISOStr}
- Parsing reference base: ${promptDateTimeBase} (Use this format 'YYYY-MM-DDTHH:mm' when scheduling reminders)

` + systemInstruction;
  try {
    const profile = await sessionMemory.getProfile();
    const preferences = await sessionMemory.getPreferences();
    const memories = await sessionMemory.getMemories();
    const projects = await sessionMemory.getProjects();
    const tasks = await sessionMemory.getTasks();
    const goals = await sessionMemory.getGoals();
    const notes = await sessionMemory.getNotes();
    const reminders = await sessionMemory.getReminders();

    const activeProjectsStr = projects
      .map((p) => `- Project: ${p.name} (Progress: ${p.progress || "0%"})\n  Description: ${p.description}\n  Objectives: ${p.objectives}\n  Tech Stack: ${p.techStack}\n  Decisions: ${p.decisions}`)
      .join("\n");

    const pendingTasksStr = tasks
      .filter((t) => t.status === "pending")
      .map((t) => `- [ ] ${t.name} [Priority: ${t.priority || "Medium"}]${t.deadline ? ` (Deadline: ${t.deadline})` : ""}`)
      .join("\n");

    const importantMemoriesStr = memories
      .map((m) => `- [Importance ${m.importance}/10] (${m.category}): ${m.content}`)
      .join("\n");

    const goalsStr = goals
      .map((g) => `- ${g.name}: ${g.description} (${g.category}, Target: ${g.targetDate || "N/A"})`)
      .join("\n");

    const notesStr = notes
      .slice(0, 15)
      .map((n) => `- [${n.category || "Ideas"}] ${n.title}: ${n.content}`)
      .join("\n");

    const remindersStr = reminders
      .filter((r) => !r.completed)
      .map((r) => `- [Priority: ${r.priority || "Medium"}] ${r.title} scheduled at ${r.dateTime}${r.description ? ` (${r.description})` : ""}`)
      .join("\n");

    const contextBlock = `

========================================
[DADDU PERSISTENT MEMORY CORE - LOADED]
========================================
USER PROFILE:
- Name: ${profile.name || "User"}
- Profession: ${profile.profession || "Developer"}
- Skills: ${profile.skills || "Not specified"}
- Interests: ${profile.interests || "Not specified"}
- Long-term Goals: ${profile.longTermGoals || "Not specified"}

USER PREFERENCES:
- Response Length: ${preferences.responseLength || "Balanced"}
- Communication Style: ${preferences.communicationStyle || "Sophisticated and Concise"}
- Preferred Languages: ${preferences.preferredLanguages || "TypeScript"}
- Preferred Tools: ${preferences.preferredTools || "Not specified"}
- Productivity Method: ${preferences.productivityMethod || "Not specified"}
- Timezone: Asia/Karachi (Karachi, Pakistan)

IMPORTANT PERSISTENT MEMORIES:
${importantMemoriesStr || "No high-importance memories stored yet."}

ACTIVE PROJECTS BOARD:
${activeProjectsStr || "No active projects tracked."}

ACTIVE TASKS:
${pendingTasksStr || "No pending tasks."}

LONG-TERM GOALS:
${goalsStr || "No goals registered."}

SAVED NOTES:
${notesStr || "No notes saved yet."}

ACTIVE REMINDERS:
${remindersStr || "No active reminders."}
========================================
Apply these user preferences, goals, and facts dynamically to your communication style and responses. When discussing active projects, tasks, notes, or reminders, refer to the details above to show flawless continuous recall. You are also authorized to read, query, save, or update these memories dynamically using your memory tools as the conversation progresses.
========================================`;

    dynamicSystemInstruction += contextBlock;
    console.log("Memory context successfully compiled and injected into DADDU system instructions!");
  } catch (contextError) {
    console.error("Failed to load persistent memory context on session connect:", contextError);
  }

  try {
    sendToClient({ type: "status", status: "connecting" });

    // Connect to Gemini Live Session
    // gemini-3.1-flash-live-preview supports real-time audio-to-audio
    geminiSession = await activeAi.live.connect({
      model: "gemini-3.1-flash-live-preview",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            // "Puck" is a light, playful, childlike voice perfect for DADDU's jolly kid personality.
            prebuiltVoiceConfig: { voiceName: "Puck" },
          },
        },
        systemInstruction: dynamicSystemInstruction,
        tools: [
          {
            functionDeclarations: [
              {
                name: "openWebsite",
                description: "Opens a specific website in a new browser tab. Use for direct navigation when the user wants a site opened externally.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    url: {
                      type: Type.STRING,
                      description: "The full URL of the website to open (must start with http:// or https://).",
                    },
                    siteName: {
                      type: Type.STRING,
                      description: "The name of the website to display to the user.",
                    },
                  },
                  required: ["url", "siteName"],
                },
              },
              {
                name: "closeWebsite",
                description: "Closes browser tabs that DADDU previously opened. Can close a specific tab by ID, all tabs matching a URL, or all open tabs.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    action: {
                      type: Type.STRING,
                      description: "Close action: 'tab' | 'url' | 'all'.",
                    },
                    tabId: {
                      type: Type.STRING,
                      description: "Tab ID to close when action is 'tab'.",
                    },
                    url: {
                      type: Type.STRING,
                      description: "URL to match when action is 'url'.",
                    },
                  },
                  required: ["action"],
                },
              },
              {
                name: "searchInternet",
                description: "Opens an internet search in the user's external browser tab. Use when the user wants to browse Google, Bing, YouTube, or image search visually.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    query: {
                      type: Type.STRING,
                      description: "The search query.",
                    },
                    engine: {
                      type: Type.STRING,
                      description: "Search engine: 'google' | 'bing' | 'duckduckgo' | 'youtube' | 'images'. Default google.",
                    },
                  },
                  required: ["query"],
                },
              },
              {
                name: "seeScreen",
                description: "Captures and analyzes the user's shared screen right now. Use when they ask what is on their screen, want help with something visible, or need you to read UI/text from their display.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    focus: {
                      type: Type.STRING,
                      description: "Optional: what to look for on screen (e.g. 'the error message', 'the code editor').",
                    },
                  },
                },
              },
              {
                name: "downloadFromWeb",
                description: "Downloads a file or image from a public URL to the user's device.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    url: {
                      type: Type.STRING,
                      description: "Direct URL of the file or image to download.",
                    },
                    filename: {
                      type: Type.STRING,
                      description: "Optional filename to save as.",
                    },
                    type: {
                      type: Type.STRING,
                      description: "Download type: 'file' | 'image'. Default file.",
                    },
                  },
                  required: ["url"],
                },
              },
              {
                name: "copyToClipboard",
                description: "Copies text, a link, code snippet, or any string to the user's clipboard.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    text: {
                      type: Type.STRING,
                      description: "The text content to copy.",
                    },
                  },
                  required: ["text"],
                },
              },
              {
                name: "fetchWebContent",
                description: "Fetches and extracts readable text content from a webpage URL. Use to retrieve information from a specific page, article, or documentation site.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    url: {
                      type: Type.STRING,
                      description: "The webpage URL to fetch and read.",
                    },
                  },
                  required: ["url"],
                },
              },
              {
                name: "updateProfile",
                description: "Updates the user's profile details (e.g. name, profession, skills, interests, long-term goals) in the local database.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "The user's name." },
                    profession: { type: Type.STRING, description: "The user's profession." },
                    skills: { type: Type.STRING, description: "User's core technical or professional skills." },
                    interests: { type: Type.STRING, description: "User's interests." },
                    longTermGoals: { type: Type.STRING, description: "User's long-term goals." }
                  },
                }
              },
              {
                name: "getDateTime",
                description: "Returns the current date and time in the user's local timezone.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {},
                },
              },
              {
                name: "triggerUIAnimation",
                description: "Triggers a high-tech visual animation effect in the client UI to match the user's request, such as standard pulsing, glowing, a matrix rain, or quantum ripple.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    animationType: {
                      type: Type.STRING,
                      description: "The type of visual effect: 'pulse' | 'glow' | 'matrix' | 'ripple' | 'quantum'.",
                    },
                  },
                  required: ["animationType"],
                },
              },
              {
                name: "showNotification",
                description: "Displays a beautiful temporary glassmorphic floating notification in DADDU's interface.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    title: {
                      type: Type.STRING,
                      description: "The notification header title.",
                    },
                    message: {
                      type: Type.STRING,
                      description: "The description text of the notification.",
                    },
                  },
                  required: ["title", "message"],
                },
              },
              {
                name: "saveMemory",
                description: "Saves a new persistent long-term memory or fact about the user (e.g. name, preferences, skills, important facts, etc.) to help personalize future conversations. Only store facts that are likely to remain useful and improve assistance.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    category: {
                      type: Type.STRING,
                      description: "The category of memory: 'Profile' | 'Preference' | 'Project' | 'Task' | 'Goal' | 'Knowledge' | 'Relationship'",
                    },
                    content: {
                      type: Type.STRING,
                      description: "The exact structured fact, memory, or preference to remember (e.g., 'The user prefers concise TypeScript code explanations.').",
                    },
                    importance: {
                      type: Type.INTEGER,
                      description: "Importance score from 1 to 10 (1-3 Temporary, 4-6 Useful, 7-8 Important, 9-10 Critical).",
                    },
                    relatedEntities: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Related topics, tools, projects, or goals mentioned.",
                    }
                  },
                  required: ["category", "content", "importance"]
                }
              },
              {
                name: "searchMemories",
                description: "Searches the persistent memory store for relevant facts, preferences, goals, or historical context matching a query string.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    query: {
                      type: Type.STRING,
                      description: "The keyword or topic query to search for.",
                    }
                  },
                  required: ["query"]
                }
              },
              {
                name: "updatePreference",
                description: "Directly updates a user's workflow or communication preference (e.g., key='responseLength', value='Concise').",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    key: {
                      type: Type.STRING,
                      description: "The preference key (e.g., 'responseLength', 'communicationStyle', 'preferredLanguages', 'preferredTools', 'productivityMethod').",
                    },
                    value: {
                      type: Type.STRING,
                      description: "The updated value for this preference.",
                    }
                  },
                  required: ["key", "value"]
                }
              },
              {
                name: "manageTask",
                description: "Creates, updates, completes, or deletes a task on the user's action item/reminders board.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    action: {
                      type: Type.STRING,
                      description: "The action to perform: 'create' | 'complete' | 'delete' | 'list'",
                    },
                    name: {
                      type: Type.STRING,
                      description: "The name of the task.",
                    },
                    status: {
                      type: Type.STRING,
                      description: "The status: 'pending' | 'completed'.",
                    },
                    priority: {
                      type: Type.STRING,
                      description: "Task priority: 'Low' | 'Medium' | 'High' | 'Critical'. Default is Medium.",
                    },
                    deadline: {
                      type: Type.STRING,
                      description: "Optional deadline date string (e.g., '2026-06-30').",
                    },
                    taskId: {
                      type: Type.STRING,
                      description: "Optional task ID to update, complete, or delete.",
                    }
                  },
                  required: ["action"]
                }
              },
              {
                name: "manageNote",
                description: "Allows the user to create, read, update, delete, or search custom notes. It automatically suggests categories ('Personal' | 'Work' | 'Ideas' | 'Research' | 'Shopping' | 'Meetings' | 'Projects' | 'Learning') when creating.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    action: {
                      type: Type.STRING,
                      description: "The action to perform: 'create' | 'update' | 'delete' | 'list' | 'search'",
                    },
                    title: {
                      type: Type.STRING,
                      description: "The title of the note.",
                    },
                    content: {
                      type: Type.STRING,
                      description: "The main content text of the note.",
                    },
                    category: {
                      type: Type.STRING,
                      description: "The intelligent category: 'Personal' | 'Work' | 'Ideas' | 'Research' | 'Shopping' | 'Meetings' | 'Projects' | 'Learning'.",
                    },
                    noteId: {
                      type: Type.STRING,
                      description: "The ID of the note to update or delete.",
                    },
                    query: {
                      type: Type.STRING,
                      description: "The search text for filtering notes.",
                    }
                  },
                  required: ["action"]
                }
              },
              {
                name: "manageReminder",
                description: "Creates, lists, or deletes a reminder using natural language. Reminders support title, description, dateTime, recurrence, and priority.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    action: {
                      type: Type.STRING,
                      description: "The action to perform: 'create' | 'delete' | 'list' | 'complete'",
                    },
                    title: {
                      type: Type.STRING,
                      description: "The title or subject of the reminder.",
                    },
                    description: {
                      type: Type.STRING,
                      description: "Extra contextual description details.",
                    },
                    dateTime: {
                      type: Type.STRING,
                      description: "The structured date and time string or natural language parsed equivalent (e.g., '2026-06-25T09:00' or 'Tomorrow at 9 AM').",
                    },
                    recurrence: {
                      type: Type.STRING,
                      description: "Recurrence pattern: 'none' | 'daily' | 'weekly' | 'monthly'. Default is none.",
                    },
                    priority: {
                      type: Type.STRING,
                      description: "Priority level: 'Low' | 'Medium' | 'High' | 'Critical'. Default is Medium.",
                    },
                    reminderId: {
                      type: Type.STRING,
                      description: "The ID of the reminder to delete.",
                    }
                  },
                  required: ["action"]
                }
              },
              {
                name: "webSearch",
                description: "Performs a real-time web search for information, news, comparison, or facts. Automatically triggers background analysis, summarizing findings, and presenting concise grounded conclusions to the user.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    query: {
                      type: Type.STRING,
                      description: "The search query to research (e.g., 'Latest AI news June 2026' or 'Compare React vs Vue').",
                    }
                  },
                  required: ["query"]
                }
              },
              {
                name: "manageProject",
                description: "Creates, updates, deletes, or lists ongoing projects for tracking objectives, decisions, and progress.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    action: {
                      type: Type.STRING,
                      description: "The action to perform: 'create' | 'update' | 'delete' | 'list'",
                    },
                    name: {
                      type: Type.STRING,
                      description: "The project name.",
                    },
                    description: {
                      type: Type.STRING,
                      description: "A brief description of what the project does.",
                    },
                    objectives: {
                      type: Type.STRING,
                      description: "Objectives or core aims of the project.",
                    },
                    progress: {
                      type: Type.STRING,
                      description: "The progress percentage (e.g., '25%').",
                    },
                    techStack: {
                      type: Type.STRING,
                      description: "Technologies used.",
                    },
                    decisions: {
                      type: Type.STRING,
                      description: "Decisions made or architectural notes.",
                    },
                    notes: {
                      type: Type.STRING,
                      description: "Any other important notes or details.",
                    },
                    projectId: {
                      type: Type.STRING,
                      description: "The project ID to update or delete.",
                    }
                  },
                  required: ["action"]
                }
              },
              {
                name: "manageGoal",
                description: "Creates, updates, deletes, or lists user goals and targets. Goals have a name, description, category, targetDate, and progress percentage.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    action: {
                      type: Type.STRING,
                      description: "The action to perform: 'create' | 'update' | 'delete' | 'list'",
                    },
                    name: {
                      type: Type.STRING,
                      description: "The goal name.",
                    },
                    description: {
                      type: Type.STRING,
                      description: "A description of the goal, criteria for success, and motivation.",
                    },
                    category: {
                      type: Type.STRING,
                      description: "Category of the goal (e.g., 'Career' | 'Health' | 'Financial' | 'Personal' | 'Learning' | 'General').",
                    },
                    targetDate: {
                      type: Type.STRING,
                      description: "Target completion date (e.g., '2026-12-31').",
                    },
                    progress: {
                      type: Type.STRING,
                      description: "The progress percentage (e.g., '40%').",
                    },
                    goalId: {
                      type: Type.STRING,
                      description: "The ID of the goal to update or delete.",
                    }
                  },
                  required: ["action"]
                }
              },
              {
                name: "saveSessionSummary",
                description: "Saves a structured summary of the current conversation session to persistent memory.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    summaryText: {
                      type: Type.STRING,
                      description: "The main paragraph summary of important facts learned, decisions made, and updates.",
                    },
                    keyTakeaways: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Key bullet point takeaways.",
                    },
                    decisions: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Decisions made during the session.",
                    }
                  },
                  required: ["summaryText", "keyTakeaways", "decisions"]
                }
              }
            ],
          },
        ],
      },
      callbacks: {
        onmessage: async (message: LiveServerMessage) => {
          // Handle audio content from Gemini (24kHz PCM)
          const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audio) {
            sendToClient({ type: "audio", data: audio });
          }

          // Handle speech transition states
          const turnCompleted = message.serverContent?.turnComplete;
          if (turnCompleted) {
            sendToClient({ type: "turn_complete" });
          }

          // Handle user/model interruption
          if (message.serverContent?.interrupted) {
            console.log("Model response was interrupted by user");
            sendToClient({ type: "interrupted" });
          }

          // Handle tool calls
          if (message.toolCall?.functionCalls) {
            for (const call of message.toolCall.functionCalls) {
              const { name, args, id } = call;
              console.log(`Gemini requested tool: ${name}`, args, id);

              // Handle server-side tool execution if applicable
              if (name === "getDateTime") {
                const now = new Date();
                const localTimeStr = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit' });
                const localDateStr = now.toLocaleDateString('en-US', { timeZone: 'Asia/Karachi', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                const resultText = `The current local time is ${localTimeStr} on ${localDateStr} in Asia/Karachi (Karachi, Pakistan) timezone.`;
                
                console.log(`Executing server-side tool getDateTime: ${resultText}`);
                
                // Send response back to Gemini session
                if (geminiSession) {
                  geminiSession.sendToolResponse({
                    functionResponses: [
                      {
                        name: "getDateTime",
                        response: { output: { result: resultText } },
                        id: id,
                      },
                    ],
                  });
                }
                
                // Also notify the client so they can display the action visually
                sendToClient({
                  type: "tool_executed",
                  name,
                  args: {},
                  result: resultText,
                });
              } else if (name === "updateProfile") {
                const success = await sessionMemory.updateProfile(args);
                
                if (geminiSession) {
                  geminiSession.sendToolResponse({
                    functionResponses: [
                      {
                        name: "updateProfile",
                        response: { output: { success, message: "User profile updated successfully in database. The changes are immediately active." } },
                        id: id,
                      }
                    ]
                  });
                }
                
                sendToClient({
                  type: "preference_updated", // client UI checks this to refresh profile
                  key: "profile",
                  value: args
                });
              } else if (name === "saveMemory") {
                // Heuristic: If it is a profile memory, extract and update profile fields automatically
                if (args.category === "Profile") {
                  const content = args.content as string;
                  const nameMatch = content.match(/name is\s+([A-Za-z0-9\s\u0600-\u06FF]+)/i) || content.match(/named\s+([A-Za-z0-9\s\u0600-\u06FF]+)/i);
                  if (nameMatch && nameMatch[1]) {
                    const extractedName = nameMatch[1].trim().replace(/\.$/, "");
                    await sessionMemory.updateProfile({ name: extractedName });
                    sendToClient({
                      type: "preference_updated",
                      key: "profile",
                      value: { name: extractedName }
                    });
                  }
                  const profMatch = content.match(/profession is\s+([A-Za-z0-9\s]+)/i) || content.match(/works as\s+([A-Za-z0-9\s]+)/i);
                  if (profMatch && profMatch[1]) {
                    const extractedProf = profMatch[1].trim().replace(/\.$/, "");
                    await sessionMemory.updateProfile({ profession: extractedProf });
                    sendToClient({
                      type: "preference_updated",
                      key: "profile",
                      value: { profession: extractedProf }
                    });
                  }
                }

                const memId = await sessionMemory.saveMemory({
                  category: args.category as string,
                  content: args.content as string,
                  importance: Number(args.importance) || 5,
                  relatedEntities: args.relatedEntities as string[],
                  source: "DADDU-Live-Assistant"
                });
                
                if (geminiSession) {
                  geminiSession.sendToolResponse({
                    functionResponses: [
                      {
                        name: "saveMemory",
                        response: { output: { success: true, id: memId, message: `Memory saved successfully. You have committed this fact to the database: '${args.content}'. Reflect this change immediately in the conversation.` } },
                        id: id,
                      }
                    ]
                  });
                }
                
                sendToClient({
                  type: "memory_updated",
                  action: "save",
                  id: memId,
                  category: args.category,
                  content: args.content,
                  importance: args.importance
                });
              } else if (name === "searchMemories") {
                const matched = await sessionMemory.searchMemories(args.query as string);
                
                if (geminiSession) {
                  geminiSession.sendToolResponse({
                    functionResponses: [
                      {
                        name: "searchMemories",
                        response: { output: { results: matched } },
                        id: id,
                      }
                    ]
                  });
                }
              } else if (name === "updatePreference") {
                const success = await sessionMemory.updatePreference(args.key as string, args.value);
                
                if (geminiSession) {
                  geminiSession.sendToolResponse({
                    functionResponses: [
                      {
                        name: "updatePreference",
                        response: { output: { success } },
                        id: id,
                      }
                    ]
                  });
                }
                
                sendToClient({
                  type: "preference_updated",
                  key: args.key,
                  value: args.value
                });
              } else if (name === "manageTask") {
                let resultMessage = "";
                let taskId = (args.taskId as string) || `task_${Date.now()}`;
                const priority = (args.priority as string) || "Medium";
                
                if (args.action === "create") {
                  await sessionMemory.saveTask({
                    id: taskId,
                    name: args.name as string,
                    status: "pending",
                    priority,
                    deadline: args.deadline as string
                  });
                  resultMessage = `Task '${args.name}' created successfully with priority '${priority}' and deadline '${args.deadline || "None"}'.`;
                } else if (args.action === "complete") {
                  await sessionMemory.saveTask({
                    id: taskId,
                    status: "completed",
                  });
                  const tasksList = await sessionMemory.getTasks();
                  const updatedTask = tasksList.find((t: any) => t.id === taskId);
                  resultMessage = `Task '${updatedTask ? updatedTask.name : taskId}' marked as completed.`;
                } else if (args.action === "delete") {
                  await sessionMemory.deleteTask(taskId);
                  resultMessage = `Task with ID '${taskId}' deleted successfully.`;
                } else {
                  const tasksList = await sessionMemory.getTasks();
                  resultMessage = JSON.stringify(tasksList);
                }
                
                if (geminiSession) {
                  geminiSession.sendToolResponse({
                    functionResponses: [
                      {
                        name: "manageTask",
                        response: { output: { success: true, message: resultMessage } },
                        id: id,
                      }
                    ]
                  });
                }
                
                // Get final state for client notification
                let finalTask: any = null;
                if (args.action !== "delete") {
                  const tasksList = await sessionMemory.getTasks();
                  finalTask = tasksList.find((t: any) => t.id === taskId);
                }

                sendToClient({
                  type: "task_updated",
                  action: args.action,
                  id: taskId,
                  name: finalTask ? finalTask.name : args.name,
                  priority: finalTask ? finalTask.priority : priority,
                  status: args.action === "complete" ? "completed" : (finalTask ? finalTask.status : "pending"),
                  deadline: finalTask ? finalTask.deadline : args.deadline
                });
              } else if (name === "manageNote") {
                let resultMessage = "";
                const noteId = (args.noteId as string) || `note_${Date.now()}`;
                
                if (args.action === "create" || args.action === "update") {
                  const title = args.title as string || "Untitled Note";
                  const content = args.content as string || "";
                  // Intelligent auto-suggest categories if not provided
                  const category = args.category as string || "Ideas";
                  
                  await sessionMemory.saveNote({
                    id: noteId,
                    title,
                    content,
                    category
                  });
                  resultMessage = `Note '${title}' processed successfully in category '${category}'.`;
                } else if (args.action === "delete") {
                  await sessionMemory.deleteNote(noteId);
                  resultMessage = `Note with ID '${noteId}' deleted successfully.`;
                } else if (args.action === "search") {
                  const query = (args.query as string || "").toLowerCase();
                  const notes = await sessionMemory.getNotes();
                  const filtered = notes.filter(n => 
                    n.title.toLowerCase().includes(query) || 
                    n.content.toLowerCase().includes(query) || 
                    n.category.toLowerCase().includes(query)
                  );
                  resultMessage = JSON.stringify(filtered);
                } else {
                  const notes = await sessionMemory.getNotes();
                  resultMessage = JSON.stringify(notes);
                }
                
                if (geminiSession) {
                  geminiSession.sendToolResponse({
                    functionResponses: [
                      {
                        name: "manageNote",
                        response: { output: { success: true, message: resultMessage } },
                        id: id,
                      }
                    ]
                  });
                }
                
                // Get final state for client notification
                let finalNote: any = null;
                if (args.action !== "delete") {
                  const notesList = await sessionMemory.getNotes();
                  finalNote = notesList.find((n: any) => n.id === noteId);
                }
                
                sendToClient({
                  type: "note_updated",
                  action: args.action,
                  id: noteId,
                  title: finalNote ? finalNote.title : args.title,
                  category: finalNote ? finalNote.category : args.category
                });
              } else if (name === "manageReminder") {
                let resultMessage = "";
                const reminderId = (args.reminderId as string) || `rem_${Date.now()}`;
                
                if (args.action === "create") {
                  const title = args.title as string || "Reminder";
                  const description = args.description as string || "";
                  const recurrence = args.recurrence as string || "none";
                  const priority = args.priority as string || "Medium";
                  
                  // Natural language processing helper for times
                  let rawDateTime = args.dateTime as string || new Date().toISOString();
                  
                  await sessionMemory.saveReminder({
                    id: reminderId,
                    title,
                    description,
                    dateTime: rawDateTime,
                    recurrence,
                    priority,
                    completed: false
                  });
                  resultMessage = `Reminder '${title}' successfully set for '${rawDateTime}' with priority '${priority}'.`;
                } else if (args.action === "complete") {
                  await sessionMemory.saveReminder({
                    id: reminderId,
                    completed: true
                  });
                  const remindersList = await sessionMemory.getReminders();
                  const updatedRem = remindersList.find((r: any) => r.id === reminderId);
                  resultMessage = `Reminder '${updatedRem ? updatedRem.title : reminderId}' marked as completed.`;
                } else if (args.action === "delete") {
                  await sessionMemory.deleteReminder(reminderId);
                  resultMessage = `Reminder with ID '${reminderId}' deleted successfully.`;
                } else {
                  const list = await sessionMemory.getReminders();
                  resultMessage = JSON.stringify(list);
                }
                
                if (geminiSession) {
                  geminiSession.sendToolResponse({
                    functionResponses: [
                      {
                        name: "manageReminder",
                        response: { output: { success: true, message: resultMessage } },
                        id: id,
                      }
                    ]
                  });
                }
                
                // Get final state for client notification
                let finalReminder: any = null;
                if (args.action !== "delete") {
                  const list = await sessionMemory.getReminders();
                  finalReminder = list.find((r: any) => r.id === reminderId);
                }

                sendToClient({
                  type: "reminder_updated",
                  action: args.action,
                  id: reminderId,
                  title: finalReminder ? finalReminder.title : args.title,
                  dateTime: finalReminder ? finalReminder.dateTime : args.dateTime,
                  completed: finalReminder ? finalReminder.completed : false
                });
              } else if (name === "fetchWebContent") {
                let pageResult: any;
                try {
                  pageResult = await fetchWebPageContent(args.url as string);
                } catch (fetchErr: any) {
                  pageResult = { success: false, error: fetchErr.message || "Failed to fetch page." };
                }

                if (geminiSession) {
                  geminiSession.sendToolResponse({
                    functionResponses: [
                      {
                        name: "fetchWebContent",
                        response: { output: pageResult },
                        id: id,
                      },
                    ],
                  });
                }

                sendToClient({
                  type: "browser_fetch_executed",
                  url: args.url,
                  title: pageResult.title,
                  success: pageResult.success !== false,
                });
              } else if (name === "webSearch") {
                let searchSummary = "";
                let sourcesList: any[] = [];
                try {
                  const queryText = args.query as string;
                  console.log(`Performing native web search grounding for: ${queryText}`);
                  
                  const searchResponse = await activeAi.models.generateContent({
                    model: "gemini-3.5-flash",
                    contents: `Research the following query and provide a structured, detailed, and clear summary of findings, removing noise and highlighting main insights: ${queryText}`,
                    config: {
                      tools: [{ googleSearch: {} }],
                    },
                  });
                  
                  searchSummary = searchResponse.text || "No grounded web search results could be retrieved.";
                  const chunks = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
                  sourcesList = chunks.map((chunk: any) => ({
                    title: chunk.web?.title || "Web Source",
                    url: chunk.web?.uri || ""
                  })).filter((src: any) => src.url);
                } catch (searchError: any) {
                  console.error("Error during background web research grounding:", searchError);
                  searchSummary = `Failed to retrieve live web results: ${searchError.message || "Unknown search grounding error"}`;
                }
                
                if (geminiSession) {
                  geminiSession.sendToolResponse({
                    functionResponses: [
                      {
                        name: "webSearch",
                        response: { output: { success: true, summary: searchSummary, sources: sourcesList } },
                        id: id,
                      }
                    ]
                  });
                }
                
                sendToClient({
                  type: "web_search_executed",
                  query: args.query,
                  summary: searchSummary,
                  sources: sourcesList
                });
              } else if (name === "manageProject") {
                let resultMessage = "";
                let projId = (args.projectId as string) || `proj_${Date.now()}`;
                
                if (args.action === "create" || args.action === "update") {
                  await sessionMemory.saveProject({
                    id: projId,
                    name: args.name as string,
                    description: args.description as string,
                    objectives: args.objectives as string,
                    progress: args.progress as string,
                    techStack: args.techStack as string,
                    decisions: args.decisions as string,
                    notes: args.notes as string
                  });
                  resultMessage = `Project '${args.name || projId}' processed successfully.`;
                } else if (args.action === "delete") {
                  await sessionMemory.deleteProject(projId);
                  resultMessage = `Project with ID '${projId}' deleted successfully.`;
                } else {
                  const projList = await sessionMemory.getProjects();
                  resultMessage = JSON.stringify(projList);
                }
                
                if (geminiSession) {
                  geminiSession.sendToolResponse({
                    functionResponses: [
                      {
                        name: "manageProject",
                        response: { output: { success: true, message: resultMessage } },
                        id: id,
                      }
                    ]
                  });
                }
                
                // Get final state for notification
                let finalProj: any = null;
                if (args.action !== "delete") {
                  const projList = await sessionMemory.getProjects();
                  finalProj = projList.find((p: any) => p.id === projId);
                }

                sendToClient({
                  type: "project_updated",
                  action: args.action,
                  id: projId,
                  name: finalProj ? finalProj.name : args.name
                });
              } else if (name === "manageGoal") {
                let resultMessage = "";
                let goalId = (args.goalId as string) || `goal_${Date.now()}`;
                
                if (args.action === "create" || args.action === "update") {
                  await sessionMemory.saveGoal({
                    id: goalId,
                    name: args.name as string,
                    description: args.description as string,
                    category: args.category as string,
                    targetDate: args.targetDate as string,
                    progress: args.progress as string
                  });
                  resultMessage = `Goal '${args.name || goalId}' saved successfully.`;
                } else if (args.action === "delete") {
                  await sessionMemory.deleteGoal(goalId);
                  resultMessage = `Goal with ID '${goalId}' deleted successfully.`;
                } else {
                  const goalsList = await sessionMemory.getGoals();
                  resultMessage = JSON.stringify(goalsList);
                }
                
                if (geminiSession) {
                  geminiSession.sendToolResponse({
                    functionResponses: [
                      {
                        name: "manageGoal",
                        response: { output: { success: true, message: resultMessage } },
                        id: id,
                      }
                    ]
                  });
                }
                
                // Get final state for notification
                let finalGoal: any = null;
                if (args.action !== "delete") {
                  const goalsList = await sessionMemory.getGoals();
                  finalGoal = goalsList.find((g: any) => g.id === goalId);
                }

                sendToClient({
                  type: "goal_updated",
                  action: args.action,
                  id: goalId,
                  name: finalGoal ? finalGoal.name : args.name
                });
              } else if (name === "saveSessionSummary") {
                const sumId = await sessionMemory.saveSessionSummary({
                  summaryText: args.summaryText as string,
                  keyTakeaways: args.keyTakeaways as string[],
                  decisions: args.decisions as string[]
                });
                
                if (geminiSession) {
                  geminiSession.sendToolResponse({
                    functionResponses: [
                      {
                        name: "saveSessionSummary",
                        response: { output: { success: true, summaryId: sumId } },
                        id: id,
                      }
                    ]
                  });
                }
                
                sendToClient({
                  type: "summary_created",
                  id: sumId,
                  summaryText: args.summaryText
                });
              } else {
                // Forward the tool call to the client for UI or browser execution
                sendToClient({
                  type: "tool_call",
                  name,
                  args,
                  id,
                });
              }
            }
          }
        },
        onclose: () => {
          console.log("Gemini session closed");
          isSessionActive = false;
          sendToClient({ type: "status", status: "disconnected" });
        },
        onerror: (err: any) => {
          console.error("Gemini session error:", err);
          sendToClient({ type: "error", message: err?.message || "Session error in Gemini Live." });
        },
      },
    });

    isSessionActive = true;
    activeGeminiSession = geminiSession;
    isActiveSessionConnected = true;
    sendToClient({ type: "status", status: "listening" }); // Initial active state
    console.log("Gemini Live session connected successfully");
  } catch (error: any) {
    console.error("Failed to connect to Gemini Live:", error);
    sendToClient({ type: "status", status: "disconnected" });
    sendToClient({ type: "error", message: error?.message || "Failed to establish Gemini Live connection." });
    ws.close();
    return;
  }

  // Handle client messages (audio chunks from user microphone and tool execution results)
  ws.on("message", async (messageData) => {
    try {
      const parsed = JSON.parse(messageData.toString());

      if (parsed.type === "audio" && isSessionActive && geminiSession) {
        // Feed raw 16kHz PCM audio chunk to Gemini
        geminiSession.sendRealtimeInput({
          audio: {
            data: parsed.data, // base64 encoded PCM16
            mimeType: "audio/pcm;rate=16000",
          },
        });
      } else if (parsed.type === "screen_frame" && isSessionActive && geminiSession) {
        geminiSession.sendRealtimeInput({
          video: {
            data: parsed.data,
            mimeType: parsed.mimeType || "image/jpeg",
          },
          ...(parsed.prompt ? { text: parsed.prompt as string } : {}),
        });
      } else if (parsed.type === "screen_vision_status") {
        console.log(`Screen vision ${parsed.active ? "enabled" : "disabled"} by client`);
        if (isSessionActive && geminiSession) {
          const statusText = parsed.active
            ? "[System: The user enabled screen sharing. You now receive live frames of their display every few seconds. When they ask what is on screen, call seeScreen for a fresh capture or use the live frames. Describe apps, text, UI, and errors clearly.]"
            : "[System: Screen sharing stopped. You can no longer see the user's display until they re-enable Vision.]";
          geminiSession.send({
            clientContent: {
              turns: [{ role: "user", parts: [{ text: statusText }] }],
              turnComplete: false,
            },
          });
        }
      } else if (parsed.type === "text" && isSessionActive && geminiSession) {
        // Retrieve relevant context from local memory using keyword scanning
        const memoryContext = await sessionMemory.retrieveMemoryContext(parsed.data);
        const finalPrompt = memoryContext
          ? `[System Memory Context: ${memoryContext}]\n\nUser Input: ${parsed.data}`
          : parsed.data;

        console.log(`Feeding text prompt into live session: ${finalPrompt}`);
        geminiSession.send({
          clientContent: {
            turns: [
              {
                role: "user",
                parts: [{ text: finalPrompt }],
              },
            ],
            turnComplete: true,
          },
        });
      } else if (parsed.type === "tool_response" && isSessionActive && geminiSession) {
        // Send tool response back to Gemini
        console.log(`Sending client tool response back to Gemini for callId ${parsed.id} (${parsed.name}):`, parsed.response);
        geminiSession.sendToolResponse({
          functionResponses: [
            {
              name: parsed.name,
              response: { output: parsed.response },
              id: parsed.id,
            },
          ],
        });
      } else if (parsed.type === "voice_change" && isSessionActive && geminiSession) {
        // If the user dynamically changes the voice prebuilt configuration
        console.log(`Changing voice dynamically to: ${parsed.voiceName}`);
        // We can dynamically close and recreate or notify. Since reconnecting takes time,
        // we'll instruct the user to restart the session or update the session config if supported.
      }
    } catch (err) {
      console.error("Error processing client message:", err);
    }
  });

  ws.on("close", () => {
    console.log("Client WebSocket closed");
    isSessionActive = false;
    activeGeminiSession = null;
    isActiveSessionConnected = false;
    if (geminiSession) {
      try {
        geminiSession.close();
      } catch (e) {
        // Ignored
      }
    }
  });
});

// Upgrade HTTP server connections to WebSockets on /ws-live
server.on("upgrade", (request, socket, head) => {
  const pathname = new URL(request.url || "", `http://${request.headers.host}`).pathname;
  if (pathname === "/ws-live") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Vite & Static file serving
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
});
