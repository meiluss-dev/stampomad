'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-bg text-text flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">✈️</div>
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl text-gold mb-3">
          You&apos;re offline
        </h1>
        <p className="text-text-muted leading-relaxed mb-8">
          It looks like you&apos;ve lost your internet connection.
          Reconnect and your travels will be right where you left them.
        </p>
        <button
          onClick={() => typeof window !== 'undefined' && window.location.reload()}
          className="px-6 py-3 rounded-xl bg-gold text-bg font-medium hover:opacity-90 transition-opacity cursor-pointer"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
