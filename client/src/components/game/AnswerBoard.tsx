import type { Answer } from 'shared';
import { AnswerSlot } from './AnswerSlot.js';

interface Props {
  answers: Answer[];
  showPoints?: boolean;
}

export function AnswerBoard({ answers, showPoints = true }: Props) {
  return (
    <div className="space-y-2 w-full">
      {answers.map((answer) => (
        <AnswerSlot key={answer.id} answer={answer} showPoints={showPoints} />
      ))}
    </div>
  );
}
