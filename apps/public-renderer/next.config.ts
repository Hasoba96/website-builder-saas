import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { readWebConfig } from '@website-builder/config/web-server';
import { securityHeaders } from '@website-builder/observability';
readWebConfig();
const config: NextConfig = {
  output: 'standalone',
  agentRules: false,
  poweredByHeader: false,
  devIndicators: false,
  images: { unoptimized: true, remotePatterns: [], localPatterns: [] },
  skipTrailingSlashRedirect: true,
  skipProxyUrlNormalize: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: Object.entries(securityHeaders('public-renderer')).map(
          ([key, value]) => ({ key, value }),
        ),
      },
    ];
  },
};
export default createNextIntlPlugin('./src/i18n/request.ts')(config);
