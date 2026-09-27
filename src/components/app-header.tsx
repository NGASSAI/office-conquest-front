'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../store/auth-store';
import { logout } from '../lib/auth';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/map', label: 'Carte' },
  { href: '/profile', label: 'Profil' },
];

export function AppHeader() {
  const { user, setUser } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  async function onLogout() {
    await logout();
    setUser(null);
    router.push('/login');
  }

  if (!user) return null;

  return (
    <header className="border-b border-ink-line">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <Link href="/dashboard" className="font-display text-lg text-parchment">
          Conquête du Bureau
        </Link>

        <nav className="flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm transition ${
                pathname === link.href
                  ? 'text-brass'
                  : 'text-parchment-muted hover:text-parchment'
              }`}
            >
              {link.label}
            </Link>
          ))}
          {user.role === 'ADMIN' && (
            <Link
              href="/admin"
              className={`font-mono text-xs uppercase ${
                pathname.startsWith('/admin')
                  ? 'text-brass'
                  : 'text-parchment-muted hover:text-parchment'
              }`}
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-4">
          <span className="text-sm text-parchment-muted">{user.pseudo}</span>
          <button
            onClick={onLogout}
            className="text-xs text-parchment-muted hover:text-danger"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  );
}