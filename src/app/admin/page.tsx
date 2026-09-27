'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, getApiErrorMessage } from '../../lib/api';
import { AppHeader } from '../../components/app-header';
import { AdminGuard } from '../../components/admin-guard';
import { HelpButton } from '../../components/help-button';

interface TeamRanking {
  id: string;
  name: string;
  energy: number;
  _count: { territories: number };
}

interface GlobalStats {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  totalTeams: number;
  totalTerritories: number;
  totalRaids: number;
  totalDuels: number;
  challengesCompletedToday: number;
  teamRanking: TeamRanking[];
}

export default function AdminDashboardPage() {
  return (
    <AdminGuard>
      <AppHeader />
      <AdminDashboardContent />
    </AdminGuard>
  );
}

function AdminDashboardContent() {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<GlobalStats>('/admin/stats')
      .then(({ data }) => setStats(data))
      .catch((e) => setError(getApiErrorMessage(e, 'Impossible de charger les statistiques.')))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-line border-t-brass" />
      </main>
    );
  }

  if (error || !stats) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="border border-danger bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
        </main>
      </>
    );
  }

  const cards: [string, number][] = [
    ['Utilisateurs totaux', stats.totalUsers],
    ['Actifs', stats.activeUsers],
    ['Bloqués', stats.blockedUsers],
    ['Équipes', stats.totalTeams],
    ['Territoires', stats.totalTerritories],
    ['Raids au total', stats.totalRaids],
    ['Duels au total', stats.totalDuels],
    ["Défis complétés aujourd'hui", stats.challengesCompletedToday],
  ];

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-parchment-muted">
            Salle d&apos;opérations
          </p>
          <h1 className="text-2xl font-semibold text-parchment sm:text-3xl">Vue d&apos;ensemble</h1>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex flex-wrap gap-3 text-sm sm:gap-4">
            <Link href="/admin/users" className="text-parchment-muted hover:text-brass">
              Utilisateurs
            </Link>
            <Link href="/admin/teams" className="text-parchment-muted hover:text-brass">
              Équipes
            </Link>
            <Link href="/admin/challenges" className="text-parchment-muted hover:text-brass">
              Défis
            </Link>
            <Link href="/admin/raids" className="text-parchment-muted hover:text-brass">
              Raids
            </Link>
            <Link href="/admin/monitoring" className="text-parchment-muted hover:text-brass">
              Monitoring
            </Link>
          </div>
          <HelpButton
            title="Vue d'ensemble admin"
            content={[
              "Statistiques globales : utilisateurs, équipes, territoires, raids, duels.",
              "Classement des équipes par énergie et nombre de territoires.",
              "Utilise le menu pour accéder aux autres pages d'administration.",
              "Monitoring : flux d'activité en temps réel.",
              "Utilisateurs : gérer les comptes, bloquer/débloquer.",
              "Équipes : créer, modifier, supprimer des équipes.",
              "Défis : programmer les défis quotidiens.",
              "Raids : voir l'historique des raids."
            ]}
          />
        </div>
      </div>

      {/* --- Cartes de statistiques --- */}
      <div className="mb-8 grid grid-cols-2 gap-px bg-ink-line sm:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="bg-ink px-4 py-4">
            <p className="text-xs text-parchment-muted">{label}</p>
            <p className="font-mono text-2xl text-parchment">{value}</p>
          </div>
        ))}
      </div>

      {/* --- Classement des équipes --- */}
      <section className="border border-ink-line">
        <h2 className="border-b border-ink-line px-5 py-3 font-display text-lg text-parchment">
          Classement des équipes
        </h2>
        <div className="divide-y divide-ink-line">
          {stats.teamRanking.map((team, i) => (
            <div key={team.id} className="flex items-center gap-4 px-5 py-3 text-sm">
              <span className="font-mono text-xs text-parchment-muted">#{i + 1}</span>
              <span className="flex-1 text-parchment">{team.name}</span>
              <span className="font-mono text-xs text-parchment-muted">
                {team._count.territories} territoire(s)
              </span>
              <span className="font-mono text-brass">{team.energy}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}