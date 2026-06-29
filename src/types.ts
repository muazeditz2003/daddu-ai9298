export type ConnectionStatus = "disconnected" | "connecting" | "listening" | "speaking";

export interface ToolCallLog {
  id: string;
  name: string;
  args: any;
  timestamp: Date;
  status: "pending" | "success" | "error";
  result?: any;
}

export interface NotificationMsg {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
}

export interface VoiceOption {
  id: string;
  name: string;
  description: string;
}
