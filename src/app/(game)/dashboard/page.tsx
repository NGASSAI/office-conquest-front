'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api, getApiErrorMessage } from '../../../lib/api';
import { AppHeader } from '../../../components/app-header';
import { RoundGame } from '../../../components/round-game';

interface TeamSummary {
  id: string;
  name: string;
  color: string;
  energy: number;
  energyThreshold: number;
}

interface TodayChallenge {
  id: string;
  type: 'QUIZ' | 'RIDDLE' | 'MEMORY' | 'REFLEX';
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
}

export default function DashboardPage() {
  const [team, setTeam] = useState<TeamSummary | null>(null);
  const [challenge, setChallenge] = useState<TodayChallenge | null>(null);
  const [raids, setRaids] = useState<RaidSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [answerError, setAnswerError] = useState<string | null>(null);
  const [attemptResult, setAttemptResult] = useState<AttemptResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const startedAt = useRef<number>(Date.now());

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, raidsRes] = await Promise.all([
          api.get('/users/me'),
          api.get<RaidSummary[]>('/raids/active'),
        ]);
        setTeam(profileRes.data.team);
        setRaids(raidsRes.data);

        // Le défi du jour est indépendant : son absence (pas encore d'équipe) ne doit pas casser le reste
        try {
          const challengeRes = await api.get<TodayChallenge>('/challenges/today');
          setChallenge(challengeRes.data);
          startedAt.current = Date.now();
        } catch {
          setChallenge(null);
        }
      } catch (error) {
        setLoadError(getApiErrorMessage(error, 'Impossible de charger le dashboard.'));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function submitQuizOrRiddle(answerData: Record<string, unknown>) {
    if (!challenge) return;
    setAnswerError(null);
    setSubmitting(true);
    try {
      const timeTakenSeconds = Math.round((Date.now() - startedAt.current) / 1000);
      const { data } = await api.post<AttemptResult>(`/challenges/${challenge.id}/attempt`, {
        answerData,
        timeTakenSeconds,
      });
      setAttemptResult(data);
      setChallenge((c) => (c ? { ...c, alreadyPlayed: true } : c));
      if (team) {
        setTeam((t) => (t ? { ...t, energy: t.energy + data.energyEarned } : t));
      }
    } catch (error) {
      setAnswerError(getApiErrorMessage(error, "La soumission a échoué."));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-line border-t-brass" />
      </main>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-4xl px-6 py-10">
        {loadError && (
          <div role="alert" className="mb-6 border border-danger bg-danger/10 px-4 py-3 text-sm text-danger">
            {loadError}
          </div>
        )}

        {!team && (
          <div className="mb-8 border border-brass bg-brass/10 px-4 py-3 text-sm text-parchment">
            Tu n&apos;as pas encore rejoint d&apos;équipe.{' '}
            <Link href="/profile" className="text-brass hover:underline">
              Choisis-en une dans ton profil
            </Link>{' '}
            pour commencer à jouer.
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-[1fr_280px]">
          {/* --- Colonne principale : défi du jour --- */}
          <section className="border border-ink-line">
            <h2 className="border-b border-ink-line px-5 py-3 font-display text-lg text-parchment">
              Défi du jour
            </h2>
            <div className="px-5 py-5">
              {!challenge && (
                <p className="text-sm text-parchment-muted">
                  Pas de défi disponible aujourd&apos;hui — reviens demain.
                </p>
              )}

              {challenge && challenge.alreadyPlayed && !attemptResult && (
                <p className="text-sm text-teal">
                  Déjà joué aujourd&apos;hui — score : {challenge.previousScore}. Reviens demain.
                </p>
              )}

              {attemptResult && (
                <div className="animate-capture border border-brass px-4 py-3">
                  <p className="text-parchment">
                    Score : <span className="font-mono text-brass">{attemptResult.score}</span>
                  </p>
                  <p className="text-sm text-parchment-muted">
                    +{attemptResult.energyEarned} énergie pour ton équipe
                  </p>
                </div>
              )}

              {challenge && !challenge.alreadyPlayed && !attemptResult && (
                <ChallengeForm
                  challenge={challenge}
                  onSubmit={submitQuizOrRiddle}
                  submitting={submitting}
                  error={answerError}
                />
              )}
            </div>
          </section>

          {/* --- Colonne latérale : équipe + raids --- */}
          <aside className="space-y-6">
            {team && (
              <section className="border border-ink-line">
                <h2 className="border-b border-ink-line px-5 py-3 font-display text-base text-parchment">
                  {team.name}
                </h2>
                <div className="px-5 py-4">
                  <div className="mb-1.5 flex justify-between font-mono text-xs text-parchment-muted">
                    <span>Énergie</span>
                    <span>
                      {team.energy} / {team.energyThreshold}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-ink-line">
                    <div
                      className="h-full bg-brass transition-all"
                      style={{
                        width: `${Math.min(100, (team.energy / team.energyThreshold) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-parchment-muted">
                    Un raid se déclenche automatiquement au seuil.
                  </p>
                </div>
              </section>
            )}

            <section className="border border-ink-line">
              <h2 className="border-b border-ink-line px-5 py-3 font-display text-base text-parchment">
                Raids actifs
              </h2>
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

  if (challenge.type === 'QUIZ') {
    const content = challenge.content as { question: string; options: string[] };
    return (
      <div>
        <p className="mb-4 text-parchment">{content.question}</p>
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
          {submitting ? 'Envoi…' : 'Valider'}
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

  // MEMORY et REFLEX réutilisent le même moteur de mini-jeu que les manches de raid
  if (challenge.type === 'MEMORY' || challenge.type === 'REFLEX') {
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