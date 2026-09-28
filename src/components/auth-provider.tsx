'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth-store';
import { restoreSession } from '../lib/auth';
import { AUTH_LOGOUT_EVENT } from '../lib/api';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, status } = useAuthStore();
  const [restoreFailed, setRestoreFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setRestoreFailed(false);
    restoreSession()
      .then((user) => {
        if (!cancelled) setUser(user);
      })
      .catch(() => {
        if (!cancelled) setRestoreFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [retryCount, setUser]);

  useEffect(() => {
    // Réagit à une déconnexion déclenchée ailleurs (refresh expiré, compte bloqué en cours de session...)
    function handleLogout() {
      setUser(null);
    }
    window.addEventListener(AUTH_LOGOUT_EVENT, handleLogout);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, handleLogout);
  }, [setUser]);

  // Évite un flash "invité" pendant la vérification silencieuse de la session au premier chargement
  if (status === 'checking') {
    if (restoreFailed) {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink px-4 text-center">
          <p role="alert" className="text-sm text-parchment">
            Le serveur ne répond pas. Ta session n&apos;a pas été supprimée.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => setRetryCount((count) => count + 1)}
              className="border border-brass bg-brass px-4 py-2 text-sm font-medium text-ink"
            >
              Réessayer
            </button>
            <button
              type="button"
              onClick={() => setUser(null)}
              className="border border-ink-line px-4 py-2 text-sm text-parchment-muted"
            >
              Continuer en visiteur
            </button>
          </div>
        </main>
      );
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-line border-t-brass" />
      </div>
    );
  }

  return <>{children}</>;
}