import type { NextConfig } from 'next';

const config: NextConfig = {
    transpilePackages: [
        '@amakers/auth',
        '@amakers/billing',
        '@amakers/db',
        '@amakers/types',
        '@amakers/ui',
    ],
    typescript: {
        ignoreBuildErrors: false,
    },
    images: {
        // 외부 사이트 (쿠팡·타오바오·1688·아마존 등) 이미지를 직접 fetch 후 보여주기 위해
        // remotePatterns 사용 — production 에서는 R2 다운로드 후 표시 권장.
        remotePatterns: [
            { protocol: 'https', hostname: '**' },
            { protocol: 'http', hostname: '**' },
        ],
    },
};

export default config;
