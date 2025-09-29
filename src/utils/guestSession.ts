import React from 'react';

// Guest session management for unauthenticated users
// This provides a temporary session ID that persists across page refreshes

const GUEST_SESSION_KEY = 'nexus_guest_session_id';

export function getGuestSessionId(): string {
  if (typeof window === 'undefined') {
    // Server-side, return a placeholder
    return 'server-side';
  }

  let sessionId = localStorage.getItem(GUEST_SESSION_KEY);
  
  if (!sessionId) {
    // Generate a new session ID
    sessionId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(GUEST_SESSION_KEY, sessionId);
  }
  
  return sessionId;
}

// React hook for guest session ID that handles hydration properly
export function useGuestSessionId(): string | null {
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
    let id = localStorage.getItem(GUEST_SESSION_KEY);
    
    if (!id) {
      id = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem(GUEST_SESSION_KEY, id);
    }
    
    setSessionId(id);
  }, []);

  // Return null during SSR and initial client render to prevent hydration mismatch
  return isClient ? sessionId : null;
}

export function clearGuestSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(GUEST_SESSION_KEY);
  }
}

export function isGuestSession(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  const sessionId = localStorage.getItem(GUEST_SESSION_KEY);
  return !!sessionId;
}
