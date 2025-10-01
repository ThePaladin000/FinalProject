/**
 * ProtectedRoute HOC Component
 * Protects routes from unauthorized access as required by Stage 3 criteria
 */

'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Higher-Order Component to protect routes
 * Unauthorized users are redirected to /login
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Wait for auth to load
    if (!isLoaded) {
      return;
    }

    // If user is not signed in, redirect to login
    if (!isSignedIn) {
      // Store the attempted URL to redirect back after login
      if (pathname) {
        localStorage.setItem('redirect_after_login', pathname);
      }
      router.push('/login');
    }
  }, [isSignedIn, isLoaded, router, pathname]);

  // Show loading state while checking authentication
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // If not authenticated, show nothing (will redirect)
  if (!isSignedIn) {
    return null;
  }

  // Render protected content
  return <>{children}</>;
}

/**
 * Hook to use protected route logic in components
 */
export function useProtectedRoute() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  const requireAuth = () => {
    if (!isLoaded) return false;

    if (!isSignedIn) {
      router.push('/login');
      return false;
    }

    return true;
  };

  return {
    isAuthenticated: isSignedIn,
    isLoading: !isLoaded,
    requireAuth,
  };
}
