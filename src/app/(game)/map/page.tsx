'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, getApiErrorMessage } from '../../../lib/api';
import { AppHeader } from '../../../components/app-header';
import { HelpButton } from '../../../components/help-button';

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

// Disposition fixe façon plan d'étage — mappée par nom de territoire (ceux du seed).
// Un territoire dont le nom n'est pas dans cette liste tombe automatiquement dans une grille de secours.
const ROOM_LAYOUT: Record<string, { x: number; y: number; w: number; h: number }> = {
  'Open Space Nord': { x: 20, y: 20, w: 220, h: 140 },
  'Salle Everest': { x: 260, y: 20, w: 140, h: 140 },
  Cafétéria: { x: 420, y: 20, w: 140, h: 140 },
  'Salle Serveurs': { x: 580, y: 20, w: 200, h: 140 },
  Terrasse: { x: 20, y: 180, w: 180, h: 120 },
  'Salle K2': { x: 220, y: 180, w: 140, h: 120 },
  Accueil: { x: 380, y: 180, w: 180, h: 120 },
  'Open Space Sud': { x: 580, y: 180, w: 200, h: 120 },
};
const FALLBACK_COLS = 4;
const FALLBACK_ROOM_SIZE = 180;

function getRoomRect(name: string, index: number) {
  if (ROOM_LAYOUT[name]) return ROOM_LAYOUT[name];
  const col = index % FALLBACK_COLS;
  const row = Math.floor(index / FALLBACK_COLS);
  return {
    x: 20 + col * (FALLBACK_ROOM_SIZE + 16),
    y: 320 + row * (FALLBACK_ROOM_SIZE + 16),
    w: FALLBACK_ROOM_SIZE,
    h: FALLBACK_ROOM_SIZE,
  };
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function MapPage() {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [teams, setTeams] = useState<TeamRanking[]>([]);
  const [selected, setSelected] = useState<Territory | null>(null);
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

  const svgHeight = Math.max(
    320,
    ...territories.map((t, i) => {
      const r = getRoomRect(t.name, i);
      return r.y + r.h + 20;
    }),
  );

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="mb-1 text-3xl font-semibold text-parchment">Carte des territoires</h1>
            <p className="text-sm text-parchment-muted">
              L&apos;état de la conquête en temps réel.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-parchment-muted hover:text-brass">
              ← Retour
            </Link>
            <HelpButton
              title="La carte"
              content={[
                "Chaque territoire appartient à une équipe ou reste neutre.",
                "Une victoire en attaque transfère le territoire; une victoire en défense le conserve; une égalité ne change pas son propriétaire.",
                "Les raids sont réservés aux membres des deux équipes concernées. Le mode solo permet de jouer les défis, pas de participer aux raids.",
                "La carte montre le propriétaire actuel et les couleurs de chaque équipe."
              ]}
            />
          </div>
        </div>
        <p className="mb-8 text-sm text-parchment-muted">
          Plan de conquête — {territories.length} territoires en jeu.
        </p>

        {loadError && (
          <div role="alert" className="mb-6 border border-danger bg-danger/10 px-4 py-3 text-sm text-danger">
            {loadError}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
          {/* --- Plan SVG interactif --- */}
          <section className="min-w-0 border border-ink-line p-3 sm:p-4">
            <div className="overflow-x-auto">
              <svg
                viewBox={`0 0 800 ${svgHeight}`}
                className="w-full min-w-140 sm:min-w-0"
                role="img"
                aria-label="Plan des territoires du bureau"
              >
              {territories.map((territory, index) => {
                const rect = getRoomRect(territory.name, index);
                const color = territory.ownerTeam?.color ?? '#26314A';
                const isSelected = selected?.id === territory.id;
                return (
                  <g
                    key={territory.id}
                    onClick={() => setSelected(territory)}
                    className="cursor-pointer"
                    tabIndex={0}
                    role="button"
                    aria-label={`${territory.name} — ${territory.ownerTeam?.name ?? 'territoire neutre'}`}
                    onKeyDown={(e) => e.key === 'Enter' && setSelected(territory)}
                  >
                    <rect
                      x={rect.x}
                      y={rect.y}
                      width={rect.w}
                      height={rect.h}
                      fill={territory.ownerTeam ? `${color}26` : 'transparent'}
                      stroke={color}
                      strokeWidth={isSelected ? 3 : 1.5}
                      className="transition-all"
                    />
                    <text
                      x={rect.x + 12}
                      y={rect.y + 24}
                      fill="#EDEAE0"
                      fontSize="13"
                      fontFamily="var(--font-space-grotesk)"
                    >
                      {territory.name}
                    </text>
                    {territory.ownerTeam && (
                      <text
                        x={rect.x + 12}
                        y={rect.y + rect.h - 14}
                        fill={color}
                        fontSize="11"
                        fontFamily="var(--font-jetbrains-mono)"
                        className="uppercase"
                      >
                        {territory.ownerTeam.name}
                      </text>
                    )}
                  </g>
                );
              })}
              </svg>
            </div>

                        {/* --- Détail du territoire sélectionné --- */}
            {selected && (
              <div className="mt-4 border-t border-ink-line pt-4">
                <p className="mb-1 font-display text-lg text-parchment">{selected.name}</p>
                {selected.ownerTeam ? (
                  (() => {
                    const owningTeam = teams.find((t) => t.id === selected.ownerTeam!.id);
                    return (
                      <div>
                        <p className="mb-3 text-sm text-parchment-muted">
                          Contrôlé par{' '}
                          <span style={{ color: selected.ownerTeam!.color }}>{selected.ownerTeam!.name}</span>
                          {selected.capturedAt && ` depuis le ${formatDate(selected.capturedAt)}`}
                        </p>
                        {owningTeam && (
                          <div className="grid grid-cols-3 gap-px bg-ink-line">
                            <div className="bg-ink px-3 py-2">
                              <p className="text-[10px] text-parchment-muted">Énergie</p>
                              <p className="font-mono text-brass">{owningTeam.energy}</p>
                            </div>
                            <div className="bg-ink px-3 py-2">
                              <p className="text-[10px] text-parchment-muted">Membres</p>
                              <p className="font-mono text-parchment">{owningTeam._count.members}</p>
                            </div>
                            <div className="bg-ink px-3 py-2">
                              <p className="text-[10px] text-parchment-muted">Territoires</p>
                              <p className="font-mono text-parchment">{owningTeam._count.territories}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-sm text-parchment-muted">Territoire neutre — pas encore conquis.</p>
                )}
              </div>
            )}
            {!selected && (
              <p className="mt-4 border-t border-ink-line pt-4 text-xs text-parchment-muted">
                Clique sur une salle pour voir son détail.
              </p>
            )}
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