'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, getApiErrorMessage } from '../../../lib/api';
import { AppHeader } from '../../../components/app-header';
import { AdminGuard } from '../../../components/admin-guard';
import { HelpButton } from '../../../components/help-button';

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
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-3xl font-semibold text-parchment">Gestion des utilisateurs</h1>
          <p className="text-sm text-parchment-muted">
            Liste, recherche et blocage des comptes.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-sm text-parchment-muted hover:text-brass">
            ← Retour
          </Link>
          <HelpButton
            title="Gestion des utilisateurs"
            content={[
              "Recherche par email ou pseudo; le filtre de statut affiche les comptes actifs ou bloqués.",
              "Bloquer empêche toute nouvelle connexion et révoque les sessions existantes.",
              "Débloquer rend l'accès au compte; cela ne change ni le mot de passe ni l'équipe.",
              "Tu ne peux bloquer ni ton propre compte ni un autre administrateur.",
              "Le compteur indique les tentatives de connexion échouées, pas les actions de jeu."
            ]}
          />
        </div>
      </div>
      {/* --- Filtres --- */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
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
          className="w-full border border-ink-line bg-ink-panel px-3 py-2 text-sm text-parchment focus:border-brass sm:w-auto"
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
        <div className="hidden grid-cols-[minmax(0,1fr)_100px_100px_100px] gap-3 border-b border-ink-line px-5 py-3 font-mono text-xs uppercase text-parchment-muted sm:grid">
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
              <div key={user.id} className="grid grid-cols-2 gap-x-3 gap-y-3 px-3 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_100px_100px_100px] sm:items-center sm:gap-3 sm:px-5">
                <div className="col-span-2 min-w-0 sm:col-span-1">
                  <p className="text-parchment">{user.pseudo}</p>
                  <p className="break-all text-xs text-parchment-muted">{user.email}</p>
                </div>
                <span className={user.status === 'BLOCKED' ? 'text-danger' : 'text-teal'}>
                  <span className="mb-0.5 block font-mono text-[10px] uppercase text-parchment-muted sm:hidden">Statut</span>
                  {user.status === 'BLOCKED' ? 'Bloqué' : 'Actif'}
                </span>
                <span className="font-mono text-xs text-parchment-muted">
                  <span className="mb-0.5 block font-sans text-[10px] uppercase text-parchment-muted sm:hidden">Échecs</span>
                  {user.failedLoginAttempts > 0 ? user.failedLoginAttempts : '—'}
                </span>
                <button
                  onClick={() => toggleStatus(user)}
                  disabled={actioningId === user.id || user.role === 'ADMIN'}
                  className={`justify-self-start border px-3 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-40 sm:justify-self-auto ${
                    user.status === 'ACTIVE'
                      ? 'border-danger text-danger hover:bg-danger/10'
                      : 'border-teal text-teal hover:bg-teal/10'
                  }`}
                >
                  <span className="sm:hidden">Action</span>
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