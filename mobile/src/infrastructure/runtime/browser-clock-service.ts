import type { ClockService } from "../../core/contracts/services";

export class BrowserClockService implements ClockService {
  private timerHandle: number | null = null;
  private lastTickAt = 0;

  constructor(private readonly intervalMs = 1_000) {}

  now(): number {
    return Date.now();
  }

  start(onTick: (deltaMs: number, now: number) => void): void {
    this.stop();

    this.lastTickAt = this.now();
    this.timerHandle = window.setInterval(() => {
      const now = this.now();
      const deltaMs = Math.max(1, now - this.lastTickAt);
      this.lastTickAt = now;
      onTick(deltaMs, now);
    }, this.intervalMs);
  }

  stop(): void {
    if (this.timerHandle !== null) {
      window.clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }
}
