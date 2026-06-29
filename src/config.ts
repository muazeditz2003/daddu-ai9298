const API_BASE = import.meta.env.VITE_API_URL || '';
const WS_BASE = import.meta.env.VITE_WS_URL || '';

const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const host = window.location.host;

export const getWsUrl = (): string =>
  WS_BASE || `${protocol}//${host}/ws-live`;

export const apiUrl = (path: string): string =>
  `${API_BASE}${path}`;
