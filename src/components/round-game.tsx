'use client';

import { useEffect, useRef, useState } from 'react';

interface RoundGameProps {
  roundId: string;
  type: 'QUIZ' | 'MEMORY' | 'REFLEX';
  content: Record<string, unknown>;
  onAnswer: (answerData: Record<string, unknown>) => void;
  disabled: boolean;
}

const MEMORY_COLOR_STYLES: Record<string, string> = {
  red: 'bg-danger',
  blue: 'bg-teal',
  green: 'bg-teal/60',
  yellow: 'bg-brass',
};

export function RoundGame({ roundId, type, content, onAnswer, disabled }: RoundGameProps) {
  // Remet le mini-jeu à zéro à chaque nouvelle manche (nouvel id = nouveau round)
  const key = roundId;

  if (type === 'QUIZ') return <QuizGame key={key} content={content} onAnswer={onAnswer} disabled={disabled} />;
  if (type === 'MEMORY') return <MemoryGame key={key} content={content} onAnswer={onAnswer} disabled={disabled} />;
  return <ReflexGame key={key} onAnswer={onAnswer} disabled={disabled} />;
}

function QuizGame({
  content,
  onAnswer,
  disabled,
}: {
  content: Record<string, unknown>;
  onAnswer: (a: Record<string, unknown>) => void;
  disabled: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const options = (content.options as string[]) ?? [];

  return (
    <div>
      <p className="mb-4 text-parchment">{content.question as string}</p>
      <div className="space-y-2">
        {options.map((option) => (
          <button
            key={option}
            disabled={disabled}
            onClick={() => setSelected(option)}
            className={`block w-full border px-4 py-2.5 text-left text-sm transition disabled:opacity-50 touch-manipulation ${
              selected === option ? 'border-brass text-brass' : 'border-ink-line text-parchment hover:border-parchment-muted'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      <button
        onClick={() => selected && onAnswer({ selectedOption: selected })}
        disabled={!selected || disabled}
        className="mt-4 border border-brass bg-brass px-4 py-2 text-sm font-medium text-ink transition hover:bg-transparent hover:text-brass disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
      >
        Valider
      </button>
    </div>
  );
}

function MemoryGame({
  content,
  onAnswer,
  disabled,
}: {
  content: Record<string, unknown>;
  onAnswer: (a: Record<string, unknown>) => void;
  disabled: boolean;
}) {
  if (content.mode === 'PAIRS') {
    return <PairsMemoryGame content={content} onAnswer={onAnswer} disabled={disabled} />;
  }

  return <SequenceMemoryGame content={content} onAnswer={onAnswer} disabled={disabled} />;
}

function SequenceMemoryGame({
  content,
  onAnswer,
  disabled,
}: {
  content: Record<string, unknown>;
  onAnswer: (a: Record<string, unknown>) => void;
  disabled: boolean;
}) {
  const sequence = (content.correctSequence as string[]) ?? [];
  const [phase, setPhase] = useState<'showing' | 'input'>('showing');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [input, setInput] = useState<string[]>([]);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setHighlightIndex(i);
      i++;
      if (i > sequence.length) {
        clearInterval(interval);
        setHighlightIndex(-1);
        setPhase('input');
      }
    }, 700);
    return () => clearInterval(interval);
  }, [sequence.length]);

  const colors = Object.keys(MEMORY_COLOR_STYLES);

  function onPick(color: string) {
    if (disabled || phase !== 'input') return;
    const next = [...input, color];
    setInput(next);
    if (next.length === sequence.length) {
      onAnswer({ sequence: next });
    }
  }

  return (
    <div>
      <p className="mb-4 text-sm text-parchment-muted">
        {phase === 'showing' ? 'Mémorise la séquence…' : 'Reproduis la séquence'}
      </p>
      <div className="grid grid-cols-4 gap-3">
        {colors.map((color, i) => (
          <button
            key={color}
            disabled={phase !== 'input' || disabled}
            onClick={() => onPick(color)}
            className={`h-16 border-2 transition disabled:cursor-not-allowed touch-manipulation ${MEMORY_COLOR_STYLES[color]} ${
              phase === 'showing' && sequence[highlightIndex] === color
                ? 'border-parchment opacity-100'
                : 'border-transparent opacity-40'
            }`}
          />
        ))}
      </div>
      {phase === 'input' && (
        <p className="mt-3 font-mono text-xs text-parchment-muted">
          {input.length} / {sequence.length}
        </p>
      )}
    </div>
  );
}

interface MemoryCard {
  id: number;
  symbol: string;
}

export function SpotGame({
  content,
  onAnswer,
  disabled,
}: {
  content: Record<string, unknown>;
  onAnswer: (answerData: Record<string, unknown>) => void;
  disabled: boolean;
}) {
  const symbols = (content.symbols as string[]) ?? [];
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  return (
    <div className="touch-manipulation">
      <p className="mb-4 text-sm text-parchment">{String(content.question ?? 'Trouve l’intrus.')}</p>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {symbols.map((symbol, index) => (
          <button
            key={`${symbol}-${index}`}
            type="button"
            onClick={() => setSelectedIndex(index)}
            disabled={disabled}
            aria-label={`Choisir l’icône ${symbol}, case ${index + 1}`}
            aria-pressed={selectedIndex === index}
            className={`flex aspect-square items-center justify-center border text-4xl transition sm:text-5xl touch-manipulation ${
              selectedIndex === index
                ? 'border-brass bg-brass/10 scale-[0.97]'
                : 'border-ink-line bg-ink-panel hover:border-parchment-muted'
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {symbol}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          if (selectedIndex !== null) onAnswer({ selectedSymbol: symbols[selectedIndex] });
        }}
        disabled={selectedIndex === null || disabled}
        className="mt-4 border border-brass bg-brass px-4 py-2 text-sm font-medium text-ink transition hover:bg-transparent hover:text-brass disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
      >
        {disabled ? 'Envoi…' : 'Valider mon choix'}
      </button>
    </div>
  );
}

function PairsMemoryGame({
  content,
  onAnswer,
  disabled,
}: {
  content: Record<string, unknown>;
  onAnswer: (a: Record<string, unknown>) => void;
  disabled: boolean;
}) {
  const pairSymbols = (content.pairSymbols as string[]) ?? [];
  const [cards] = useState<MemoryCard[]>(() => {
    const deck = pairSymbols.flatMap((symbol, index) => [
      { id: index * 2, symbol },
      { id: index * 2 + 1, symbol },
    ]);
    for (let index = deck.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
    }
    return deck;
  });
  const [revealedIds, setRevealedIds] = useState<number[]>([]);
  const [matchedSymbols, setMatchedSymbols] = useState<string[]>([]);
  const [pairAttempts, setPairAttempts] = useState(0);
  const [complete, setComplete] = useState(false);
  const mismatchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (mismatchTimer.current) clearTimeout(mismatchTimer.current);
  }, []);

  function reveal(card: MemoryCard) {
    if (
      disabled || complete || revealedIds.length === 2 || revealedIds.includes(card.id) ||
      matchedSymbols.includes(card.symbol)
    ) return;

    const nextRevealed = [...revealedIds, card.id];
    setRevealedIds(nextRevealed);
    if (nextRevealed.length < 2) return;

    const nextAttempts = pairAttempts + 1;
    setPairAttempts(nextAttempts);
    const firstCard = cards.find((item) => item.id === nextRevealed[0]);
    if (firstCard?.symbol === card.symbol) {
      const nextMatched = [...matchedSymbols, card.symbol];
      setMatchedSymbols(nextMatched);
      setRevealedIds([]);
      if (nextMatched.length === pairSymbols.length) {
        setComplete(true);
        onAnswer({ matchedSymbols: nextMatched, pairAttempts: nextAttempts });
      }
      return;
    }

    mismatchTimer.current = setTimeout(() => setRevealedIds([]), 700);
  }

  return (
    <div className="touch-manipulation">
      <p className="mb-1 text-sm text-parchment">Retourne deux cartes pour trouver une paire identique.</p>
      <p className="mb-4 text-xs text-parchment-muted">
        Paires trouvées : {matchedSymbols.length}/{pairSymbols.length} · Coups : {pairAttempts}
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
        {cards.map((card) => {
          const isRevealed = revealedIds.includes(card.id);
          const isMatched = matchedSymbols.includes(card.symbol);
          const isVisible = isRevealed || isMatched;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => reveal(card)}
              disabled={disabled || complete || isMatched || (revealedIds.length === 2 && !isRevealed)}
              aria-label={isVisible ? `Carte ${card.symbol}` : 'Révéler une carte'}
              aria-pressed={isVisible}
              className={`aspect-square border text-3xl transition-all duration-200 disabled:cursor-not-allowed touch-manipulation ${
                isMatched
                  ? 'scale-[0.97] border-teal bg-teal/20 text-parchment'
                  : isVisible
                    ? 'border-brass bg-ink-panel text-parchment'
                    : 'border-ink-line bg-ink-panel text-transparent hover:border-brass'
              }`}
            >
              {isVisible ? card.symbol : '?'}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ReflexGame({
  onAnswer,
  disabled,
}: {
  onAnswer: (a: Record<string, unknown>) => void;
  disabled: boolean;
}) {
  const [ready, setReady] = useState(false);
  const [clicked, setClicked] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    // Délai aléatoire avant que la cible apparaisse — le vrai chrono est côté serveur,
    // ceci n'est qu'un affichage pour rendre le mini-jeu jouable.
    const delay = 1000 + Math.random() * 2500;
    timeoutRef.current = setTimeout(() => setReady(true), delay);
    return () => clearTimeout(timeoutRef.current);
  }, []);

  function onClick() {
    if (!ready || clicked || disabled) return;
    setClicked(true);
    onAnswer({}); // le score est entièrement calculé par le serveur à partir de son horloge
  }

  return (
    <div className="flex flex-col items-center gap-4 py-6 touch-manipulation">
      <p className="text-sm text-parchment-muted">
        {clicked ? 'Envoyé — en attente des autres joueurs…' : ready ? 'Clique !' : 'Attends…'}
      </p>
      <button
        onClick={onClick}
        disabled={!ready || clicked || disabled}
        className={`h-32 w-32 rounded-full border-2 transition disabled:cursor-not-allowed touch-manipulation ${
          ready && !clicked ? 'animate-capture border-brass bg-brass' : 'border-ink-line bg-ink-panel'
        }`}
      />
    </div>
  );
}