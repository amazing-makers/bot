import type { NextConfig } from 'next';
const config: NextConfig = {
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: '**' },
            { protocol: 'http', hostname: '**' },
        ],
    },
    typescript: { ignoreBuildErrors: false },
};
export default config;
