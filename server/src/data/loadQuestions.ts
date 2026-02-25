import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Question, BigGameQuestion } from 'shared';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface QuestionsData {
  rounds: Question[];
  bigGame: BigGameQuestion[];
}

export function loadQuestions(): QuestionsData {
  const raw = readFileSync(join(__dirname, 'questions.json'), 'utf-8');
  return JSON.parse(raw);
}
