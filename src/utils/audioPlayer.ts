function base64ToFloat32(base64: string): Float32Array {
  const binary = window.atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  
  // 16-bit PCM has 2 bytes per sample
  const numSamples = len / 2;
  const floats = new Float32Array(numSamples);
  const dataView = new DataView(bytes.buffer);
  
  for (let i = 0; i < numSamples; i++) {
    const intSample = dataView.getInt16(i * 2, true); // true = little-endian
    floats[i] = intSample / 32768; // normalize to -1.0 to 1.0
  }
  return floats;
}

export class AudioPlayer {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private nextStartTime: number = 0;
  private sampleRate: number = 24000; // Gemini output rate is 24kHz
  private sourceNodes: AudioBufferSourceNode[] = [];
  private onVolumeChange?: (volume: number) => void;
  private analyserInterval: any = null;

  constructor(onVolumeChange?: (volume: number) => void) {
    this.onVolumeChange = onVolumeChange;
  }

  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.sampleRate,
      });
      
      // Setup Analyser Node for visualizing DADDU's speech output
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 32;
      this.analyser.connect(this.audioCtx.destination);
      
      this.nextStartTime = this.audioCtx.currentTime;

      // Start volume analysis polling
      if (this.onVolumeChange) {
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        this.analyserInterval = setInterval(() => {
          if (this.analyser && this.audioCtx && this.audioCtx.state === "running") {
            this.analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
            }
            const average = sum / bufferLength;
            this.onVolumeChange!(average / 255); // Normalize to 0-1 range
          }
        }, 30);
      }
    }
  }

  playChunk(base64Data: string) {
    this.init();
    const ctx = this.audioCtx!;
    
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const floats = base64ToFloat32(base64Data);
    if (floats.length === 0) return;

    const audioBuffer = ctx.createBuffer(1, floats.length, this.sampleRate);
    audioBuffer.getChannelData(0).set(floats);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    
    // Connect through analyser for real-time visual output feedback
    if (this.analyser) {
      source.connect(this.analyser);
    } else {
      source.connect(ctx.destination);
    }

    const now = ctx.currentTime;
    let startTime = this.nextStartTime;
    if (startTime < now) {
      startTime = now + 0.05; // 50ms buffer for stability/smooth splicing
    }

    source.start(startTime);
    this.nextStartTime = startTime + audioBuffer.duration;
    this.sourceNodes.push(source);

    // Clean up nodes once finished playing
    source.onended = () => {
      const idx = this.sourceNodes.indexOf(source);
      if (idx !== -1) {
        this.sourceNodes.splice(idx, 1);
      }
    };
  }

  isPlaying(): boolean {
    if (!this.audioCtx) return false;
    const now = this.audioCtx.currentTime;
    return this.sourceNodes.length > 0 || this.nextStartTime > now + 0.05;
  }

  waitUntilIdle(pollMs = 50): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        if (!this.isPlaying()) {
          resolve();
        } else {
          setTimeout(check, pollMs);
        }
      };
      check();
    });
  }

  stop() {
    this.sourceNodes.forEach((node) => {
      try {
        node.stop();
      } catch (e) { /* already stopped */ }
    });
    this.sourceNodes = [];
    if (this.audioCtx) {
      this.nextStartTime = this.audioCtx.currentTime;
    }
    if (this.onVolumeChange) {
      this.onVolumeChange(0);
    }
  }

  close() {
    this.stop();
    if (this.analyserInterval) {
      clearInterval(this.analyserInterval);
      this.analyserInterval = null;
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch (e) { /* ignored */ }
      this.audioCtx = null;
      this.analyser = null;
    }
  }
}
