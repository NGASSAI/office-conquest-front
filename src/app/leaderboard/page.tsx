'use client';

import { useEffect, useState } from 'react';
import { api, getApiErrorMessage } from '../../lib/api';
import { AppHeader } from '../../components/app-header';
import { useAuthStore } from '../../store/auth-store';

interface LeaderboardEntry {
  userId: string;
  pseudo: string;
  avatar: string | null;
  team: { name: string; color: string } | null;
  totalEnergyContributed: number;
  challengesCompleted: number;
  duelsWon: number;
}

function parseAvatar(raw: string | null): { emoji: string; color: string } | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<LeaderboardEntry[]>('/users/leaderboard')
      .then(({ data }) => setEntries(data))
      .catch((e) => setError(getApiErrorMessage(e, 'Impossible de charger le classement.')))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="mb-1 text-3xl font-semibold text-parchment">Classement individuel</h1>
        <p className="mb-8 text-sm text-parchment-muted">Les 20 joueurs les plus actifs.</p>

        {error && (
          <div role="alert" className="mb-6 border border-danger bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-line border-t-brass" />
          </div>
        ) : entries.length === 0 ? (
          <p className="border border-ink-line px-5 py-6 text-sm text-parchment-muted">
            Personne n&apos;a encore joué de défi quotidien.
          </p>
        ) : (
          <div className="border border-ink-line">
            <div className="divide-y divide-ink-line">
              {entries.map((entry, index) => {
                const avatar = parseAvatar(entry.avatar);
                const isMe = entry.userId === currentUser?.id;
                return (
                  <div
                    key={entry.userId}
                    className={`flex items-center gap-4 px-5 py-3 text-sm ${isMe ? 'bg-brass/5' : ''}`}
                  >
                    <span className="w-6 font-mono text-xs text-parchment-muted">
                      {MEDALS[index] ?? `#${index + 1}`}
                    </span>
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center border text-lg"
                      style={{ borderColor: avatar?.color ?? '#26314A', backgroundColor: `${avatar?.color ?? '#26314A'}26` }}
                    >
                      {avatar?.emoji ?? '👤'}
                    </span>
                    <div className="flex-1">
                      <p className={isMe ? 'text-brass' : 'text-parchment'}>
                        {entry.pseudo}
                        {isMe && ' (toi)'}
                      </p>
                      {entry.team && (
                        <p className="text-xs" style={{ color: entry.team.color }}>
                          {entry.team.name}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-brass">{entry.totalEnergyContributed}</p>
                      <p className="font-mono text-xs text-parchment-muted">
                        {entry.challengesCompleted} défi(s) · {entry.duelsWon} duel(s) gagné(s)
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </>
  );
}