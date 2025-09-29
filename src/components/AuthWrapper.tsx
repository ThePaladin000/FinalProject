"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";

interface AuthWrapperProps {
    children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
    const { isSignedIn, isLoaded } = useAuth();
    async function ensureUserViaServer() {
        try {
            await fetch("/api/ensure-user", { method: "POST" });
        } catch {
            // swallow errors in wrapper
        }
    }

    // Do not redirect guests; allow browsing with limited capabilities
    useEffect(() => {
        // no-op for guests
    }, [isLoaded, isSignedIn]);

    useEffect(() => {
        if (isLoaded && isSignedIn) {
            ensureUserViaServer();
        }
    }, [isLoaded, isSignedIn]);

    if (!isLoaded) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    // For guests, still render children; downstream components should self-limit features
    return <>{children}</>;
} 