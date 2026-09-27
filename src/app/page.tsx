'use client';

import Link from 'next/link';
import { AppHeader } from '../components/app-header';
import { useState } from 'react';
import { usePWAInstall } from '../hooks/use-pwa-install';
import { motion } from 'framer-motion';

export default function HomePage() {
  const { installationMode, promptInstall } = usePWAInstall();
  const [showInstallInstructions, setShowInstallInstructions] = useState(false);

  async function onInstallClick() {
    if (installationMode === 'ios') {
      setShowInstallInstructions((visible) => !visible);
      return;
    }

    await promptInstall();
  }

  return (
    <>
      <AppHeader />
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-2xl text-center">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-4 font-display text-3xl font-semibold text-parchment sm:text-4xl md:text-5xl"
          >
            La Conquête du Bureau
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-6 text-sm text-parchment-muted sm:text-base md:text-lg"
          >
            Rejoins ton équipe, complète les défis quotidiens et participe aux raids pour conquérir
            les territoires de ton entreprise !
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-8 grid grid-cols-1 gap-4 sm:gap-6"
          >
            <FeatureCard
              icon="🎯"
              title="Défis quotidiens"
              description="Quiz, énigmes, mémoire et réflexe pour gagner de l'énergie pour ton équipe."
              delay={0}
            />
            <FeatureCard
              icon="⚔️"
              title="Raids d'équipe"
              description="Affronte les autres équipes en temps réel pour capturer des territoires."
              delay={0.1}
            />
            <FeatureCard
              icon="🏆"
              title="Duels 1v1"
              description="Défie tes collègues en duel éclair et grimpe dans le classement."
              delay={0.2}
            />
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col gap-3 items-center"
          >
            <div className="flex flex-col gap-3 w-full sm:flex-row sm:gap-4">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
                <Link
                  href="/register"
                  className="block w-full border border-brass bg-brass px-6 py-3 text-center font-medium text-ink transition hover:bg-transparent hover:text-brass sm:px-8"
                >
                  S'inscrire
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
                <Link
                  href="/login"
                  className="block w-full border border-ink-line px-6 py-3 text-center font-medium text-parchment transition hover:border-parchment hover:text-parchment sm:px-8"
                >
                  Se connecter
                </Link>
              </motion.div>
            </div>
            
            {installationMode && (
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onInstallClick}
                aria-expanded={installationMode === 'ios' ? showInstallInstructions : undefined}
                aria-controls={installationMode === 'ios' ? 'ios-install-instructions' : undefined}
                className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 border border-teal bg-teal px-5 py-3 font-medium text-parchment transition hover:border-brass hover:bg-transparent hover:text-brass sm:w-auto"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M5 17v3h14v-3" />
                </svg>
                {installationMode === 'ios' ? 'Installer sur iPhone ou iPad' : 'Installer l’application'}
              </motion.button>
            )}
            {installationMode === 'ios' && showInstallInstructions && (
              <div
                id="ios-install-instructions"
                role="status"
                className="w-full border border-ink-line bg-ink-panel px-4 py-3 text-left text-sm sm:max-w-md"
              >
                <p className="font-medium text-parchment">Ajouter à l’écran d’accueil</p>
                <p className="mt-1 text-parchment-muted">
                  Ouvre cette page dans Safari, touche <span className="text-parchment">Partager</span>, puis{' '}
                  <span className="text-parchment">Sur l’écran d’accueil</span>.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </>
  );
}

function FeatureCard({ icon, title, description, delay }: { icon: string; title: string; description: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02, borderColor: '#C9A227' }}
      className="border border-ink-line bg-ink-panel px-4 py-3 text-left transition sm:px-5 sm:py-4"
    >
      <motion.div 
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: delay + 0.2 }}
        className="mb-2 text-2xl sm:text-3xl"
      >
        {icon}
      </motion.div>
      <h3 className="mb-1 font-display text-sm text-parchment sm:text-base">{title}</h3>
      <p className="text-xs text-parchment-muted leading-relaxed">{description}</p>
    </motion.div>
  );
}