"use client";

import AuthWrapper from "@/components/AuthWrapper";
import DesktopOnly from "@/components/DesktopOnly";
import SidebarTreeClient from "@/components/SidebarTreeClient";
import Link from "next/link";
import RouteProgress from "@/components/RouteProgress";
import { Suspense, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

export default function AppLayout({ children }: { children: React.ReactNode }) {

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user } = useUser();
  const me = useQuery(api.queries.getMe, {});

  // Get user's display name from Clerk or fallback to database name
  const displayName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.fullName || me?.name || "User";

  // Get user's plan status
  const planStatus = me?.isPaid ? "Pro" : "Free";

  return (
    <AuthWrapper>
      <DesktopOnly>
      <div className="h-screen bg-gray-900 text-white flex overflow-hidden relative">
        {/* Collapsed sidebar strip with subtle purple tint */}
        {!isSidebarOpen && (
          <div className="fixed top-0 left-0 h-full w-14 z-40 relative bg-gray-800/95 border-r border-purple-900/30 shadow-lg shadow-purple-900/10">
            <div className="absolute inset-0 bg-purple-900/20 pointer-events-none" />
            <div className="relative flex items-start justify-center pt-3">
              <button
                aria-label="Open sidebar"
                title="Open sidebar"
                onClick={() => setIsSidebarOpen(true)}
                className="z-50 p-2 rounded-md bg-gray-800/90 border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5v14" />
                </svg>
              </button>
            </div>
          </div>
        )}
        {/* Left Sidebar */}
        {isSidebarOpen && (
        <div className="w-64 bg-gray-800 flex flex-col h-full">
          {/* Top Section - Nexus Hub */}
          <div className="flex-shrink-0 relative">
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 shadow-lg shadow-purple-500/50"></div>
            <div className="flex items-center w-full">
              <Link
                href="/nexi"
                title="Nexus Hub"
                className="flex flex-1 items-center gap-2 p-3 hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-medium text-purple-400">Nexus Hub</div>
                </div>
              </Link>
              <div className="ml-auto w-[2.625rem] flex items-center justify-center">
                <button
                  aria-label="Hide sidebar"
                  title="Hide sidebar"
                  onClick={() => setIsSidebarOpen(false)}
                  className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 5v14" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 7l-5 5 5 5" />
                  </svg>
                  </button>
              </div>
            </div>
          </div>

          {/* Tree View */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <Suspense fallback={<div className="p-3 text-xs text-gray-400">Loading tree…</div>}>
              <SidebarTreeClient />
            </Suspense>
          </div>

          {/* Bottom Section - Profile with separator */}
          <div className="h-12 px-3 flex items-center flex-shrink-0 relative">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 shadow-lg shadow-purple-500/50"></div>
            <Link
              href="/settings"
              title="Settings"
              className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586l-3.707 3.707A1 1 0 0116.586 11H7.414a1 1 0 01-.707-.707L3 6.586V4zM3 8v10a1 1 0 001 1h16a1 1 0 001-1V8l-3.707 3.707A1 1 0 0116.586 11H7.414a1 1 0 01-.707-.707L3 8z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-xs font-medium">{displayName}</div>
                <div className="text-xs text-purple-400">{planStatus}</div>
              </div>
            </Link>
          </div>
        </div>
        )}

        {/* Main Content Area */}
        <div className={`flex-1 flex flex-col h-full overflow-hidden min-h-0`}>
          <RouteProgress />
          {children}
        </div>
      </div>
      </DesktopOnly>
    </AuthWrapper>
  );
}


