export type ScreenFrame = {
  data: string;
  mimeType: string;
};

export class ScreenVision {
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private onFrame: (frame: ScreenFrame) => void;
  private onStop?: () => void;

  constructor(onFrame: (frame: ScreenFrame) => void, onStop?: () => void) {
    this.onFrame = onFrame;
    this.onStop = onStop;
    this.canvas = document.createElement("canvas");
  }

  get isActive(): boolean {
    return Boolean(this.stream);
  }

  async start(): Promise<void> {
    if (this.stream) return;

    this.stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 5 },
      audio: false,
    });

    this.video = document.createElement("video");
    this.video.srcObject = this.stream;
    this.video.muted = true;
    this.video.playsInline = true;
    await this.video.play();

    const track = this.stream.getVideoTracks()[0];
    track?.addEventListener("ended", () => this.stop());

    await this.waitForVideoReady();
    this.captureAndSend();
    this.intervalId = setInterval(() => this.captureAndSend(), 2500);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.video = null;
    this.onStop?.();
  }

  captureNow(): ScreenFrame | null {
    return this.grabFrame();
  }

  private waitForVideoReady(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.video) {
        resolve();
        return;
      }
      if (this.video.videoWidth > 0) {
        resolve();
        return;
      }
      this.video.onloadeddata = () => resolve();
    });
  }

  private grabFrame(): ScreenFrame | null {
    if (!this.video) return null;

    const width = this.video.videoWidth;
    const height = this.video.videoHeight;
    if (!width || !height) return null;

    const scale = Math.min(1, 1280 / width);
    this.canvas.width = Math.round(width * scale);
    this.canvas.height = Math.round(height * scale);

    const ctx = this.canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
    const dataUrl = this.canvas.toDataURL("image/jpeg", 0.65);
    const base64 = dataUrl.split(",")[1];
    if (!base64) return null;

    return { data: base64, mimeType: "image/jpeg" };
  }

  private captureAndSend() {
    const frame = this.grabFrame();
    if (frame) this.onFrame(frame);
  }
}
