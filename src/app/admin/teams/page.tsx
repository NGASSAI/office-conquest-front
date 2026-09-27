'use client';

import { useEffect, useState } from 'react';
import { api, getApiErrorMessage } from '../../../lib/api';
import { AppHeader } from '../../../components/app-header';
import { AdminGuard } from '../../../components/admin-guard';

interface Team {
  id: string;
  name: string;
  color: string;
  energy: number;
  energyThreshold: number;
  _count: { members: number; territories: number };
}

interface Territory {
  id: string;
  name: string;
  ownerTeam: { id: string; name: string; color: string } | null;
}

export default function AdminTeamsPage() {
  return (
    <AdminGuard>
      <AppHeader />
      <AdminTeamsContent />
    </AdminGuard>
  );
}

function AdminTeamsContent() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function loadAll() {
    setLoading(true);
    Promise.all([api.get<Team[]>('/teams'), api.get<Territory[]>('/territories')])
      .then(([teamsRes, territoriesRes]) => {
        setTeams(teamsRes.data);
        setTerritories(territoriesRes.data);
      })
      .catch((e) => setError(getApiErrorMessage(e, 'Impossible de charger les données.')))
      .finally(() => setLoading(false));
  }

  useEffect(loadAll, []);

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-line border-t-brass" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-1 text-3xl font-semibold text-parchment">Équipes &amp; Territoires</h1>
      <p className="mb-8 text-sm text-parchment-muted">
        Sans équipe ni territoire configurés, le jeu est injouable.
      </p>

      {error && (
        <div role="alert" className="mb-6 border border-danger bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <TeamsSection teams={teams} onChanged={loadAll} setError={setError} />
      <TerritoriesSection territories={territories} teams={teams} onChanged={loadAll} setError={setError} />
    </main>
  );
}

// ============================================================
// ÉQUIPES
// ============================================================

