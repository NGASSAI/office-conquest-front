'use client';

import { useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';

interface ConfettiProps {
  trigger?: boolean;
  duration?: number;
  particleCount?: number;
}

export function Confetti({ trigger = false, duration = 3000, particleCount = 50 }: ConfettiProps) {
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (trigger) {
      controls.start('visible');
      const timer = setTimeout(() => controls.start('hidden'), duration);
      return () => clearTimeout(timer);
    }
  }, [trigger, controls, duration]);

  const colors = ['#C9A227', '#2F6F6B', '#EDEAE0', '#B4462F', '#26314A'];
  const particles = Array.from({ length: particleCount }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100 - 50,
    rotation: Math.random() * 360,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: Math.random() * 8 + 4,
    delay: Math.random() * 0.5,
  }));

  return (
    <motion.div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      initial="hidden"
      animate={controls}
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      }}
    >
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            backgroundColor: particle.color,
            width: particle.size,
            height: particle.size,
          }}
          variants={{
            hidden: {
              y: '-10vh',
              rotate: 0,
              opacity: 0,
              scale: 0,
            },
            visible: {
              y: '110vh',
              rotate: particle.rotation,
              opacity: [0, 1, 1, 0],
              scale: [0, 1, 1, 0.5],
              transition: {
                duration: 2 + Math.random(),
                delay: particle.delay,
                ease: 'easeOut',
              },
            },
          }}
        />
      ))}
    </motion.div>
  );
}
