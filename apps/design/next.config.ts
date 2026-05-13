import type { NextConfig } from 'next';

const config: NextConfig = {
    transpilePackages: [
        '@amakers/auth',
        '@amakers/billing',
        '@amakers/db',
        '@amakers/types',
        '@amakers/ui',
    ],
    // designbot 도 한글 텍스트 합성 사용 — Pretendard otf 번들 포함.
    outputFileTracingIncludes: {
        '/api/**': ['./fonts/**'],
    },
    typescript: {
        ignoreBuildErrors: false,
    },
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: '**' },
            { protocol: 'http', hostname: '**' },
        ],
    },
};

export default config;
