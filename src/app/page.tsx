"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

export default function Home() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      const redirectUrl = localStorage.getItem('redirect_after_login');
      if (redirectUrl) {
        localStorage.removeItem('redirect_after_login');
        router.push(redirectUrl);
      } else {
        router.push("/nexi");
      }
    } else {
      router.push("/login");
    }
  }, [isSignedIn, isLoaded, router]);

  // Show loading state while checking auth
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white text-xl">Loading...</div>
    </div>
  );
}


