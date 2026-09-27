'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { register as registerUser } from '../../../lib/auth';
import { getApiErrorMessage } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth-store';

// Miroir exact des règles du backend (RegisterDto) — pour prévenir l'erreur avant l'appel réseau,
// jamais pour remplacer la validation serveur qui reste la seule source de vérité.
const registerSchema = z
  .object({
    email: z.string().min(1, 'Email requis').email('Adresse email invalide'),
    pseudo: z
      .string()
      .min(3, '3 caractères minimum')
      .max(20, '20 caractères maximum')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Lettres, chiffres, - et _ uniquement'),
    password: z
      .string()
      .min(8, '8 caractères minimum')
      .regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Majuscule, minuscule et chiffre requis'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

function getPasswordStrength(password: string): { score: number; label: string } {
  if (!password) return { score: 0, label: '' };
  let score = 0;
  if (password.length >= 10) score++;
  if (password.length >= 14) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: 'Faible' };
  if (score <= 3) return { score, label: 'Correct' };
  return { score, label: 'Solide' };
}

export default function RegisterPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
  });

  const passwordValue = watch('password', '');
  const strength = getPasswordStrength(passwordValue);

  async function onSubmit(values: RegisterFormValues) {
    setServerError(null);
    try {
      const user = await registerUser({
        email: values.email,
        pseudo: values.pseudo,
        password: values.password,
      });
      setUser(user);
      router.push('/dashboard');
    } catch (error) {
      setServerError(getApiErrorMessage(error, "L'inscription a échoué. Réessaie."));
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 space-y-1">
          <p className="font-mono text-xs uppercase tracking-widest text-parchment-muted">
            Étape 1 — Accès
          </p>
          <h1 className="text-3xl font-semibold text-parchment">Rejoindre la conquête</h1>
          <p className="text-sm text-parchment-muted">
            Une inscription, ensuite plus rien à retaper.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm text-parchment">
              Email professionnel
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className="w-full border border-ink-line bg-ink-panel px-3 py-2.5 text-parchment placeholder:text-parchment-muted/50 focus:border-brass"
              placeholder="prenom.nom@entreprise.com"
              {...register('email')}
            />
            {errors.email && (
              <p id="email-error" className="mt-1 text-xs text-danger">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="pseudo" className="mb-1.5 block text-sm text-parchment">
              Pseudo
            </label>
            <input
              id="pseudo"
              type="text"
              autoComplete="nickname"
              aria-invalid={!!errors.pseudo}
              aria-describedby={errors.pseudo ? 'pseudo-error' : undefined}
              className="w-full border border-ink-line bg-ink-panel px-3 py-2.5 text-parchment placeholder:text-parchment-muted/50 focus:border-brass"
              placeholder="Ton nom de guerre"
              {...register('pseudo')}
            />
            {errors.pseudo && (
              <p id="pseudo-error" className="mt-1 text-xs text-danger">
                {errors.pseudo.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm text-parchment">
              Mot de passe
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                aria-describedby="password-strength"
                className="w-full border border-ink-line bg-ink-panel px-3 py-2.5 pr-16 text-parchment placeholder:text-parchment-muted/50 focus:border-brass"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-parchment-muted hover:text-parchment"
              >
                {showPassword ? 'Masquer' : 'Afficher'}
              </button>
            </div>

            {/* Indicateur de force — feedback immédiat, jamais bloquant côté client */}
            {passwordValue && (
              <div id="password-strength" className="mt-2 flex items-center gap-2">
                <div className="flex h-1 flex-1 gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className={`h-full flex-1 ${
                        i < strength.score
                          ? strength.score <= 1
                            ? 'bg-danger'
                            : strength.score <= 3
                              ? 'bg-brass'
                              : 'bg-teal'
                          : 'bg-ink-line'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-mono text-xs text-parchment-muted">{strength.label}</span>
              </div>
            )}
            {errors.password && (
              <p className="mt-1 text-xs text-danger">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1.5 block text-sm text-parchment">
              Confirmer le mot de passe
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
              className="w-full border border-ink-line bg-ink-panel px-3 py-2.5 text-parchment placeholder:text-parchment-muted/50 focus:border-brass"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-danger">{errors.confirmPassword.message}</p>
            )}
          </div>

          {serverError && (
            <div role="alert" className="border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full border border-brass bg-brass px-4 py-2.5 font-medium text-ink transition hover:bg-transparent hover:text-brass disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Inscription en cours…' : 'Rejoindre la conquête'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-parchment-muted">
          Déjà inscrit ?{' '}
          <Link href="/login" className="text-brass hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}