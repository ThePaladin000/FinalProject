import "./globals.css";
import { Providers } from "./providers";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nexus Tech",
  icons: {
    icon: "/images/purple-nexus-icon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider
          signInFallbackRedirectUrl="/login"
          signUpFallbackRedirectUrl="/login"
          afterSignInUrl="/nexi"
          afterSignUpUrl="/nexi"
        >
          <Providers>{children}</Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
