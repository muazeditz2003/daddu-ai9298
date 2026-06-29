import { URL } from "url";

const MAX_FETCH_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15000;
const USER_AGENT = "DADDU-Browser/1.0 (+https://DADDU-ai-assistant)";

export function validateBrowserUrl(raw: string): string {
  const trimmed = raw.trim();
  const withProtocol =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;
  const parsed = new URL(withProtocol);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http and https URLs are allowed.");
  }

  const host = parsed.hostname.toLowerCase();
  const blockedHosts = ["localhost", "127.0.0.1", "0.0.0.0", "::1"];
  if (blockedHosts.includes(host) || host.endsWith(".local")) {
    throw new Error("Local or private network URLs are not allowed.");
  }

  return parsed.toString();
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.trim() || "";
}

function filenameFromUrl(url: string, contentType: string, type?: string): string {
  const pathname = new URL(url).pathname;
  const segment = pathname.split("/").filter(Boolean).pop();
  if (segment && segment.includes(".")) return decodeURIComponent(segment);
  if (type === "image" || contentType.startsWith("image/")) {
    const ext = contentType.split("/")[1]?.split(";")[0] || "jpg";
    return `image.${ext}`;
  }
  return "download";
}

async function fetchUrlBuffer(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, Accept: "*/*" },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const arrayBuffer = await response.arrayBuffer();

    if (arrayBuffer.byteLength > MAX_FETCH_BYTES) {
      throw new Error(`File too large (max ${MAX_FETCH_BYTES / (1024 * 1024)}MB).`);
    }

    return { buffer: Buffer.from(arrayBuffer), contentType };
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchWebPageContent(url: string) {
  const safeUrl = validateBrowserUrl(url);
  const { buffer, contentType } = await fetchUrlBuffer(safeUrl);
  const body = buffer.toString("utf-8");

  if (contentType.includes("text/html")) {
    const text = stripHtml(body);
    return {
      success: true,
      url: safeUrl,
      contentType,
      title: extractTitle(body),
      text: text.slice(0, 50000),
      length: text.length,
      isBinary: false,
    };
  }

  if (contentType.includes("application/json") || contentType.includes("text/plain")) {
    return {
      success: true,
      url: safeUrl,
      contentType,
      title: "",
      text: body.slice(0, 50000),
      length: body.length,
      isBinary: false,
    };
  }

  return {
    success: true,
    url: safeUrl,
    contentType,
    title: "",
    text: "",
    length: buffer.byteLength,
    isBinary: true,
    note: "Binary content detected. Use downloadFromWeb to save this file.",
  };
}

export async function proxyDownload(url: string, type?: string) {
  const safeUrl = validateBrowserUrl(url);
  const { buffer, contentType } = await fetchUrlBuffer(safeUrl);

  if (type === "image" && !contentType.startsWith("image/")) {
    throw new Error("URL does not point to an image file.");
  }

  return {
    success: true,
    url: safeUrl,
    mimeType: contentType,
    filename: filenameFromUrl(safeUrl, contentType, type),
    size: buffer.byteLength,
    base64: buffer.toString("base64"),
  };
}
