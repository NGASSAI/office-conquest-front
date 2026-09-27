'use client';

import { useEffect, useState } from 'react';
import { api, getApiErrorMessage } from '../../../lib/api';
import { AppHeader } from '../../../components/app-header';
import { AdminGuard } from '../../../components/admin-guard';

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
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-1 text-3xl font-semibold text-parchment">Historique des raids</h1>
      <p className="mb-8 text-sm text-parchment-muted">Les 50 derniers raids déclenchés.</p>

      {error && (
        <div role="alert" className="mb-6 border border-danger bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <section className="border border-ink-line">
        <div className="grid grid-cols-[110px_1fr_1fr_100px_130px] gap-3 border-b border-ink-line px-5 py-3 font-mono text-xs uppercase text-parchment-muted">
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
                className="grid grid-cols-[110px_1fr_1fr_100px_130px] items-center gap-3 px-5 py-3 text-sm"
              >
                <span className="font-mono text-xs text-parchment-muted">
                  {formatDateTime(raid.triggeredAt)}
                </span>
                <span style={{ color: raid.attackerTeam.color }}>{raid.attackerTeam.name}</span>
                <span style={{ color: raid.defenderTeam.color }}>{raid.defenderTeam.name}</span>
                <span className="font-mono text-xs text-parchment-muted">
                  {STATUS_LABELS[raid.status]}
                </span>
                <span className="font-mono text-xs">
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