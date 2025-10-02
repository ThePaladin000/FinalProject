import React from "react";

type DesktopOnlyProps = {
  children: React.ReactNode;
};

export default function DesktopOnly({ children }: DesktopOnlyProps) {
  return (
    <main className="min-h-screen">
      {/* Desktop (lg+): render the app normally */}
      <section className="hidden lg:block min-h-screen" aria-label="Desktop application view">{children}</section>

      {/* Tablet (md-lg): render the app with tablet optimizations */}
      <section className="hidden md:block lg:hidden min-h-screen" aria-label="Tablet application view">{children}</section>

      {/* Mobile (below md): show placeholder */}
      <section className="md:hidden flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6" aria-label="Mobile device message">
        <article className="w-full max-w-sm text-center">
          <figure className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-600/20 ring-1 ring-purple-500/30">
            <svg className="h-8 w-8 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7h18M6 12h12M9 17h6" />
            </svg>
          </figure>
          <h1 className="text-2xl font-semibold">NexusTech</h1>
          <p className="mt-2 text-sm text-gray-300">
            Please use a device with a larger screen.
          </p>
          <aside className="mt-6 rounded-xl bg-gray-800/60 p-4 text-left text-xs text-gray-300 ring-1 ring-gray-700">
            <p>
              <strong>Why are you seeing this?</strong> NexusTech provides a dense, multi‑panel workspace that is
              optimized for large displays and precise input.
            </p>
          </aside>
        </article>
      </section>
    </main>
  );
}

