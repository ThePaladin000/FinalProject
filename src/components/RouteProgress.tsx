"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export default function RouteProgress() {
  const pathname = usePathname();
  const previousPathnameRef = useRef<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (previousPathnameRef.current === null) {
      previousPathnameRef.current = pathname;
      return;
    }
    if (previousPathnameRef.current !== pathname) {
      setVisible(true);
      const timeout = setTimeout(() => setVisible(false), 450);
      previousPathnameRef.current = pathname;
      return () => clearTimeout(timeout);
    }
  }, [pathname]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 h-0.5 z-50" role="progressbar" aria-label="Page navigation progress">
      <progress 
        className="h-full w-full animate-[routeprogress_0.45s_ease-out] bg-gradient-to-r from-purple-500 to-blue-500 border-0" 
        value="100" 
        max="100"
        aria-hidden="true"
      />
      <style jsx global>{`
        @keyframes routeprogress {
          from { transform: translateX(-80%); opacity: 0.6; }
          to { transform: translateX(0%); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