function TeamsSection({
  teams,
  onChanged,
  setError,
}: {
  teams: Team[];
  onChanged: () => void;
  setError: (e: string | null) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [color, setColor] = useState('#C9A227');
  const [threshold, setThreshold] = useState(1000);

  function startEdit(team: Team) {
    setEditingId(team.id);
    setCreating(false);
    setName(team.name);
    setColor(team.color);
    setThreshold(team.energyThreshold);
  }

  function startCreate() {
    setCreating(true);
    setEditingId(null);
    setName('');
    setColor('#C9A227');
    setThreshold(1000);
  }

  function cancel() {
    setEditingId(null);
    setCreating(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      if (creating) {
        await api.post('/teams', { name, color, energyThreshold: threshold });
      } else if (editingId) {
        await api.patch(`/teams/${editingId}`, { name, color, energyThreshold: threshold });
      }
      cancel();
      onChanged();
    } catch (e) {
      setError(getApiErrorMessage(e, "L'enregistrement a échoué."));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      await api.delete(`/teams/${id}`);
      onChanged();
    } catch (e) {
      setError(getApiErrorMessage(e, 'Suppression impossible.'));
    }
  }

  return (
    <section className="mb-10 border border-ink-line">
      <div className="flex items-center justify-between border-b border-ink-line px-5 py-3">
        <h2 className="font-display text-lg text-parchment">Équipes</h2>
        {!creating && (
          <button onClick={startCreate} className="text-xs text-brass hover:underline">
            + Nouvelle équipe
          </button>
        )}
      </div>

      {creating && (
        <TeamForm
          name={name}
          color={color}
          threshold={threshold}
          setName={setName}
          setColor={setColor}
          setThreshold={setThreshold}
          onSave={save}
          onCancel={cancel}
          saving={saving}
        />
      )}

      <div className="divide-y divide-ink-line">
        {teams.map((team) =>
          editingId === team.id ? (
            <TeamForm
              key={team.id}
              name={name}
              color={color}
              threshold={threshold}
              setName={setName}
              setColor={setColor}
              setThreshold={setThreshold}
              onSave={save}
              onCancel={cancel}
              saving={saving}
            />
          ) : (
            <div key={team.id} className="flex items-center gap-4 px-5 py-3 text-sm">
              <span className="h-3 w-3 shrink-0" style={{ backgroundColor: team.color }} />
              <span className="flex-1 text-parchment">{team.name}</span>
              <span className="font-mono text-xs text-parchment-muted">
                {team._count.members} membre(s) · {team._count.territories} territoire(s)
              </span>
              <span className="font-mono text-xs text-brass">
                {team.energy}/{team.energyThreshold}
              </span>
              <button onClick={() => startEdit(team)} className="text-xs text-parchment-muted hover:text-brass">
                Modifier
              </button>
              <button onClick={() => remove(team.id)} className="text-xs text-parchment-muted hover:text-danger">
                Suppr.
              </button>
            </div>
          ),
        )}
        {teams.length === 0 && !creating && (
          <p className="px-5 py-4 text-sm text-parchment-muted">Aucune équipe.</p>
        )}
      </div>
    </section>
  );
}

function TeamForm({
  name,
  color,
  threshold,
  setName,
  setColor,
  setThreshold,
  onSave,
  onCancel,
  saving,
}: {
  name: string;
  color: string;
  threshold: number;
  setName: (v: string) => void;
  setColor: (v: string) => void;
  setThreshold: (v: number) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="grid grid-cols-[1fr_100px_120px_auto] items-center gap-3 border-b border-ink-line bg-ink-panel px-5 py-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nom de l'équipe"
        className="border border-ink-line bg-ink px-2 py-1.5 text-sm text-parchment focus:border-brass"
      />
      <input
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        className="h-9 w-full border border-ink-line bg-ink"
      />
      <input
        type="number"
        min={100}
        value={threshold}
        onChange={(e) => setThreshold(Number(e.target.value))}
        placeholder="Seuil"
        className="border border-ink-line bg-ink px-2 py-1.5 text-sm text-parchment focus:border-brass"
      />
      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={saving || !name.trim()}
          className="border border-brass bg-brass px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-50"
        >
          {saving ? '…' : 'OK'}
        </button>
        <button onClick={onCancel} className="border border-ink-line px-3 py-1.5 text-xs text-parchment-muted">
          Annuler
        </button>
      </div>
    </div>
  );
}

// ============================================================
// TERRITOIRES
// ============================================================

function TerritoriesSection({
  territories,
  teams,
  onChanged,
  setError,
}: {
  territories: Territory[];
  teams: Team[];
  onChanged: () => void;
  setError: (e: string | null) => void;
}) {
  const [newName, setNewName] = useState('');
  const [newOwnerId, setNewOwnerId] = useState('');
  const [creating, setCreating] = useState(false);

  async function create() {
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await api.post('/territories', { name: newName, ownerTeamId: newOwnerId || undefined });
      setNewName('');
      setNewOwnerId('');
      onChanged();
    } catch (e) {
      setError(getApiErrorMessage(e, 'La création a échoué.'));
    } finally {
      setCreating(false);
    }
  }

  async function changeOwner(territoryId: string, ownerTeamId: string) {
    setError(null);
    try {
      await api.patch(`/territories/${territoryId}`, { ownerTeamId: ownerTeamId || undefined });
      onChanged();
    } catch (e) {
      setError(getApiErrorMessage(e, 'La modification a échoué.'));
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      await api.delete(`/territories/${id}`);
      onChanged();
    } catch (e) {
      setError(getApiErrorMessage(e, 'Suppression impossible.'));
    }
  }

  return (
    <section className="border border-ink-line">
      <h2 className="border-b border-ink-line px-5 py-3 font-display text-lg text-parchment">
        Territoires
      </h2>

      <div className="flex gap-3 border-b border-ink-line px-5 py-3">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nom du territoire"
          className="flex-1 border border-ink-line bg-ink-panel px-2 py-1.5 text-sm text-parchment placeholder:text-parchment-muted/50 focus:border-brass"
        />
        <select
          value={newOwnerId}
          onChange={(e) => setNewOwnerId(e.target.value)}
          className="border border-ink-line bg-ink-panel px-2 py-1.5 text-sm text-parchment focus:border-brass"
        >
          <option value="">Neutre</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button
          onClick={create}
          disabled={creating || !newName.trim()}
          className="border border-brass bg-brass px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-50"
        >
          Ajouter
        </button>
      </div>

      <div className="divide-y divide-ink-line">
        {territories.map((t) => (
          <div key={t.id} className="flex items-center gap-3 px-5 py-3 text-sm">
            <span className="flex-1 text-parchment">{t.name}</span>
            <select
              value={t.ownerTeam?.id ?? ''}
              onChange={(e) => changeOwner(t.id, e.target.value)}
              className="border border-ink-line bg-ink-panel px-2 py-1 text-xs text-parchment focus:border-brass"
            >
              <option value="">Neutre</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
            <button onClick={() => remove(t.id)} className="text-xs text-parchment-muted hover:text-danger">
              Suppr.
            </button>
          </div>
        ))}
        {territories.length === 0 && (
          <p className="px-5 py-4 text-sm text-parchment-muted">Aucun territoire.</p>
        )}
      </div>
    </section>
  );
}