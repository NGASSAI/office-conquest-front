'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, getApiErrorMessage } from '../../../lib/api';
import { AppHeader } from '../../../components/app-header';
import { HelpButton } from '../../../components/help-button';

interface Colleague {
  id: string;
  pseudo: string;
  teamId: string | null;
}

interface DuelSummary {
  id: string;
  type: 'QUIZ' | 'MEMORY' | 'REFLEX';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  winnerId: string | null;
  player1Id: string;
  player2Id: string;
  player1: { pseudo: string };
  player2: { pseudo: string };
}

const DUEL_TYPES: { value: DuelSummary['type']; label: string }[] = [
  { value: 'QUIZ', label: 'Quiz éclair' },
  { value: 'MEMORY', label: 'Mémoire' },
  { value: 'REFLEX', label: 'Réflexe' },
];

export default function DuelLobbyPage() {
  const router = useRouter();
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [myDuels, setMyDuels] = useState<DuelSummary[]>([]);
  const [selectedOpponent, setSelectedOpponent] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<DuelSummary['type']>('QUIZ');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.get<Colleague[]>('/users/directory'), api.get<DuelSummary[]>('/duels/mine')])
      .then(([dirRes, duelsRes]) => {
        setColleagues(dirRes.data);
        setMyDuels(duelsRes.data);
      })
      .catch((e) => setError(getApiErrorMessage(e, 'Impossible de charger les données.')))
      .finally(() => setLoading(false));
  }, []);

  async function onChallenge() {
    if (!selectedOpponent) return;
    setCreating(true);
    setError(null);
    try {
      const { data } = await api.post('/duels', { opponentId: selectedOpponent, type: selectedType });
      router.push(`/duel/${data.id}`);
    } catch (e) {
      setError(getApiErrorMessage(e, 'Le défi a échoué.'));
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-line border-t-brass" />
      </main>
    );
  }

  const pendingDuels = myDuels.filter((d) => d.status !== 'COMPLETED');
  const completedDuels = myDuels.filter((d) => d.status === 'COMPLETED');

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="mb-1 text-3xl font-semibold text-parchment">Duel éclair</h1>
            <p className="text-sm text-parchment-muted">Défie un collègue en 1 contre 1.</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-parchment-muted hover:text-brass">
              ← Retour
            </Link>
            <HelpButton
              title="Les duels"
              content={[
                "Choisis un adversaire et un type d'épreuve.",
                "Quiz : question à choix multiples.",
                "Mémoire : reproduis la séquence de couleurs.",
                "Réflexe : clique le plus vite possible.",
                "Chaque joueur joue indépendamment, pas besoin d'être connecté en même temps.",
                "Le gagnant est celui avec le score le plus élevé."
              ]}
            />
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-6 border border-danger bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {/* --- Nouveau duel --- */}
        <section className="mb-8 border border-ink-line">
          <h2 className="border-b border-ink-line px-5 py-3 font-display text-lg text-parchment">
            Défier un collègue
          </h2>
          <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
            <div>
              <label className="mb-1.5 block text-sm text-parchment-muted">Adversaire</label>
              <select
                value={selectedOpponent ?? ''}
                onChange={(e) => setSelectedOpponent(e.target.value || null)}
                className="w-full border border-ink-line bg-ink-panel px-3 py-2.5 text-parchment focus:border-brass"
              >
                <option value="">Choisir un collègue</option>
                {colleagues.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.pseudo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-parchment-muted">Type d&apos;épreuve</label>
              <div className="flex gap-2">
                {DUEL_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setSelectedType(t.value)}
                    className={`flex-1 border px-3 py-2 text-sm transition ${
                      selectedType === t.value
                        ? 'border-brass text-brass'
                        : 'border-ink-line text-parchment-muted hover:border-parchment-muted'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={onChallenge}
              disabled={!selectedOpponent || creating}
              className="w-full border border-brass bg-brass px-4 py-2.5 font-medium text-ink transition hover:bg-transparent hover:text-brass disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? 'Envoi…' : 'Lancer le défi'}
            </button>
          </div>
        </section>

        {/* --- Duels en cours --- */}
        {pendingDuels.length > 0 && (
          <section className="mb-8 border border-ink-line">
            <h2 className="border-b border-ink-line px-5 py-3 font-display text-base text-parchment">
              En cours
            </h2>
            <div className="divide-y divide-ink-line">
              {pendingDuels.map((d) => (
                <Link
                  key={d.id}
                  href={`/duel/${d.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-sm transition hover:bg-ink-panel sm:px-5"
                >
                  <span className="min-w-0 break-words text-parchment">
                    {d.player1.pseudo} vs {d.player2.pseudo}
                  </span>
                  <span className="font-mono text-xs text-parchment-muted">{d.type}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* --- Historique --- */}
        {completedDuels.length > 0 && (
          <section className="border border-ink-line">
            <h2 className="border-b border-ink-line px-5 py-3 font-display text-base text-parchment">
              Historique
            </h2>
            <div className="divide-y divide-ink-line">
              {completedDuels.map((d) => (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm sm:px-5">
                  <span className="min-w-0 break-words text-parchment-muted">
                    {d.player1.pseudo} vs {d.player2.pseudo}
                  </span>
                  <span className="font-mono text-xs text-brass">
                    {d.winnerId
                      ? `${d.winnerId === d.player1Id ? d.player1.pseudo : d.player2.pseudo} gagne`
                      : 'Égalité'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}