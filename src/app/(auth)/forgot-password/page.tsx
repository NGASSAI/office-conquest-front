'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { api, getApiErrorMessage } from '../../../lib/api';

type Step = 'email' | 'phrase' | 'newPassword' | 'done';

// Étape 1 — collecte l'email. Aucun appel serveur ici : on ne vérifie jamais
// l'existence d'un email isolément (anti-énumération, décision prise côté backend).
const emailSchema = z.object({
  email: z.string().min(1, 'Email requis').email('Adresse email invalide'),
});

// Étape 2 — email + phrase envoyés ENSEMBLE au serveur en un seul appel atomique.
const phraseSchema = z.object({
  secretPhrase: z.string().min(1, 'Phrase secrète requise'),
});

// Étape 3 — même règle de robustesse que l'inscription.
const newPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(10, '10 caractères minimum')
      .regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Majuscule, minuscule et chiffre requis'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  // Le token de reset ne quitte jamais la mémoire du composant : pas d'URL, pas de storage.
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const emailForm = useForm<z.infer<typeof emailSchema>>({ resolver: zodResolver(emailSchema) });
  const phraseForm = useForm<z.infer<typeof phraseSchema>>({ resolver: zodResolver(phraseSchema) });
  const passwordForm = useForm<z.infer<typeof newPasswordSchema>>({
    resolver: zodResolver(newPasswordSchema),
  });

  function onEmailNext(values: z.infer<typeof emailSchema>) {
    setEmail(values.email);
    setServerError(null);
    setStep('phrase');
  }

  async function onPhraseSubmit(values: z.infer<typeof phraseSchema>) {
    setServerError(null);
    try {
      const { data } = await api.post('/auth/password-reset/verify', {
        email,
        secretPhrase: values.secretPhrase,
      });
      setResetToken(data.resetToken);
      setStep('newPassword');
    } catch (error) {
      // Message volontairement générique (email inexistant, phrase fausse, ou jamais configurée
      // = exactement le même message, comme convenu côté backend).
      setServerError(getApiErrorMessage(error, 'Email ou phrase secrète incorrects'));
    }
  }

  async function onNewPasswordSubmit(values: z.infer<typeof newPasswordSchema>) {
    if (!resetToken) return;
    setServerError(null);
    try {
      await api.post('/auth/password-reset/confirm', {
        token: resetToken,
        newPassword: values.newPassword,
      });
      setStep('done');
    } catch (error) {
      setServerError(getApiErrorMessage(error, 'Le lien a expiré, recommence la procédure.'));
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 space-y-1">
          <p className="font-mono text-xs uppercase tracking-widest text-parchment-muted">
            Récupération d&apos;accès
          </p>
          <h1 className="text-3xl font-semibold text-parchment">Mot de passe oublié</h1>
        </div>

        {/* Repères d'étapes — purement visuels, la vraie vérification est atomique côté serveur */}
        <div className="mb-8 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-parchment-muted">
          <span className={step === 'email' ? 'text-brass' : ''}>1. Email</span>
          <span>—</span>
          <span className={step === 'phrase' ? 'text-brass' : ''}>2. Phrase secrète</span>
          <span>—</span>
          <span className={step === 'newPassword' ? 'text-brass' : ''}>3. Nouveau mot de passe</span>
        </div>

        {step === 'email' && (
          <form onSubmit={emailForm.handleSubmit(onEmailNext)} noValidate className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm text-parchment">
                Ton email professionnel
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                className="w-full border border-ink-line bg-ink-panel px-3 py-2.5 text-parchment placeholder:text-parchment-muted/50 focus:border-brass"
                {...emailForm.register('email')}
              />
              {emailForm.formState.errors.email && (
                <p className="mt-1 text-xs text-danger">
                  {emailForm.formState.errors.email.message}
                </p>
              )}
            </div>
            <button
              type="submit"
              className="w-full border border-brass bg-brass px-4 py-2.5 font-medium text-ink transition hover:bg-transparent hover:text-brass"
            >
              Continuer
            </button>
          </form>
        )}

        {step === 'phrase' && (
          <form onSubmit={phraseForm.handleSubmit(onPhraseSubmit)} noValidate className="space-y-5">
            <div>
              <label htmlFor="secretPhrase" className="mb-1.5 block text-sm text-parchment">
                Ta phrase secrète
              </label>
              <input
                id="secretPhrase"
                type="text"
                autoFocus
                autoComplete="off"
                className="w-full border border-ink-line bg-ink-panel px-3 py-2.5 text-parchment placeholder:text-parchment-muted/50 focus:border-brass"
                {...phraseForm.register('secretPhrase')}
              />
              {phraseForm.formState.errors.secretPhrase && (
                <p className="mt-1 text-xs text-danger">
                  {phraseForm.formState.errors.secretPhrase.message}
                </p>
              )}
            </div>
            {serverError && (
              <div role="alert" className="border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
                {serverError}
              </div>
            )}
            <button
              type="submit"
              disabled={phraseForm.formState.isSubmitting}
              className="w-full border border-brass bg-brass px-4 py-2.5 font-medium text-ink transition hover:bg-transparent hover:text-brass disabled:cursor-not-allowed disabled:opacity-50"
            >
              {phraseForm.formState.isSubmitting ? 'Vérification…' : 'Vérifier'}
            </button>
            <p className="text-xs text-parchment-muted">
              Tu n&apos;as pas configuré de phrase secrète ? Contacte un admin pour réinitialiser ton
              compte.
            </p>
          </form>
        )}

        {step === 'newPassword' && (
          <form
            onSubmit={passwordForm.handleSubmit(onNewPasswordSubmit)}
            noValidate
            className="space-y-5"
          >
            <div>
              <label htmlFor="newPassword" className="mb-1.5 block text-sm text-parchment">
                Nouveau mot de passe
              </label>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                autoFocus
                className="w-full border border-ink-line bg-ink-panel px-3 py-2.5 text-parchment placeholder:text-parchment-muted/50 focus:border-brass"
                {...passwordForm.register('newPassword')}
              />
              {passwordForm.formState.errors.newPassword && (
                <p className="mt-1 text-xs text-danger">
                  {passwordForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="confirmPassword" className="mb-1.5 block text-sm text-parchment">
                Confirmer
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                className="w-full border border-ink-line bg-ink-panel px-3 py-2.5 text-parchment placeholder:text-parchment-muted/50 focus:border-brass"
                {...passwordForm.register('confirmPassword')}
              />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="mt-1 text-xs text-danger">
                  {passwordForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>
            {serverError && (
              <div role="alert" className="border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
                {serverError}
              </div>
            )}
            <button
              type="submit"
              disabled={passwordForm.formState.isSubmitting}
              className="w-full border border-brass bg-brass px-4 py-2.5 font-medium text-ink transition hover:bg-transparent hover:text-brass disabled:cursor-not-allowed disabled:opacity-50"
            >
              {passwordForm.formState.isSubmitting ? 'Mise à jour…' : 'Réinitialiser le mot de passe'}
            </button>
          </form>
        )}

        {step === 'done' && (
          <div className="space-y-5 text-center">
            <p className="text-parchment">
              Mot de passe mis à jour. Toutes tes anciennes sessions ont été déconnectées par
              sécurité.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="w-full border border-brass bg-brass px-4 py-2.5 font-medium text-ink transition hover:bg-transparent hover:text-brass"
            >
              Se connecter
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-parchment-muted">
          <Link href="/login" className="text-brass hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </main>
  );
}