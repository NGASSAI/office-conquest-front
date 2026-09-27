'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HelpButtonProps {
  title: string;
  content: string | string[];
}

export function HelpButton({ title, content }: HelpButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const contentArray = Array.isArray(content) ? content : [content];

  return (
    <div className="relative inline-block">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-6 w-6 items-center justify-center rounded border border-ink-line text-xs text-parchment-muted transition hover:border-brass hover:text-brass"
        aria-label="Aide"
      >
        ?
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-8 z-20 w-72 border border-ink-line bg-ink-panel p-4 shadow-lg"
            >
              <h4 className="mb-2 font-display text-sm text-parchment">{title}</h4>
              <div className="space-y-2 text-xs text-parchment-muted">
                {contentArray.map((line, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.05 }}
                  >
                    {line}
                  </motion.p>
                ))}
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(false)}
                className="mt-3 text-xs text-brass hover:underline"
              >
                Fermer
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
