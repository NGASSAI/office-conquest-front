'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

interface Obstacle {
  id: number;
  x: number;
  y: number;
  type: 'printer' | 'coffee' | 'stressed-colleague';
}

interface Collectible {
  id: number;
  x: number;
  y: number;
  type: 'document' | 'coffee-cup' | 'pen';
  collected: boolean;
}

interface EndlessRunnerProps {
  onGameOver?: (score: number, distance: number) => void;
  onScoreUpdate?: (score: number) => void;
}

export function EndlessRunner({ onGameOver, onScoreUpdate }: EndlessRunnerProps) {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(5);
  const [playerY, setPlayerY] = useState(50);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  
  const gameLoopRef = useRef<number | undefined>(undefined);
  const obstacleIdRef = useRef(0);
  const collectibleIdRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const distanceRef = useRef(0);

  const PLAYER_HEIGHT = 60;
  const PLAYER_WIDTH = 40;
  const CANVAS_HEIGHT = 400;
  const CANVAS_WIDTH = 600;

  const spawnObstacle = useCallback(() => {
    const types: Obstacle['type'][] = ['printer', 'coffee', 'stressed-colleague'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    setObstacles(prev => [...prev, {
      id: obstacleIdRef.current++,
      x: CANVAS_WIDTH,
      y: Math.random() * (CANVAS_HEIGHT - PLAYER_HEIGHT - 50) + 25,
      type,
    }]);
  }, []);

  const spawnCollectible = useCallback(() => {
    const types: Collectible['type'][] = ['document', 'coffee-cup', 'pen'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    setCollectibles(prev => [...prev, {
      id: collectibleIdRef.current++,
      x: CANVAS_WIDTH,
      y: Math.random() * (CANVAS_HEIGHT - PLAYER_HEIGHT - 50) + 25,
      type,
      collected: false,
    }]);
  }, []);

  const jump = useCallback(() => {
    if (gameState !== 'playing') return;
    setPlayerY(prev => Math.max(20, prev - 80));
    setTimeout(() => {
      setPlayerY(prev => Math.min(CANVAS_HEIGHT - PLAYER_HEIGHT - 20, prev + 80));
    }, 300);
  }, [gameState]);

  const startGame = useCallback(() => {
    setGameState('playing');
    setScore(0);
    setDistance(0);
    setSpeed(5);
    setPlayerY(50);
    setObstacles([]);
    setCollectibles([]);
    obstacleIdRef.current = 0;
    collectibleIdRef.current = 0;
    lastSpawnRef.current = 0;
    distanceRef.current = 0;
  }, []);

  const pauseGame = useCallback(() => {
    setGameState('paused');
  }, []);

  const resumeGame = useCallback(() => {
    setGameState('playing');
  }, []);

  const endGame = useCallback(() => {
    setGameState('gameover');
    onGameOver?.(score, distance);
  }, [score, distance, onGameOver]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      return;
    }

    const gameLoop = (timestamp: number) => {
      setDistance(prev => {
        const newDistance = prev + speed * 0.1;
        distanceRef.current = newDistance;
        
        // Augmenter la vitesse progressivement
        if (newDistance > 0 && newDistance % 100 < 1) {
          setSpeed(s => Math.min(15, s + 0.5));
        }
        
        return newDistance;
      });

      // Spawn obstacles
      if (timestamp - lastSpawnRef.current > 2000 / (speed / 5)) {
        spawnObstacle();
        lastSpawnRef.current = timestamp;
      }

      // Spawn collectibles
      if (Math.random() < 0.02) {
        spawnCollectible();
      }

      // Move obstacles
      setObstacles(prev => {
        const filtered = prev.filter(obs => obs.x > -50);
        return filtered.map(obs => ({ ...obs, x: obs.x - speed }));
      });

      // Move collectibles
      setCollectibles(prev => {
        const filtered = prev.filter(col => col.x > -50 && !col.collected);
        return filtered.map(col => ({ ...col, x: col.x - speed }));
      });

      // Collision detection
      setObstacles(prev => {
        for (const obs of prev) {
          if (
            obs.x < 100 &&
            obs.x > 60 &&
            Math.abs(obs.y - playerY) < PLAYER_HEIGHT
          ) {
            endGame();
            return prev;
          }
        }
        return prev;
      });

      // Collectible detection
      setCollectibles(prev => {
        let newScore = score;
        const updated = prev.map(col => {
          if (
            !col.collected &&
            col.x < 100 &&
            col.x > 60 &&
            Math.abs(col.y - playerY) < PLAYER_HEIGHT
          ) {
            newScore += 10;
            onScoreUpdate?.(newScore);
            return { ...col, collected: true };
          }
          return col;
        });
        setScore(newScore);
        return updated;
      });

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, speed, playerY, score, spawnObstacle, spawnCollectible, endGame, onScoreUpdate]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (gameState === 'menu' || gameState === 'gameover') {
          startGame();
        } else if (gameState === 'playing') {
          jump();
        } else if (gameState === 'paused') {
          resumeGame();
        }
      }
      if (e.code === 'Escape' && gameState === 'playing') {
        pauseGame();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState, startGame, jump, pauseGame, resumeGame]);

  const getEmoji = (type: Obstacle['type'] | Collectible['type']) => {
    const emojis: Record<string, string> = {
      printer: '🖨️',
      coffee: '☕',
      'stressed-colleague': '😰',
      document: '📄',
      'coffee-cup': '☕',
      pen: '🖊️',
    };
    return emojis[type] || '❓';
  };

  if (gameState === 'menu') {
    return (
      <div className="flex flex-col items-center justify-center gap-6 p-8 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-6xl"
        >
          🏃‍♂️
        </motion.div>
        <h2 className="font-display text-2xl text-parchment">Le Bureau Infini</h2>
        <p className="text-sm text-parchment-muted max-w-md">
          Évite les obstacles du bureau et collecte les objets utiles !<br />
          Appuie sur ESPACE ou clique pour sauter.
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={startGame}
          className="border border-brass bg-brass px-8 py-3 font-medium text-ink transition hover:bg-transparent hover:text-brass"
        >
          Commencer
        </motion.button>
      </div>
    );
  }

  if (gameState === 'paused') {
    return (
      <div className="flex flex-col items-center justify-center gap-6 p-8 text-center">
        <h2 className="font-display text-2xl text-parchment">Pause</h2>
        <p className="text-sm text-parchment-muted">Score: {score} · Distance: {Math.floor(distance)}m</p>
        <div className="flex gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={resumeGame}
            className="border border-brass bg-brass px-6 py-2 font-medium text-ink transition hover:bg-transparent hover:text-brass"
          >
            Reprendre
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={endGame}
            className="border border-ink-line px-6 py-2 text-parchment transition hover:border-brass hover:text-brass"
          >
            Quitter
          </motion.button>
        </div>
      </div>
    );
  }

  if (gameState === 'gameover') {
    return (
      <div className="flex flex-col items-center justify-center gap-6 p-8 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-6xl"
        >
          😵
        </motion.div>
        <h2 className="font-display text-2xl text-parchment">Game Over!</h2>
        <div className="space-y-2">
          <p className="font-mono text-lg text-brass">Score: {score}</p>
          <p className="text-sm text-parchment-muted">Distance: {Math.floor(distance)}m</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={startGame}
          className="border border-brass bg-brass px-8 py-3 font-medium text-ink transition hover:bg-transparent hover:text-brass"
        >
          Rejouer
        </motion.button>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Header */}
      <div className="mb-4 flex justify-between font-mono text-sm">
        <span className="text-parchment">Score: {score}</span>
        <span className="text-parchment-muted">{Math.floor(distance)}m</span>
        <button
          onClick={pauseGame}
          className="text-parchment-muted hover:text-brass"
        >
          ⏸️
        </button>
      </div>

      {/* Game Canvas */}
      <div
        className="relative mx-auto h-[400px] w-full max-w-[600px] overflow-hidden rounded-lg border-2 border-ink-line bg-ink-panel"
        onClick={jump}
        role="button"
        tabIndex={0}
      >
        {/* Player */}
        <motion.div
          className="absolute left-16 flex h-[60px] w-[40px] items-center justify-center text-4xl"
          style={{ top: `${playerY}px` }}
          animate={{ y: playerY }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          🏃‍♂️
        </motion.div>

        {/* Obstacles */}
        {obstacles.map(obs => (
          <div
            key={obs.id}
            className="absolute flex h-[50px] w-[50px] items-center justify-center text-3xl"
            style={{ left: `${obs.x}px`, top: `${obs.y}px` }}
          >
            {getEmoji(obs.type)}
          </div>
        ))}

        {/* Collectibles */}
        {collectibles.map(col => (
          <motion.div
            key={col.id}
            className="absolute flex h-[30px] w-[30px] items-center justify-center text-2xl"
            style={{ left: `${col.x}px`, top: `${col.y}px` }}
            animate={col.collected ? { scale: 0, opacity: 0 } : { scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            {getEmoji(col.type)}
          </motion.div>
        ))}

        {/* Floor line */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-brass" />
      </div>

      {/* Instructions */}
      <p className="mt-4 text-center text-xs text-parchment-muted">
        ESPACE ou clic pour sauter · ÉCHAP pour pause
      </p>
    </div>
  );
}
