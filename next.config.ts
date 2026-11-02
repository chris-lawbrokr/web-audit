import type { NextConfig } from 'next';

import { BASE_PATH } from './src/shared/config/base-path';

// The Content-Security-Policy comes later from proxy.ts, which can set a per-request nonce (06 §4.6).
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  basePath: BASE_PATH,
  poweredByHeader: false,
  headers() {
    return Promise.resolve([{ source: '/:path*', headers: securityHeaders }]);
  },
  // The bare origin (localhost:4100, the Vercel URL) has no page of its own; send it to the tool.
  redirects() {
    return Promise.resolve([
      { source: '/', destination: BASE_PATH, basePath: false, permanent: false },
    ]);
  },
};

export default nextConfig;
