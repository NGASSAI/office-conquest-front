'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../store/auth-store';
import { logout } from '../lib/auth';
import { getApiErrorMessage } from '../lib/api';
import { HelpButton } from './help-button';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/map', label: 'Carte' },
  { href: '/duel', label: 'Duel' },
  { href: '/leaderboard', label: 'Classement' },
  { href: '/profile', label: 'Profil' },
];

export function AppHeader() {
  const { user, setUser } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  async function onLogout() {
    try {
      await logout();
      setUser(null);
      router.push('/login');
    } catch (error) {
      setLogoutError(getApiErrorMessage(error, 'La déconnexion a échoué. Réessaie.'));
    }
  }

  return (
    <header className="border-b border-ink-line">
      <div className="mx-auto max-w-4xl px-4 py-3 sm:px-6 sm:py-4 md:flex md:items-center md:justify-between md:gap-6">
        <div className="flex min-w-0 items-center justify-between gap-3 md:flex-1">
          <Link href={user ? '/dashboard' : '/'} className="truncate font-display text-lg text-parchment">
            Conquête du Bureau
          </Link>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {user && <span className="hidden max-w-32 truncate text-sm text-parchment-muted sm:block">{user.pseudo}</span>}
            {user ? (
              <button
                type="button"
                onClick={onLogout}
                aria-label="Déconnexion"
                title="Déconnexion"
                className="flex h-9 w-9 items-center justify-center border border-ink-line text-parchment-muted hover:border-danger hover:text-danger sm:h-auto sm:w-auto sm:border-0 sm:text-xs"
              >
                <svg className="h-4 w-4 sm:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 17l5-5-5-5m5 5H3m9-9h6a2 2 0 012 2v14a2 2 0 01-2 2h-6" />
                </svg>
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            ) : (
              <Link href="/login" className="flex min-h-10 items-center border border-ink-line px-3 text-xs text-parchment hover:border-brass hover:text-brass">
                Connexion
              </Link>
            )}
            <HelpButton
              title="Comment jouer à La Conquête du Bureau ?"
              content={[
                "Choisis une équipe dans ton profil : ses membres jouent ensemble pour conquérir les territoires.",
                "Chaque jour, relève un défi (quiz, énigme, mémoire ou réflexe). Tu peux le jouer une fois; ton score apporte de l'énergie à ton équipe.",
                "Quand une équipe atteint son seuil d'énergie, un raid se déclenche. Les deux équipes s'affrontent en trois manches : quiz, mémoire et réflexe.",
                "Les joueurs peuvent aussi se défier en duel 1 contre 1. Chaque adversaire joue à son rythme; le meilleur score gagne.",
                "Consulte la carte pour suivre les territoires et le classement pour voir les joueurs les plus actifs.",
                "La navigation et la consultation restent possibles hors ligne, mais jouer, modifier ton compte et te connecter nécessitent Internet."
              ]}
            />
            <button
              type="button"
              aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={menuOpen}
              aria-controls="main-navigation"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-9 w-9 items-center justify-center border border-ink-line text-parchment md:hidden"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                {menuOpen ? (
                  <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                ) : (
                  <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        <nav
          id="main-navigation"
          className={`${menuOpen ? 'grid' : 'hidden'} mt-3 grid-cols-2 gap-1 border-t border-ink-line pt-3 text-sm md:mt-0 md:flex md:items-center md:justify-center md:gap-6 md:border-0 md:pt-0`}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`text-sm transition ${
                pathname === link.href
                  ? 'text-brass'
                  : 'text-parchment-muted hover:text-parchment'
              } block px-3 py-2 md:px-0 md:py-0`}
            >
              {link.label}
            </Link>
          ))}
          {user?.role === 'ADMIN' && (
            <Link
              href="/admin"
              onClick={() => setMenuOpen(false)}
              className={`font-mono text-xs uppercase ${
                pathname.startsWith('/admin')
                  ? 'text-brass'
                  : 'text-parchment-muted hover:text-parchment'
              } block px-3 py-2 md:px-0 md:py-0`}
            >
              Admin
            </Link>
          )}
          {!user && (
            <Link
              href="/register"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 text-sm text-brass md:px-0 md:py-0"
            >
              Créer un compte
            </Link>
          )}
        </nav>
      </div>
      {logoutError && (
        <div role="alert" className="border-t border-danger/50 bg-danger/10 px-4 py-2 text-center text-xs text-danger sm:text-sm">
          {logoutError}
        </div>
      )}
      {!isOnline && (
        <div role="status" className="border-t border-danger/50 bg-danger/10 px-4 py-2 text-center text-xs text-parchment sm:text-sm">
          Mode hors ligne : tu peux naviguer, mais la connexion et les actions de jeu nécessitent Internet.
        </div>
      )}
    </header>
  );
}