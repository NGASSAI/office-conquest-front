'use client';

import { useEffect, useState } from 'react';
import { api, getApiErrorMessage } from '../../../lib/api';
import { AppHeader } from '../../../components/app-header';

interface Territory {
  id: string;
  name: string;
  capturedAt: string | null;
  ownerTeam: { id: string; name: string; color: string } | null;
}

interface TeamRanking {
  id: string;
  name: string;
  color: string;
  energy: number;
  _count: { members: number; territories: number };
}

export default function MapPage() {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [teams, setTeams] = useState<TeamRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [territoriesRes, teamsRes] = await Promise.all([
          api.get<Territory[]>('/territories'),
          api.get<TeamRanking[]>('/teams'),
        ]);
        setTerritories(territoriesRes.data);
        setTeams(teamsRes.data);
      } catch (error) {
        setLoadError(getApiErrorMessage(error, 'Impossible de charger la carte.'));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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
        <h1 className="mb-1 text-3xl font-semibold text-parchment">Carte du bureau</h1>
        <p className="mb-8 text-sm text-parchment-muted">
          Coordonnées de conquête — {territories.length} territoires en jeu.
        </p>

        {loadError && (
          <div role="alert" className="mb-6 border border-danger bg-danger/10 px-4 py-3 text-sm text-danger">
            {loadError}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-[1fr_260px]">
          {/* --- Territoires, façon dossier de coordonnées --- */}
          <section className="border border-ink-line">
            <h2 className="border-b border-ink-line px-5 py-3 font-display text-lg text-parchment">
              Territoires
            </h2>
            <div className="divide-y divide-ink-line">
              {territories.map((territory, index) => {
                // Coordonnée façon carte d'état-major (A1, B2...) dérivée de la position dans la liste
                const coord = `${String.fromCharCode(65 + Math.floor(index / 5))}${(index % 5) + 1}`;
                return (
                  <div key={territory.id} className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-xs text-parchment-muted">{coord}</span>
                      <span className="text-parchment">{territory.name}</span>
                    </div>
                    {territory.ownerTeam ? (
                      <span
                        className="border px-2.5 py-1 font-mono text-xs"
                        style={{
                          borderColor: territory.ownerTeam.color,
                          color: territory.ownerTeam.color,
                        }}
                      >
                        {territory.ownerTeam.name}
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-parchment-muted">Neutre</span>
                    )}
                  </div>
                );
              })}
              {territories.length === 0 && (
                <p className="px-5 py-4 text-sm text-parchment-muted">Aucun territoire configuré.</p>
              )}
            </div>
          </section>

          {/* --- Classement des équipes --- */}
          <aside className="border border-ink-line">
            <h2 className="border-b border-ink-line px-5 py-3 font-display text-base text-parchment">
              Classement
            </h2>
            <div className="divide-y divide-ink-line">
              {teams.map((team, index) => (
                <div key={team.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="font-mono text-xs text-parchment-muted">#{index + 1}</span>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: team.color }} />
                  <div className="flex-1">
                    <p className="text-sm text-parchment">{team.name}</p>
                    <p className="font-mono text-xs text-parchment-muted">
                      {team._count.territories} territoire(s) · {team._count.members} membres
                    </p>
                  </div>
                  <span className="font-mono text-sm text-brass">{team.energy}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}