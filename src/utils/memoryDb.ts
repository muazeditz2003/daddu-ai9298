import fs from "fs";
import path from "path";

const STORE_PATH = path.join(process.cwd(), "memory_store.json");
const TASKS_PATH = path.join(process.cwd(), "tasks_store.json");
const NOTES_PATH = path.join(process.cwd(), "notes_store.json");
const REMINDERS_PATH = path.join(process.cwd(), "reminders_store.json");

// Define interface for our complete local store
interface LocalStore {
  profile: Record<string, any>;
  preferences: Record<string, any>;
  memories: any[];
  projects: any[];
  goals: any[];
  summaries: any[];
  tasks?: any[];
  notes?: any[];
  reminders?: any[];
}

// Fallback in-memory store if the file doesn't exist yet
const defaultStore: LocalStore = {
  profile: {
    name: "User",
    profession: "Developer",
    education: "Self-taught / Professional",
    skills: "TypeScript, React, Node.js",
    interests: "Artificial Intelligence, Cybernetics, Creative Coding",
    hobbies: "Building cool tech, exploring ambient soundscapes",
    timezone: "UTC",
    longTermGoals: "Build next-generation context-aware companion systems",
  },
  preferences: {
    responseLength: "Balanced",
    communicationStyle: "Sophisticated and Concise",
    preferredLanguages: "TypeScript, Python",
    preferredTools: "Vite, Tailwind, Gemini",
    productivityMethod: "Focus Time / Deep Work",
  },
  memories: [
    {
      id: "mem_welcome",
      category: "Knowledge",
      content: "The user is exploring the DADDU live system and configuring the persistent memory core.",
      importance: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      source: "System",
      relatedEntities: ["DADDU", "Memory Core"],
      retrievalCount: 1,
    }
  ],
  projects: [
    {
      id: "proj_alpha",
      name: "DADDU Voice Companion",
      description: "A real-time, low-latency audio AI assistant with local context visualizers.",
      objectives: "Enable continuous voice-based interaction with automatic memory synthesis.",
      progress: "60%",
      techStack: "React, Express, Google GenAI SDK, TailwindCSS, Local JSON File",
      decisions: "Using local JSON file-based database for simple, fast, and durable server-side storage.",
      notes: "The memory engine uses a structured JSON file to store profile details, notes, reminders, and tasks.",
    }
  ],
  tasks: [
    {
      id: "task_1",
      name: "Establish Local JSON Memory Engine",
      status: "completed",
      priority: "High",
      deadline: "2026-06-30",
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    },
    {
      id: "task_2",
      name: "Build interactive Memory Explorer panel in client UI",
      status: "pending",
      priority: "Critical",
      deadline: "2026-07-05",
      createdAt: new Date().toISOString(),
    }
  ],
  goals: [
    {
      id: "goal_1",
      name: "Deep Context Retention",
      description: "Achieve zero-effort context recovery between companion sessions.",
      category: "Personal Development",
      targetDate: "2026-08-15",
      progress: "40%",
    }
  ],
  summaries: [],
  notes: [
    {
      id: "note_welcome",
      title: "Welcome Note",
      content: "DADDU is fully upgraded with Notes, Tasks, Reminders, and Web Research capabilities. Use simple natural voice or type instructions to manage them.",
      category: "Ideas",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ],
  reminders: [
    {
      id: "rem_welcome",
      title: "Explore Phase 2 Features",
      description: "Create notes, organize tasks, and perform web research via live commands.",
      dateTime: "2026-06-25T09:00",
      recurrence: "none",
      priority: "High",
      completed: false,
      createdAt: new Date().toISOString(),
    }
  ],
};

function readLocalStore(): LocalStore {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = fs.readFileSync(STORE_PATH, "utf-8");
      const parsed = JSON.parse(data);
      // Defensive merging to make sure all expected properties exist
      const store: LocalStore = {
        profile: parsed.profile || defaultStore.profile,
        preferences: parsed.preferences || defaultStore.preferences,
        memories: Array.isArray(parsed.memories) ? parsed.memories : defaultStore.memories,
        projects: Array.isArray(parsed.projects) ? parsed.projects : defaultStore.projects,
        goals: Array.isArray(parsed.goals) ? parsed.goals : defaultStore.goals,
        summaries: Array.isArray(parsed.summaries) ? parsed.summaries : defaultStore.summaries,
      };
      if (parsed.tasks) store.tasks = parsed.tasks;
      if (parsed.notes) store.notes = parsed.notes;
      if (parsed.reminders) store.reminders = parsed.reminders;
      return store;
    }
  } catch (err) {
    console.error("Failed to read local store file, falling back to in-memory defaults:", err);
  }
  // Initialize file with defaults if it doesn't exist
  writeLocalStore(defaultStore);
  return defaultStore;
}

