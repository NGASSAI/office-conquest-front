'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, getApiErrorMessage } from '../../../lib/api';
import { AppHeader } from '../../../components/app-header';
import { AdminGuard } from '../../../components/admin-guard';
import { HelpButton } from '../../../components/help-button';

type ChallengeType = 'QUIZ' | 'RIDDLE' | 'MEMORY' | 'REFLEX' | 'POLL' | 'SPOT';

const CHALLENGE_TYPE_LABELS: Record<ChallengeType, string> = {
  QUIZ: 'Quiz',
  RIDDLE: 'Énigme',
  MEMORY: 'Memory',
  REFLEX: 'Réflexe',
  POLL: 'Sondage',
  SPOT: 'Trouve l’intrus',
};

interface ChallengeSummary {
  id: string;
  date: string;
  type: ChallengeType;
  title: string;
  difficulty: number;
  _count: { attempts: number };
}

const MEMORY_COLORS = ['red', 'blue', 'green', 'yellow'];
const MEMORY_PAIR_SYMBOLS = ['☕', '⭐', '🎧', '🍕', '🌱', '🐱', '⚽', '🎈'];
const SPOT_SYMBOLS = ['☕', '🌱', '⭐', '🎧', '🍕', '🐱', '⚽', '🎈'];

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default function AdminChallengesPage() {
  return (
    <AdminGuard>
      <AppHeader />
      <AdminChallengesContent />
    </AdminGuard>
  );
}

