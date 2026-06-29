import { apiUrl } from "../config";

export interface BrowserTab {
  id: string;
  url: string;
  siteName: string;
  windowRef: Window | null;
  openedAt: Date;
}

const externalTabs = new Map<string, BrowserTab>();

export function validateUrl(raw: string): string {
  const trimmed = raw.trim();
  const withProtocol =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;
  const url = new URL(withProtocol);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http and https URLs are allowed.");
  }
  return url.toString();
}

export function buildSearchUrl(query: string, engine: string = "google"): string {
  const q = encodeURIComponent(query.trim());
  switch (engine.toLowerCase()) {
    case "bing":
      return `https://www.bing.com/search?q=${q}`;
    case "duckduckgo":
    case "duckduckgo.com":
      return `https://duckduckgo.com/?q=${q}`;
    case "youtube":
      return `https://www.youtube.com/results?search_query=${q}`;
    case "images":
    case "google_images":
      return `https://www.google.com/search?tbm=isch&q=${q}`;
    default:
      return `https://www.google.com/search?q=${q}`;
  }
}

export function openExternalTab(url: string, siteName: string): BrowserTab {
  const safeUrl = validateUrl(url);
  const tab: BrowserTab = {
    id: `tab_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    url: safeUrl,
    siteName: siteName || safeUrl,
    windowRef: null,
    openedAt: new Date(),
  };

  try {
    tab.windowRef = window.open(safeUrl, "_blank", "noopener,noreferrer");
  } catch {
    tab.windowRef = null;
  }

  externalTabs.set(tab.id, tab);
  return tab;
}

export function closeTab(tabId?: string, url?: string): { closed: string[]; failed: string[] } {
  const closed: string[] = [];
  const failed: string[] = [];

  const targets = tabId
    ? [externalTabs.get(tabId)].filter(Boolean)
    : url
      ? Array.from(externalTabs.values()).filter((t) => t.url === validateUrl(url))
      : [];

  for (const tab of targets as BrowserTab[]) {
    try {
      if (tab.windowRef && !tab.windowRef.closed) {
        tab.windowRef.close();
        closed.push(tab.id);
      } else {
        failed.push(tab.id);
      }
      externalTabs.delete(tab.id);
    } catch {
      failed.push(tab.id);
      externalTabs.delete(tab.id);
    }
  }

  return { closed, failed };
}

export function closeAllTabs(): { closedCount: number; failedCount: number } {
  let closedCount = 0;
  let failedCount = 0;
  for (const tab of externalTabs.values()) {
    try {
      if (tab.windowRef && !tab.windowRef.closed) {
        tab.windowRef.close();
        closedCount++;
      } else {
        failedCount++;
      }
    } catch {
      failedCount++;
    }
  }
  externalTabs.clear();
  return { closedCount, failedCount };
}

export async function downloadFromWeb(
  url: string,
  filename?: string,
  type: "file" | "image" = "file"
): Promise<{ success: boolean; filename: string; size?: number; error?: string }> {
  const safeUrl = validateUrl(url);

  const response = await fetch(apiUrl("/api/browser/proxy-download"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: safeUrl, type }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    return { success: false, filename: filename || "download", error: data.error || "Download failed." };
  }

  const blob = base64ToBlob(data.base64, data.mimeType);
  const finalName = filename || data.filename || (type === "image" ? "image.jpg" : "download");

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = finalName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);

  return { success: true, filename: finalName, size: data.size };
}

export async function copyTextToClipboard(text: string): Promise<{ success: boolean; length: number }> {
  if (!text?.trim()) {
    throw new Error("No text provided to copy.");
  }
  await navigator.clipboard.writeText(text);
  return { success: true, length: text.length };
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}
