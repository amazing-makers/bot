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
        // 사용자 업로드/R2 호스팅 이미지 미리보기 + 인스타 발행용 public URL 미리보기.
        remotePatterns: [
            { protocol: 'https', hostname: '**' },
        ],
    },
};

export default config;
