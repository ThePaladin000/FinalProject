import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    domains: ['images.clerk.dev'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.clerk.dev',
        port: '',
        pathname: '/**',
      },
    ],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  async headers() {
    const isProd = process.env.NODE_ENV === 'production';

    const cspDev = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss: data: blob:",
      "media-src 'self' https:",
      "frame-src 'self' https:",
      "object-src 'none'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
    ].join('; ');

    const cspProd = [
      "default-src 'self'",
      // Allow inline scripts for Next.js and client-side libraries
      "script-src 'self' 'unsafe-inline' https:",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss:",
      "media-src 'self' https:",
      "frame-src 'self' https:",
      "object-src 'none'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      'upgrade-insecure-requests',
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: isProd ? cspProd : cspDev,
          },
          // HSTS: only effective over HTTPS; safe on Vercel
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // Reduce referrer leakage
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Lock down powerful APIs
          {
            key: 'Permissions-Policy',
            value: [
              'camera=()',
              'microphone=()',
              'geolocation=()',
              'payment=()',
              'usb=()',
              'magnetometer=()',
              'gyroscope=()',
              'accelerometer=()',
              'document-domain=()',
              'fullscreen=(self)',
            ].join(', '),
          },
          // COOP: isolate browsing context
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          // Optional: enforce same-origin resource policy
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Permitted-Cross-Domain-Policies',
            value: 'none',
          },
          {
            key: 'Origin-Agent-Cluster',
            value: '?1',
          },
        ],
      },
    ];
  },
  // Add a webpack alias to trap accidental imports of next/document and show a clear stack
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias["next/document"] = path.resolve(__dirname, "src/shims/next-document-block.ts");

    // Handle SVG imports using SVGR in webpack (Turbopack will ignore webpack loaders)
    // This avoids using unsupported Turbopack loader config that can cause chunk issues.
    // Only apply when module rules are present (webpack build)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const moduleConfig = (config as any).module;
    if (moduleConfig && Array.isArray(moduleConfig.rules)) {
      moduleConfig.rules.push({
        test: /\.svg$/i,
        issuer: /\.[jt]sx?$/,
        use: ["@svgr/webpack"],
      });
    }
    return config;
  },
};

export default nextConfig;