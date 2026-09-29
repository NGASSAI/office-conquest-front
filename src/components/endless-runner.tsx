'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

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
  const [speed, setSpeed] = useState(3);
  const [playerY, setPlayerY] = useState(50);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 400 });
  
  const gameLoopRef = useRef<number | undefined>(undefined);
  const obstacleIdRef = useRef(0);
  const collectibleIdRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const distanceRef = useRef(0);
  const canvasRef = useRef<HTMLDivElement>(null);

  const PLAYER_HEIGHT = 50;
  const PLAYER_WIDTH = 35;

  // Responsive canvas size
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };
    
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  const spawnObstacle = useCallback(() => {
    const types: Obstacle['type'][] = ['printer', 'coffee', 'stressed-colleague'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    setObstacles(prev => [...prev, {
      id: obstacleIdRef.current++,
      x: canvasSize.width,
      y: Math.random() * (canvasSize.height - PLAYER_HEIGHT - 60) + 30,
      type,
    }]);
  }, [canvasSize.width, canvasSize.height]);

  const spawnCollectible = useCallback(() => {
    const types: Collectible['type'][] = ['document', 'coffee-cup', 'pen'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    setCollectibles(prev => [...prev, {
      id: collectibleIdRef.current++,
      x: canvasSize.width,
      y: Math.random() * (canvasSize.height - PLAYER_HEIGHT - 60) + 30,
      type,
      collected: false,
    }]);
  }, [canvasSize.width, canvasSize.height]);

  const jump = useCallback(() => {
    if (gameState !== 'playing') return;
    setPlayerY(prev => Math.max(20, prev - 70));
    setTimeout(() => {
      setPlayerY(prev => Math.min(canvasSize.height - PLAYER_HEIGHT - 20, prev + 70));
    }, 350);
  }, [gameState, canvasSize.height]);

  const startGame = useCallback(() => {
    setGameState('playing');
    setScore(0);
    setDistance(0);
    setSpeed(3);
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
        const newDistance = prev + speed * 0.08;
        distanceRef.current = newDistance;
        
        // Augmenter la vitesse progressivement plus lentement
        if (newDistance > 0 && newDistance % 150 < 1) {
          setSpeed(s => Math.min(10, s + 0.3));
        }
        
        return newDistance;
      });

      // Spawn obstacles avec plus d'espace entre eux
      const spawnInterval = 2500 / (speed / 3);
      if (timestamp - lastSpawnRef.current > spawnInterval) {
        spawnObstacle();
        lastSpawnRef.current = timestamp;
      }

      // Spawn collectibles
      if (Math.random() < 0.02) {
        spawnCollectible();
      }

      // Move obstacles
      setObstacles(prev => {
        const filtered = prev.filter(obs => obs.x > -60);
        return filtered.map(obs => ({ ...obs, x: obs.x - speed * 0.8 }));
      });

      // Move collectibles
      setCollectibles(prev => {
        const filtered = prev.filter(col => col.x > -60 && !col.collected);
        return filtered.map(col => ({ ...col, x: col.x - speed * 0.8 }));
      });

      // Collision detection avec hitbox plus précise
      setObstacles(prev => {
        for (const obs of prev) {
          const playerX = canvasSize.width * 0.15;
          const hitboxPadding = 10;
          if (
            obs.x < playerX + PLAYER_WIDTH - hitboxPadding &&
            obs.x > playerX + hitboxPadding &&
            Math.abs(obs.y - playerY) < PLAYER_HEIGHT - hitboxPadding
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
          const playerX = canvasSize.width * 0.15;
          if (
            !col.collected &&
            col.x < playerX + PLAYER_WIDTH &&
            col.x > playerX &&
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

  // Touch controls for mobile
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (gameState === 'menu' || gameState === 'gameover') {
        startGame();
      } else if (gameState === 'playing') {
        jump();
      } else if (gameState === 'paused') {
        resumeGame();
      }
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
      return () => canvas.removeEventListener('touchstart', handleTouchStart);
    }
  }, [gameState, startGame, jump, resumeGame]);

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
      <div className="flex flex-col items-center justify-center gap-6 p-4 sm:p-8 text-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', duration: 0.8 }}
          className="text-6xl sm:text-7xl"
        >
          🏃‍♂️
        </motion.div>
        <h2 className="font-display text-2xl sm:text-3xl text-parchment">Le Bureau Infini</h2>
        <p className="text-sm text-parchment-muted max-w-md">
          Évite les obstacles du bureau et collecte les objets utiles !<br />
          <span className="hidden sm:inline">Appuie sur ESPACE ou clique pour sauter.</span>
          <span className="sm:hidden">Touche l'écran pour sauter.</span>
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
        ref={canvasRef}
        className="relative mx-auto h-[350px] w-full max-w-[600px] overflow-hidden rounded-lg border-2 border-ink-line bg-gradient-to-b from-ink-panel to-ink"
        onClick={jump}
        role="button"
        tabIndex={0}
      >
        {/* Background decorations */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 text-4xl">🖨️</div>
          <div className="absolute top-20 right-20 text-3xl">☕</div>
          <div className="absolute bottom-20 left-20 text-3xl">📄</div>
          <div className="absolute bottom-10 right-10 text-4xl">💻</div>
        </div>

        {/* Floor with pattern */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-brass via-teal to-brass" />
        <div className="absolute bottom-2 left-0 right-0 h-8 bg-gradient-to-t from-ink to-transparent" />

        {/* Player */}
        <motion.div
          className="absolute flex h-[50px] w-[35px] items-center justify-center text-3xl sm:text-4xl"
          style={{ left: '15%', top: `${playerY}px` }}
          animate={{ y: playerY }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          🏃‍♂️
        </motion.div>

        {/* Obstacles */}
        {obstacles.map(obs => (
          <motion.div
            key={obs.id}
            className="absolute flex h-[45px] w-[45px] items-center justify-center text-2xl sm:text-3xl shadow-lg"
            style={{ left: `${obs.x}px`, top: `${obs.y}px` }}
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            {getEmoji(obs.type)}
          </motion.div>
        ))}

        {/* Collectibles */}
        {collectibles.map(col => (
          <motion.div
            key={col.id}
            className="absolute flex h-[28px] w-[28px] items-center justify-center text-xl sm:text-2xl"
            style={{ left: `${col.x}px`, top: `${col.y}px` }}
            animate={col.collected ? { scale: 0, opacity: 0 } : { scale: [1, 1.3, 1], rotate: [0, 360] }}
            transition={{ duration: 0.6, repeat: Infinity }}
          >
            {getEmoji(col.type)}
          </motion.div>
        ))}
      </div>

      {/* Instructions */}
      <p className="mt-4 text-center text-xs text-parchment-muted">
        <span className="hidden sm:inline">ESPACE ou clic pour sauter · ÉCHAP pour pause</span>
        <span className="sm:hidden">Touche l'écran pour sauter</span>
      </p>
    </div>
  );
}
