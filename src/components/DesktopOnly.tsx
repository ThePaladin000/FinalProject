import React from "react";

type DesktopOnlyProps = {
  children: React.ReactNode;
};

export default function DesktopOnly({ children }: DesktopOnlyProps) {
  return (
    <div className="min-h-screen">
      {/* Desktop and larger: render the app normally */}
      <div className="hidden md:block min-h-screen">{children}</div>

      {/* Tablet/Mobile: show placeholder */}
      <div className="md:hidden flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-600/20 ring-1 ring-purple-500/30">
            <svg className="h-8 w-8 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7h18M6 12h12M9 17h6" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold">NexusTech is Desktop only</h1>
          <p className="mt-2 text-sm text-gray-300">
            Please use a device with a larger screen (md and up) for the best experience.
          </p>
          <div className="mt-6 rounded-xl bg-gray-800/60 p-4 text-left text-xs text-gray-300 ring-1 ring-gray-700">
            <p>
              Why am I seeing this? NexusTech provides a dense, multi‑panel workspace that is
              optimized for large displays and precise input.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


