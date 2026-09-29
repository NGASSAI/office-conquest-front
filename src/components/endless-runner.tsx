'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { Play, Pause, RotateCcw, Trophy, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Zap, Shield, Target, Coins } from 'lucide-react';

interface GameState {
  isPlaying: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  score: number;
  highScore: number;
  distance: number;
  speed: number;
  level: number;
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
  shield: boolean;
  powerUp: boolean;
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

interface PowerUp {
  id: number;
  x: number;
  y: number;
  type: 'shield' | 'speed' | 'magnet';
  collected: boolean;
}

interface EndlessRunnerProps {
  onGameOver?: (score: number, distance: number) => void;
  onScoreUpdate?: (score: number) => void;
}

export function EndlessRunner({ onGameOver, onScoreUpdate }: EndlessRunnerProps) {
  const [gameState, setGameState] = useState<GameState>({
    isPlaying: false,
    isPaused: false,
    isGameOver: false,
    score: 0,
    highScore: 0,
    distance: 0,
    speed: 4,
    level: 1,
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
    shield: false,
    powerUp: false,
  });
  
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [showTutorial, setShowTutorial] = useState(true);
  const [combo, setCombo] = useState(0);
  const [coins, setCoins] = useState(0);
  
  const gameLoopRef = useRef<number | undefined>(undefined);
  const obstacleIdRef = useRef(0);
  const collectibleIdRef = useRef(0);
  const powerUpIdRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const canvasRef = useRef<HTMLDivElement>(null);
  const moveIntervalRef = useRef<number | undefined>(undefined);
  
  // Configuration professionnelle inspirée des jeux de plateforme
  const CONFIG = {
    CANVAS_HEIGHT: 450,
    CANVAS_WIDTH: 800,
    PLAYER_WIDTH: 45,
    PLAYER_HEIGHT: 45,
    PLAYER_SPEED: 6,
    MIN_X: 50,
    MAX_X: 700,
    MIN_Y: 30,
    MAX_Y: 350,
    MOVE_INCREMENT: 12,
    INITIAL_SPEED: 3,
    MAX_SPEED: 10,
    SPEED_INCREMENT: 0.0003,
    OBSTACLE_SPAWN_RATE: 0.03, // Augmenté pour plus d'obstacles
    COLLECTIBLE_SPAWN_RATE: 0.04, // Augmenté pour plus de pièces
    POWER_UP_SPAWN_RATE: 0.008,
    MIN_OBSTACLE_GAP: 180,
    MAX_OBSTACLE_GAP: 350,
  };

  // Animations
  const titleSpring = useSpring({
    from: { opacity: 0, transform: 'translateY(-20px)' },
    to: { opacity: 1, transform: 'translateY(0px)' },
    config: { tension: 300, friction: 20 },
  });

  const scoreSpring = useSpring({
    from: { number: 0 },
    to: { number: gameState.score },
    config: { tension: 120, friction: 14 },
  });

  // Contrôles progressifs dans toutes les directions
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

  // Mouvement continu avec interval
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

  // Interpolation fluide de la position du joueur
  useEffect(() => {
    if (!gameState.isPlaying || gameState.isPaused) return;

    const animationInterval = setInterval(() => {
      setPlayer(prev => {
        const diffX = prev.targetX - prev.x;
        const diffY = prev.targetY - prev.y;
        
        let newX = prev.x;
        let newY = prev.y;
        
        if (Math.abs(diffX) > 1) {
          newX = prev.x + diffX * 0.15;
        } else {
          newX = prev.targetX;
        }
        
        if (Math.abs(diffY) > 1) {
          newY = prev.y + diffY * 0.15;
        } else {
          newY = prev.targetY;
        }
        
        return { ...prev, x: newX, y: newY };
      });
    }, 16);

    return () => clearInterval(animationInterval);
  }, [gameState.isPlaying, gameState.isPaused]);

  const startGame = useCallback(() => {
    setGameState({
      isPlaying: true,
      isPaused: false,
      isGameOver: false,
      score: 0,
      highScore: gameState.highScore,
      distance: 0,
      speed: CONFIG.INITIAL_SPEED,
      level: 1,
    });
    setPlayer({
      x: 150,
      y: CONFIG.CANVAS_HEIGHT / 2,
      targetX: 150,
      targetY: CONFIG.CANVAS_HEIGHT / 2,
      isMovingUp: false,
      isMovingDown: false,
      isMovingLeft: false,
      isMovingRight: false,
      shield: false,
      powerUp: false,
    });
    setObstacles([]);
    setCollectibles([]);
    setPowerUps([]);
    setCombo(0);
    setCoins(0);
    obstacleIdRef.current = 0;
    collectibleIdRef.current = 0;
    powerUpIdRef.current = 0;
    lastSpawnRef.current = 0;
    setShowTutorial(true);
  }, [gameState.highScore]);

  const pauseGame = useCallback(() => {
    setGameState(prev => ({ ...prev, isPaused: true }));
  }, []);

  const resumeGame = useCallback(() => {
    setGameState(prev => ({ ...prev, isPaused: false }));
  }, []);

  const endGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      isPlaying: false,
      isGameOver: true,
      highScore: Math.max(prev.score, prev.highScore),
    }));
    onGameOver?.(gameState.score, gameState.distance);
  }, [gameState.score, gameState.distance, onGameOver]);

  // Game loop principal
  useEffect(() => {
    if (!gameState.isPlaying || gameState.isPaused) {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      return;
    }

    console.log('Game loop started, speed:', gameState.speed);

    const gameLoop = (timestamp: number) => {
      console.log('Game loop tick, timestamp:', timestamp, 'lastSpawn:', lastSpawnRef.current);
      
      // Update game state
      setGameState(prev => {
        const newSpeed = Math.min(CONFIG.MAX_SPEED, prev.speed + CONFIG.SPEED_INCREMENT);
        const newDistance = prev.distance + newSpeed * 0.05;
        const newLevel = Math.floor(newDistance / 200) + 1;
        
        console.log('Speed:', newSpeed, 'Distance:', newDistance);
        
        // Spawn obstacles avec logique métier améliorée
        const gap = CONFIG.MIN_OBSTACLE_GAP + Math.random() * (CONFIG.MAX_OBSTACLE_GAP - CONFIG.MIN_OBSTACLE_GAP);
        const requiredTime = gap / newSpeed * 1000;
        
        console.log('Gap:', gap, 'Required time:', requiredTime, 'Time since last spawn:', timestamp - lastSpawnRef.current);
        
        if (timestamp - lastSpawnRef.current > requiredTime) {
          console.log('SPAWNING OBSTACLE');
          
          const obstacleTypes: Obstacle['type'][] = ['barrier', 'laser', 'spike'];
          const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
          
          const sizes = {
            barrier: { width: 35, height: 50 },
            laser: { width: 15, height: 100 },
            spike: { width: 30, height: 40 },
          };
          
          const size = sizes[type];
          
          // Position Y aléatoire pour varier les défis
          const randomY = CONFIG.MIN_Y + Math.random() * (CONFIG.MAX_Y - CONFIG.MIN_Y - size.height);
          
          console.log('Creating obstacle at x:', CONFIG.CANVAS_WIDTH, 'y:', randomY);
          
          setObstacles(obs => {
            const newObstacle = {
              id: obstacleIdRef.current++,
              x: CONFIG.CANVAS_WIDTH,
              y: randomY,
              type,
              width: size.width,
              height: size.height,
            };
            console.log('Obstacles count:', obs.length + 1);
            return [...obs, newObstacle];
          });
          
          // Spawn collectibles (pièces) inspiré des jeux de plateforme
          if (Math.random() < CONFIG.COLLECTIBLE_SPAWN_RATE) {
            console.log('SPAWNING COLLECTIBLE');
            
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
                x: CONFIG.CANVAS_WIDTH + Math.random() * 150,
                y: CONFIG.MIN_Y + Math.random() * (CONFIG.MAX_Y - CONFIG.MIN_Y - 30),
                type: cType,
                value: values[cType],
                collected: false,
              };
              console.log('Collectibles count:', cols.length + 1);
              return [...cols, newCollectible];
            });
          }
          
          // Spawn power-up occasionnellement
          if (Math.random() < CONFIG.POWER_UP_SPAWN_RATE) {
            console.log('SPAWNING POWERUP');
            
            const powerUpTypes: PowerUp['type'][] = ['shield', 'speed', 'magnet'];
            const pType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
            
            setPowerUps(powers => {
              const newPowerUp = {
                id: powerUpIdRef.current++,
                x: CONFIG.CANVAS_WIDTH + Math.random() * 100,
                y: CONFIG.MIN_Y + Math.random() * (CONFIG.MAX_Y - CONFIG.MIN_Y - 40),
                type: pType,
                collected: false,
              };
              console.log('Powerups count:', powers.length + 1);
              return [...powers, newPowerUp];
            });
          }
          
          lastSpawnRef.current = timestamp;
        }
        
        return {
          ...prev,
          speed: newSpeed,
          distance: newDistance,
          level: newLevel,
        };
      });

      // Move obstacles
      setObstacles(prev => {
        const filtered = prev.filter(obs => obs.x > -80);
        const moved = filtered.map(obs => ({ ...obs, x: obs.x - gameState.speed }));
        console.log('Moving obstacles, count:', moved.length);
        return moved;
      });

      // Move collectibles
      setCollectibles(prev => {
        const filtered = prev.filter(c => c.x > -80 && !c.collected);
        const moved = filtered.map(c => ({ ...c, x: c.x - gameState.speed }));
        console.log('Moving collectibles, count:', moved.length);
        return moved;
      });

      // Move power-ups
      setPowerUps(prev => {
        const filtered = prev.filter(p => p.x > -80 && !p.collected);
        const moved = filtered.map(p => ({ ...p, x: p.x - gameState.speed }));
        return moved;
      });

      // Collision detection avec obstacles
      setObstacles(prev => {
        const playerHitbox = {
          x: player.x + 8,
          y: player.y + 8,
          width: CONFIG.PLAYER_WIDTH - 16,
          height: CONFIG.PLAYER_HEIGHT - 16,
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
            if (player.shield) {
              // Shield protects, remove obstacle
              return prev.filter(o => o.id !== obs.id);
            } else {
              endGame();
              return prev;
            }
          }
        }
        return prev;
      });

      // Collectible detection (pièces inspiré des jeux de plateforme)
      setCollectibles(prev => {
        let newScore = gameState.score;
        let newCoins = coins;
        let newCombo = combo;
        
        const updated = prev.map(c => {
          const distance = Math.sqrt(
            Math.pow(player.x + CONFIG.PLAYER_WIDTH / 2 - c.x, 2) +
            Math.pow(player.y + CONFIG.PLAYER_HEIGHT / 2 - c.y, 2)
          );
          
          if (!c.collected && distance < 40) {
            console.log('COLLECTIBLE COLLECTED:', c.type);
            newCombo++;
            newCoins++;
            newScore += c.value + (newCombo * 2);
            
            onScoreUpdate?.(newScore);
            setCombo(newCombo);
            setCoins(newCoins);
            return { ...c, collected: true };
          }
          return c;
        });
        
        setGameState(prev => ({ ...prev, score: newScore }));
        return updated;
      });

      // Power-up detection
      setPowerUps(prev => {
        const updated = prev.map(p => {
          const distance = Math.sqrt(
            Math.pow(player.x + CONFIG.PLAYER_WIDTH / 2 - p.x, 2) +
            Math.pow(player.y + CONFIG.PLAYER_HEIGHT / 2 - p.y, 2)
          );
          
          if (!p.collected && distance < 45) {
            console.log('POWERUP COLLECTED:', p.type);
            if (p.type === 'shield') {
              setPlayer(prev => ({ ...prev, shield: true }));
              setTimeout(() => {
                setPlayer(prev => ({ ...prev, shield: false }));
              }, 5000);
            } else if (p.type === 'speed') {
              setGameState(prev => ({ ...prev, speed: Math.min(CONFIG.MAX_SPEED, prev.speed + 2) }));
              setTimeout(() => {
                setGameState(prev => ({ ...prev, speed: Math.max(CONFIG.INITIAL_SPEED, prev.speed - 2) }));
              }, 3000);
            } else if (p.type === 'magnet') {
              // Magnet attire les pièces proches
              setCollectibles(cols => {
                return cols.map(c => {
                  if (!c.collected) {
                    const dist = Math.sqrt(
                      Math.pow(player.x + CONFIG.PLAYER_WIDTH / 2 - c.x, 2) +
                      Math.pow(player.y + CONFIG.PLAYER_HEIGHT / 2 - c.y, 2)
                    );
                    if (dist < 150) {
                      return { ...c, x: c.x + (player.x - c.x) * 0.1, y: c.y + (player.y - c.y) * 0.1 };
                    }
                  }
                  return c;
                });
              });
              setTimeout(() => {
                // Arrêter l'effet magnétique
              }, 5000);
            }
            return { ...p, collected: true };
          }
          return p;
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
  }, [gameState.isPlaying, gameState.isPaused, gameState.speed, gameState.score, player.x, player.y, player.shield, combo, coins, endGame, onScoreUpdate]);

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

  const getPowerUpIcon = (type: PowerUp['type']) => {
    const icons = {
      shield: '🛡️',
      speed: '🚀',
      magnet: '🧲',
    };
    return icons[type];
  };

  // Menu screen
  if (!gameState.isPlaying && !gameState.isGameOver) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] p-8 text-center">
        <animated.div style={titleSpring}>
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
              <ArrowUp className="w-5 h-5 text-brass" />
              <ArrowDown className="w-5 h-5 text-brass" />
              <ArrowLeft className="w-5 h-5 text-brass" />
              <ArrowRight className="w-5 h-5 text-brass" />
              <span className="text-sm">Maintiens pour te déplacer</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-parchment-muted">
              <Coins className="w-5 h-5 text-brass" />
              <span className="text-sm">Collecte les pièces et gemmes</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-parchment-muted">
              <Target className="w-5 h-5 text-brass" />
              <span className="text-sm">Évite les obstacles</span>
            </div>
          </div>
          
          <button
            onClick={startGame}
            className="group bg-gradient-to-r from-brass to-teal text-ink font-bold px-12 py-4 rounded-xl text-xl shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105 flex items-center gap-3 mx-auto touch-manipulation"
          >
            <Play className="w-6 h-6" />
            <span>Commencer</span>
          </button>
          
          {gameState.highScore > 0 && (
            <div className="mt-8 flex items-center justify-center gap-2 text-parchment-muted">
              <Trophy className="w-5 h-5 text-brass" />
              <span className="font-mono">Meilleur score: {gameState.highScore}</span>
            </div>
          )}
        </animated.div>
      </div>
    );
  }

  // Game over screen
  if (gameState.isGameOver) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] p-8 text-center">
        <animated.div style={titleSpring}>
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
            <div className="mb-8 flex items-center justify-center gap-2 text-teal font-semibold">
              <Trophy className="w-6 h-6" />
              <span>Nouveau record !</span>
            </div>
          )}
          
          <button
            onClick={startGame}
            className="group bg-gradient-to-r from-brass to-teal text-ink font-bold px-12 py-4 rounded-xl text-xl shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105 flex items-center gap-3 mx-auto touch-manipulation"
          >
            <RotateCcw className="w-6 h-6" />
            <span>Rejouer</span>
          </button>
        </animated.div>
      </div>
    );
  }

  // Paused screen
  if (gameState.isPaused) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] p-8 text-center">
        <animated.div style={titleSpring}>
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
            <button
              onClick={resumeGame}
              className="group bg-gradient-to-r from-brass to-teal text-ink font-bold px-8 py-4 rounded-xl text-lg shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105 flex items-center gap-3 touch-manipulation"
            >
              <Play className="w-5 h-5" />
              <span>Reprendre</span>
            </button>
            <button
              onClick={endGame}
              className="border-2 border-ink-line text-parchment px-8 py-4 rounded-xl text-lg hover:border-brass hover:text-brass transition-all flex items-center gap-3 touch-manipulation"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Quitter</span>
            </button>
          </div>
        </animated.div>
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
            <animated.p className="font-mono text-2xl text-brass font-bold">
              {scoreSpring.number.to(n => Math.round(n))}
            </animated.p>
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
        
        <div className="flex items-center gap-3">
          {combo > 0 && (
            <div className="flex items-center gap-2 bg-brass/20 px-3 py-1 rounded-full border border-brass">
              <Zap className="w-4 h-4 text-brass" />
              <span className="font-mono text-sm text-brass">x{combo}</span>
            </div>
          )}
          {player.shield && (
            <div className="flex items-center gap-2 bg-teal/20 px-3 py-1 rounded-full border border-teal">
              <Shield className="w-4 h-4 text-teal" />
              <span className="text-sm text-teal">Shield</span>
            </div>
          )}
          <button
            onClick={pauseGame}
            className="p-3 rounded-xl border border-ink-line text-parchment-muted hover:border-brass hover:text-brass transition-all touch-manipulation"
          >
            <Pause className="w-5 h-5" />
          </button>
        </div>
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
          <div className="relative">
            {player.shield && (
              <div className="absolute -inset-3 rounded-full border-4 border-teal opacity-60 animate-pulse" />
            )}
            <div className="text-4xl">🏃‍♂️</div>
          </div>
        </div>

        {/* Obstacles modernes */}
        {obstacles.map(obs => (
          <div
            key={obs.id}
            className="absolute flex items-center justify-center rounded-lg shadow-lg transition-all"
            style={{
              left: `${obs.x}px`,
              top: `${obs.y}px`,
              width: `${obs.width}px`,
              height: `${obs.height}px`,
              background: obs.type === 'laser' ? 'linear-gradient(180deg, #C9A227, #B4462F)' : 'rgba(180, 70, 47, 0.85)',
              border: '2px solid #C9A227',
            }}
          >
            <div className="text-2xl">{getObstacleIcon(obs.type)}</div>
          </div>
        ))}

        {/* Collectibles (pièces inspiré des jeux de plateforme) */}
        {collectibles.map(c => (
          <div
            key={c.id}
            className="absolute flex items-center justify-center rounded-full shadow-lg transition-all animate-bounce"
            style={{
              left: `${c.x}px`,
              top: `${c.y}px`,
              width: '35px',
              height: '35px',
              background: c.type === 'coin' ? 'rgba(201, 162, 39, 0.9)' : c.type === 'gem' ? 'rgba(47, 111, 107, 0.9)' : 'rgba(180, 70, 47, 0.9)',
              border: '2px solid #EDEAE0',
            }}
          >
            <div className="text-xl">{getCollectibleIcon(c.type)}</div>
          </div>
        ))}

        {/* Power-ups modernes */}
        {powerUps.map(p => (
          <div
            key={p.id}
            className="absolute flex items-center justify-center rounded-full shadow-lg transition-all animate-pulse"
            style={{
              left: `${p.x}px`,
              top: `${p.y}px`,
              width: '40px',
              height: '40px',
              background: p.type === 'shield' ? 'rgba(47, 111, 107, 0.9)' : p.type === 'speed' ? 'rgba(201, 162, 39, 0.9)' : 'rgba(180, 70, 47, 0.9)',
              border: '2px solid #EDEAE0',
            }}
          >
            <div className="text-xl">{getPowerUpIcon(p.type)}</div>
          </div>
        ))}

        {/* Tutorial overlay moderne */}
        {showTutorial && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-ink-panel border-2 border-brass px-8 py-4 rounded-2xl shadow-2xl">
              <div className="flex items-center gap-3">
                <Zap className="w-6 h-6 text-brass" />
                <p className="font-semibold text-lg text-parchment">Utilise les flèches pour te déplacer</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contrôles mobile D-pad */}
      <div className="mt-6 flex flex-col items-center gap-4 sm:hidden">
        <button
          onTouchStart={(e) => { e.preventDefault(); startMovingUp(); }}
          onTouchEnd={(e) => { e.preventDefault(); stopMoving(); }}
          className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-brass bg-brass/20 text-2xl active:bg-brass/40 touch-manipulation"
        >
          <ArrowUp className="w-6 h-6 text-brass" />
        </button>
        <div className="flex gap-4">
          <button
            onTouchStart={(e) => { e.preventDefault(); startMovingLeft(); }}
            onTouchEnd={(e) => { e.preventDefault(); stopMoving(); }}
            className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-brass bg-brass/20 text-2xl active:bg-brass/40 touch-manipulation"
          >
            <ArrowLeft className="w-6 h-6 text-brass" />
          </button>
          <button
            onTouchStart={(e) => { e.preventDefault(); startMovingRight(); }}
            onTouchEnd={(e) => { e.preventDefault(); stopMoving(); }}
            className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-brass bg-brass/20 text-2xl active:bg-brass/40 touch-manipulation"
          >
            <ArrowRight className="w-6 h-6 text-brass" />
          </button>
        </div>
        <button
          onTouchStart={(e) => { e.preventDefault(); startMovingDown(); }}
          onTouchEnd={(e) => { e.preventDefault(); stopMoving(); }}
          className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-brass bg-brass/20 text-2xl active:bg-brass/40 touch-manipulation"
        >
          <ArrowDown className="w-6 h-6 text-brass" />
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