function AdminChallengesContent() {
  const [challenges, setChallenges] = useState<ChallengeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [date, setDate] = useState(tomorrowISO());
  const [type, setType] = useState<ChallengeType>('QUIZ');
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState(1);

  // Champs spécifiques selon le type
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [memorySequence, setMemorySequence] = useState<string[]>([]);
  const [memoryMode, setMemoryMode] = useState<'SEQUENCE' | 'PAIRS'>('SEQUENCE');
  const [memoryPairSymbols, setMemoryPairSymbols] = useState(['☕', '⭐', '🎧', '🍕']);
  const [spotMainSymbol, setSpotMainSymbol] = useState('☕');
  const [spotOddSymbol, setSpotOddSymbol] = useState('🌱');
  const [spotQuestion, setSpotQuestion] = useState('Repère l’icône différente.');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function loadChallenges() {
    setLoading(true);
    api
      .get<ChallengeSummary[]>('/challenges')
      .then(({ data }) => setChallenges(data))
      .catch((e) => setError(getApiErrorMessage(e, 'Impossible de charger les défis.')))
      .finally(() => setLoading(false));
  }

  useEffect(loadChallenges, []);

  function resetForm() {
    setTitle('');
    setQuestion('');
    setOptions(['', '', '', '']);
    setCorrectAnswer('');
    setMemorySequence([]);
    setMemoryMode('SEQUENCE');
    setMemoryPairSymbols(['☕', '⭐', '🎧', '🍕']);
    setSpotMainSymbol('☕');
    setSpotOddSymbol('🌱');
    setSpotQuestion('Repère l’icône différente.');
    setDifficulty(1);
  }

  function buildContent(): Record<string, unknown> | null {
    if (type === 'QUIZ') {
      const cleanOptions = options.filter((o) => o.trim());
      if (!question.trim() || cleanOptions.length < 2 || !correctAnswer.trim()) return null;
      if (!cleanOptions.includes(correctAnswer)) return null;
      return { question, options: cleanOptions, correctAnswer };
    }
    if (type === 'POLL') {
      const cleanOptions = options.map((option) => option.trim()).filter(Boolean);
      if (
        !question.trim() || cleanOptions.length < 2 || cleanOptions.length > 4 ||
        new Set(cleanOptions).size !== cleanOptions.length
      ) return null;
      return { question: question.trim(), options: cleanOptions };
    }
    if (type === 'RIDDLE') {
      if (!question.trim() || !correctAnswer.trim()) return null;
      return { question, correctAnswer };
    }
    if (type === 'SPOT') {
      if (!spotQuestion.trim() || spotMainSymbol === spotOddSymbol) return null;
      const oddIndex = Math.floor(Math.random() * 9);
      const symbols = Array.from({ length: 9 }, (_, index) => index === oddIndex ? spotOddSymbol : spotMainSymbol);
      return { question: spotQuestion.trim(), symbols, oddSymbol: spotOddSymbol };
    }
    if (type === 'MEMORY') {
      if (memoryMode === 'PAIRS') {
        return memoryPairSymbols.length >= 3 ? { mode: 'PAIRS', pairSymbols: memoryPairSymbols } : null;
      }
      if (memorySequence.length === 0) return null;
      return { correctSequence: memorySequence };
    }
    return {}; // REFLEX
  }

  async function createChallenge() {
    setFormError(null);
    setSuccess(false);

    const content = buildContent();
    if (!content || !title.trim()) {
      setFormError('Remplis tous les champs requis pour ce type de défi.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/challenges', { date, type, title, content, difficulty });
      setSuccess(true);
      resetForm();
      loadChallenges();
    } catch (e) {
      setFormError(getApiErrorMessage(e, 'La création a échoué.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteChallenge(challenge: ChallengeSummary) {
    const attempts = challenge._count.attempts;
    const warning = attempts > 0
      ? ` Cela supprimera aussi les ${attempts} tentative(s) associée(s), mais ne retirera pas l'énergie déjà gagnée.`
      : '';
    if (!window.confirm(`Supprimer « ${challenge.title} » ?${warning}`)) return;

    setActionError(null);
    setDeletingId(challenge.id);
    try {
      await api.delete(`/challenges/${challenge.id}`);
      setChallenges((current) => current.filter((item) => item.id !== challenge.id));
    } catch (e) {
      setActionError(getApiErrorMessage(e, 'La suppression a échoué.'));
    } finally {
      setDeletingId(null);
    }
  }

  function toggleMemoryColor(color: string) {
    setMemorySequence((prev) => [...prev, color]);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-3xl font-semibold text-parchment">Défis quotidiens</h1>
          <p className="text-sm text-parchment-muted">
            Programme un ou plusieurs défis par date; ils seront tous accessibles aux joueurs.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-sm text-parchment-muted hover:text-brass">
            ← Retour
          </Link>
          <HelpButton
            title="Défis quotidiens"
            content={[
              "Programme un ou plusieurs défis à chaque date; les joueurs peuvent tenter chacun une fois.",
              "Quiz et énigme ont une réponse à valider. Memory propose une séquence ou des paires; Trouve l'intrus utilise 9 icônes.",
              "Pour un sondage, ajoute 2 à 4 choix différents. Le vote rapporte seulement de l'XP et l'objectif commun, jamais score compétitif ou énergie.",
              "La difficulté multiplie l'énergie apportée uniquement pour les défis scorés par un joueur en équipe.",
              "Les réponses correctes sont gardées secrètes et vérifiées par le serveur.",
              "Supprimer un défi efface aussi ses tentatives; l'énergie déjà gagnée par les équipes n'est pas retirée."
            ]}
          />
        </div>
      </div>

      {/* --- Formulaire de création --- */}
      <section className="mb-10 border border-ink-line">
        <h2 className="border-b border-ink-line px-5 py-3 font-display text-lg text-parchment">
          Créer un défi
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void createChallenge();
          }}
          className="space-y-4 px-4 py-4 sm:px-5 sm:py-5"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm text-parchment-muted">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-ink-line bg-ink-panel px-3 py-2 text-parchment focus:border-brass"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-parchment-muted">Difficulté (1-5)</label>
              <input
                type="number"
                min={1}
                max={5}
                value={difficulty}
                onChange={(e) => setDifficulty(Number(e.target.value))}
                className="w-full border border-ink-line bg-ink-panel px-3 py-2 text-parchment focus:border-brass"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-parchment-muted">Type</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {(['QUIZ', 'RIDDLE', 'MEMORY', 'REFLEX', 'POLL', 'SPOT'] as ChallengeType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setType(t);
                    resetForm();
                  }}
                  className={`flex-1 border px-3 py-2 text-xs uppercase transition ${
                    type === t ? 'border-brass text-brass' : 'border-ink-line text-parchment-muted hover:border-parchment-muted'
                  }`}
                >
                    {CHALLENGE_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-parchment-muted">Titre affiché</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Culture générale du lundi"
              className="w-full border border-ink-line bg-ink-panel px-3 py-2 text-parchment placeholder:text-parchment-muted/50 focus:border-brass"
            />
          </div>

          {(type === 'QUIZ' || type === 'RIDDLE' || type === 'POLL' || type === 'SPOT') && (
            <div>
              <label className="mb-1.5 block text-sm text-parchment-muted">
                {type === 'SPOT' ? 'Consigne du jeu' : 'Question'}
              </label>
              <input
                type="text"
                value={type === 'SPOT' ? spotQuestion : question}
                onChange={(e) => type === 'SPOT' ? setSpotQuestion(e.target.value) : setQuestion(e.target.value)}
                className="w-full border border-ink-line bg-ink-panel px-3 py-2 text-parchment focus:border-brass"
              />
            </div>
          )}

          {type === 'SPOT' && (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm text-parchment-muted">
                Icônes principales
                <select
                  value={spotMainSymbol}
                  onChange={(event) => setSpotMainSymbol(event.target.value)}
                  className="mt-1.5 w-full border border-ink-line bg-ink-panel px-3 py-2 text-2xl text-parchment"
                >
                  {SPOT_SYMBOLS.filter((symbol) => symbol !== spotOddSymbol).map((symbol) => (
                    <option key={symbol} value={symbol}>{symbol}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-parchment-muted">
                Icône intruse
                <select
                  value={spotOddSymbol}
                  onChange={(event) => setSpotOddSymbol(event.target.value)}
                  className="mt-1.5 w-full border border-ink-line bg-ink-panel px-3 py-2 text-2xl text-parchment"
                >
                  {SPOT_SYMBOLS.filter((symbol) => symbol !== spotMainSymbol).map((symbol) => (
                    <option key={symbol} value={symbol}>{symbol}</option>
                  ))}
                </select>
              </label>
              <p className="col-span-2 text-xs text-parchment-muted">Une grille mélangée de 9 icônes sera créée automatiquement.</p>
            </div>
          )}
          {(type === 'QUIZ' || type === 'POLL') && (
            <div>
              <label className="mb-1.5 block text-sm text-parchment-muted">
                {type === 'POLL' ? 'Choix du sondage (2 à 4)' : 'Options (4)'}
              </label>
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <input
                    key={i}
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const next = [...options];
                      next[i] = e.target.value;
                      setOptions(next);
                    }}
                    placeholder={`Option ${i + 1}`}
                    className="w-full border border-ink-line bg-ink-panel px-3 py-2 text-sm text-parchment placeholder:text-parchment-muted/50 focus:border-brass"
                  />
                ))}
              </div>
            </div>
          )}

          {type === 'POLL' && (
            <p className="text-xs text-teal">Pas de mauvaise réponse : le vote rapporte de l&apos;XP et fait avancer l&apos;objectif commun, sans énergie ni score compétitif.</p>
          )}

          {(type === 'QUIZ' || type === 'RIDDLE') && (
            <div>
              <label className="mb-1.5 block text-sm text-parchment-muted">
                Bonne réponse {type === 'QUIZ' && '(doit correspondre exactement à une option)'}
              </label>
              <input
                type="text"
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
                className="w-full border border-ink-line bg-ink-panel px-3 py-2 text-parchment focus:border-brass"
              />
            </div>
          )}

          {type === 'MEMORY' && (
            <div>
              <label className="mb-1.5 block text-sm text-parchment-muted">Mode de jeu</label>
              <div className="mb-4 grid grid-cols-2 gap-2">
                {([
                  ['SEQUENCE', 'Séquence'],
                  ['PAIRS', 'Paires d’icônes'],
                ] as const).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setMemoryMode(mode)}
                    className={`border px-3 py-2 text-xs transition ${
                      memoryMode === mode ? 'border-brass text-brass' : 'border-ink-line text-parchment-muted hover:border-parchment-muted'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {memoryMode === 'SEQUENCE' ? (
                <>
              <label className="mb-1.5 block text-sm text-parchment-muted">
                Séquence à mémoriser — clique les couleurs dans l&apos;ordre
              </label>
              <div className="mb-2 flex gap-2">
                {MEMORY_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleMemoryColor(c)}
                    className="h-10 w-10 border border-ink-line capitalize"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
              <p className="font-mono text-xs text-parchment-muted">
                Séquence : {memorySequence.length ? memorySequence.join(' → ') : '—'}
              </p>
              {memorySequence.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMemorySequence([])}
                  className="mt-1 text-xs text-danger hover:underline"
                >
                  Réinitialiser
                </button>
              )}
                </>
              ) : (
                <>
                  <p className="mb-2 text-sm text-parchment-muted">Choisis de 3 à 8 icônes; chacune apparaîtra deux fois.</p>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                    {MEMORY_PAIR_SYMBOLS.map((symbol) => {
                      const selected = memoryPairSymbols.includes(symbol);
                      return (
                        <button
                          key={symbol}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setMemoryPairSymbols((current) => selected
                            ? current.filter((item) => item !== symbol)
                            : current.length < 8 ? [...current, symbol] : current)}
                          className={`flex aspect-square items-center justify-center border text-xl transition ${
                            selected ? 'border-brass bg-brass/10' : 'border-ink-line hover:border-parchment-muted'
                          }`}
                        >
                          {symbol}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-parchment-muted">
                    {memoryPairSymbols.length} paires sélectionnées · 3 minimum
                  </p>
                </>
              )}
            </div>
          )}

          {type === 'REFLEX' && (
            <p className="text-xs text-parchment-muted">
              Aucun contenu requis — le score se base sur le temps de réaction du joueur.
            </p>
          )}

          {formError && <p className="text-xs text-danger">{formError}</p>}
          {success && <p className="text-xs text-teal">Défi créé avec succès.</p>}

          <button
            type="button"
            onClick={createChallenge}
            disabled={submitting}
            className="w-full border border-brass bg-brass px-4 py-2.5 font-medium text-ink transition hover:bg-transparent hover:text-brass disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Création…' : 'Créer le défi'}
          </button>
        </form>
      </section>

      {/* --- Liste des défis existants --- */}
      <section className="border border-ink-line">
        <div className="border-b border-ink-line px-5 py-3">
          <h2 className="font-display text-lg text-parchment">Défis récents</h2>
          <p className="mt-1 text-xs text-parchment-muted">
            Les défis passés restent enregistrés. Seuls les 30 plus récents sont affichés.
          </p>
        </div>
        {error && <p className="px-5 py-4 text-sm text-danger">{error}</p>}
        {actionError && <p className="px-5 py-4 text-sm text-danger">{actionError}</p>}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink-line border-t-brass" />
          </div>
        ) : (
          <div className="divide-y divide-ink-line">
            {challenges.length === 0 && (
              <p className="px-5 py-4 text-sm text-parchment-muted">Aucun défi programmé.</p>
            )}
            {challenges.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                <div>
                  <p className="text-parchment">{c.title}</p>
                  <p className="font-mono text-xs text-parchment-muted">
                    {new Date(c.date).toLocaleDateString('fr-FR')} · {CHALLENGE_TYPE_LABELS[c.type]}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-mono text-xs text-brass">{c._count.attempts} joué(s)</span>
                  <button
                    type="button"
                    onClick={() => deleteChallenge(c)}
                    disabled={deletingId !== null}
                    className="text-xs text-danger hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingId === c.id ? 'Suppression…' : 'Supprimer'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}