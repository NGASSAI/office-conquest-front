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
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-ink-line text-base text-parchment-muted transition hover:border-brass hover:text-brass"
        aria-label="Aide"
        aria-expanded={isOpen}
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
              className="fixed inset-0 z-40 bg-black/60"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
              role="dialog"
              aria-modal="true"
              aria-label={title}
              className="fixed left-1/2 top-1/2 z-50 max-h-[min(80dvh,40rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto border border-ink-line bg-ink-panel p-5 shadow-lg sm:p-6"
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
                type="button"
                onClick={() => setIsOpen(false)}
                className="mt-4 min-h-10 px-2 text-sm text-brass hover:underline"
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
