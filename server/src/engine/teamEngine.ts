export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function splitIntoTeams(playerIds: string[]): { team1: string[]; team2: string[] } {
  const shuffled = shuffleArray(playerIds);
  const half = Math.ceil(shuffled.length / 2);
  return {
    team1: shuffled.slice(0, half),
    team2: shuffled.slice(half),
  };
}
