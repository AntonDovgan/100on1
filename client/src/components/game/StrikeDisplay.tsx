import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  strikes: number;
}

export function StrikeDisplay({ strikes }: Props) {
  if (strikes === 0) return null;

  return (
    <div className="flex justify-center gap-4 py-2">
      <AnimatePresence>
        {Array.from({ length: strikes }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-wrong text-white text-2xl font-bold shadow-lg"
          >
            ✕
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
