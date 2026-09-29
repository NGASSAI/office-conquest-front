'use client';

import { motion } from 'framer-motion';

interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
  showLabel?: boolean;
  animated?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ProgressBar({
  value,
  max,
  color = '#2F6F6B',
  showLabel = false,
  animated = true,
  size = 'md',
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const heights = { sm: 'h-1', md: 'h-2', lg: 'h-3' };

  return (
    <div className={`w-full ${heights[size]} bg-ink-line rounded-full overflow-hidden`}>
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: animated ? 0.8 : 0, ease: 'easeOut' }}
      >
        {showLabel && percentage > 10 && (
          <motion.span
            className="flex h-full items-center justify-center text-xs font-medium text-ink"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {Math.round(percentage)}%
          </motion.span>
        )}
      </motion.div>
    </div>
  );
}

interface LevelUpProps {
  level: number;
  showAnimation?: boolean;
}

export function LevelUp({ level, showAnimation = true }: LevelUpProps) {
  if (!showAnimation) return null;

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-ink/80"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration: 2, times: [0, 0.1, 0.8, 1] }}
    >
      <motion.div
        className="text-center"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: [0, 1.2, 1], rotate: [ -180, 10, 0] }}
        transition={{ duration: 1, ease: 'easeOut' }}
      >
        <motion.div
          className="mb-4 text-6xl"
          animate={{ 
            scale: [1, 1.5, 1],
            rotate: [0, 360, 0],
          }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
        >
          🎉
        </motion.div>
        <motion.h2
          className="font-display text-4xl font-bold text-brass"
          animate={{ 
            textShadow: [
              '0 0 20px rgba(201, 162, 39, 0)',
              '0 0 40px rgba(201, 162, 39, 0.8)',
              '0 0 20px rgba(201, 162, 39, 0)',
            ],
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Niveau {level}
        </motion.h2>
        <motion.p
          className="mt-2 text-parchment"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          Félicitations !
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
