'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../store/auth-store';
import { restoreSession } from '../lib/auth';
import { AUTH_LOGOUT_EVENT } from '../lib/api';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, status } = useAuthStore();
  const [restoreFailed, setRestoreFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRestoreFailed(false);
    setIsRetrying(false);
    
    restoreSession()
      .then((user) => {
        if (!cancelled) {
          setUser(user);
          setRestoreFailed(false);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Session restore failed:', error);
          setRestoreFailed(true);
          
          // Tentative automatique de reconnexion après un délai
          if (retryCount < 3) {
            setIsRetrying(true);
            retryTimeoutRef.current = setTimeout(() => {
              setRetryCount((count) => count + 1);
            }, 3000); // 3 secondes avant réessai automatique
          }
        }
      });
    
    return () => {
      cancelled = true;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
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

  // Surveiller le changement de statut de connexion réseau
  useEffect(() => {
    const handleOnline = () => {
      // Quand on redevient en ligne, tenter de restaurer la session
      if (restoreFailed && retryCount < 5) {
        setRetryCount((count) => count + 1);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [restoreFailed, retryCount]);

  // Évite un flash "invité" pendant la vérification silencieuse de la session au premier chargement
  if (status === 'checking') {
    if (restoreFailed) {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink px-4 text-center">
          <p role="alert" className="text-sm text-parchment">
            {isRetrying 
              ? 'Tentative de reconnexion automatique...' 
              : 'Le serveur ne répond pas. Ta session n\'a pas été supprimée.'}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (retryTimeoutRef.current) {
                  clearTimeout(retryTimeoutRef.current);
                }
                setRetryCount((count) => count + 1);
              }}
              disabled={isRetrying}
              className="border border-brass bg-brass px-4 py-2 text-sm font-medium text-ink disabled:opacity-50"
            >
              {isRetrying ? 'Reconnexion...' : 'Réessayer'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (retryTimeoutRef.current) {
                  clearTimeout(retryTimeoutRef.current);
                }
                setUser(null);
              }}
              className="border border-ink-line px-4 py-2 text-sm text-parchment-muted"
            >
              Continuer en visiteur
            </button>
          </div>
          {retryCount > 0 && (
            <p className="text-xs text-parchment-muted">
              Tentatives: {retryCount}/5
            </p>
          )}
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