'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { EndlessRunner } from '../../../components/endless-runner';
import { offlineStorage } from '../../../lib/offline-storage';
import { AppHeader } from '../../../components/app-header';
import { Confetti } from '../../../components/confetti';
import { api } from '../../../lib/api';

interface OfflineGameData {
  highScore: number;
  totalGames: number;
  totalDistance: number;
  lastPlayed: string;
  achievements: string[];
}

export default function SoloGamePage() {
  const [gameData, setGameData] = useState<OfflineGameData | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    loadGameData();
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  async function loadGameData() {
    try {
      const data = await offlineStorage.getGameData();
      setGameData(data);
    } catch (error) {
      console.error('Failed to load offline game data:', error);
    }
  }

  async function handleGameOver(score: number, distance: number) {
    const isHighScore = score > (gameData?.highScore || 0);
    
    const newGameData: OfflineGameData = {
      highScore: Math.max(gameData?.highScore || 0, score),
      totalGames: (gameData?.totalGames || 0) + 1,
      totalDistance: (gameData?.totalDistance || 0) + distance,
      lastPlayed: new Date().toISOString(),
      achievements: gameData?.achievements || [],
    };

    // Sauvegarder localement
    await offlineStorage.saveGameData(newGameData);
    setGameData(newGameData);

    // Nouveau high score - déclencher le confetti de manière asynchrone
    if (isHighScore) {
      setTimeout(() => {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }, 0);
    }

    // Sync avec le serveur si connecté
    if (isOnline) {
      try {
        await api.post('/users/solo-game-sync', {
          score,
          distance,
          highScore: newGameData.highScore,
          totalGames: newGameData.totalGames,
          totalDistance: newGameData.totalDistance,
        });
      } catch (error) {
        console.error('Failed to sync with server:', error);
        // L'erreur n'empêche pas de continuer à jouer
      }
    }
  }

  async function syncToServer() {
    if (!gameData || !isOnline) return;
    
    try {
      await api.post('/users/solo-game-sync', {
        highScore: gameData.highScore,
        totalGames: gameData.totalGames,
        totalDistance: gameData.totalDistance,
        lastPlayed: gameData.lastPlayed,
      });
    } catch (error) {
      console.error('Failed to sync with server:', error);
    }
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="mb-1 text-3xl font-semibold text-parchment">Le Bureau Infini</h1>
            <p className="text-sm text-parchment-muted">
              Mode solo hors-ligne · Joue n&apos;importe où, n&apos;importe quand
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-parchment-muted hover:text-brass">
              ← Retour
            </Link>
            {!isOnline && (
              <span className="flex items-center gap-2 text-xs text-parchment-muted">
                <span className="h-2 w-2 rounded-full bg-danger" />
                Hors-ligne
              </span>
            )}
            {isOnline && gameData && (
              <button
                onClick={syncToServer}
                className="text-xs text-teal hover:text-brass"
              >
                Sync ↻
              </button>
            )}
          </div>
        </div>

        {/* Stats Panel */}
        {gameData && (
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="border border-ink-line bg-ink-panel px-4 py-3 text-center">
              <p className="font-mono text-2xl text-brass">{gameData.highScore}</p>
              <p className="text-xs text-parchment-muted">Meilleur score</p>
            </div>
            <div className="border border-ink-line bg-ink-panel px-4 py-3 text-center">
              <p className="font-mono text-2xl text-teal">{gameData.totalGames}</p>
              <p className="text-xs text-parchment-muted">Parties jouées</p>
            </div>
            <div className="border border-ink-line bg-ink-panel px-4 py-3 text-center">
              <p className="font-mono text-2xl text-parchment">{Math.floor(gameData.totalDistance)}m</p>
              <p className="text-xs text-parchment-muted">Distance totale</p>
            </div>
            <div className="border border-ink-line bg-ink-panel px-4 py-3 text-center">
              <p className="font-mono text-2xl text-parchment-muted">
                {gameData.achievements.length}
              </p>
              <p className="text-xs text-parchment-muted">Succès</p>
            </div>
          </div>
        )}

        {/* Game Area */}
        <div className="border border-ink-line bg-ink-panel px-4 py-6 sm:px-6 sm:py-8">
          <EndlessRunner 
            onGameOver={handleGameOver}
          />
        </div>

        {/* Instructions */}
        <div className="mt-6 border border-ink-line px-4 py-4 text-sm text-parchment-muted">
          <h3 className="mb-2 font-display text-parchment">Comment jouer</h3>
          <ul className="list-inside list-disc space-y-1">
            <li>Appuie sur ESPACE ou clique pour sauter</li>
            <li>Évite les obstacles : 🖨️ imprimante, ☕ café renversé, 😰 collègue stressé</li>
            <li>Collecte les objets : 📄 documents, ☕ café, 🖊️ stylos</li>
            <li>La vitesse augmente progressivement</li>
            <li>Tes statistiques sont sauvegardées localement</li>
            <li>En ligne, tes stats sont synchronisées avec le serveur</li>
          </ul>
        </div>
      </main>
      <Confetti trigger={showConfetti} />
    </>
  );
}
