'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { api, getApiErrorMessage } from '../../../lib/api';
import { AppHeader } from '../../../components/app-header';
import { HelpButton } from '../../../components/help-button';
import { RoundGame, SpotGame } from '../../../components/round-game';
import { Confetti } from '../../../components/confetti';
import { ProgressBar, LevelUp } from '../../../components/progress-bar';
import { TiltCard } from '../../../components/tilt-card';
import { StreakBadge, StreakProgress } from '../../../components/streak-badge';

interface TeamSummary {
  id: string;
  name: string;
  color: string;
  energy: number;
  energyThreshold: number;
}

interface TodayChallenge {
  id: string;
  type: 'QUIZ' | 'RIDDLE' | 'MEMORY' | 'REFLEX' | 'POLL' | 'SPOT';
  title: string;
  difficulty: number;
  content: Record<string, unknown>;
  alreadyPlayed: boolean;
  previousScore: number | null;
}

interface RaidSummary {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS';
  attackerTeam: { name: string; color: string };
  defenderTeam: { name: string; color: string };
  territory: { name: string };
}

interface AttemptResult {
  score: number;
  energyEarned: number;
  experienceEarned: number;
}

interface PlayerProgress {
  challengesCompleted: number;
  experiencePoints: number;
  level: number;
  levelProgress: number;
  levelSize: number;
  badges: { id: string; title: string; description: string; unlocked: boolean }[];
  streak?: number;
}

interface WeeklyGoal {
  completed: number;
  target: number;
  percent: number;
  endsAt: string;
}

