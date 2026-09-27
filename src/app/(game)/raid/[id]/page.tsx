'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, getApiErrorMessage } from '../../../../lib/api';
import { connectRaidSocket, disconnectRaidSocket } from '../../../../lib/socket';
import { AppHeader } from '../../../../components/app-header';
import { RoundGame } from '../../../../components/round-game';

interface TeamRef {
  id: string;
  name: string;
  color: string;
}

interface Participant {
  userId: string;
  teamId: string;
  totalScore: number;
  user: { id: string; pseudo: string };
}

interface Round {
  id: string;
  roundNumber: number;
  type: 'QUIZ' | 'MEMORY' | 'REFLEX';
  content: Record<string, unknown>;
  resultsData: Record<string, number>;
  endedAt: string | null;
}

interface RaidDetail {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  result: 'ATTACKER_WIN' | 'DEFENDER_WIN' | 'DRAW' | null;
  attackerTeam: TeamRef;
  defenderTeam: TeamRef;
  territory: { name: string };
  participants: Participant[];
  rounds: Round[];
}

interface RaidEndedPayload {
  result: 'ATTACKER_WIN' | 'DEFENDER_WIN' | 'DRAW';
  attackerScore: number;
  defenderScore: number;
}

export default function RaidPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [raid, setRaid] = useState<RaidDetail | null>(null);
  const [ended, setEnded] = useState<RaidEndedPayload | null>(null);
  const [hasAnsweredRound, setHasAnsweredRound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyRaidUpdate = useCallback((data: RaidDetail) => {
    setRaid(data);
    setHasAnsweredRound(false);
  }, []);

  useEffect(() => {
    if (!id) return;

    // Chargement initial en REST pour un premier affichage immédiat, avant même que le socket se connecte
    api
      .get<RaidDetail>(`/raids/${id}`)
      .then(({ data }) => setRaid(data))
      .catch((e) => setError(getApiErrorMessage(e, 'Impossible de charger ce raid.')))
      .finally(() => setLoading(false));

    const socket = connectRaidSocket();

    function onConnect() {
      socket.emit('joinRaidRoom', { raidId: id }, (response: RaidDetail) => {
        if (response) applyRaidUpdate(response);
      });
    }

    function onRaidUpdate(data: RaidDetail) {
      applyRaidUpdate(data);
    }

    function onRoundUpdate(payload: { roundId: string; resultsData: Record<string, number> }) {
      setRaid((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rounds: prev.rounds.map((r) =>
            r.id === payload.roundId ? { ...r, resultsData: payload.resultsData } : r,
          ),
        };
      });
    }

    function onRaidEnded(payload: RaidEndedPayload) {
      setEnded(payload);
    }

    socket.on('connect', onConnect);
    socket.on('raidUpdate', onRaidUpdate);
    socket.on('roundUpdate', onRoundUpdate);
    socket.on('raidEnded', onRaidEnded);
    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('raidUpdate', onRaidUpdate);
      socket.off('roundUpdate', onRoundUpdate);
      socket.off('raidEnded', onRaidEnded);
      disconnectRaidSocket();
    };
  }, [id, applyRaidUpdate]);

  function onAnswer(roundId: string, answerData: Record<string, unknown>) {
    setHasAnsweredRound(true);
    const socket = connectRaidSocket();
    socket.emit('submitRoundAnswer', { raidId: id, roundId, answerData });
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-line border-t-brass" />
      </main>
    );
  }

  if (error || !raid) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto max-w-2xl px-6 py-10">
          <div className="border border-danger bg-danger/10 px-4 py-3 text-sm text-danger">
            {error ?? 'Raid introuvable.'}
          </div>
        </main>
      </>
    );
  }

  const currentRound = raid.rounds.find((r) => !r.endedAt) ?? raid.rounds[raid.rounds.length - 1];

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-6 py-10">
        {/* --- En-tête du raid --- */}
        <div className="mb-8 flex items-center justify-between border border-ink-line px-5 py-4">
          <div className="text-center">
            <p className="font-mono text-xs text-parchment-muted">{raid.attackerTeam.name}</p>
            <p className="font-mono text-2xl" style={{ color: raid.attackerTeam.color }}>
              {sumScore(raid.participants, raid.attackerTeam.id)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-parchment-muted">{raid.territory.name}</p>
            <p className="font-display text-sm text-parchment">VS</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-xs text-parchment-muted">{raid.defenderTeam.name}</p>
            <p className="font-mono text-2xl" style={{ color: raid.defenderTeam.color }}>
              {sumScore(raid.participants, raid.defenderTeam.id)}
            </p>
          </div>
        </div>

        {/* --- Résultat final --- */}
        {ended && (
          <div className="animate-capture mb-8 border border-brass px-5 py-6 text-center">
            <p className="mb-1 font-display text-xl text-parchment">
              {ended.result === 'DRAW'
                ? 'Égalité'
                : ended.result === 'ATTACKER_WIN'
                  ? `${raid.attackerTeam.name} prend le territoire !`
                  : `${raid.defenderTeam.name} défend avec succès`}
            </p>
            <p className="font-mono text-sm text-parchment-muted">
              {ended.attackerScore} — {ended.defenderScore}
            </p>
            <button
              onClick={() => router.push('/map')}
              className="mt-4 border border-brass bg-brass px-4 py-2 text-sm font-medium text-ink transition hover:bg-transparent hover:text-brass"
            >
              Voir la carte
            </button>
          </div>
        )}

        {/* --- Manche en cours --- */}
        {!ended && currentRound && (
          <section className="border border-ink-line">
            <div className="flex items-center justify-between border-b border-ink-line px-5 py-3">
              <h2 className="font-display text-lg text-parchment">
                Manche {currentRound.roundNumber} / 3
              </h2>
              <span className="font-mono text-xs uppercase text-parchment-muted">
                {currentRound.type}
              </span>
            </div>
            <div className="px-5 py-5">
              {hasAnsweredRound ? (
                <p className="text-sm text-teal">Réponse envoyée — en attente des autres joueurs…</p>
              ) : (
                <RoundGame
                  roundId={currentRound.id}
                  type={currentRound.type}
                  content={currentRound.content}
                  disabled={hasAnsweredRound}
                  onAnswer={(answerData) => onAnswer(currentRound.id, answerData)}
                />
              )}
            </div>
          </section>
        )}

        {/* --- Participants --- */}
        <section className="mt-6 border border-ink-line">
          <h2 className="border-b border-ink-line px-5 py-3 font-display text-base text-parchment">
            Participants
          </h2>
          <div className="divide-y divide-ink-line">
            {raid.participants.map((p) => (
              <div key={p.userId} className="flex items-center justify-between px-5 py-2.5 text-sm">
                <span className="text-parchment">{p.user.pseudo}</span>
                <span className="font-mono text-parchment-muted">{p.totalScore}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

function sumScore(participants: Participant[], teamId: string) {
  return participants.filter((p) => p.teamId === teamId).reduce((s, p) => s + p.totalScore, 0);
}