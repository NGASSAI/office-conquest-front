'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/auth-store';

// Garde-fou côté affichage uniquement — la vraie protection est le RolesGuard backend
// sur chaque endpoint /admin/*. Ce composant évite juste d'afficher une UI admin vide/cassée
// à un non-admin le temps que ses appels API échouent tous en 403.
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, status } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (status === 'guest') {
      router.push('/login');
    } else if (status === 'authenticated' && user?.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [status, user, router]);

  if (status !== 'authenticated' || user?.role !== 'ADMIN') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-line border-t-brass" />
      </div>
    );
  }

  return <>{children}</>;
}