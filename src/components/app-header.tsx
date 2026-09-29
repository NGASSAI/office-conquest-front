'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../store/auth-store';
import { logout } from '../lib/auth';
import { api, getApiErrorMessage } from '../lib/api';
import { disconnectNotificationsSocket, getNotificationsSocket } from '../lib/notifications-socket';
import { HelpButton } from './help-button';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/map', label: 'Carte' },
  { href: '/duel', label: 'Duel' },
  { href: '/leaderboard', label: 'Classement' },
  { href: '/profile', label: 'Profil' },
];

interface UserNotification {
  id: string;
  type: 'DUEL_INVITE' | 'DUEL_RESPONSE' | 'RAID_ATTACK' | 'RAID_DEFENSE';
  title: string;
  message: string;
  targetId: string;
  createdAt: string;
}

export function AppHeader() {
  const { user, setUser } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioInitializedRef = useRef(false);

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

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    let active = true;
    let requestInFlight = false;
    const socket = getNotificationsSocket();

    async function refreshNotifications() {
      if (requestInFlight || !navigator.onLine || document.visibilityState !== 'visible') return;
      requestInFlight = true;
      try {
        const { data } = await api.get<UserNotification[]>('/notifications/mine');
        if (active) setNotifications(data);
      } catch {
        // Le socket réessaiera et les alertes restent enregistrées côté serveur.
      } finally {
        requestInFlight = false;
      }
    }

    function playNotificationSound() {
      try {
        // Initialiser l'audio au premier appel
        if (!audioInitializedRef.current) {
          audioRef.current = new Audio('/notification.mp3');
          audioRef.current.volume = 0.5;
          audioRef.current.preload = 'auto';
          audioInitializedRef.current = true;
        }

        const audio = audioRef.current;
        if (!audio) return;
        
        // Réinitialiser pour pouvoir rejouer
        audio.currentTime = 0;
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((error: Error) => {
            console.warn('Audio play failed:', error);
            // Si l'audio context n'est pas autorisé, on essaie de le réinitialiser
            if (error.name === 'NotAllowedError') {
              audioInitializedRef.current = false;
            }
          });
        }
      } catch (error) {
        console.error('Audio error:', error);
      }
    }

    function onNewNotification(notification: UserNotification) {
      setNotifications((current) => [
        notification,
        ...current.filter((item) => item.id !== notification.id),
      ].slice(0, 30));
      playNotificationSound();
    }

    function onNotificationRemoved(payload: { id?: string; targetId?: string }) {
      setNotifications((current) => current.filter((item) =>
        payload.id ? item.id !== payload.id : item.targetId !== payload.targetId,
      ));
    }

    socket.on('connect', refreshNotifications);
    socket.on('notification:new', onNewNotification);
    socket.on('notification:removed', onNotificationRemoved);
    void refreshNotifications();
    if (!socket.connected) socket.connect();
    else void refreshNotifications();

    const refreshInterval = setInterval(refreshNotifications, 10000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refreshNotifications();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('online', onVisibilityChange);

    return () => {
      active = false;
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('online', onVisibilityChange);
      socket.off('connect', refreshNotifications);
      socket.off('notification:new', onNewNotification);
      socket.off('notification:removed', onNotificationRemoved);
      disconnectNotificationsSocket();
    };
  }, [user?.id]);

  async function openNotification(notification: UserNotification) {
    setNotificationsOpen(false);
    try {
      await api.post(`/notifications/${notification.id}/read`);
      setNotifications((current) => current.filter((item) => item.id !== notification.id));
    } catch {
      // Navigation reste possible; l'alerte reviendra au prochain chargement si elle n'a pas été acquittée.
    }
    router.push(notification.type.startsWith('DUEL')
      ? `/duel/${notification.targetId}`
      : `/raid/${notification.targetId}`);
  }

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
            {user && (
              <div className="relative">
                <button
                  type="button"
                  aria-label={`Notifications${notifications.length ? `, ${notifications.length} non lue(s)` : ''}`}
                  aria-expanded={notificationsOpen}
                  aria-controls="user-notifications"
                  title="Notifications"
                  onClick={() => setNotificationsOpen((open) => !open)}
                  className="relative flex h-9 w-9 items-center justify-center border border-ink-line text-parchment-muted transition hover:border-brass hover:text-brass"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0" />
                  </svg>
                  {notifications.length > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center border border-ink bg-danger px-1 font-mono text-[10px] text-white">
                      {notifications.length > 9 ? '9+' : notifications.length}
                    </span>
                  )}
                </button>
                {notificationsOpen && (
                  <>
                    <button
                      type="button"
                      aria-label="Fermer les notifications"
                      onClick={() => setNotificationsOpen(false)}
                      className="fixed inset-0 z-40 cursor-default bg-black/25"
                    />
                    <section
                      id="user-notifications"
                      aria-label="Notifications non lues"
                      className="fixed right-2 top-16 z-50 max-h-[calc(100dvh-5rem)] w-[calc(100vw-1rem)] max-w-sm overflow-y-auto border border-ink-line bg-ink-panel shadow-xl"
                    >
                      <h2 className="border-b border-ink-line px-4 py-3 font-display text-sm text-parchment">
                        Notifications
                      </h2>
                      {notifications.length === 0 ? (
                        <p className="px-4 py-5 text-sm text-parchment-muted">Aucune nouvelle alerte.</p>
                      ) : (
                        <div className="divide-y divide-ink-line">
                          {notifications.map((notification) => (
                            <button
                              key={notification.id}
                              type="button"
                              onClick={() => void openNotification(notification)}
                              className="block w-full px-4 py-3 text-left transition hover:bg-ink"
                            >
                              <span className="block text-sm text-brass">{notification.title}</span>
                              <span className="mt-1 block text-xs text-parchment-muted">{notification.message}</span>
                              <time className="mt-2 block font-mono text-[10px] text-parchment-muted/70">
                                {new Date(notification.createdAt).toLocaleString('fr-FR')}
                              </time>
                            </button>
                          ))}
                        </div>
                      )}
                    </section>
                  </>
                )}
              </div>
            )}
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
                "Tu peux commencer en solo : les défis quotidiens donnent de l'XP et débloquent des badges. Rejoins une équipe si tu veux contribuer à son énergie et jouer les raids.",
                "Les activités sont Quiz, énigme, Memory (séquence ou paires), Réflexe, sondage sans score compétitif et Trouve l'intrus.",
                "Chaque défi se joue une fois par jour. Une erreur ne retire pas ton XP; seuls les défis scorés en équipe apportent de l'énergie.",
                "Un sondage rapporte de l'XP et fait avancer l'objectif commun, sans score compétitif ni énergie.",
                "Quand une équipe atteint son seuil, elle lance un raid et dépense ce seuil. Une attaque gagnée prend le territoire; une défense gagnée le garde.",
                "Les duels sont asynchrones et sans perte d'XP ou d'énergie en cas de défaite.",
                "Les pages peuvent rester consultables hors ligne; jouer, enregistrer une réponse et modifier ton profil demandent Internet."
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