/**
 * Serializes notification TTS and agent live speech so they never overlap.
 * If one source is speaking, the other waits until it finishes.
 */
class TtsCoordinator {
  private notificationChain: Promise<void> = Promise.resolve();
  private notificationSpeaking = false;
  private agentSpeaking = false;
  private agentIdleWaiters: Array<() => void> = [];

  get isNotificationSpeaking(): boolean {
    return this.notificationSpeaking;
  }

  get isAgentSpeaking(): boolean {
    return this.agentSpeaking;
  }

  isAnySpeaking(): boolean {
    return this.notificationSpeaking || this.agentSpeaking;
  }

  notifyAgentSpeechStart(): void {
    if (!this.agentSpeaking) {
      this.agentSpeaking = true;
    }
  }

  notifyAgentSpeechEnd(): void {
    if (!this.agentSpeaking) return;
    this.agentSpeaking = false;
    const waiters = this.agentIdleWaiters.splice(0);
    waiters.forEach((resolve) => resolve());
  }

  waitForAgentIdle(): Promise<void> {
    if (!this.agentSpeaking) return Promise.resolve();
    return new Promise((resolve) => {
      this.agentIdleWaiters.push(resolve);
    });
  }

  /** Queue notification TTS; waits for agent speech to finish first. */
  enqueueNotification(speak: () => Promise<void>): Promise<void> {
    const task = this.notificationChain.then(async () => {
      await this.waitForAgentIdle();
      this.notificationSpeaking = true;
      try {
        await speak();
      } finally {
        this.notificationSpeaking = false;
      }
    });

    this.notificationChain = task.catch(() => {});
    return task;
  }
}

export const ttsCoordinator = new TtsCoordinator();
