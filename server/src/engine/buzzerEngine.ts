import type { TeamId } from 'shared';

export class BuzzerEngine {
  private isOpen = false;
  private winner: TeamId | null = null;

  open() {
    this.isOpen = true;
    this.winner = null;
  }

  close() {
    this.isOpen = false;
  }

  tryBuzz(teamId: TeamId): TeamId | null {
    if (!this.isOpen || this.winner) return null;
    this.winner = teamId;
    this.isOpen = false;
    return teamId;
  }

  getWinner(): TeamId | null {
    return this.winner;
  }

  isActive(): boolean {
    return this.isOpen;
  }

  reset() {
    this.isOpen = false;
    this.winner = null;
  }
}
