'use client';

import { useEffect, useState } from 'react';
import { api, getApiErrorMessage } from '../../../lib/api';
import { connectMonitoringSocket, disconnectMonitoringSocket } from '../../../lib/monitoring-socket';
import { AppHeader } from '../../../components/app-header';
import { AdminGuard } from '../../../components/admin-guard';

interface ActivityLog {
  id: string;
  type: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { pseudo: string; email: string } | null;
}

const CRITICAL_TYPES = new Set([
  'ACCOUNT_LOCKED',
  'TOKEN_REUSE_DETECTED',
  'USER_BLOCKED',
  'LOGIN_FAILED',
]);

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function AdminMonitoringPage() {
  return (
    <AdminGuard>
      <AppHeader />
      <MonitoringContent />
    </AdminGuard>
  );
}

function MonitoringContent() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<ActivityLog[]>('/admin/activity', { params: { limit: 50 } })
      .then(({ data }) => setLogs(data))
      .catch((e) => setError(getApiErrorMessage(e, "Impossible de charger l'activité.")))
      .finally(() => setLoading(false));

    const socket = connectMonitoringSocket();

    function onConnect() {
      setConnected(true);
    }
    function onDisconnect() {
      setConnected(false);
    }
    // Le backend émet chaque événement sous son propre nom via logAndBroadcast — on écoute
    // le canal générique 'activity' utilisé par MonitoringService.logAndBroadcast.
    function onActivity(log: ActivityLog) {
      setLogs((prev) => [log, ...prev].slice(0, 100));
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('activity', onActivity);
    if (socket.connected) setConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('activity', onActivity);
      disconnectMonitoringSocket();
    };
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-parchment-muted">
            Flux en direct
          </p>
          <h1 className="text-3xl font-semibold text-parchment">Monitoring</h1>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-teal' : 'bg-danger'}`} />
          <span className="text-parchment-muted">{connected ? 'En direct' : 'Déconnecté'}</span>
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-6 border border-danger bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <section className="border border-ink-line">
        <div className="grid grid-cols-[90px_140px_1fr_1fr] gap-3 border-b border-ink-line px-5 py-3 font-mono text-xs uppercase text-parchment-muted">
          <span>Heure</span>
          <span>Type</span>
          <span>Utilisateur</span>
          <span>Détail</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink-line border-t-brass" />
          </div>
        ) : logs.length === 0 ? (
          <p className="px-5 py-6 text-sm text-parchment-muted">Aucune activité pour l&apos;instant.</p>
        ) : (
          <div className="max-h-[70vh] divide-y divide-ink-line overflow-y-auto">
            {logs.map((log) => (
              <div
                key={log.id}
                className="grid grid-cols-[90px_140px_1fr_1fr] items-start gap-3 px-5 py-2.5 text-xs"
              >
                <span className="font-mono text-parchment-muted">{formatTime(log.createdAt)}</span>
                <span className={`font-mono ${CRITICAL_TYPES.has(log.type) ? 'text-danger' : 'text-brass'}`}>
                  {log.type}
                </span>
                <span className="text-parchment">
                  {log.user ? `${log.user.pseudo} (${log.user.email})` : '—'}
                </span>
                <span className="truncate font-mono text-parchment-muted" title={JSON.stringify(log.metadata)}>
                  {log.metadata ? JSON.stringify(log.metadata) : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}