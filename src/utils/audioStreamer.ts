function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  let offset = 0;
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true); // true = little-endian
  }
  return buffer;
}

function base64ArrayBuffer(arrayBuffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function resample(input: Float32Array, inputSampleRate: number, outputSampleRate: number): Float32Array {
  if (inputSampleRate === outputSampleRate) {
    return input;
  }
  const ratio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(input.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const nextOffset = i * ratio;
    const index = Math.floor(nextOffset);
    const interpolationFraction = nextOffset - index;
    const sample1 = input[index];
    const sample2 = index + 1 < input.length ? input[index + 1] : sample1;
    result[i] = sample1 + (sample2 - sample1) * interpolationFraction;
  }
  return result;
}

export class AudioStreamer {
  private audioCtx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private onAudioCallback: (base64Pcm: string) => void;
  private onVolumeChange?: (volume: number) => void;

  constructor(onAudioCallback: (base64Pcm: string) => void, onVolumeChange?: (volume: number) => void) {
    this.onAudioCallback = onAudioCallback;
    this.onVolumeChange = onVolumeChange;
  }

  async start() {
    // Request permission and capture mic
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    // Create AudioContext at native hardware sample rate to avoid browser conversion issues
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

    if (this.audioCtx.state === "suspended") {
      await this.audioCtx.resume();
    }

    this.source = this.audioCtx.createMediaStreamSource(this.stream);
    
    // ScriptProcessor is widely supported for real-time sound analysis
    this.processor = this.audioCtx.createScriptProcessor(2048, 1, 1);

    this.processor.onaudioprocess = (e) => {
      if (!this.audioCtx) return;
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate real-time root-mean-square (RMS) for microphone volume visualization
      if (this.onVolumeChange) {
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        this.onVolumeChange(rms); // value between 0 and 1
      }

      // Resample native input rate to 16kHz for Gemini compatibility
      const inputSampleRate = this.audioCtx.sampleRate;
      const resampledData = resample(inputData, inputSampleRate, 16000);

      // Convert Float32 to 16-bit PCM little-endian
      const pcmBuffer = floatTo16BitPCM(resampledData);
      const base64 = base64ArrayBuffer(pcmBuffer);
      this.onAudioCallback(base64);
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioCtx.destination);
  }

  stop() {
    if (this.processor) {
      try {
        this.processor.disconnect();
      } catch (e) { /* ignored */ }
      this.processor.onaudioprocess = null;
      this.processor = null;
    }
    if (this.source) {
      try {
        this.source.disconnect();
      } catch (e) { /* ignored */ }
      this.source = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) { /* ignored */ }
      });
      this.stream = null;
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch (e) { /* ignored */ }
      this.audioCtx = null;
    }
    
    if (this.onVolumeChange) {
      this.onVolumeChange(0);
    }
  }
}
