import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { GameState } from 'shared';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_DIR = join(__dirname, '../../roomstates');

try { mkdirSync(STATE_DIR, { recursive: true }); } catch { /* ignore */ }

export function persist(roomId: string, state: GameState) {
  try {
    writeFileSync(join(STATE_DIR, `${roomId}.json`), JSON.stringify(state, null, 2));
  } catch {
    // Silently ignore persistence errors
  }
}