function writeLocalStore(store: LocalStore): void {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write to local store file:", err);
  }
}

function readTasksStore(): any[] {
  try {
    if (fs.existsSync(TASKS_PATH)) {
      const data = fs.readFileSync(TASKS_PATH, "utf-8");
      return JSON.parse(data) || [];
    }
  } catch (err) {
    console.error("Failed to read tasks store file:", err);
  }
  // Migration logic: read from memory_store.json, write to tasks_store.json, and clean up memory_store.json
  const store = readLocalStore();
  const tasks = store.tasks || defaultStore.tasks || [];
  writeTasksStore(tasks);
  if (store.tasks) {
    delete store.tasks;
    writeLocalStore(store);
  }
  return tasks;
}

function writeTasksStore(tasks: any[]): void {
  try {
    fs.writeFileSync(TASKS_PATH, JSON.stringify(tasks, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write to tasks store file:", err);
  }
}

function readNotesStore(): any[] {
  try {
    if (fs.existsSync(NOTES_PATH)) {
      const data = fs.readFileSync(NOTES_PATH, "utf-8");
      return JSON.parse(data) || [];
    }
  } catch (err) {
    console.error("Failed to read notes store file:", err);
  }
  // Migration logic: read from memory_store.json, write to notes_store.json, and clean up memory_store.json
  const store = readLocalStore();
  const notes = store.notes || defaultStore.notes || [];
  writeNotesStore(notes);
  if (store.notes) {
    delete store.notes;
    writeLocalStore(store);
  }
  return notes;
}

function writeNotesStore(notes: any[]): void {
  try {
    fs.writeFileSync(NOTES_PATH, JSON.stringify(notes, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write to notes store file:", err);
  }
}

function readRemindersStore(): any[] {
  try {
    if (fs.existsSync(REMINDERS_PATH)) {
      const data = fs.readFileSync(REMINDERS_PATH, "utf-8");
      return JSON.parse(data) || [];
    }
  } catch (err) {
    console.error("Failed to read reminders store file:", err);
  }
  // Migration logic: read from memory_store.json, write to reminders_store.json, and clean up memory_store.json
  const store = readLocalStore();
  const reminders = store.reminders || defaultStore.reminders || [];
  writeRemindersStore(reminders);
  if (store.reminders) {
    delete store.reminders;
    writeLocalStore(store);
  }
  return reminders;
}

function writeRemindersStore(reminders: any[]): void {
  try {
    fs.writeFileSync(REMINDERS_PATH, JSON.stringify(reminders, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write to reminders store file:", err);
  }
}

// Eagerly initialize all stores if they don't exist
readLocalStore();
readTasksStore();
readNotesStore();
readRemindersStore();

// User memory manager helper class
export class MemoryManager {
  private userId: string;

  constructor(userId: string = "default_user") {
    this.userId = userId;
  }

  // 1. User Profile Memory
  async getProfile(): Promise<any> {
    const store = readLocalStore();
    return store.profile;
  }

  async updateProfile(profileData: any): Promise<boolean> {
    const store = readLocalStore();
    const cleanData = { ...profileData, updatedAt: new Date().toISOString() };
    store.profile = { ...store.profile, ...cleanData };
    writeLocalStore(store);
    return true;
  }

  // 2. Preferences Memory
  async getPreferences(): Promise<any> {
    const store = readLocalStore();
    return store.preferences;
  }

  async updatePreference(key: string, value: any): Promise<boolean> {
    const store = readLocalStore();
    store.preferences[key] = value;
    store.preferences.updatedAt = new Date().toISOString();
    writeLocalStore(store);
    return true;
  }

  // 3. Structured Memories (Facts / Knowledge / Rules)
  async getMemories(): Promise<any[]> {
    const store = readLocalStore();
    return store.memories;
  }

  async saveMemory(memory: {
    id?: string;
    category: string;
    content: string;
    importance: number;
    relatedEntities?: string[];
    source?: string;
  }): Promise<string> {
    const store = readLocalStore();
    const id = memory.id || `mem_${Date.now()}`;
    const cleanMemory = {
      id,
      category: memory.category,
      content: memory.content,
      importance: Number(memory.importance) || 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      source: memory.source || "Conversation",
      relatedEntities: memory.relatedEntities || [],
      retrievalCount: 0,
    };

    const existingIdx = store.memories.findIndex((m) => m.id === id);
    if (existingIdx !== -1) {
      store.memories[existingIdx] = { 
        ...store.memories[existingIdx], 
        ...cleanMemory, 
        createdAt: store.memories[existingIdx].createdAt || cleanMemory.createdAt,
        updatedAt: new Date().toISOString() 
      };
    } else {
      store.memories.push(cleanMemory);
    }
    writeLocalStore(store);
    return id;
  }

  async searchMemories(query: string): Promise<any[]> {
    const list = await this.getMemories();
    if (!query) return list;

    // Direct simple search implementation ranking by word matching & importance
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (words.length === 0) return list.slice(0, 5);

    const scored = list.map((mem) => {
      let score = 0;
      const contentLower = (mem.content || "").toLowerCase();
      const catLower = (mem.category || "").toLowerCase();
      
      // Match words
      words.forEach((word) => {
        if (contentLower.includes(word)) score += 10;
        if (catLower.includes(word)) score += 5;
        // Boost for matching related entities
        if (mem.relatedEntities && Array.isArray(mem.relatedEntities)) {
          mem.relatedEntities.forEach((ent: string) => {
            if (ent.toLowerCase().includes(word)) score += 15;
          });
        }
      });

      // Factor in memory importance (0.1x of score)
      score += (mem.importance || 5) * 1.5;

      return { ...mem, score };
    });

    // Sort by score descending and return those with score > 8
    return scored
      .filter((m) => m.score > 8)
      .sort((a, b) => b.score - a.score)
      .map(({ score, ...rest }) => rest);
  }

  async retrieveMemoryContext(query: string): Promise<string> {
    try {
      const store = readLocalStore();
      const notes = readNotesStore();
      const tasks = readTasksStore();
      const reminders = readRemindersStore();
      const words = query
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !["the", "and", "for", "you", "that", "this", "with", "what", "where", "when", "how", "who", "why"].includes(w));

      if (words.length === 0) return "";

      const matches: string[] = [];

      // 1. Profile matching
      for (const [key, val] of Object.entries(store.profile)) {
        if (typeof val === "string") {
          const valLower = val.toLowerCase();
          if (words.some((word) => valLower.includes(word) || key.toLowerCase().includes(word))) {
            matches.push(`Profile ${key}: ${val}`);
          }
        }
      }

      // 2. Preferences matching
      for (const [key, val] of Object.entries(store.preferences)) {
        if (typeof val === "string") {
          const valLower = val.toLowerCase();
          if (words.some((word) => valLower.includes(word) || key.toLowerCase().includes(word))) {
            matches.push(`Preference ${key}: ${val}`);
          }
        }
      }

      // 3. Memories matching
      store.memories.forEach((m) => {
        const content = m.content.toLowerCase();
        if (words.some((word) => content.includes(word))) {
          matches.push(`Memory: ${m.content}`);
        }
      });

      // 4. Notes matching
      notes.forEach((n) => {
        const title = n.title.toLowerCase();
        const content = n.content.toLowerCase();
        if (words.some((word) => title.includes(word) || content.includes(word))) {
          matches.push(`Note [${n.title}]: ${n.content}`);
        }
      });

      // 5. Tasks matching
      tasks.forEach((t) => {
        const name = t.name.toLowerCase();
        if (words.some((word) => name.includes(word))) {
          matches.push(`Task: ${t.name} (Status: ${t.status}, Priority: ${t.priority || "Medium"})`);
        }
      });

      // 6. Reminders matching
      reminders.forEach((r) => {
        const title = r.title.toLowerCase();
        const desc = (r.description || "").toLowerCase();
        if (words.some((word) => title.includes(word) || desc.includes(word))) {
          matches.push(`Reminder: ${r.title} at ${r.dateTime} (Completed: ${r.completed})`);
        }
      });

      // 7. Projects matching
      store.projects.forEach((p) => {
        const name = p.name.toLowerCase();
        const desc = p.description.toLowerCase();
        if (words.some((word) => name.includes(word) || desc.includes(word))) {
          matches.push(`Project: ${p.name} - ${p.description}`);
        }
      });

      if (matches.length > 0) {
        return matches.slice(0, 5).join(" | ");
      }
    } catch (e) {
      console.error("Failed to retrieve memory context:", e);
    }
    return "";
  }

  async deleteMemory(memoryId: string): Promise<boolean> {
    const store = readLocalStore();
    store.memories = store.memories.filter((m) => m.id !== memoryId);
    writeLocalStore(store);
    return true;
  }

  // 4. Projects Memory
  async getProjects(): Promise<any[]> {
    const store = readLocalStore();
    return store.projects;
  }

  async saveProject(project: {
    id?: string;
    name?: string;
    description?: string;
    objectives?: string;
    progress?: string;
    techStack?: string;
    decisions?: string;
    notes?: string;
  }): Promise<string> {
    const store = readLocalStore();
    const id = project.id || `proj_${Date.now()}`;
    
    const existingProject = store.projects.find((p) => p.id === id);

    const cleanProject = {
      id,
      name: project.name !== undefined ? project.name : (existingProject ? existingProject.name : "Untitled Project"),
      description: project.description !== undefined ? project.description : (existingProject ? existingProject.description : ""),
      objectives: project.objectives !== undefined ? project.objectives : (existingProject ? existingProject.objectives : ""),
      progress: project.progress !== undefined ? project.progress : (existingProject ? existingProject.progress : "0%"),
      techStack: project.techStack !== undefined ? project.techStack : (existingProject ? existingProject.techStack : ""),
      decisions: project.decisions !== undefined ? project.decisions : (existingProject ? existingProject.decisions : ""),
      notes: project.notes !== undefined ? project.notes : (existingProject ? existingProject.notes : ""),
      updatedAt: new Date().toISOString(),
    };

    const idx = store.projects.findIndex((p) => p.id === id);
    if (idx !== -1) {
      store.projects[idx] = cleanProject;
    } else {
      store.projects.push(cleanProject);
    }
    writeLocalStore(store);
    return id;
  }

  // 5. Tasks Memory
  async getTasks(): Promise<any[]> {
    return readTasksStore();
  }

  async saveTask(task: {
    id?: string;
    name?: string;
    status?: "pending" | "completed";
    priority?: string;
    deadline?: string;
    completedAt?: string | null;
    createdAt?: string;
  }): Promise<string> {
    const tasks = readTasksStore();
    const id = task.id || `task_${Date.now()}`;
    
    const existingTask = tasks.find((t) => t.id === id);

    const cleanTask = {
      id,
      name: task.name !== undefined ? task.name : (existingTask ? existingTask.name : "Untitled Task"),
      status: task.status !== undefined ? task.status : (existingTask ? existingTask.status : "pending"),
      priority: task.priority !== undefined ? task.priority : (existingTask ? existingTask.priority : "Medium"),
      deadline: task.deadline !== undefined ? task.deadline : (existingTask ? existingTask.deadline : ""),
      createdAt: existingTask ? (existingTask.createdAt || new Date().toISOString()) : (task.createdAt || new Date().toISOString()),
      completedAt: task.status === "completed" 
        ? (existingTask?.completedAt || new Date().toISOString()) 
        : (task.status === "pending" ? null : (existingTask ? existingTask.completedAt : null)),
    };

    const idx = tasks.findIndex((t) => t.id === id);
    if (idx !== -1) {
      tasks[idx] = cleanTask;
    } else {
      tasks.push(cleanTask);
    }
    writeTasksStore(tasks);
    return id;
  }

  // 6. Goals Memory
  async getGoals(): Promise<any[]> {
    const store = readLocalStore();
    return store.goals;
  }

  async saveGoal(goal: {
    id?: string;
    name?: string;
    description?: string;
    category?: string;
    targetDate?: string;
    progress?: string;
  }): Promise<string> {
    const store = readLocalStore();
    const id = goal.id || `goal_${Date.now()}`;
    
    const existingGoal = store.goals.find((g) => g.id === id);

    const cleanGoal = {
      id,
      name: goal.name !== undefined ? goal.name : (existingGoal ? existingGoal.name : "Untitled Goal"),
      description: goal.description !== undefined ? goal.description : (existingGoal ? existingGoal.description : ""),
      category: goal.category !== undefined ? goal.category : (existingGoal ? existingGoal.category : "General"),
      targetDate: goal.targetDate !== undefined ? goal.targetDate : (existingGoal ? existingGoal.targetDate : ""),
      progress: goal.progress !== undefined ? goal.progress : (existingGoal ? existingGoal.progress : "0%"),
      updatedAt: new Date().toISOString(),
    };

    const idx = store.goals.findIndex((g) => g.id === id);
    if (idx !== -1) {
      store.goals[idx] = cleanGoal;
    } else {
      store.goals.push(cleanGoal);
    }
    writeLocalStore(store);
    return id;
  }

  // 7. Session Summaries
  async getSummaries(): Promise<any[]> {
    const store = readLocalStore();
    return store.summaries;
  }

  async saveSessionSummary(summary: {
    summaryText: string;
    keyTakeaways: string[];
    decisions: string[];
  }): Promise<string> {
    const store = readLocalStore();
    const id = `sum_${Date.now()}`;
    const cleanSummary = {
      id,
      summaryText: summary.summaryText,
      keyTakeaways: summary.keyTakeaways,
      decisions: summary.decisions,
      createdAt: new Date().toISOString(),
    };

    store.summaries.unshift(cleanSummary);
    writeLocalStore(store);
    return id;
  }

  async deleteTask(taskId: string): Promise<boolean> {
    let tasks = readTasksStore();
    tasks = tasks.filter((t) => t.id !== taskId);
    writeTasksStore(tasks);
    return true;
  }

  // 8. Notes System
  async getNotes(): Promise<any[]> {
    return readNotesStore();
  }

  async saveNote(note: {
    id?: string;
    title: string;
    content: string;
    category?: string;
  }): Promise<string> {
    const notes = readNotesStore();
    const id = note.id || `note_${Date.now()}`;
    const cleanNote = {
      id,
      title: note.title,
      content: note.content,
      category: note.category || "Ideas",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const idx = notes.findIndex((n) => n.id === id);
    if (idx !== -1) {
      notes[idx] = { 
        ...notes[idx], 
        ...cleanNote, 
        createdAt: notes[idx].createdAt || new Date().toISOString() 
      };
    } else {
      notes.push(cleanNote);
    }
    writeNotesStore(notes);
    return id;
  }

  async deleteNote(noteId: string): Promise<boolean> {
    let notes = readNotesStore();
    notes = notes.filter((n) => n.id !== noteId);
    writeNotesStore(notes);
    return true;
  }

  // 9. Reminders System
  async getReminders(): Promise<any[]> {
    return readRemindersStore();
  }

  async saveReminder(reminder: {
    id?: string;
    title?: string;
    description?: string;
    dateTime?: string;
    recurrence?: string;
    priority?: string;
    completed?: boolean;
    createdAt?: string;
  }): Promise<string> {
    const reminders = readRemindersStore();
    const id = reminder.id || `rem_${Date.now()}`;
    
    const existingReminder = reminders.find((r) => r.id === id);

    const cleanReminder = {
      id,
      title: reminder.title !== undefined ? reminder.title : (existingReminder ? existingReminder.title : "Reminder"),
      description: reminder.description !== undefined ? reminder.description : (existingReminder ? existingReminder.description : ""),
      dateTime: reminder.dateTime !== undefined ? reminder.dateTime : (existingReminder ? existingReminder.dateTime : new Date().toISOString()),
      recurrence: reminder.recurrence !== undefined ? reminder.recurrence : (existingReminder ? existingReminder.recurrence : "none"),
      priority: reminder.priority !== undefined ? reminder.priority : (existingReminder ? existingReminder.priority : "Medium"),
      completed: reminder.completed !== undefined ? !!reminder.completed : (existingReminder ? !!existingReminder.completed : false),
      createdAt: existingReminder ? (existingReminder.createdAt || new Date().toISOString()) : (reminder.createdAt || new Date().toISOString()),
    };

    const idx = reminders.findIndex((r) => r.id === id);
    if (idx !== -1) {
      reminders[idx] = cleanReminder;
    } else {
      reminders.push(cleanReminder);
    }
    writeRemindersStore(reminders);
    return id;
  }

  async deleteReminder(reminderId: string): Promise<boolean> {
    let reminders = readRemindersStore();
    reminders = reminders.filter((r) => r.id !== reminderId);
    writeRemindersStore(reminders);
    return true;
  }

  async deleteGoal(goalId: string): Promise<boolean> {
    const store = readLocalStore();
    store.goals = store.goals.filter((g) => g.id !== goalId);
    writeLocalStore(store);
    return true;
  }

  async deleteProject(projectId: string): Promise<boolean> {
    const store = readLocalStore();
    store.projects = store.projects.filter((p) => p.id !== projectId);
    writeLocalStore(store);
    return true;
  }
}
