import '@mantine/core/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/notifications/styles.css';

import type { Metadata } from 'next';
import { ColorSchemeScript, mantineHtmlProps, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';

export const metadata: Metadata = {
    title: 'mockupbot — AI 상품 목업 생성',
    description: '한국 이커머스 셀러를 위한 AI 라이프스타일 상품 목업 자동 생성',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ko" {...mantineHtmlProps}>
            <head>
                <ColorSchemeScript defaultColorScheme="auto" />
            </head>
            <body>
                <MantineProvider defaultColorScheme="auto">
                    <Notifications position="top-right" />
                    {children}
                </MantineProvider>
            </body>
        </html>
    );
}
