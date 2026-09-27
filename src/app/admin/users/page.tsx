'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, getApiErrorMessage } from '../../../lib/api';
import { AppHeader } from '../../../components/app-header';
import { AdminGuard } from '../../../components/admin-guard';

interface AdminUser {
  id: string;
  email: string;
  pseudo: string;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'BLOCKED';
  teamId: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  failedLoginAttempts: number;
}

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  return (
    <AdminGuard>
      <AppHeader />
      <AdminUsersContent />
    </AdminGuard>
  );
}

function AdminUsersContent() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | 'ACTIVE' | 'BLOCKED'>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get('/users', { params: { search: search || undefined, status: status || undefined, page, pageSize: PAGE_SIZE } })
      .then(({ data }) => {
        setUsers(data.users);
        setTotal(data.total);
      })
      .catch((e) => setError(getApiErrorMessage(e, 'Impossible de charger les utilisateurs.')))
      .finally(() => setLoading(false));
  }, [search, status, page]);

  useEffect(() => {
    // Petit debounce manuel pour éviter un appel réseau à chaque frappe dans la recherche
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
  }, [load]);

  async function toggleStatus(user: AdminUser) {
    const action = user.status === 'ACTIVE' ? 'block' : 'unblock';
    setActioningId(user.id);
    try {
      await api.patch(`/users/${user.id}/${action}`);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: action === 'block' ? 'BLOCKED' : 'ACTIVE' } : u)),
      );
    } catch (e) {
      setError(getApiErrorMessage(e, "L'action a échoué."));
    } finally {
      setActioningId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-1 text-3xl font-semibold text-parchment">Utilisateurs</h1>
      <p className="mb-8 text-sm text-parchment-muted">{total} compte(s) au total.</p>

      {/* --- Filtres --- */}
      <div className="mb-6 flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder="Rechercher par email ou pseudo…"
          className="flex-1 border border-ink-line bg-ink-panel px-3 py-2 text-sm text-parchment placeholder:text-parchment-muted/50 focus:border-brass"
        />
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as typeof status);
          }}
          className="border border-ink-line bg-ink-panel px-3 py-2 text-sm text-parchment focus:border-brass"
        >
          <option value="">Tous les statuts</option>
          <option value="ACTIVE">Actifs</option>
          <option value="BLOCKED">Bloqués</option>
        </select>
      </div>

      {error && (
        <div role="alert" className="mb-4 border border-danger bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* --- Table --- */}
      <div className="border border-ink-line">
        <div className="grid grid-cols-[1fr_100px_100px_100px] gap-3 border-b border-ink-line px-5 py-3 font-mono text-xs uppercase text-parchment-muted">
          <span>Utilisateur</span>
          <span>Statut</span>
          <span>Échecs</span>
          <span>Action</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink-line border-t-brass" />
          </div>
        ) : users.length === 0 ? (
          <p className="px-5 py-6 text-sm text-parchment-muted">Aucun utilisateur trouvé.</p>
        ) : (
          <div className="divide-y divide-ink-line">
            {users.map((user) => (
              <div key={user.id} className="grid grid-cols-[1fr_100px_100px_100px] items-center gap-3 px-5 py-3 text-sm">
                <div>
                  <p className="text-parchment">{user.pseudo}</p>
                  <p className="text-xs text-parchment-muted">{user.email}</p>
                </div>
                <span className={user.status === 'BLOCKED' ? 'text-danger' : 'text-teal'}>
                  {user.status === 'BLOCKED' ? 'Bloqué' : 'Actif'}
                </span>
                <span className="font-mono text-xs text-parchment-muted">
                  {user.failedLoginAttempts > 0 ? user.failedLoginAttempts : '—'}
                </span>
                <button
                  onClick={() => toggleStatus(user)}
                  disabled={actioningId === user.id || user.role === 'ADMIN'}
                  className={`border px-3 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    user.status === 'ACTIVE'
                      ? 'border-danger text-danger hover:bg-danger/10'
                      : 'border-teal text-teal hover:bg-teal/10'
                  }`}
                >
                  {actioningId === user.id ? '…' : user.status === 'ACTIVE' ? 'Bloquer' : 'Débloquer'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- Pagination --- */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4 font-mono text-xs text-parchment-muted">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="disabled:opacity-30"
          >
            ← Précédent
          </button>
          <span>
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="disabled:opacity-30"
          >
            Suivant →
          </button>
        </div>
      )}
    </main>
  );
}