export default function DashboardPage() {
  const [team, setTeam] = useState<TeamSummary | null>(null);
  const [challenges, setChallenges] = useState<TodayChallenge[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [raids, setRaids] = useState<RaidSummary[]>([]);
  const [playerProgress, setPlayerProgress] = useState<PlayerProgress | null>(null);
  const [weeklyGoal, setWeeklyGoal] = useState<WeeklyGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [previousLevel, setPreviousLevel] = useState(0);

  const [answerErrors, setAnswerErrors] = useState<Record<string, string>>({});
  const [attemptResults, setAttemptResults] = useState<Record<string, AttemptResult>>({});
  const [submittingChallengeId, setSubmittingChallengeId] = useState<string | null>(null);
  const startedAt = useRef<number>(Date.now());
  const challenge = challenges.find((item) => item.id === selectedChallengeId) ?? challenges[0] ?? null;
  const attemptResult = challenge ? attemptResults[challenge.id] ?? null : null;
  const answerError = challenge ? answerErrors[challenge.id] ?? null : null;
  const submitting = submittingChallengeId !== null;

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, raidsRes] = await Promise.all([
          api.get('/users/me'),
          api.get<RaidSummary[]>('/raids/active'),
        ]);
        setTeam(profileRes.data.team);
        setRaids(raidsRes.data);

        const [progressResult, goalResult] = await Promise.allSettled([
          api.get<PlayerProgress>('/users/me/performance'),
          api.get<WeeklyGoal>('/challenges/weekly-goal'),
        ]);
        if (progressResult.status === 'fulfilled') setPlayerProgress(progressResult.value.data);
        if (goalResult.status === 'fulfilled') setWeeklyGoal(goalResult.value.data);

        // Le défi du jour est indépendant : son absence (pas encore d'équipe) ne doit pas casser le reste
        try {
          const challengeRes = await api.get<TodayChallenge[]>('/challenges/today');
          setChallenges(challengeRes.data);
          setSelectedChallengeId(
            challengeRes.data.find((item) => !item.alreadyPlayed)?.id ?? challengeRes.data[0]?.id ?? null,
          );
          startedAt.current = Date.now();
        } catch {
          setChallenges([]);
        }
      } catch (error) {
        setLoadError(getApiErrorMessage(error, 'Impossible de charger le dashboard.'));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    let active = true;
    let requestInFlight = false;

    async function refreshRaids() {
      if (requestInFlight || !navigator.onLine || document.visibilityState !== 'visible') return;
      requestInFlight = true;
      try {
        const { data } = await api.get<RaidSummary[]>('/raids/active');
        if (active) setRaids(data);
      } catch {
        // Keep the last known raids visible during transient network failures.
      } finally {
        requestInFlight = false;
      }
    }

    const interval = setInterval(refreshRaids, 4000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refreshRaids();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('online', onVisibilityChange);

    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('online', onVisibilityChange);
    };
  }, []);

  function selectChallenge(challengeId: string) {
    setSelectedChallengeId(challengeId);
    startedAt.current = Date.now();
  }

  async function submitChallenge(challengeId: string, answerData: Record<string, unknown>) {
    setAnswerErrors((current) => ({ ...current, [challengeId]: '' }));
    setSubmittingChallengeId(challengeId);
    try {
      const timeTakenSeconds = Math.round((Date.now() - startedAt.current) / 1000);
      const { data } = await api.post<AttemptResult>(`/challenges/${challengeId}/attempt`, {
        answerData,
        timeTakenSeconds,
      });
      const experienceEarned = data.experienceEarned ?? 10 + Math.floor(data.score / 10);
      setAttemptResults((current) => ({ ...current, [challengeId]: { ...data, experienceEarned } }));
      setChallenges((current) => current.map((item) => item.id === challengeId
        ? { ...item, alreadyPlayed: true, previousScore: data.score }
        : item));
      setPlayerProgress((current) => {
        if (!current || typeof current.experiencePoints !== 'number') return current;
        const challengesCompleted = (current.challengesCompleted ?? 0) + 1;
        const experiencePoints = current.experiencePoints + experienceEarned;
        const newLevel = Math.floor(experiencePoints / current.levelSize) + 1;
        
        if (newLevel > current.level) {
          setPreviousLevel(current.level);
          setShowLevelUp(true);
          setShowConfetti(true);
          setTimeout(() => setShowLevelUp(false), 2000);
          setTimeout(() => setShowConfetti(false), 3000);
        }
        
        if (data.score === 100) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
        }
        
        return {
          ...current,
          challengesCompleted,
          experiencePoints,
          level: newLevel,
          levelProgress: experiencePoints % current.levelSize,
          badges: (current.badges ?? []).map((badge) => ({
            ...badge,
            unlocked: badge.unlocked ||
              (badge.id === 'first-challenge' && challengesCompleted >= 1) ||
              (badge.id === 'five-challenges' && challengesCompleted >= 5) ||
              (badge.id === 'twenty-challenges' && challengesCompleted >= 20) ||
              (badge.id === 'perfect-score' && data.score === 100),
          })),
        };
      });
      setWeeklyGoal((current) => current ? {
        ...current,
        completed: current.completed + 1,
        percent: Math.min(100, Math.round(((current.completed + 1) / current.target) * 100)),
      } : current);
      if (team) {
        setTeam((t) => (t ? { ...t, energy: t.energy + data.energyEarned } : t));
      }
    } catch (error) {
      setAnswerErrors((current) => ({
        ...current,
        [challengeId]: getApiErrorMessage(error, "La soumission a échoué."),
      }));
    } finally {
      setSubmittingChallengeId(null);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-line border-t-brass" />
      </main>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        {loadError && (
          <div role="alert" className="mb-6 border border-danger bg-danger/10 px-4 py-3 text-sm text-danger">
            {loadError}
          </div>
        )}

        {!team && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border border-teal/50 bg-teal/10 px-4 py-3 text-sm text-parchment">
            <p>
              Mode solo actif. Tes défis font progresser ton profil; une équipe reste facultative.
            </p>
            <Link href="/profile" className="shrink-0 text-brass hover:underline">
              Voir les équipes
            </Link>
          </div>
        )}

        {playerProgress && (
          <TiltCard className="mb-6 border border-ink-line px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="font-display text-lg text-parchment">Ta progression</h2>
              <div className="flex items-center gap-3">
                {playerProgress.streak && playerProgress.streak > 0 && (
                  <StreakBadge count={playerProgress.streak} />
                )}
                <p className="font-mono text-sm text-brass">
                  Niveau {playerProgress.level} · {playerProgress.experiencePoints} XP
                </p>
              </div>
            </div>
            <ProgressBar
              value={playerProgress.levelProgress}
              max={playerProgress.levelSize}
              color="#2F6F6B"
              size="md"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {playerProgress.badges.map((badge) => (
                <motion.span
                  key={badge.id}
                  title={badge.description}
                  className={`border px-2 py-1 text-xs ${badge.unlocked ? 'border-brass/60 text-brass' : 'border-ink-line text-parchment-muted'}`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {badge.title}
                </motion.span>
              ))}
            </div>
          </TiltCard>
        )}

        {weeklyGoal && (
          <TiltCard className="mb-6 border border-ink-line px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <div>
                <h2 className="font-display text-base text-parchment">Objectif commun de la semaine</h2>
                <p className="mt-1 text-xs text-parchment-muted">Chaque défi joué compte, en équipe comme en solo.</p>
              </div>
              <p className="font-mono text-sm text-teal">{weeklyGoal.completed} / {weeklyGoal.target}</p>
            </div>
            <ProgressBar
              value={Math.min(weeklyGoal.target, weeklyGoal.completed)}
              max={weeklyGoal.target}
              color="#C9A227"
              size="md"
            />
            {weeklyGoal.completed >= weeklyGoal.target && (
              <motion.p 
                className="mt-2 text-xs text-teal"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                Objectif atteint, bravo à toute la communauté ! 🎉
              </motion.p>
            )}
          </TiltCard>
        )}

        <div className="grid gap-6 md:grid-cols-[1fr_280px]">
          {/* --- Colonne principale : défi du jour --- */}
          <div className="space-y-6">
            {/* Carte Jeu Solo */}
            <TiltCard className="border border-teal/50 bg-teal/5 px-4 py-4 sm:px-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🏃‍♂️</span>
                  <div>
                    <h3 className="font-display text-base text-parchment">Le Bureau Infini</h3>
                    <p className="text-xs text-parchment-muted">Mode solo hors-ligne</p>
                  </div>
                </div>
                <Link
                  href="/solo"
                  className="border border-teal bg-teal/20 px-4 py-2 text-sm font-medium text-parchment transition hover:bg-teal/30"
                >
                  Jouer
                </Link>
              </div>
            </TiltCard>

            <section className="border border-ink-line">
            <div className="flex items-center justify-between border-b border-ink-line px-4 py-3 sm:px-5">
              <h2 className="font-display text-base text-parchment sm:text-lg">
                Défi du jour
              </h2>
              <HelpButton
                title="Comment ça marche ?"
                content={[
                  "Joue chaque défi du jour une fois; tu peux jouer seul, sans équipe.",
                  "Chaque participation rapporte 10 XP, même si tu rates ta réponse.",
                  "Une bonne réponse rapporte aussi un score; si tu as une équipe, ce score lui donne de l'énergie.",
                  "Un sondage n'a pas de bonne réponse et ne donne ni score compétitif ni énergie; il fait avancer l'objectif commun.",
                  "Memory propose une séquence de couleurs ou des paires d'icônes. Trouve l'intrus consiste à choisir l'icône différente.",
                  "Réflexe : attends le signal aléatoire du serveur, puis clique la cible le plus vite possible.",
                  "Quand l'énergie d'une équipe atteint son seuil, elle lance automatiquement un raid et dépense ce seuil.",
                  "Un raid gagné permet à l'attaquant de prendre le territoire; le défenseur le garde s'il gagne; une égalité ne change rien.",
                  "Un raid non commencé expire après 24 h et son énergie est rendue.",
                  "L'objectif hebdomadaire compte les défis joués par toute la communauté."
                ]}
              />
            </div>
            <div className="px-4 py-4 sm:px-5 sm:py-5">
              {!challenge && (
                <p className="text-sm text-parchment-muted">
                  Pas de défi disponible aujourd&apos;hui — reviens demain.
                </p>
              )}

              {challenges.length > 1 && (
                <div className="mb-5">
                  <label htmlFor="daily-challenge" className="mb-1.5 block text-sm text-parchment-muted">
                    Défis du jour ({challenges.filter((item) => item.alreadyPlayed).length}/{challenges.length} joués)
                  </label>
                  <select
                    id="daily-challenge"
                    value={challenge?.id ?? ''}
                    onChange={(event) => selectChallenge(event.target.value)}
                    disabled={submitting}
                    className="w-full border border-ink-line bg-ink-panel px-3 py-2.5 text-sm text-parchment focus:border-brass disabled:opacity-50"
                  >
                    {challenges.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title} · {item.alreadyPlayed ? `Joué (${item.previousScore})` : 'À jouer'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {challenge && <h3 className="mb-4 font-display text-lg text-parchment">{challenge.title}</h3>}

              {challenge && challenge.alreadyPlayed && !attemptResult && (
                <p className="text-sm text-teal">
                  {challenge.type === 'POLL'
                    ? 'Vote déjà enregistré.'
                    : `Défi déjà joué — score : ${challenge.previousScore}.`}
                  {challenges.some((item) => !item.alreadyPlayed) && ' Tu peux encore jouer les autres défis.'}
                </p>
              )}

              {attemptResult && (
                <div className="animate-capture border border-brass px-4 py-3">
                  {challenge?.type === 'POLL' ? (
                    <p className="text-parchment">Choix enregistré, merci d&apos;avoir participé !</p>
                  ) : attemptResult.score === 0 ? (
                    <p className="text-parchment">Partie enregistrée, bien joué d&apos;avoir participé !</p>
                  ) : (
                    <p className="text-parchment">
                      Score : <span className="font-mono text-brass">{attemptResult.score}</span>
                    </p>
                  )}
                  <p className="text-sm text-parchment-muted">
                    +{attemptResult.experienceEarned} XP pour ton profil
                    {team && challenge?.type !== 'POLL' && <> · +{attemptResult.energyEarned} énergie pour ton équipe</>}
                  </p>
                </div>
              )}

              {challenge && !challenge.alreadyPlayed && !attemptResult && (
                <ChallengeForm
                  key={challenge.id}
                  challenge={challenge}
                  onSubmit={(answerData) => submitChallenge(challenge.id, answerData)}
                  submitting={submitting}
                  error={answerError}
                />
              )}
            </div>
          </section>
          </div>

          {/* --- Colonne latérale : équipe + raids --- */}
          <aside className="space-y-6">
            {team && (
              <TiltCard className="border border-ink-line">
                <h2 className="border-b border-ink-line px-4 py-3 font-display text-sm text-parchment sm:px-5 sm:text-base">
                  {team.name}
                </h2>
                <div className="px-4 py-3 sm:px-5 sm:py-4">
                  <div className="mb-1.5 flex justify-between font-mono text-xs text-parchment-muted">
                    <span>Énergie</span>
                    <span>
                      {team.energy} / {team.energyThreshold}
                    </span>
                  </div>
                  <ProgressBar
                    value={team.energy}
                    max={team.energyThreshold}
                    color="#C9A227"
                    size="sm"
                  />
                  <p className="mt-2 text-xs text-parchment-muted">
                    Un raid se déclenche automatiquement au seuil.
                  </p>
                </div>
              </TiltCard>
            )}

            <section className="border border-ink-line">
              <div className="flex items-center justify-between border-b border-ink-line px-4 py-3 sm:px-5">
                <h2 className="font-display text-sm text-parchment sm:text-base">
                  Raids actifs
                </h2>
                <HelpButton
                  title="Les raids"
                  content={[
                    "L'attaquant dépense son seuil d'énergie au lancement, que le raid soit gagné ou perdu.",
                    "Seuls les membres des équipes attaquante et défenseuse peuvent rejoindre et répondre.",
                    "Le raid comprend 3 manches : Quiz, Réflexe et Memory. Chaque membre peut répondre une fois par manche.",
                    "L'attaquant prend le territoire s'il gagne; le défenseur le conserve s'il gagne; en cas d'égalité, le propriétaire ne change pas.",
                    "Un raid encore en attente après 24 h est annulé et l'énergie de l'attaquant est remboursée."
                  ]}
                />
              </div>
              <div className="divide-y divide-ink-line">
                {raids.length === 0 && (
                  <p className="px-5 py-4 text-sm text-parchment-muted">Aucun raid en cours.</p>
                )}
                {raids.map((raid) => (
                  <Link
                    key={raid.id}
                    href={`/raid/${raid.id}`}
                    className="block px-5 py-3 text-sm transition hover:bg-ink-panel"
                  >
                    <p className="text-parchment">
                      {raid.attackerTeam.name} → {raid.defenderTeam.name}
                    </p>
                    <p className="font-mono text-xs text-parchment-muted">
                      {raid.territory.name} · {raid.status === 'PENDING' ? 'en attente' : 'en cours'}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </main>
      <Confetti trigger={showConfetti} />
      {showLevelUp && <LevelUp level={playerProgress?.level ?? 1} />}
    </>
  );
}

// --- Sous-composant : formulaire adapté au type de défi ---
function ChallengeForm({
  challenge,
  onSubmit,
  submitting,
  error,
}: {
  challenge: TodayChallenge;
  onSubmit: (answerData: Record<string, unknown>) => void;
  submitting: boolean;
  error: string | null;
}) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [riddleAnswer, setRiddleAnswer] = useState('');

  if (challenge.type === 'REFLEX') {
    return (
      <DailyReflexChallenge
        challengeId={challenge.id}
        onSubmit={onSubmit}
        submitting={submitting}
        error={error}
      />
    );
  }

  if (challenge.type === 'SPOT') {
    return <SpotGame content={challenge.content} onAnswer={onSubmit} disabled={submitting} />;
  }

  if (challenge.type === 'QUIZ' || challenge.type === 'POLL') {
    const content = challenge.content as { question: string; options: string[] };
    return (
      <div>
        <p className="mb-4 text-parchment">{content.question}</p>
        {challenge.type === 'POLL' && (
          <p className="mb-3 text-xs text-teal">Pas de bonne ou mauvaise réponse. Ton vote rapporte de l&apos;XP et fait avancer l&apos;objectif commun.</p>
        )}
        <div className="space-y-2">
          {content.options?.map((option) => (
            <button
              key={option}
              onClick={() => setSelectedOption(option)}
              className={`block w-full border px-4 py-2.5 text-left text-sm transition ${
                selectedOption === option
                  ? 'border-brass text-brass'
                  : 'border-ink-line text-parchment hover:border-parchment-muted'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        {error && <p className="mt-3 text-xs text-danger">{error}</p>}
        <button
          onClick={() => selectedOption && onSubmit({ selectedOption })}
          disabled={!selectedOption || submitting}
          className="mt-4 border border-brass bg-brass px-4 py-2 text-sm font-medium text-ink transition hover:bg-transparent hover:text-brass disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Envoi…' : challenge.type === 'POLL' ? 'Envoyer mon choix' : 'Valider'}
        </button>
      </div>
    );
  }

  if (challenge.type === 'RIDDLE') {
    const content = challenge.content as { question: string };
    return (
      <div>
        <p className="mb-4 text-parchment">{content.question}</p>
        <input
          type="text"
          value={riddleAnswer}
          onChange={(e) => setRiddleAnswer(e.target.value)}
          placeholder="Ta réponse"
          className="w-full border border-ink-line bg-ink-panel px-3 py-2.5 text-parchment placeholder:text-parchment-muted/50 focus:border-brass"
        />
        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        <button
          onClick={() => riddleAnswer.trim() && onSubmit({ answer: riddleAnswer })}
          disabled={!riddleAnswer.trim() || submitting}
          className="mt-4 border border-brass bg-brass px-4 py-2 text-sm font-medium text-ink transition hover:bg-transparent hover:text-brass disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Envoi…' : 'Valider'}
        </button>
      </div>
    );
  }

  if (challenge.type === 'MEMORY') {
    return (
      <div>
        <RoundGame
          roundId={challenge.id}
          type={challenge.type}
          content={challenge.content}
          onAnswer={onSubmit}
          disabled={submitting}
        />
        {error && <p className="mt-3 text-xs text-danger">{error}</p>}
      </div>
    );
  }

  return null;
}

function DailyReflexChallenge({
  challengeId,
  onSubmit,
  submitting,
  error,
}: {
  challengeId: string;
  onSubmit: (answerData: Record<string, unknown>) => void;
  submitting: boolean;
  error: string | null;
}) {
  const [roundKey, setRoundKey] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'waiting' | 'ready' | 'error'>('loading');
  const [reflexToken, setReflexToken] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setPhase('loading');
    setStartError(null);
    setReflexToken(null);

    api.post<{ token: string; readyInMs: number }>(`/challenges/${challengeId}/reflex/start`)
      .then(({ data }) => {
        if (cancelled) return;
        setReflexToken(data.token);
        setPhase('waiting');
        timer = setTimeout(() => {
          if (!cancelled) setPhase('ready');
        }, data.readyInMs);
      })
      .catch((requestError) => {
        if (cancelled) return;
        setStartError(getApiErrorMessage(requestError, 'Impossible de préparer le signal.'));
        setPhase('error');
      });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [challengeId, roundKey]);

  function retry() {
    setRetrying(true);
    setRoundKey((current) => current + 1);
  }

  function answer() {
    if (!reflexToken) return;
    setRetrying(false);
    onSubmit({ reflexToken });
  }

  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <p className="text-sm text-parchment-muted" aria-live="polite">
        {phase === 'loading' ? 'Préparation du signal…' :
          phase === 'waiting' ? 'Attends que la cible apparaisse…' :
            phase === 'ready' ? 'Maintenant ! Clique sur la cible.' :
              startError}
      </p>
      {phase === 'ready' ? (
        <button
          type="button"
          onClick={answer}
          disabled={submitting}
          aria-label="Cliquer sur la cible réflexe"
          className="h-32 w-32 animate-pulse rounded-full border-4 border-teal bg-teal text-ink transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Envoi…' : 'CLIQUE !'}
        </button>
      ) : (
        <div aria-hidden="true" className="h-32 w-32 rounded-full border-2 border-ink-line bg-ink-panel" />
      )}
      {error && !retrying && <p role="alert" className="text-xs text-danger">{error}</p>}
      {phase === 'error' && (
        <button
          type="button"
          onClick={retry}
          className="border border-ink-line px-4 py-2 text-sm text-parchment hover:border-brass hover:text-brass"
        >
          Réessayer
        </button>
      )}
      {phase === 'ready' && error && !retrying && (
        <button
          type="button"
          onClick={retry}
          className="border border-ink-line px-4 py-2 text-sm text-parchment hover:border-brass hover:text-brass"
        >
          Relancer le signal
        </button>
      )}
    </div>
  );
}