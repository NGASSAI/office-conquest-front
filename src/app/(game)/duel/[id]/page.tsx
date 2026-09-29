'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, getApiErrorMessage } from '../../../../lib/api';
import { AppHeader } from '../../../../components/app-header';
import { RoundGame } from '../../../../components/round-game';
import { HelpButton } from '../../../../components/help-button';
import { useAuthStore } from '../../../../store/auth-store';

interface DuelDetail {
  id: string;
  type: 'QUIZ' | 'MEMORY' | 'REFLEX';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  content: Record<string, unknown>;
  scores: Record<string, number> | null;
  winnerId: string | null;
  player1Id: string;
  player2Id: string;
  player1: { pseudo: string };
  player2: { pseudo: string };
}

const POLL_INTERVAL_MS = 4000;

export default function DuelPlayPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);

  const [duel, setDuel] = useState<DuelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [reflexReady, setReflexReady] = useState(false);
  const load = useCallback((silent = false) => {
    return api
      .get<DuelDetail>(`/duels/${id}`)
      .then(({ data }) => {
        setDuel(data);
        setError(null);
        if (currentUser && data.scores?.[currentUser.id] !== undefined) setHasAnswered(true);
        return data;
      })
      .catch((e) => {
        if (!silent) setError(getApiErrorMessage(e, 'Impossible de charger ce duel.'));
        return null;
      });
  }, [id, currentUser]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  // Tant que le duel n'est pas terminé et qu'on attend l'adversaire, on vérifie périodiquement —
  // pas de WebSocket pour les duels (asynchrones par nature, contrairement aux raids).
  useEffect(() => {
    if (!duel || duel.status === 'COMPLETED') return;

    let requestInFlight = false;
    const refresh = async () => {
      if (requestInFlight || !navigator.onLine || document.visibilityState !== 'visible') return;
      requestInFlight = true;
      try {
        await load(true);
      } finally {
        requestInFlight = false;
      }
    };

    const interval = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('online', onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('online', onVisibilityChange);
    };
  }, [duel?.status, load]);

  async function onReflexReady() {
    try {
      await api.post(`/duels/${id}/ready`);
      setReflexReady(true);
    } catch (e) {
      setError(getApiErrorMessage(e, 'Impossible de démarrer.'));
    }
  }

  async function onAnswer(answerData: Record<string, unknown>) {
    setHasAnswered(true);
    try {
      const { data } = await api.post(`/duels/${id}/answer`, { answerData });
      setDuel((prev) => (prev ? { ...prev, status: data.bothPlayed ? 'COMPLETED' : 'IN_PROGRESS' } : prev));
      if (data.bothPlayed) load();
    } catch (e) {
      setError(getApiErrorMessage(e, 'La réponse a échoué.'));
      setHasAnswered(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-line border-t-brass" />
      </main>
    );
  }

  if (error || !duel || !currentUser) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto max-w-xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="border border-danger bg-danger/10 px-4 py-3 text-sm text-danger">
            {error ?? 'Duel introuvable.'}
          </div>
        </main>
      </>
    );
  }

  const opponent = currentUser.id === duel.player1Id ? duel.player2 : duel.player1;
  const isCompleted = duel.status === 'COMPLETED';

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border border-ink-line px-4 py-4 sm:px-5">
          <div className="flex items-center gap-4">
            <div>
              <p className="font-mono text-xs text-parchment-muted">Face à</p>
              <p className="text-lg text-parchment">{opponent.pseudo}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/duel" className="text-sm text-parchment-muted hover:text-brass">
              ← Retour
            </Link>
            <span className="font-mono text-xs uppercase text-brass">{duel.type}</span>
            <HelpButton
              title="Comment jouer ?"
              content={[
                "Quiz : choisis une option. Memory : reproduis la séquence. Réflexe : appuie sur Prêt puis clique dès que la cible apparaît.",
                "Tu n'as qu'une réponse par duel; vérifie ton choix avant de l'envoyer.",
                "Après ta réponse, tu peux quitter la page. Le résultat arrivera quand l'adversaire aura joué.",
                "Une défaite ou une égalité ne retire pas d'XP ni d'énergie d'équipe."
              ]}
            />
          </div>
        </div>

        {isCompleted && (
          <div className="animate-capture mb-8 border border-brass px-5 py-6 text-center">
            <p className="mb-1 font-display text-xl text-parchment">
              {!duel.winnerId
                ? 'Égalité'
                : duel.winnerId === currentUser.id
                  ? 'Tu as gagné !'
                  : `${opponent.pseudo} gagne`}
            </p>
            {duel.scores && (
              <p className="font-mono text-sm text-parchment-muted">
                {duel.scores[duel.player1Id] ?? 0} — {duel.scores[duel.player2Id] ?? 0}
              </p>
            )}
            <button
              onClick={() => router.push('/duel')}
              className="mt-4 border border-brass bg-brass px-4 py-2 text-sm font-medium text-ink transition hover:bg-transparent hover:text-brass"
            >
              Retour aux duels
            </button>
          </div>
        )}

        {!isCompleted && hasAnswered && (
          <div className="border border-ink-line px-5 py-6 text-center text-sm text-parchment-muted">
            Réponse envoyée; le résultat se met à jour automatiquement pendant que tu attends {opponent.pseudo}…
          </div>
        )}

        {!isCompleted && !hasAnswered && duel.type === 'REFLEX' && !reflexReady && (
          <div className="border border-ink-line px-5 py-6 text-center">
            <p className="mb-4 text-sm text-parchment-muted">
              Le chrono démarre côté serveur dès que tu cliques sur Prêt.
            </p>
            <button
              onClick={onReflexReady}
              className="border border-brass bg-brass px-4 py-2 text-sm font-medium text-ink transition hover:bg-transparent hover:text-brass"
            >
              Prêt
            </button>
          </div>
        )}

        {!isCompleted && !hasAnswered && (duel.type !== 'REFLEX' || reflexReady) && (
          <section className="border border-ink-line px-5 py-5">
            <RoundGame
              roundId={duel.id}
              type={duel.type}
              content={duel.content}
              onAnswer={onAnswer}
              disabled={hasAnswered}
            />
          </section>
        )}
      </main>
    </>
  );
}