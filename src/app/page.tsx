import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-widest text-parchment-muted">
          Dossier tactique — accès restreint
        </p>
        <h1 className="text-4xl font-semibold text-parchment sm:text-5xl">
          La Conquête du Bureau
        </h1>
        <p className="max-w-md text-parchment-muted">
          Rejoins ton équipe, relève le défi du jour, et prends part à la conquête des territoires.
        </p>
      </div>

      <div className="flex gap-4">
        <Link
          href="/register"
          className="rounded-none border border-brass bg-brass px-6 py-2.5 font-medium text-ink transition hover:bg-transparent hover:text-brass"
        >
          Rejoindre la conquête
        </Link>
        <Link
          href="/login"
          className="rounded-none border border-ink-line px-6 py-2.5 font-medium text-parchment transition hover:border-parchment-muted"
        >
          Déjà inscrit
        </Link>
      </div>
    </main>
  );
}