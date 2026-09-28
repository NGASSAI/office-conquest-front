'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { login as loginUser } from '../../../lib/auth';
import { getApiErrorMessage } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth-store';
import { AppHeader } from '../../../components/app-header';

const loginSchema = z.object({
  email: z.string().min(1, 'Email requis').email('Adresse email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      const user = await loginUser(values);
      setUser(user);
      router.push('/dashboard');
    } catch (error) {
      // Le backend renvoie volontairement un message générique en cas d'échec (anti-énumération),
      // sauf pour le blocage/verrouillage qui a un message explicite — on affiche tel quel.
      setServerError(getApiErrorMessage(error, 'Connexion impossible. Réessaie.'));
    }
  }

  return (
    <>
      <AppHeader />
      <main className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 space-y-1 sm:mb-8">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs uppercase tracking-widest text-parchment-muted">
              Retour au front
            </p>
            <Link href="/" className="text-xs text-parchment-muted hover:text-brass">
              ← Accueil
            </Link>
          </div>
          <h1 className="text-2xl font-semibold text-parchment sm:text-3xl">Connexion</h1>
          <p className="text-sm text-parchment-muted">
            Ton équipe t&apos;attend sur la carte.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm text-parchment">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              autoFocus
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
            <label htmlFor="password" className="mb-1.5 block text-sm text-parchment">
              Mot de passe
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
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
                       {errors.password && (
              <p id="password-error" className="mt-1 text-xs text-danger">
                {errors.password.message}
              </p>
            )}
            <div className="mt-1.5 text-right">
              <Link href="/forgot-password" className="text-xs text-parchment-muted hover:text-brass">
                Mot de passe oublié ?
              </Link>
            </div>
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
            {isSubmitting ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-parchment-muted">
          Pas encore de compte ?{' '}
          <Link href="/register" className="text-brass hover:underline">
            S&apos;inscrire
          </Link>
        </p>
      </div>
      </main>
    </>
  );
}