'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GameState {
  isPlaying: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  score: number;
  highScore: number;
  distance: number;
  speed: number;
}

interface Player {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  isMovingUp: boolean;
  isMovingDown: boolean;
  isMovingLeft: boolean;
  isMovingRight: boolean;
}

interface Obstacle {
  id: number;
  x: number;
  y: number;
  type: 'barrier' | 'laser' | 'spike';
  width: number;
  height: number;
}

interface Collectible {
  id: number;
  x: number;
  y: number;
  type: 'coin' | 'gem' | 'star';
  value: number;
  collected: boolean;
}

interface EndlessRunnerProps {
  onGameOver?: (score: number, distance: number) => void;
  onScoreUpdate?: (score: number) => void;
}

export function EndlessRunner({ onGameOver, onScoreUpdate }: EndlessRunnerProps) {
  // Configuration simplifiée mais professionnelle
  const CONFIG = {
    CANVAS_HEIGHT: 450,
    CANVAS_WIDTH: 800,
    PLAYER_WIDTH: 50,
    PLAYER_HEIGHT: 50,
    PLAYER_SPEED: 8,
    MIN_X: 50,
    MAX_X: 700,
    MIN_Y: 30,
    MAX_Y: 350,
    MOVE_INCREMENT: 15,
    INITIAL_SPEED: 4,
    MAX_SPEED: 12,
    SPEED_INCREMENT: 0.001,
    SPAWN_INTERVAL: 1500, // Spawn tous les 1.5 secondes - garanti
  };

  const [gameState, setGameState] = useState<GameState>({
    isPlaying: false,
    isPaused: false,
    isGameOver: false,
    score: 0,
    highScore: 0,
    distance: 0,
    speed: CONFIG.INITIAL_SPEED,
  });
  
  const [player, setPlayer] = useState<Player>({
    x: 150,
    y: 200,
    targetX: 150,
    targetY: 200,
    isMovingUp: false,
    isMovingDown: false,
    isMovingLeft: false,
    isMovingRight: false,
  });
  
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const [showTutorial, setShowTutorial] = useState(true);
  const [coins, setCoins] = useState(0);
  
  const gameLoopRef = useRef<number | undefined>(undefined);
  const obstacleIdRef = useRef(0);
  const collectibleIdRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const canvasRef = useRef<HTMLDivElement>(null);
  const moveIntervalRef = useRef<number | undefined>(undefined);
  const currentScoreRef = useRef(0);

  // Contrôles progressifs
  const startMovingUp = useCallback(() => {
    if (gameState.isPlaying && !gameState.isPaused) {
      setPlayer(prev => ({
        ...prev,
        isMovingUp: true,
        isMovingDown: false,
        targetY: Math.max(CONFIG.MIN_Y, prev.targetY - CONFIG.MOVE_INCREMENT),
      }));
      setShowTutorial(false);
    }
  }, [gameState.isPlaying, gameState.isPaused]);

  const startMovingDown = useCallback(() => {
    if (gameState.isPlaying && !gameState.isPaused) {
      setPlayer(prev => ({
        ...prev,
        isMovingDown: true,
        isMovingUp: false,
        targetY: Math.min(CONFIG.MAX_Y, prev.targetY + CONFIG.MOVE_INCREMENT),
      }));
      setShowTutorial(false);
    }
  }, [gameState.isPlaying, gameState.isPaused]);

  const startMovingLeft = useCallback(() => {
    if (gameState.isPlaying && !gameState.isPaused) {
      setPlayer(prev => ({
        ...prev,
        isMovingLeft: true,
        isMovingRight: false,
        targetX: Math.max(CONFIG.MIN_X, prev.targetX - CONFIG.MOVE_INCREMENT),
      }));
      setShowTutorial(false);
    }
  }, [gameState.isPlaying, gameState.isPaused]);

  const startMovingRight = useCallback(() => {
    if (gameState.isPlaying && !gameState.isPaused) {
      setPlayer(prev => ({
        ...prev,
        isMovingRight: true,
        isMovingLeft: false,
        targetX: Math.min(CONFIG.MAX_X, prev.targetX + CONFIG.MOVE_INCREMENT),
      }));
      setShowTutorial(false);
    }
  }, [gameState.isPlaying, gameState.isPaused]);

  const stopMoving = useCallback(() => {
    setPlayer(prev => ({
      ...prev,
      isMovingUp: false,
      isMovingDown: false,
      isMovingLeft: false,
      isMovingRight: false,
    }));
  }, []);

  // Mouvement continu
  useEffect(() => {
    if (player.isMovingUp || player.isMovingDown || player.isMovingLeft || player.isMovingRight) {
      moveIntervalRef.current = window.setInterval(() => {
        setPlayer(prev => {
          let newTargetX = prev.targetX;
          let newTargetY = prev.targetY;
          
          if (prev.isMovingUp) {
            newTargetY = Math.max(CONFIG.MIN_Y, prev.targetY - CONFIG.PLAYER_SPEED);
          } else if (prev.isMovingDown) {
            newTargetY = Math.min(CONFIG.MAX_Y, prev.targetY + CONFIG.PLAYER_SPEED);
          }
          
          if (prev.isMovingLeft) {
            newTargetX = Math.max(CONFIG.MIN_X, prev.targetX - CONFIG.PLAYER_SPEED);
          } else if (prev.isMovingRight) {
            newTargetX = Math.min(CONFIG.MAX_X, prev.targetX + CONFIG.PLAYER_SPEED);
          }
          
          return { ...prev, targetX: newTargetX, targetY: newTargetY };
        });
      }, 50);
    } else {
      if (moveIntervalRef.current) {
        clearInterval(moveIntervalRef.current);
      }
    }

    return () => {
      if (moveIntervalRef.current) {
        clearInterval(moveIntervalRef.current);
      }
    };
  }, [player.isMovingUp, player.isMovingDown, player.isMovingLeft, player.isMovingRight]);

  // Interpolation fluide
  useEffect(() => {
    if (!gameState.isPlaying || gameState.isPaused) return;

    const animationInterval = setInterval(() => {
      setPlayer(prev => {
        const diffX = prev.targetX - prev.x;
        const diffY = prev.targetY - prev.y;
        
        let newX = prev.x;
        let newY = prev.y;
        
        if (Math.abs(diffX) > 1) {
          newX = prev.x + diffX * 0.2;
        } else {
          newX = prev.targetX;
        }
        
        if (Math.abs(diffY) > 1) {
          newY = prev.y + diffY * 0.2;
        } else {
          newY = prev.targetY;
        }
        
        return { ...prev, x: newX, y: newY };
      });
    }, 16);

    return () => clearInterval(animationInterval);
  }, [gameState.isPlaying, gameState.isPaused]);

  const startGame = useCallback(() => {
    currentScoreRef.current = 0;
    setGameState(prev => ({
      isPlaying: true,
      isPaused: false,
      isGameOver: false,
      score: 0,
      highScore: prev.highScore,
      distance: 0,
      speed: CONFIG.INITIAL_SPEED,
    }));
    setPlayer({
      x: 150,
      y: CONFIG.CANVAS_HEIGHT / 2,
      targetX: 150,
      targetY: CONFIG.CANVAS_HEIGHT / 2,
      isMovingUp: false,
      isMovingDown: false,
      isMovingLeft: false,
      isMovingRight: false,
    });
    setObstacles([]);
    setCollectibles([]);
    setCoins(0);
    obstacleIdRef.current = 0;
    collectibleIdRef.current = 0;
    lastSpawnRef.current = 0;
    setShowTutorial(true);
  }, [gameState.highScore]);

  const pauseGame = useCallback(() => {
    setGameState(prev => ({ ...prev, isPaused: true, speed: prev.speed }));
  }, []);

  const resumeGame = useCallback(() => {
    setGameState(prev => ({ ...prev, isPaused: false, speed: prev.speed }));
  }, []);

  const endGame = useCallback(() => {
    setGameState(prev => {
      const newHighScore = Math.max(prev.score, prev.highScore);
      onGameOver?.(currentScoreRef.current, prev.distance);
      return {
        ...prev,
        isPlaying: false,
        isGameOver: true,
        highScore: newHighScore,
      };
    });
  }, [onGameOver]);

  // Spawn simple et garanti d'obstacles
  const spawnElements = useCallback(() => {
    const obstacleTypes: Obstacle['type'][] = ['barrier', 'laser', 'spike'];
    const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
    
    const sizes = {
      barrier: { width: 40, height: 60 },
      laser: { width: 20, height: 100 },
      spike: { width: 35, height: 45 },
    };
    
    const size = sizes[type];
    const randomY = CONFIG.MIN_Y + Math.random() * (CONFIG.MAX_Y - CONFIG.MIN_Y - size.height);
    
    setObstacles(obs => {
      const newObstacle: Obstacle = {
        id: obstacleIdRef.current++,
        x: CONFIG.CANVAS_WIDTH,
        y: randomY,
        type,
        width: size.width,
        height: size.height,
      };
      return [...obs, newObstacle];
    });
    
    // Spawn collectible
    const collectibleTypes: Collectible['type'][] = ['coin', 'gem', 'star'];
    const cType = collectibleTypes[Math.floor(Math.random() * collectibleTypes.length)];
    
    const values = {
      coin: 10,
      gem: 25,
      star: 50,
    };
    
    setCollectibles(cols => {
      const newCollectible = {
        id: collectibleIdRef.current++,
        x: CONFIG.CANVAS_WIDTH + Math.random() * 100,
        y: CONFIG.MIN_Y + Math.random() * (CONFIG.MAX_Y - CONFIG.MIN_Y - 30),
        type: cType,
        value: values[cType],
        collected: false,
      };
      return [...cols, newCollectible];
    });
  }, []);

  // Game loop simplifié mais fonctionnel
  useEffect(() => {
    if (!gameState.isPlaying || gameState.isPaused) {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      return;
    }

    const gameLoop = (timestamp: number) => {
      // Spawn à interval fixe garanti
      if (timestamp - lastSpawnRef.current > CONFIG.SPAWN_INTERVAL) {
        spawnElements();
        lastSpawnRef.current = timestamp;
      }
      
      // Update game state
      setGameState(prev => {
        const newSpeed = Math.min(CONFIG.MAX_SPEED, prev.speed + CONFIG.SPEED_INCREMENT);
        const newDistance = prev.distance + newSpeed * 0.05;
        
        return {
          ...prev,
          speed: newSpeed,
          distance: newDistance,
        };
      });

      // Move obstacles
      setObstacles(prev => {
        const filtered = prev.filter(obs => obs.x > -100);
        return filtered.map(obs => ({ ...obs, x: obs.x - gameState.speed }));
      });

      // Move collectibles
      setCollectibles(prev => {
        const filtered = prev.filter(c => c.x > -100 && !c.collected);
        return filtered.map(c => ({ ...c, x: c.x - gameState.speed }));
      });

      // Collision detection
      setObstacles(prev => {
        const playerHitbox = {
          x: player.x + 10,
          y: player.y + 10,
          width: CONFIG.PLAYER_WIDTH - 20,
          height: CONFIG.PLAYER_HEIGHT - 20,
        };
        
        for (const obs of prev) {
          const obsHitbox = {
            x: obs.x + 5,
            y: obs.y + 5,
            width: obs.width - 10,
            height: obs.height - 10,
          };
          
          if (
            playerHitbox.x < obsHitbox.x + obsHitbox.width &&
            playerHitbox.x + playerHitbox.width > obsHitbox.x &&
            playerHitbox.y < obsHitbox.y + obsHitbox.height &&
            playerHitbox.y + playerHitbox.height > obsHitbox.y
          ) {
            endGame();
            return prev;
          }
        }
        return prev;
      });

      // Collectible detection
      setCollectibles(prev => {
        const updated = prev.map(c => {
          const distance = Math.sqrt(
            Math.pow(player.x + CONFIG.PLAYER_WIDTH / 2 - c.x, 2) +
            Math.pow(player.y + CONFIG.PLAYER_HEIGHT / 2 - c.y, 2)
          );
          
          if (!c.collected && distance < 45) {
            setCoins(prevCoins => prevCoins + 1);
            currentScoreRef.current += c.value;
            setGameState(prevState => ({ ...prevState, score: currentScoreRef.current }));
            onScoreUpdate?.(currentScoreRef.current);
            return { ...c, collected: true };
          }
          return c;
        });
        
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
  }, [gameState.isPlaying, gameState.isPaused, gameState.speed, player.x, player.y, endGame, onScoreUpdate, spawnElements]);

  // Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (!gameState.isPlaying) {
          startGame();
        } else if (gameState.isPaused) {
          resumeGame();
        }
      }
      if (e.code === 'Escape' && gameState.isPlaying) {
        e.preventDefault();
        pauseGame();
      }
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        if (gameState.isPlaying && !gameState.isPaused) {
          startMovingUp();
        }
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        if (gameState.isPlaying && !gameState.isPaused) {
          startMovingDown();
        }
      }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        if (gameState.isPlaying && !gameState.isPaused) {
          startMovingLeft();
        }
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        if (gameState.isPlaying && !gameState.isPaused) {
          startMovingRight();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const movementKeys = ['ArrowUp', 'KeyW', 'ArrowDown', 'KeyS', 'ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD'];
      if (movementKeys.includes(e.code)) {
        e.preventDefault();
        stopMoving();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState.isPlaying, gameState.isPaused, startGame, resumeGame, pauseGame, startMovingUp, startMovingDown, startMovingLeft, startMovingRight, stopMoving]);

  const getObstacleIcon = (type: Obstacle['type']) => {
    const icons = {
      barrier: '🚧',
      laser: '⚡',
      spike: '📌',
    };
    return icons[type];
  };

  const getCollectibleIcon = (type: Collectible['type']) => {
    const icons = {
      coin: '🪙',
      gem: '💎',
      star: '⭐',
    };
    return icons[type];
  };

  // Menu screen
  if (!gameState.isPlaying && !gameState.isGameOver) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] p-8 text-center">
        <motion.div
          initial={{ opacity: 0, transform: 'translateY(-20px)' }}
          animate={{ opacity: 1, transform: 'translateY(0px)' }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-8">
            <div className="text-8xl mb-4">🏃‍♂️</div>
            <h1 className="font-display text-5xl font-bold text-parchment mb-2">
              Bureau Infini
            </h1>
            <p className="text-parchment-muted text-lg">
              Collecte les pièces, évite les obstacles
            </p>
          </div>
          
          <div className="flex flex-col gap-3 mb-8">
            <div className="flex items-center justify-center gap-3 text-parchment-muted">
              <span className="text-2xl">⬆️⬇️⬅️➡️</span>
              <span className="text-sm">Maintiens pour te déplacer</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-parchment-muted">
              <span className="text-2xl">🪙💎⭐</span>
              <span className="text-sm">Collecte les pièces et gemmes</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-parchment-muted">
              <span className="text-2xl">🚧⚡📌</span>
              <span className="text-sm">Évite les obstacles</span>
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startGame}
            className="bg-gradient-to-r from-brass to-teal text-ink font-bold px-12 py-4 rounded-xl text-xl shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105 touch-manipulation"
          >
            Commencer
          </motion.button>
          
          {gameState.highScore > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-8 flex items-center justify-center gap-2 text-parchment-muted"
            >
              <span className="text-2xl">🏆</span>
              <span className="font-mono">Meilleur score: {gameState.highScore}</span>
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  }

  // Game over screen
  if (gameState.isGameOver) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] p-8 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
        >
          <div className="mb-8">
            <div className="text-8xl mb-4">😵</div>
            <h2 className="font-display text-4xl font-bold text-parchment mb-4">
              Game Over
            </h2>
          </div>
          
          <div className="bg-ink-panel rounded-2xl p-6 mb-8 border border-ink-line">
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <p className="text-xs text-parchment-muted uppercase tracking-wider mb-1">Score</p>
                <p className="font-mono text-3xl text-brass">{gameState.score}</p>
              </div>
              <div>
                <p className="text-xs text-parchment-muted uppercase tracking-wider mb-1">Pièces</p>
                <p className="font-mono text-3xl text-teal">{coins}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-parchment-muted uppercase tracking-wider mb-1">Distance</p>
                <p className="font-mono text-2xl text-parchment">{Math.floor(gameState.distance)}m</p>
              </div>
              <div>
                <p className="text-xs text-parchment-muted uppercase tracking-wider mb-1">Record</p>
                <p className="font-mono text-2xl text-brass">{gameState.highScore}</p>
              </div>
            </div>
          </div>
          
          {gameState.score >= gameState.highScore && gameState.score > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-8 flex items-center justify-center gap-2 text-teal font-semibold"
            >
              <span className="text-2xl">🏆</span>
              <span>Nouveau record !</span>
            </motion.div>
          )}
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startGame}
            className="bg-gradient-to-r from-brass to-teal text-ink font-bold px-12 py-4 rounded-xl text-xl shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105 touch-manipulation"
          >
            Rejouer
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // Paused screen
  if (gameState.isPaused) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] p-8 text-center">
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.3 }}
        >
          <div className="mb-8">
            <div className="text-8xl mb-4">⏸️</div>
            <h2 className="font-display text-4xl font-bold text-parchment mb-4">
              Pause
            </h2>
          </div>
          
          <div className="bg-ink-panel rounded-2xl p-6 mb-8 border border-ink-line">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-parchment-muted uppercase tracking-wider mb-1">Score</p>
                <p className="font-mono text-3xl text-brass">{gameState.score}</p>
              </div>
              <div>
                <p className="text-xs text-parchment-muted uppercase tracking-wider mb-1">Pièces</p>
                <p className="font-mono text-3xl text-teal">{coins}</p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={resumeGame}
              className="bg-gradient-to-r from-brass to-teal text-ink font-bold px-8 py-4 rounded-xl text-lg shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105 touch-manipulation"
            >
              Reprendre
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={endGame}
              className="border-2 border-ink-line text-parchment px-8 py-4 rounded-xl text-lg hover:border-brass hover:text-brass transition-all touch-manipulation"
            >
              Quitter
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Game screen
  return (
    <div className="relative">
      {/* HUD professionnel */}
      <div className="flex justify-between items-center mb-6 px-4">
        <div className="flex gap-6">
          <div className="text-left">
            <p className="text-xs text-parchment-muted uppercase tracking-wider mb-1">Score</p>
            <p className="font-mono text-2xl text-brass font-bold">{gameState.score}</p>
          </div>
          <div className="text-left">
            <p className="text-xs text-parchment-muted uppercase tracking-wider mb-1">Pièces</p>
            <p className="font-mono text-2xl text-teal font-bold">{coins}</p>
          </div>
          <div className="text-left">
            <p className="text-xs text-parchment-muted uppercase tracking-wider mb-1">Distance</p>
            <p className="font-mono text-xl text-parchment font-bold">{Math.floor(gameState.distance)}m</p>
          </div>
        </div>
        
        <button
          onClick={pauseGame}
          className="p-3 rounded-xl border border-ink-line text-parchment-muted hover:border-brass hover:text-brass transition-all touch-manipulation"
        >
          <span className="text-2xl">⏸️</span>
        </button>
      </div>

      {/* Game Canvas moderne */}
      <div
        ref={canvasRef}
        className="relative mx-auto h-[450px] w-full max-w-[900px] overflow-hidden rounded-2xl border-2 border-ink-line bg-gradient-to-b from-ink-panel to-ink touch-none select-none shadow-2xl"
        role="button"
        tabIndex={0}
      >
        {/* Background moderne */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 right-0 h-1/4 bg-gradient-to-b from-brass/5 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-ink to-transparent" />
          
          {/* Grille de fond stylisée */}
          <div className="absolute inset-0 opacity-5">
            <div className="grid grid-cols-10 h-full">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="border-r border-parchment/20" />
              ))}
            </div>
          </div>
        </div>

        {/* Player moderne */}
        <div
          className="absolute flex items-center justify-center transition-transform duration-100"
          style={{
            left: `${player.x}px`,
            top: `${player.y}px`,
            width: `${CONFIG.PLAYER_WIDTH}px`,
            height: `${CONFIG.PLAYER_HEIGHT}px`,
          }}
        >
          <div className="text-4xl">🏃‍♂️</div>
        </div>

        {/* Obstacles modernes */}
        <AnimatePresence>
          {obstacles.map(obs => (
            <motion.div
              key={obs.id}
              className="absolute flex items-center justify-center rounded-lg shadow-lg"
              style={{
                left: `${obs.x}px`,
                top: `${obs.y}px`,
                width: `${obs.width}px`,
                height: `${obs.height}px`,
                background: obs.type === 'laser' ? 'linear-gradient(180deg, #C9A227, #B4462F)' : 'rgba(180, 70, 47, 0.85)',
                border: '2px solid #C9A227',
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <div className="text-2xl">{getObstacleIcon(obs.type)}</div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Collectibles */}
        <AnimatePresence>
          {collectibles.map(c => (
            <motion.div
              key={c.id}
              className="absolute flex items-center justify-center rounded-full shadow-lg"
              style={{
                left: `${c.x}px`,
                top: `${c.y}px`,
                width: '35px',
                height: '35px',
                background: c.type === 'coin' ? 'rgba(201, 162, 39, 0.9)' : c.type === 'gem' ? 'rgba(47, 111, 107, 0.9)' : 'rgba(180, 70, 47, 0.9)',
                border: '2px solid #EDEAE0',
              }}
              animate={c.collected ? { scale: 0, opacity: 0 } : { scale: [1, 1.2, 1], rotate: [0, 360] }}
              transition={{ duration: 0.8, repeat: c.collected ? 0 : Infinity }}
            >
              <div className="text-xl">{getCollectibleIcon(c.type)}</div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Tutorial overlay moderne */}
        <AnimatePresence>
          {showTutorial && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            >
              <div className="bg-ink-panel border-2 border-brass px-8 py-4 rounded-2xl shadow-2xl">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚡</span>
                  <p className="font-semibold text-lg text-parchment">Utilise les flèches pour te déplacer</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Contrôles mobile D-pad */}
      <div className="mt-6 flex flex-col items-center gap-4 sm:hidden">
        <button
          onTouchStart={(e) => { e.preventDefault(); startMovingUp(); }}
          onTouchEnd={(e) => { e.preventDefault(); stopMoving(); }}
          className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-brass bg-brass/20 text-2xl active:bg-brass/40 touch-manipulation"
        >
          ⬆️
        </button>
        <div className="flex gap-4">
          <button
            onTouchStart={(e) => { e.preventDefault(); startMovingLeft(); }}
            onTouchEnd={(e) => { e.preventDefault(); stopMoving(); }}
            className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-brass bg-brass/20 text-2xl active:bg-brass/40 touch-manipulation"
          >
            ⬅️
          </button>
          <button
            onTouchStart={(e) => { e.preventDefault(); startMovingRight(); }}
            onTouchEnd={(e) => { e.preventDefault(); stopMoving(); }}
            className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-brass bg-brass/20 text-2xl active:bg-brass/40 touch-manipulation"
          >
            ➡️
          </button>
        </div>
        <button
          onTouchStart={(e) => { e.preventDefault(); startMovingDown(); }}
          onTouchEnd={(e) => { e.preventDefault(); stopMoving(); }}
          className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-brass bg-brass/20 text-2xl active:bg-brass/40 touch-manipulation"
        >
          ⬇️
        </button>
      </div>

      {/* Instructions desktop */}
      <div className="mt-6 text-center hidden sm:block">
        <div className="flex items-center justify-center gap-6 text-sm text-parchment-muted">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-ink-panel rounded-md border border-ink-line font-mono text-xs">FLÈCHES</span>
            <span>pour se déplacer</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-ink-panel rounded-md border border-ink-line font-mono text-xs">ÉCHAP</span>
            <span>pour pause</span>
          </div>
        </div>
      </div>
    </div>
  );
}