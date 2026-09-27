'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { logout } from '../../lib/auth';
import { useAuthStore } from '../../store/auth-store';
import { api, getApiErrorMessage } from '../../lib/api';
import { HelpButton } from '../../components/help-button';





interface Team {
  id: string;
  name: string;
  color: string;
  energy: number;
}

interface ProfileData {
  id: string;
  email: string;
  pseudo: string;
  avatar: string | null;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'BLOCKED';
  teamId: string | null;
  team: Team | null;
  createdAt: string;
  lastLoginAt: string | null;
  hasSecretPhrase: boolean;
}

interface Performance {
  challengesCompleted: number;
  totalEnergyContributed: number;
  averageScore: number;
  raidsParticipated: number;
  duelsWon: number;
}

const secretPhraseSchema = z.object({
  secretPhrase: z.string().min(6, '6 caractères minimum').max(100, '100 caractères maximum'),
});
type SecretPhraseValues = z.infer<typeof secretPhraseSchema>;
function parseAvatar(raw: string | null): { emoji: string; color: string } | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function ProfilePage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
const AVATAR_EMOJIS = ['🦊', '🐺', '🦉', '🐝', '🦅', '🐉', '🦁', '🐯', '🐨', '🦄', '🐧', '🦈'];
const AVATAR_COLORS = ['#C9A227', '#2F6F6B', '#B4462F', '#6B7FD7', '#8B93A8', '#EDEAE0'];
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [performance, setPerformance] = useState<Performance | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [teamChangeStatus, setTeamChangeStatus] = useState<'idle' | 'saving'>('idle');
  const [teamChangeError, setTeamChangeError] = useState<string | null>(null);
  const currentAvatar = profile ? parseAvatar(profile.avatar) : null;
  const [avatarEmoji, setAvatarEmoji] = useState(currentAvatar?.emoji ?? AVATAR_EMOJIS[0]);
  const [avatarColor, setAvatarColor] = useState(currentAvatar?.color ?? AVATAR_COLORS[0]);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [phraseStatus, setPhraseStatus] = useState<'idle' | 'success'>('idle');
  const [phraseError, setPhraseError] = useState<string | null>(null);
  const {
    register: registerPhrase,
    handleSubmit: handlePhraseSubmit,
    reset: resetPhraseForm,
    formState: { errors: phraseErrors, isSubmitting: isPhraseSubmitting },
  } = useForm<SecretPhraseValues>({ resolver: zodResolver(secretPhraseSchema) });

    useEffect(() => {
    async function load() {
      try {
        const [profileRes, perfRes, teamsRes] = await Promise.all([
          api.get<ProfileData>('/users/me'),
          api.get<Performance>('/users/me/performance'),
          api.get<Team[]>('/teams'),
        ]);
        setProfile(profileRes.data);
        const savedAvatar = parseAvatar(profileRes.data.avatar);
        if (savedAvatar) {
          setAvatarEmoji(savedAvatar.emoji);
          setAvatarColor(savedAvatar.color);
        }
        setPerformance(perfRes.data);
        setTeams(teamsRes.data);
      } catch (error) {
        setLoadError(getApiErrorMessage(error, 'Impossible de charger ton profil.'));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function onChangeTeam(teamId: string) {
    if (!profile || teamId === profile.teamId) return;
    setTeamChangeStatus('saving');
    setTeamChangeError(null);
    try {
      await api.patch('/users/me/team', { teamId });
      const newTeam = teams.find((t) => t.id === teamId) ?? null;
      setProfile((p) => (p ? { ...p, teamId, team: newTeam } : p));
    } catch (error) {
      setTeamChangeError(getApiErrorMessage(error, "Le changement d'équipe a échoué."));
    } finally {
      setTeamChangeStatus('idle');
    }
  }

  async function onSetSecretPhrase(values: SecretPhraseValues) {
    setPhraseError(null);
    setPhraseStatus('idle');
    try {
      await api.patch('/users/me/secret-phrase', values);
      setProfile((p) => (p ? { ...p, hasSecretPhrase: true } : p));
      setPhraseStatus('success');
      resetPhraseForm();
    } catch (error) {
      setPhraseError(getApiErrorMessage(error, 'La mise à jour a échoué.'));
    }
  }
  async function onSaveAvatar() {
    setAvatarSaving(true);
    setAvatarError(null);
    try {
      const { data } = await api.patch('/users/me/avatar', { emoji: avatarEmoji, color: avatarColor });
      setProfile((p) => (p ? { ...p, avatar: data.avatar } : p));
    } catch (error) {
      setAvatarError(getApiErrorMessage(error, "L'avatar n'a pas pu être enregistré."));
    } finally {
      setAvatarSaving(false);
    }
  }

  async function onLogout() {
    await logout();
    setUser(null);
    router.push('/login');
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-line border-t-brass" />
      </main>
    );
  }

  if (loadError || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 sm:px-6">
        <div className="border border-danger bg-danger/10 px-4 py-3 text-sm text-danger">
          {loadError ?? 'Profil introuvable.'}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center border text-2xl"
            style={{ borderColor: avatarColor, backgroundColor: `${avatarColor}26` }}
          >
            {avatarEmoji}
          </span>
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-parchment-muted">
              Dossier personnel
            </p>
            <h1 className="break-all text-2xl font-semibold text-parchment sm:text-3xl">{profile.pseudo}</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <HelpButton
            title="Mon profil"
            content={[
              "Avatar : personnalise ton symbole et sa couleur.",
              "Équipe : tu peux changer d'équipe à tout moment.",
              "Performance : tes statistiques de jeu.",
              "Phrase secrète : te permet de récupérer ton compte si tu oublies ton mot de passe.",
              "Déconnexion : te déconnecte de ta session actuelle."
            ]}
          />
          <Link href="/dashboard" className="text-sm text-parchment-muted hover:text-brass">
            ← Retour
          </Link>
        </div>
      </div>

      {/* --- Avatar --- */}
      <section className="mb-8 border border-ink-line">
        <h2 className="border-b border-ink-line px-5 py-3 font-display text-lg text-parchment">
          Avatar
        </h2>
        <div className="px-4 py-4 sm:px-5">
          <p className="mb-3 text-xs text-parchment-muted">Symbole</p>
          <div className="mb-4 flex flex-wrap gap-2">
            {AVATAR_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setAvatarEmoji(emoji)}
                className={`flex h-10 w-10 items-center justify-center border text-lg transition ${
                  avatarEmoji === emoji ? 'border-brass' : 'border-ink-line hover:border-parchment-muted'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <p className="mb-3 text-xs text-parchment-muted">Couleur</p>
          <div className="mb-4 flex gap-2">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setAvatarColor(c)}
                className={`h-8 w-8 border-2 transition ${avatarColor === c ? 'border-parchment' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          {avatarError && <p className="mb-3 text-xs text-danger">{avatarError}</p>}
          <button
            onClick={onSaveAvatar}
            disabled={avatarSaving}
            className="border border-brass bg-brass px-4 py-2 text-sm font-medium text-ink transition hover:bg-transparent hover:text-brass disabled:opacity-50"
          >
            {avatarSaving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </section>

      {/* --- Identité --- */}
      <section className="mb-8 border border-ink-line">
        <h2 className="border-b border-ink-line px-5 py-3 font-display text-lg text-parchment">
          Identité
        </h2>
        <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-3 gap-y-4 px-4 py-4 text-sm sm:px-5">
          <dt className="text-parchment-muted">Email</dt>
          <dd className="break-all text-parchment">{profile.email}</dd>
          <dt className="text-parchment-muted">Rôle</dt>
          <dd>
            <span
              className={`font-mono text-xs uppercase ${
                profile.role === 'ADMIN' ? 'text-brass' : 'text-parchment-muted'
              }`}
            >
              {profile.role}
            </span>
          </dd>
          <dt className="text-parchment-muted">Membre depuis</dt>
          <dd className="font-mono text-parchment">{formatDate(profile.createdAt)}</dd>
          <dt className="text-parchment-muted">Dernière connexion</dt>
          <dd className="font-mono text-parchment">{formatDate(profile.lastLoginAt)}</dd>
        </dl>
      </section>

      {/* --- Équipe --- */}
      <section className="mb-8 border border-ink-line">
        <h2 className="border-b border-ink-line px-5 py-3 font-display text-lg text-parchment">
          Équipe
        </h2>
        <div className="px-4 py-4 sm:px-5">
          <label htmlFor="team" className="mb-1.5 block text-sm text-parchment-muted">
            Tu peux changer d&apos;équipe à tout moment
          </label>
          <select
            id="team"
            value={profile.teamId ?? ''}
            onChange={(e) => onChangeTeam(e.target.value)}
            disabled={teamChangeStatus === 'saving'}
            className="w-full border border-ink-line bg-ink-panel px-3 py-2.5 text-parchment focus:border-brass"
          >
            <option value="" disabled>
              Choisir une équipe
            </option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name} — {team.energy} énergie
              </option>
            ))}
          </select>
          {teamChangeError && <p className="mt-2 text-xs text-danger">{teamChangeError}</p>}
        </div>
      </section>

      {/* --- Performance --- */}
      {performance && (
        <section className="mb-8 border border-ink-line">
          <h2 className="border-b border-ink-line px-5 py-3 font-display text-lg text-parchment">
            Performance
          </h2>
          <div className="grid grid-cols-2 gap-px bg-ink-line sm:grid-cols-3">
            {[
              ['Défis complétés', performance.challengesCompleted],
              ['Énergie apportée', performance.totalEnergyContributed],
              ['Score moyen', performance.averageScore],
              ['Raids joués', performance.raidsParticipated],
              ['Duels gagnés', performance.duelsWon],
            ].map(([label, value]) => (
              <div key={label as string} className="min-w-0 bg-ink px-3 py-3 sm:px-5 sm:py-4">
                <p className="wrap-break-word text-xs text-parchment-muted">{label}</p>
                <p className="wrap-break-word font-mono text-xl text-parchment sm:text-2xl">{value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* --- Sécurité --- */}
      <section className="mb-8 border border-ink-line">
        <h2 className="border-b border-ink-line px-5 py-3 font-display text-lg text-parchment">
          Sécurité
        </h2>
        <div className="px-5 py-4">
          <p className="mb-1 text-sm text-parchment">
            Phrase secrète —{' '}
            <span className={profile.hasSecretPhrase ? 'text-teal' : 'text-danger'}>
              {profile.hasSecretPhrase ? 'configurée' : 'non configurée'}
            </span>
          </p>
          <p className="mb-4 text-xs text-parchment-muted">
            Elle te permettra de réinitialiser ton mot de passe si tu l&apos;oublies. Choisis quelque
            chose que toi seul connais — pas une info que tes collègues pourraient deviner.
          </p>

          <form onSubmit={handlePhraseSubmit(onSetSecretPhrase)} noValidate className="space-y-3">
            <input
              type="text"
              autoComplete="off"
              placeholder={profile.hasSecretPhrase ? 'Nouvelle phrase secrète' : 'Ta phrase secrète'}
              className="w-full border border-ink-line bg-ink-panel px-3 py-2.5 text-parchment placeholder:text-parchment-muted/50 focus:border-brass"
              {...registerPhrase('secretPhrase')}
            />
            {phraseErrors.secretPhrase && (
              <p className="text-xs text-danger">{phraseErrors.secretPhrase.message}</p>
            )}
            {phraseError && <p className="text-xs text-danger">{phraseError}</p>}
            {phraseStatus === 'success' && (
              <p className="text-xs text-teal">Phrase secrète enregistrée.</p>
            )}
            <button
              type="submit"
              disabled={isPhraseSubmitting}
              className="border border-ink-line px-4 py-2 text-sm text-parchment transition hover:border-brass hover:text-brass disabled:opacity-50"
            >
              {isPhraseSubmitting
                ? 'Enregistrement…'
                : profile.hasSecretPhrase
                  ? 'Modifier'
                  : 'Configurer'}
            </button>
          </form>
        </div>
      </section>

      <button
        onClick={onLogout}
        className="w-full border border-danger px-4 py-2.5 text-sm text-danger transition hover:bg-danger/10"
      >
        Se déconnecter
      </button>
    </main>
  );
}