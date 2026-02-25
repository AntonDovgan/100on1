export type TeamId = 'team1' | 'team2';

export interface Player {
  id: string;
  name: string;
  teamId: TeamId | null;
  isConnected: boolean;
  joinedAt: number;
}

export interface Team {
  id: TeamId;
  name: string;
  score: number;
  players: string[];
}
