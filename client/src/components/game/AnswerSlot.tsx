import { motion, AnimatePresence } from 'framer-motion';
import type { Answer } from 'shared';

interface Props {
  answer: Answer;
  showPoints?: boolean;
}

export function AnswerSlot({ answer, showPoints = true }: Props) {
  return (
    <div className="relative h-12 perspective-500">
      <AnimatePresence mode="wait">
        {answer.isRevealed ? (
          <motion.div
            key="revealed"
            initial={{ rotateX: 90 }}
            animate={{ rotateX: 0 }}
            exit={{ rotateX: -90 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="absolute inset-0 flex items-center justify-between px-4 bg-gradient-to-r from-correct/90 to-correct/80 rounded-xl text-white shadow-md"
          >
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 flex items-center justify-center rounded-full bg-white/20 text-sm font-bold">
                {answer.id}
              </span>
              <span className="font-semibold">{answer.text}</span>
            </div>
            {showPoints && (
              <span className="font-bold text-lg">{answer.points}</span>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="hidden"
            initial={{ rotateX: -90 }}
            animate={{ rotateX: 0 }}
            exit={{ rotateX: 90 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex items-center justify-between px-4 bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl text-white shadow-md"
          >
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 flex items-center justify-center rounded-full bg-white/20 text-sm font-bold">
                {answer.id}
              </span>
              <span className="font-semibold tracking-wider">• • •</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
