import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'La Conquête du Bureau',
  description: 'Le jeu d\'équipe entre collègues',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
