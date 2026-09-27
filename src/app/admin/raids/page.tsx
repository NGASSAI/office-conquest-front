'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, getApiErrorMessage } from '../../../lib/api';
import { AppHeader } from '../../../components/app-header';
import { AdminGuard } from '../../../components/admin-guard';
import { HelpButton } from '../../../components/help-button';

interface RaidRow {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  result: 'ATTACKER_WIN' | 'DEFENDER_WIN' | 'DRAW' | null;
  triggeredAt: string;
  endedAt: string | null;
  attackerTeam: { name: string; color: string };
  defenderTeam: { name: string; color: string };
  territory: { name: string };
}

const STATUS_LABELS: Record<RaidRow['status'], string> = {
  PENDING: 'En attente',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminRaidsPage() {
  return (
    <AdminGuard>
      <AppHeader />
      <AdminRaidsContent />
    </AdminGuard>
  );
}

function AdminRaidsContent() {
  const [raids, setRaids] = useState<RaidRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<RaidRow[]>('/admin/raids')
      .then(({ data }) => setRaids(data))
      .catch((e) => setError(getApiErrorMessage(e, 'Impossible de charger les raids.')))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-3xl font-semibold text-parchment">Historique des raids</h1>
          <p className="text-sm text-parchment-muted">Les 50 derniers raids déclenchés.</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-sm text-parchment-muted hover:text-brass">
            ← Retour
          </Link>
          <HelpButton
            title="Historique des raids"
            content={[
              "Les raids se déclenchent automatiquement quand une équipe atteint son seuil d'énergie.",
              "Statuts : En attente (personne n'a rejoint), En cours (participants actifs), Terminé (résultat connu), Annulé.",
              "Résultats : l'attaquant gagne (capture le territoire), le défenseur gagne (garde le territoire), ou égalité.",
              "Le système choisit automatiquement le territoire cible (le plus anciennement conquis par une autre équipe)."
            ]}
          />
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-6 border border-danger bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <section className="border border-ink-line">
        <div className="hidden grid-cols-[110px_minmax(0,1fr)_minmax(0,1fr)_100px_130px] gap-3 border-b border-ink-line px-5 py-3 font-mono text-xs uppercase text-parchment-muted sm:grid">
          <span>Quand</span>
          <span>Attaquant</span>
          <span>Défenseur</span>
          <span>Statut</span>
          <span>Résultat</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink-line border-t-brass" />
          </div>
        ) : raids.length === 0 ? (
          <p className="px-5 py-6 text-sm text-parchment-muted">Aucun raid déclenché pour l&apos;instant.</p>
        ) : (
          <div className="divide-y divide-ink-line">
            {raids.map((raid) => (
              <div
                key={raid.id}
                className="grid grid-cols-2 gap-x-3 gap-y-3 px-3 py-3 text-xs sm:grid-cols-[110px_minmax(0,1fr)_minmax(0,1fr)_100px_130px] sm:items-center sm:gap-3 sm:px-5 sm:py-3 sm:text-sm"
              >
                <span className="col-span-2 min-w-0 font-mono text-parchment-muted sm:col-span-1">
                  <span className="mb-0.5 block font-sans text-[10px] uppercase text-parchment-muted sm:hidden">Quand</span>
                  {formatDateTime(raid.triggeredAt)}
                </span>
                <span className="min-w-0 wrap-break-word" style={{ color: raid.attackerTeam.color }}>
                  <span className="mb-0.5 block font-sans text-[10px] uppercase text-parchment-muted sm:hidden">Attaquant</span>
                  {raid.attackerTeam.name}
                </span>
                <span className="min-w-0 wrap-break-word" style={{ color: raid.defenderTeam.color }}>
                  <span className="mb-0.5 block font-sans text-[10px] uppercase text-parchment-muted sm:hidden">Défenseur</span>
                  {raid.defenderTeam.name}
                </span>
                <span className="font-mono text-xs text-parchment-muted">
                  <span className="mb-0.5 block font-sans text-[10px] uppercase text-parchment-muted sm:hidden">Statut</span>
                  {STATUS_LABELS[raid.status]}
                </span>
                <span className="min-w-0 wrap-break-word font-mono text-xs">
                  <span className="mb-0.5 block font-sans text-[10px] uppercase text-parchment-muted sm:hidden">Résultat</span>
                  {raid.result === 'ATTACKER_WIN' && (
                    <span className="text-teal">{raid.attackerTeam.name} gagne</span>
                  )}
                  {raid.result === 'DEFENDER_WIN' && (
                    <span className="text-teal">{raid.defenderTeam.name} défend</span>
                  )}
                  {raid.result === 'DRAW' && <span className="text-parchment-muted">Égalité</span>}
                  {!raid.result && <span className="text-parchment-muted">—</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}