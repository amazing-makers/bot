import '@mantine/core/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/modals/styles.css';

import type { Metadata } from 'next';
import { ColorSchemeScript, mantineHtmlProps, MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';

export const metadata: Metadata = {
    title: 'designbot — AI 디자인 자동화',
    description: '셀러용 광고·SNS·배너 디자인을 AI 로 자동 생성',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ko" {...mantineHtmlProps}>
            <head>
                <ColorSchemeScript defaultColorScheme="auto" />
            </head>
            <body>
                <MantineProvider defaultColorScheme="auto">
                    <ModalsProvider>
                        <Notifications position="top-right" />
                        {children}
                    </ModalsProvider>
                </MantineProvider>
            </body>
        </html>
    );
}
