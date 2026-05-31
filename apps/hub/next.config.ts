import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: [
    '@amakers/ai',
    '@amakers/auth',
    '@amakers/billing',
    '@amakers/db',
    '@amakers/types',
    '@amakers/ui',
  ],
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default config;
