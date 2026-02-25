export class TimerEngine {
  private interval: ReturnType<typeof setInterval> | null = null;
  private secondsLeft = 0;
  private onTick: ((secondsLeft: number) => void) | null = null;
  private onExpired: (() => void) | null = null;

  start(seconds: number, onTick: (secondsLeft: number) => void, onExpired: () => void) {
    this.stop();
    this.secondsLeft = seconds;
    this.onTick = onTick;
    this.onExpired = onExpired;

    this.interval = setInterval(() => {
      this.secondsLeft -= 1;
      if (this.onTick) this.onTick(this.secondsLeft);
      if (this.secondsLeft <= 0) {
        this.stop();
        if (this.onExpired) this.onExpired();
      }
    }, 1000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  getSecondsLeft(): number {
    return this.secondsLeft;
  }
}
