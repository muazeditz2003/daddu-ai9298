import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Database, 
  User, 
  Sliders, 
  Briefcase, 
  CheckSquare, 
  Target, 
  FileText, 
  Plus, 
  Trash2, 
  Search, 
  Save, 
  Award, 
  Clock, 
  ChevronRight, 
  Check,
  RefreshCw,
  Cpu,
  BrainCircuit,
  AlertCircle,
  Notebook,
  Bell,
  Globe,
  Tag,
  Calendar
} from "lucide-react";

interface MemoryExplorerProps {
  wsEvent: any; // Triggers refetch when socket sends update events
}

type TabType = "profile" | "memories" | "projects" | "tasks" | "notes" | "reminders" | "goals" | "research" | "summaries";

export default function MemoryExplorer({ wsEvent }: MemoryExplorerProps) {
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Core database states
  const [profile, setProfile] = useState<any>({});
  const [preferences, setPreferences] = useState<any>({});
  const [memories, setMemories] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [summaries, setSummaries] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [researchResults, setResearchResults] = useState<any[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  // Input states for creating tasks/memories/notes/reminders
  const [newMemory, setNewMemory] = useState({ content: "", category: "Knowledge", importance: 5 });
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskDeadline, setNewTaskDeadline] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("Medium");
  
  const [newNote, setNewNote] = useState({ title: "", content: "", category: "Ideas" });
  const [newReminder, setNewReminder] = useState({
    title: "",
    description: "",
    dateTime: "",
    priority: "Medium",
    recurrence: "none"
  });

  const [newProject, setNewProject] = useState({ name: "", description: "", objectives: "", techStack: "" });
  const [newGoal, setNewGoal] = useState({ name: "", description: "", category: "General", targetDate: "", progress: "0%" });

  // Tracking edit states for profile
  const [editProfile, setEditProfile] = useState<any>(null);

  // Load all data from API
  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileRes, memoriesRes, projectsRes, tasksRes, goalsRes, summariesRes, notesRes, remindersRes] = await Promise.all([
        fetch("/api/memory/profile").then((r) => r.json()),
        fetch("/api/memory/memories").then((r) => r.json()),
        fetch("/api/memory/projects").then((r) => r.json()),
        fetch("/api/memory/tasks").then((r) => r.json()),
        fetch("/api/memory/goals").then((r) => r.json()),
        fetch("/api/memory/summaries").then((r) => r.json()),
        fetch("/api/memory/notes").then((r) => r.json()),
        fetch("/api/memory/reminders").then((r) => r.json()),
      ]);

      setProfile(profileRes.profile || {});
      setPreferences(profileRes.preferences || {});
      setEditProfile(profileRes.profile || {});
      setMemories(memoriesRes || []);
      setProjects(projectsRes || []);
      setTasks(tasksRes || []);
      setGoals(goalsRes || []);
      setSummaries(summariesRes || []);
      setNotes(notesRes || []);
      setReminders(remindersRes || []);
    } catch (err: any) {
      console.error("Error fetching memory core:", err);
      setError("Failed to load DADDU Persistent Memory. Retrying...");
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchAllData();
  }, []);

  // Listen to WebSocket events from App.tsx to update memory state dynamically
  useEffect(() => {
    if (!wsEvent) return;
    
    // Refresh relevant data depending on event type
    if (wsEvent.type === "memory_updated") {
      fetch("/api/memory/memories").then((r) => r.json()).then(setMemories);
    } else if (wsEvent.type === "preference_updated") {
      fetch("/api/memory/profile").then((r) => r.json()).then((res) => {
        setProfile(res.profile || {});
        setPreferences(res.preferences || {});
      });
    } else if (wsEvent.type === "task_updated") {
      fetch("/api/memory/tasks").then((r) => r.json()).then(setTasks);
    } else if (wsEvent.type === "project_updated") {
      fetch("/api/memory/projects").then((r) => r.json()).then(setProjects);
    } else if (wsEvent.type === "goal_updated") {
      fetch("/api/memory/goals").then((r) => r.json()).then(setGoals);
    } else if (wsEvent.type === "summary_created") {
      fetch("/api/memory/summaries").then((r) => r.json()).then(setSummaries);
    } else if (wsEvent.type === "note_updated") {
      fetch("/api/memory/notes").then((r) => r.json()).then(setNotes);
    } else if (wsEvent.type === "reminder_updated") {
      fetch("/api/memory/reminders").then((r) => r.json()).then(setReminders);
    } else if (wsEvent.type === "web_search_executed") {
      setResearchResults((prev) => [
        {
          id: `res_${Date.now()}`,
          query: wsEvent.query,
          summary: wsEvent.summary,
          sources: wsEvent.sources || [],
          timestamp: new Date().toISOString()
        },
        ...prev
      ]);
      setActiveTab("research");
    }
  }, [wsEvent]);

  // Handle Profile Save
  const handleSaveProfile = async () => {
    try {
      const res = await fetch("/api/memory/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editProfile),
      });
      const data = await res.json();
      if (data.success) {
        setProfile(editProfile);
      }
    } catch (err) {
      console.error("Failed to save profile:", err);
    }
  };

  // Handle Preference Change
  const handlePreferenceChange = async (key: string, value: string) => {
    try {
      const res = await fetch("/api/memory/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      const data = await res.json();
      if (data.success) {
        setPreferences((prev: any) => ({ ...prev, [key]: value }));
      }
    } catch (err) {
      console.error("Failed to save preference:", err);
    }
  };

  // Handle Task Add
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim()) return;

    try {
      const res = await fetch("/api/memory/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTaskName,
          status: "pending",
          deadline: newTaskDeadline,
          priority: newTaskPriority,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewTaskName("");
        setNewTaskDeadline("");
        setNewTaskPriority("Medium");
        // reload tasks list
        fetch("/api/memory/tasks").then((r) => r.json()).then(setTasks);
      }
    } catch (err) {
      console.error("Failed to add task:", err);
    }
  };

  // Handle Task Delete
  const handleDeleteTask = async (id: string) => {
    try {
      const res = await fetch(`/api/memory/tasks/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setTasks((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  // Toggle Task Status
  const handleToggleTask = async (task: any) => {
    const nextStatus = task.status === "completed" ? "pending" : "completed";
    try {
      await fetch("/api/memory/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...task,
          status: nextStatus,
        }),
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus, completedAt: nextStatus === "completed" ? new Date().toISOString() : null } : t))
      );
    } catch (err) {
      console.error("Failed to toggle task:", err);
    }
  };

  // Notes system handlers
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.title.trim() || !newNote.content.trim()) return;
    try {
      const res = await fetch("/api/memory/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newNote),
      });
      const data = await res.json();
      if (data.success) {
        setNewNote({ title: "", content: "", category: "Ideas" });
        fetch("/api/memory/notes").then((r) => r.json()).then(setNotes);
      }
    } catch (err) {
      console.error("Failed to save note:", err);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      const res = await fetch(`/api/memory/notes/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setNotes((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  // Reminders system handlers
  const handleSaveReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminder.title.trim() || !newReminder.dateTime) return;
    try {
      const res = await fetch("/api/memory/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newReminder),
      });
      const data = await res.json();
      if (data.success) {
        setNewReminder({
          title: "",
          description: "",
          dateTime: "",
          priority: "Medium",
          recurrence: "none"
        });
        fetch("/api/memory/reminders").then((r) => r.json()).then(setReminders);
      }
    } catch (err) {
      console.error("Failed to save reminder:", err);
    }
  };

  const handleDeleteReminder = async (id: string) => {
    try {
      const res = await fetch(`/api/memory/reminders/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setReminders((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete reminder:", err);
    }
  };

  const handleToggleReminder = async (reminder: any) => {
    const nextCompleted = !reminder.completed;
    try {
      const res = await fetch("/api/memory/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...reminder,
          completed: nextCompleted,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetch("/api/memory/reminders").then((r) => r.json()).then(setReminders);
      }
    } catch (err) {
      console.error("Failed to toggle reminder:", err);
    }
  };

  // Delete Memory
  const handleDeleteMemory = async (id: string) => {
    try {
      const res = await fetch(`/api/memory/memories/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete memory:", err);
    }
  };

  // Delete Goal
  const handleDeleteGoal = async (id: string) => {
    try {
      const res = await fetch(`/api/memory/goals/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setGoals((prev) => prev.filter((g) => g.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete goal:", err);
    }
  };

  // Delete Project
  const handleDeleteProject = async (id: string) => {
    try {
      const res = await fetch(`/api/memory/projects/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
  };

  // Manual Memory Add
  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemory.content.trim()) return;

    try {
      const res = await fetch("/api/memory/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMemory),
      });
      const data = await res.json();
      if (data.success) {
        setNewMemory({ content: "", category: "Knowledge", importance: 5 });
        fetch("/api/memory/memories").then((r) => r.json()).then(setMemories);
      }
    } catch (err) {
      console.error("Failed to add memory:", err);
    }
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name.trim()) return;
    try {
      const res = await fetch("/api/memory/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProject),
      });
      const data = await res.json();
      if (data.success) {
        setNewProject({ name: "", description: "", objectives: "", techStack: "" });
        fetch("/api/memory/projects").then((r) => r.json()).then(setProjects);
      }
    } catch (err) {
      console.error("Failed to save project:", err);
    }
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.name.trim()) return;
    try {
      const res = await fetch("/api/memory/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newGoal),
      });
      const data = await res.json();
      if (data.success) {
        setNewGoal({ name: "", description: "", category: "General", targetDate: "", progress: "0%" });
        fetch("/api/memory/goals").then((r) => r.json()).then(setGoals);
      }
    } catch (err) {
      console.error("Failed to save goal:", err);
    }
  };

  // Helper to color code memory importance score
  const getImportanceBadge = (score: number) => {
    if (score >= 9) return "bg-red-500/10 text-red-400 border-red-500/20";
    if (score >= 7) return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    if (score >= 4) return "bg-lime-500/10 text-lime-400 border-lime-500/20";
    return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
  };

  const filteredMemories = memories.filter((mem) => {
    const matchesSearch = mem.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (mem.category || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "All" || mem.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="w-full glassmorphism rounded-3xl border border-white/[0.04] bg-[#09090e]/40 p-6 flex flex-col space-y-5" id="persistent-memory-panel">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.05] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-lime-500/10 border border-lime-500/20 text-lime-400">
            <BrainCircuit className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-mono font-bold tracking-wider text-lime-400 uppercase flex items-center gap-1.5">
              DADDU Persistent Memory Core
            </h2>
            <p className="text-[10px] text-zinc-500 font-sans tracking-wide">
              Firebase Firestore-backed context retention and continuous alignment engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={fetchAllData}
            className="p-1.5 rounded-lg bg-white/[0.02] border border-white/5 text-zinc-400 hover:text-white transition-all flex items-center gap-1 text-[10px] font-mono"
            title="Force synchronization with Firebase"
            id="btn-sync-memory"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            Sync Core
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-1 bg-black/30 p-1 rounded-xl border border-white/[0.03]">
        {[
          { id: "profile", label: "Profile", icon: User },
          { id: "memories", label: "Knowledge", icon: Database },
          { id: "projects", label: "Projects", icon: Briefcase },
          { id: "tasks", label: "Tasks", icon: CheckSquare },
          { id: "notes", label: "Notes", icon: Notebook },
          { id: "reminders", label: "Reminders", icon: Bell },
          { id: "goals", label: "Goals", icon: Target },
          { id: "research", label: "Research", icon: Globe },
          { id: "summaries", label: "Summaries", icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono transition-all duration-300 ${
                isActive 
                  ? "bg-lime-500/10 text-lime-400 border border-lime-500/20 font-bold" 
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02] border border-transparent"
              }`}
              id={`tab-${tab.id}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Error / Loading Indicator */}
      {error && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-200">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Active Tab Body */}
      <div className="flex-1 min-h-[280px]">
        <AnimatePresence mode="wait">
          {/* 1. PROFILE TAB */}
          {activeTab === "profile" && editProfile && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Long Term Profile Facts */}
                <div className="space-y-3 bg-white/[0.01] border border-white/[0.03] p-4 rounded-xl">
                  <h3 className="font-mono font-bold text-[11px] uppercase tracking-wider text-lime-400 border-b border-white/5 pb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> Long-Term Profile
                  </h3>
                  <div className="grid grid-cols-1 gap-2.5">
                    <div>
                      <label className="text-[10px] font-mono text-zinc-500 block mb-1">User Name</label>
                      <input 
                        type="text" 
                        value={editProfile.name || ""} 
                        onChange={(e) => setEditProfile({ ...editProfile, name: e.target.value })}
                        onBlur={handleSaveProfile}
                        className="w-full bg-black/40 border border-white/5 rounded-lg px-2.5 py-1.5 focus:border-lime-500/40 text-zinc-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-zinc-500 block mb-1">Profession</label>
                      <input 
                        type="text" 
                        value={editProfile.profession || ""} 
                        onChange={(e) => setEditProfile({ ...editProfile, profession: e.target.value })}
                        onBlur={handleSaveProfile}
                        className="w-full bg-black/40 border border-white/5 rounded-lg px-2.5 py-1.5 focus:border-lime-500/40 text-zinc-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-zinc-500 block mb-1">Interests</label>
                      <input 
                        type="text" 
                        value={editProfile.interests || ""} 
                        onChange={(e) => setEditProfile({ ...editProfile, interests: e.target.value })}
                        onBlur={handleSaveProfile}
                        className="w-full bg-black/40 border border-white/5 rounded-lg px-2.5 py-1.5 focus:border-lime-500/40 text-zinc-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-zinc-500 block mb-1">Key Tech Skills</label>
                      <input 
                        type="text" 
                        value={editProfile.skills || ""} 
                        onChange={(e) => setEditProfile({ ...editProfile, skills: e.target.value })}
                        onBlur={handleSaveProfile}
                        className="w-full bg-black/40 border border-white/5 rounded-lg px-2.5 py-1.5 focus:border-lime-500/40 text-zinc-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Cognitive Preferences */}
                <div className="space-y-3 bg-white/[0.01] border border-white/[0.03] p-4 rounded-xl">
                  <h3 className="font-mono font-bold text-[11px] uppercase tracking-wider text-lime-400 border-b border-white/5 pb-1 flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5" /> Behavior Preferences
                  </h3>
                  <div className="grid grid-cols-1 gap-2.5">
                    <div>
                      <label className="text-[10px] font-mono text-zinc-500 block mb-1">Response Length</label>
                      <select 
                        value={preferences.responseLength || "Balanced"} 
                        onChange={(e) => handlePreferenceChange("responseLength", e.target.value)}
                        className="w-full bg-black/40 border border-white/5 rounded-lg px-2.5 py-1.5 focus:border-lime-500/40 text-zinc-200"
                      >
                        <option value="Concise">Concise (Direct & fast)</option>
                        <option value="Balanced">Balanced (Optimal context)</option>
                        <option value="Detailed">Detailed (In-depth analysis)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-zinc-500 block mb-1">Communication Tone</label>
                      <select 
                        value={preferences.communicationStyle || "Sophisticated and Concise"} 
                        onChange={(e) => handlePreferenceChange("communicationStyle", e.target.value)}
                        className="w-full bg-black/40 border border-white/5 rounded-lg px-2.5 py-1.5 focus:border-lime-500/40 text-zinc-200"
                      >
                        <option value="Sophisticated and Concise">Sophisticated & Concise</option>
                        <option value="Direct and Technical">Direct & Technical (Code-focused)</option>
                        <option value="Friendly and Warm">Friendly & Reassuring</option>
                        <option value="Brutalist Academic">Brutalist (Ultra-dense)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-zinc-500 block mb-1">Preferred Languages</label>
                      <input 
                        type="text" 
                        value={preferences.preferredLanguages || ""} 
                        onChange={(e) => handlePreferenceChange("preferredLanguages", e.target.value)}
                        className="w-full bg-black/40 border border-white/5 rounded-lg px-2.5 py-1.5 focus:border-lime-500/40 text-zinc-200"
                        placeholder="e.g. TypeScript, Python"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-zinc-500 block mb-1">Productivity Method</label>
                      <input 
                        type="text" 
                        value={preferences.productivityMethod || ""} 
                        onChange={(e) => handlePreferenceChange("productivityMethod", e.target.value)}
                        className="w-full bg-black/40 border border-white/5 rounded-lg px-2.5 py-1.5 focus:border-lime-500/40 text-zinc-200"
                        placeholder="e.g. Focus Time, Pomodoro"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 2. MEMORIES (KNOWLEDGE) TAB */}
          {activeTab === "memories" && (
            <motion.div
              key="memories"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Search Bar & Manual Add */}
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search persistent memories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black/30 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs focus:border-lime-500/40 text-zinc-200"
                  />
                </div>
                <div className="flex gap-2">
                  {["All", "Knowledge", "Preference", "Profile"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all border ${
                        categoryFilter === cat 
                          ? "bg-lime-500/10 border-lime-500/30 text-lime-400 font-bold" 
                          : "bg-white/[0.01] border-white/5 text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Memories List */}
              <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {filteredMemories.length === 0 ? (
                  <div className="text-center py-8 text-xs text-zinc-500 font-mono">
                    No memories match this search criteria. Let DADDU auto-learn during conversations!
                  </div>
                ) : (
                  filteredMemories.map((mem) => (
                    <div 
                      key={mem.id} 
                      className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-xl flex items-start justify-between gap-3 group hover:border-white/10 transition-all duration-300"
                    >
                      <div className="space-y-1.5 flex-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-lime-400 bg-lime-500/5 border border-lime-500/10 px-1.5 py-0.5 rounded">
                            {mem.category}
                          </span>
                          <span className={`text-[9px] font-mono border px-1.5 py-0.5 rounded ${getImportanceBadge(mem.importance)}`}>
                            Imp: {mem.importance}/10
                          </span>
                          <span className="text-[9px] text-zinc-500 font-mono flex items-center gap-1 ml-auto">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(mem.createdAt).toLocaleDateString("en-US", { timeZone: "Asia/Karachi" })}
                          </span>
                        </div>
                        <p className="text-zinc-300 font-sans leading-relaxed">{mem.content}</p>
                        {mem.relatedEntities && mem.relatedEntities.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {mem.relatedEntities.map((ent: string, idx: number) => (
                              <span key={idx} className="text-[9px] font-mono text-zinc-500 bg-black/40 px-1 py-0.2 rounded">
                                #{ent}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteMemory(mem.id)}
                        className="text-zinc-600 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/5 transition-all self-center sm:opacity-0 sm:group-hover:opacity-100"
                        title="Erase memory from core"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Quick Memory Injection form */}
              <form onSubmit={handleAddMemory} className="border-t border-white/[0.04] pt-3 flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Inject a custom fact (e.g., 'User has a presentation on July 1st.')"
                  value={newMemory.content}
                  onChange={(e) => setNewMemory({ ...newMemory, content: e.target.value })}
                  className="flex-1 bg-black/40 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:border-lime-500/40"
                />
                <div className="flex gap-2">
                  <select
                    value={newMemory.category}
                    onChange={(e) => setNewMemory({ ...newMemory, category: e.target.value })}
                    className="bg-black/40 border border-white/5 rounded-xl px-2 py-1.5 text-xs text-zinc-400"
                  >
                    <option value="Knowledge">Knowledge</option>
                    <option value="Preference">Preference</option>
                    <option value="Profile">Profile</option>
                  </select>
                  <select
                    value={newMemory.importance}
                    onChange={(e) => setNewMemory({ ...newMemory, importance: Number(e.target.value) })}
                    className="bg-black/40 border border-white/5 rounded-xl px-2 py-1.5 text-xs text-zinc-400"
                  >
                    {[1,2,3,4,5,6,7,8,9,10].map((v) => (
                      <option key={v} value={v}>Imp: {v}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-lime-500/10 border border-lime-500/20 rounded-xl text-lime-400 text-xs hover:bg-lime-500/20 font-bold font-mono transition-all flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> Inject
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* 3. PROJECTS TAB */}
          {activeTab === "projects" && (
            <motion.div
              key="projects"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {projects.length === 0 ? (
                  <div className="text-center py-10 text-xs text-zinc-500 font-mono">
                    No active projects found. Start a project with DADDU using voice commands!
                  </div>
                ) : (
                  projects.map((proj) => (
                    <div key={proj.id} className="p-4 bg-white/[0.01] border border-white/[0.03] rounded-xl space-y-3 text-xs hover:border-white/10 transition-all duration-300 group">
                      <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="p-1 rounded-md bg-lime-500/10 text-lime-400">
                            <Briefcase className="w-3.5 h-3.5" />
                          </span>
                          <span className="font-mono font-bold text-white tracking-wide">{proj.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-lime-300 bg-lime-500/5 px-2 py-0.5 rounded border border-lime-500/10">
                            Progress: {proj.progress || "0%"}
                          </span>
                          <button
                            onClick={() => handleDeleteProject(proj.id)}
                            className="text-zinc-600 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/5 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                            title="Delete Project"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-zinc-300 font-sans leading-relaxed">{proj.description}</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <p className="text-[10px] font-mono text-zinc-500 uppercase">Objectives</p>
                          <p className="text-zinc-400 mt-0.5 font-sans leading-relaxed">{proj.objectives || "None listed."}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-mono text-zinc-500 uppercase">Technology Stack</p>
                          <p className="text-zinc-400 mt-0.5 font-mono">{proj.techStack || "None declared."}</p>
                        </div>
                      </div>

                      {proj.decisions && (
                        <div className="p-2.5 bg-black/30 rounded-lg border border-white/[0.03]">
                          <p className="text-[9px] font-mono text-lime-400 uppercase tracking-widest mb-0.5">Core Decisions</p>
                          <p className="text-zinc-400 font-mono text-[10px] leading-relaxed">{proj.decisions}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Quick Project Creation Form */}
              <form onSubmit={handleSaveProject} className="border-t border-white/[0.04] pt-3 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Project Name"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    className="bg-black/40 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:border-lime-500/40 w-full"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Tech Stack (e.g. React, Node.js)"
                    value={newProject.techStack}
                    onChange={(e) => setNewProject({ ...newProject, techStack: e.target.value })}
                    className="bg-black/40 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:border-lime-500/40 w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Project Description..."
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    className="flex-1 bg-black/40 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:border-lime-500/40"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-lime-500/10 border border-lime-500/20 rounded-xl text-lime-400 text-xs hover:bg-lime-500/20 font-bold font-mono transition-all flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> Save
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* 4. TASKS TAB */}
          {activeTab === "tasks" && (
            <motion.div
              key="tasks"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Task list */}
              <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {tasks.length === 0 ? (
                  <div className="text-center py-10 text-xs text-zinc-500 font-mono">
                    All clear! No pending tasks in action board. Create a task above.
                  </div>
                ) : (
                  tasks.map((task) => {
                    const isCompleted = task.status === "completed";
                    const priority = task.priority || "Medium";
                    
                    const getPriorityColor = (p: string) => {
                      switch (p) {
                        case "Critical": return "bg-red-500/15 text-red-400 border-red-500/20";
                        case "High": return "bg-amber-500/15 text-amber-400 border-amber-500/20";
                        case "Medium": return "bg-lime-500/15 text-lime-400 border-lime-500/20";
                        default: return "bg-zinc-500/15 text-zinc-400 border-zinc-500/20";
                      }
                    };

                    return (
                      <div 
                        key={task.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 group transition-all duration-300 ${
                          isCompleted 
                            ? "bg-black/20 border-white/[0.02] opacity-50" 
                            : "bg-white/[0.01] border-white/[0.03] hover:border-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggleTask(task)}
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                              isCompleted 
                                ? "bg-lime-500 border-lime-500 text-white" 
                                : "border-zinc-700 bg-black/40 hover:border-lime-500"
                            }`}
                            id={`chk-task-${task.id}`}
                          >
                            {isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>
                          <span className={`text-xs font-sans ${isCompleted ? "line-through text-zinc-500" : "text-zinc-200"}`}>
                            {task.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-mono border px-1.5 py-0.5 rounded ${getPriorityColor(priority)}`}>
                            {priority}
                          </span>
                          {task.deadline && (
                            <span className="text-[9px] font-mono text-zinc-500 flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded border border-white/5">
                              Due: {task.deadline}
                            </span>
                          )}
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-zinc-600 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/5 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                            title="Delete task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Task Form */}
              <form onSubmit={handleAddTask} className="border-t border-white/[0.04] pt-3 flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Create a pending task (e.g., 'Refactor memory hooks')"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  className="flex-1 bg-black/40 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:border-lime-500/40"
                />
                <div className="flex gap-2">
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                    className="bg-black/40 border border-white/5 rounded-xl px-2 py-1.5 text-xs text-zinc-400"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                  <input
                    type="date"
                    value={newTaskDeadline}
                    onChange={(e) => setNewTaskDeadline(e.target.value)}
                    className="bg-black/40 border border-white/5 rounded-xl px-2 py-1.5 text-xs text-zinc-400"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-lime-500/10 border border-lime-500/20 rounded-xl text-lime-400 text-xs hover:bg-lime-500/20 font-bold font-mono transition-all flex items-center gap-1 shrink-0"
                    id="btn-add-task-submit"
                  >
                    <Plus className="w-3.5 h-3.5" /> Task
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* 7. NOTES TAB */}
          {activeTab === "notes" && (
            <motion.div
              key="notes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Note search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/30 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs focus:border-lime-500/40 text-zinc-200"
                />
              </div>

              {/* Notes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                {notes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.content.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                  <div className="col-span-2 text-center py-10 text-xs text-zinc-500 font-mono">
                    No notes found. Create a new note below, or say "DADDU, save a note..." to do it by voice!
                  </div>
                ) : (
                  notes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.content.toLowerCase().includes(searchQuery.toLowerCase())).map((note) => (
                    <div key={note.id} className="p-3.5 bg-white/[0.01] border border-white/[0.03] rounded-xl flex flex-col justify-between space-y-2 group hover:border-white/10 transition-all duration-300">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-white text-xs truncate mr-2">{note.title}</span>
                          <span className="text-[9px] font-mono text-lime-400 bg-lime-500/5 px-1.5 py-0.5 rounded border border-lime-500/10 shrink-0">
                            {note.category || "Ideas"}
                          </span>
                        </div>
                        <p className="text-zinc-400 text-xs font-sans line-clamp-3 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                      </div>
                      <div className="flex items-center justify-between border-t border-white/[0.03] pt-1.5 text-[9px] text-zinc-500 font-mono">
                        <span>Updated: {new Date(note.updatedAt || note.createdAt).toLocaleDateString("en-US", { timeZone: "Asia/Karachi" })}</span>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-zinc-600 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/5 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                          title="Delete Note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Note Form */}
              <form onSubmit={handleSaveNote} className="border-t border-white/[0.04] pt-3 flex flex-col space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Note Title"
                    value={newNote.title}
                    onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                    className="flex-1 bg-black/40 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:border-lime-500/40"
                  />
                  <select
                    value={newNote.category}
                    onChange={(e) => setNewNote({ ...newNote, category: e.target.value })}
                    className="bg-black/40 border border-white/5 rounded-xl px-2 py-1.5 text-xs text-zinc-400"
                  >
                    <option value="Personal">Personal</option>
                    <option value="Work">Work</option>
                    <option value="Ideas">Ideas</option>
                    <option value="Research">Research</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Meetings">Meetings</option>
                    <option value="Projects">Projects</option>
                    <option value="Learning">Learning</option>
                  </select>
                </div>
                <div className="flex gap-2 items-end">
                  <textarea
                    placeholder="Start typing your note content..."
                    value={newNote.content}
                    onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                    rows={2}
                    className="flex-1 bg-black/40 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:border-lime-500/40 resize-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-lime-500/10 border border-lime-500/20 rounded-xl text-lime-400 text-xs hover:bg-lime-500/20 font-bold font-mono transition-all flex items-center gap-1 shrink-0 h-9"
                  >
                    <Plus className="w-3.5 h-3.5" /> Save Note
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* 8. REMINDERS TAB */}
          {activeTab === "reminders" && (
            <motion.div
              key="reminders"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Reminders list */}
              <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {reminders.length === 0 ? (
                  <div className="text-center py-10 text-xs text-zinc-500 font-mono">
                    No active reminders. Tell DADDU: "remind me to prepare slides tomorrow at 9 AM" to see it set instantly!
                  </div>
                ) : (
                  reminders.map((rem) => {
                    const getPriorityColor = (p: string) => {
                      switch (p) {
                        case "Critical": return "bg-red-500/15 text-red-400 border-red-500/20";
                        case "High": return "bg-amber-500/15 text-amber-400 border-amber-500/20";
                        case "Medium": return "bg-lime-500/15 text-lime-400 border-lime-500/20";
                        default: return "bg-zinc-500/15 text-zinc-400 border-zinc-500/20";
                      }
                    };

                    return (
                      <div 
                        key={rem.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 group transition-all duration-300 ${
                          rem.completed 
                            ? "bg-black/20 border-white/[0.02] opacity-50" 
                            : "bg-white/[0.01] border-white/[0.03] hover:border-white/10"
                        }`}
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleToggleReminder(rem)}
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-all mt-0.5 shrink-0 ${
                              rem.completed 
                                ? "bg-lime-500 border-lime-500 text-white" 
                                : "border-zinc-700 bg-black/40 hover:border-lime-500"
                            }`}
                            id={`chk-rem-${rem.id}`}
                          >
                            {rem.completed && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>
                          
                          <div className="space-y-1 min-w-0 flex-1">
                            <p className={`text-xs font-bold ${rem.completed ? "line-through text-zinc-500" : "text-white"} truncate`}>{rem.title}</p>
                            {rem.description && (
                              <p className={`text-[10px] font-sans leading-relaxed ${rem.completed ? "line-through text-zinc-600" : "text-zinc-400"}`}>{rem.description}</p>
                            )}
                            <div className="flex flex-wrap gap-2 text-[9px] font-mono text-zinc-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5 text-zinc-600" />
                                {(() => {
                                  try {
                                    const d = new Date(rem.dateTime);
                                    if (isNaN(d.getTime())) return rem.dateTime;
                                    return d.toLocaleString("en-US", { timeZone: "Asia/Karachi", dateStyle: "short", timeStyle: "short" });
                                  } catch (e) {
                                    return rem.dateTime;
                                  }
                                })()}
                              </span>
                              {rem.recurrence && rem.recurrence !== "none" && (
                                <span className="bg-white/5 px-1 rounded">
                                  ↻ {rem.recurrence}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[9px] font-mono border px-1.5 py-0.5 rounded ${getPriorityColor(rem.priority)}`}>
                            {rem.priority || "Medium"}
                          </span>
                          <button
                            onClick={() => handleDeleteReminder(rem.id)}
                            className="text-zinc-600 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/5 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                            title="Delete reminder"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Reminder Form */}
              <form onSubmit={handleSaveReminder} className="border-t border-white/[0.04] pt-3 flex flex-col space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Reminder Title"
                    value={newReminder.title}
                    onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                    className="sm:col-span-1 bg-black/40 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:border-lime-500/40"
                  />
                  <input
                    type="text"
                    placeholder="Description (Optional)"
                    value={newReminder.description}
                    onChange={(e) => setNewReminder({ ...newReminder, description: e.target.value })}
                    className="sm:col-span-2 bg-black/40 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:border-lime-500/40"
                  />
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    type="datetime-local"
                    value={newReminder.dateTime}
                    onChange={(e) => setNewReminder({ ...newReminder, dateTime: e.target.value })}
                    className="bg-black/40 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-zinc-400 flex-1"
                  />
                  <select
                    value={newReminder.priority}
                    onChange={(e) => setNewReminder({ ...newReminder, priority: e.target.value })}
                    className="bg-black/40 border border-white/5 rounded-xl px-2 py-1.5 text-xs text-zinc-400"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                  <select
                    value={newReminder.recurrence}
                    onChange={(e) => setNewReminder({ ...newReminder, recurrence: e.target.value })}
                    className="bg-black/40 border border-white/5 rounded-xl px-2 py-1.5 text-xs text-zinc-400"
                  >
                    <option value="none">Once</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-lime-500/10 border border-lime-500/20 rounded-xl text-lime-400 text-xs hover:bg-lime-500/20 font-bold font-mono transition-all flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> Reminder
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* 9. RESEARCH (WEB GROUNDING) TAB */}
          {activeTab === "research" && (
            <motion.div
              key="research"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {researchResults.length === 0 ? (
                  <div className="text-center py-12 text-xs text-zinc-500 font-mono leading-relaxed p-4 bg-white/[0.01] border border-white/[0.03] rounded-xl">
                    <Globe className="w-8 h-8 text-lime-400 mx-auto mb-2 opacity-50 animate-pulse" />
                    No web research conducted yet. Ask DADDU to search something or research a topic to trigger Native Google Search Grounding with beautiful summaries!
                  </div>
                ) : (
                  researchResults.map((res: any) => (
                    <div key={res.id} className="p-4 bg-white/[0.01] border border-white/[0.03] rounded-xl space-y-3.5 text-xs border-l-2 border-l-lime-500/40">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-lime-500/10 text-lime-400 rounded">
                            <Search className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-mono font-bold text-white truncate max-w-[200px] sm:max-w-md">"{res.query}"</span>
                        </div>
                        <span className="text-[9px] font-mono text-zinc-500 shrink-0">
                          {new Date(res.timestamp).toLocaleTimeString("en-US", { timeZone: "Asia/Karachi" })}
                        </span>
                      </div>

                      <div className="text-zinc-300 font-sans leading-relaxed whitespace-pre-wrap text-xs bg-black/20 p-3 rounded-lg border border-white/[0.02]">
                        {res.summary}
                      </div>

                      {res.sources && res.sources.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Verified Web Citations & Sources</p>
                          <div className="flex flex-wrap gap-1.5">
                            {res.sources.map((src: any, sIdx: number) => (
                              <a
                                key={sIdx}
                                href={src.url}
                                target="_blank"
                                rel="referrer noopener"
                                className="text-[10px] font-sans text-lime-400 bg-lime-500/5 px-2.5 py-1 rounded-lg border border-lime-500/10 hover:bg-lime-500/15 hover:border-lime-500/30 transition-all flex items-center gap-1.5 max-w-xs truncate"
                              >
                                <Globe className="w-3 h-3 shrink-0" />
                                <span className="truncate">{src.title || "Reference source"}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* 5. GOALS TAB */}
          {activeTab === "goals" && (
            <motion.div
              key="goals"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {goals.length === 0 ? (
                  <div className="text-center py-10 text-xs text-zinc-500 font-mono">
                    No long-term goals registered. Set your career and study aims with DADDU!
                  </div>
                ) : (
                  goals.map((goal) => (
                    <div key={goal.id} className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-xl flex items-start gap-3 group hover:border-white/10 transition-all duration-300">
                      <div className="p-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg shrink-0">
                        <Target className="w-4 h-4" />
                      </div>
                      <div className="space-y-1.5 flex-1 text-xs">
                        <div className="flex items-center justify-between">
                          <p className="font-mono font-bold text-white tracking-wide">{goal.name}</p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono text-purple-300 bg-purple-500/5 px-2 py-0.5 rounded border border-purple-500/10">
                              {goal.category}
                            </span>
                            <button
                              onClick={() => handleDeleteGoal(goal.id)}
                              className="text-zinc-600 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/5 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                              title="Delete Goal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-zinc-300 font-sans leading-relaxed">{goal.description}</p>
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono pt-1">
                          <span>Target Date: {goal.targetDate || "Continuous"}</span>
                          <span className="text-lime-400">Alignment: {goal.progress || "0%"}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Quick Goal Creation Form */}
              <form onSubmit={handleSaveGoal} className="border-t border-white/[0.04] pt-3 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Goal Name"
                    value={newGoal.name}
                    onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                    className="bg-black/40 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:border-lime-500/40 w-full col-span-1 sm:col-span-2"
                    required
                  />
                  <select
                    value={newGoal.category}
                    onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value })}
                    className="bg-black/40 border border-white/5 rounded-xl px-2 py-1.5 text-xs text-zinc-400 w-full"
                  >
                    <option value="General">General</option>
                    <option value="Career">Career</option>
                    <option value="Health">Health</option>
                    <option value="Financial">Financial</option>
                    <option value="Personal">Personal</option>
                    <option value="Learning">Learning</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Goal Description..."
                    value={newGoal.description}
                    onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                    className="flex-1 bg-black/40 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:border-lime-500/40"
                  />
                  <input
                    type="text"
                    placeholder="Target Date"
                    value={newGoal.targetDate}
                    onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
                    className="w-28 bg-black/40 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:border-lime-500/40 font-mono"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-lime-500/10 border border-lime-500/20 rounded-xl text-lime-400 text-xs hover:bg-lime-500/20 font-bold font-mono transition-all flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> Save
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* 6. SUMMARIES TAB */}
          {activeTab === "summaries" && (
            <motion.div
              key="summaries"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {summaries.length === 0 ? (
                  <div className="text-center py-12 text-xs text-zinc-500 font-mono leading-relaxed p-4 bg-white/[0.01] border border-white/[0.03] rounded-xl">
                    <BrainCircuit className="w-8 h-8 text-zinc-600 mx-auto mb-2 opacity-50" />
                    No session summaries stored yet. Summaries are automatically structured and saved at the end of every active conversation session!
                  </div>
                ) : (
                  summaries.map((sum, index) => (
                    <div key={sum.id} className="p-4 bg-white/[0.01] border border-white/[0.03] rounded-xl space-y-3 text-xs">
                      <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                        <span className="font-mono font-bold text-white">Session Summary #{summaries.length - index}</span>
                        <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(sum.createdAt).toLocaleString("en-US", { timeZone: "Asia/Karachi" })}
                        </span>
                      </div>

                      <p className="text-zinc-300 font-sans leading-relaxed">{sum.summaryText}</p>

                      {sum.keyTakeaways && sum.keyTakeaways.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-mono text-lime-400 uppercase tracking-wider">Key Discoveries & Takeaways</p>
                          <ul className="list-disc pl-4 space-y-0.5 text-zinc-400 font-sans leading-relaxed">
                            {sum.keyTakeaways.map((takeaway: string, idx: number) => (
                              <li key={idx}>{takeaway}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {sum.decisions && sum.decisions.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-mono text-purple-400 uppercase tracking-wider">Decisions & Agreements</p>
                          <ul className="list-disc pl-4 space-y-0.5 text-zinc-400 font-sans leading-relaxed">
                            {sum.decisions.map((decision: string, idx: number) => (
                              <li key={idx}>{decision}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
