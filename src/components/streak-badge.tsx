'use client';

import { motion } from 'framer-motion';

interface StreakBadgeProps {
  count: number;
  max?: number;
}

export function StreakBadge({ count, max = 7 }: StreakBadgeProps) {
  if (count === 0) return null;

  const fireColors = ['#FF6B35', '#F7931E', '#FFD700', '#FF4500'];
  const color = fireColors[Math.min(count - 1, fireColors.length - 1)];

  return (
    <motion.div
      className="flex items-center gap-2 rounded-full border border-brass/30 bg-brass/10 px-3 py-1.5"
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
    >
      <motion.span
        className="text-xl"
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, -10, 10, 0],
        }}
        transition={{
          duration: 0.5,
          repeat: Infinity,
          repeatDelay: 2,
        }}
      >
        🔥
      </motion.span>
      <span className="font-display text-sm font-bold text-brass">
        {count} {count === 1 ? 'jour' : 'jours'}
      </span>
      {max && count >= max && (
        <motion.span
          className="text-xs text-teal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Max !
        </motion.span>
      )}
    </motion.div>
  );
}

interface StreakProgressProps {
  current: number;
  max: number;
}

export function StreakProgress({ current, max }: StreakProgressProps) {
  const percentage = (current / max) * 100;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-ink-line rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-orange-500 via-yellow-500 to-red-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      <span className="font-mono text-xs text-parchment-muted">
        {current}/{max}
      </span>
    </div>
  );
}
