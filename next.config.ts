import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js App Router injects inline scripts for hydration
      "script-src 'self' 'unsafe-inline'",
      // Tailwind/React inline style props + Material Symbols stylesheet
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Material Symbols font files (next/font/google serves Inter & Manrope locally)
      "font-src 'self' https://fonts.gstatic.com",
      // Images: local + data URIs (map canvas) + blob URLs
      "img-src 'self' data: blob:",
      // API calls are same-origin only
      "connect-src 'self'",
      // Block embedding in frames entirely
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
