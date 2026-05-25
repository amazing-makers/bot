import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

import type { Metadata } from 'next';
import { ColorSchemeScript, mantineHtmlProps, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';

export const metadata: Metadata = {
    title: 'BlogAuto — 블로그 자동화',
    description: '글 작성부터 예약·발행까지, 블로그 마케팅 자동화봇.',
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
