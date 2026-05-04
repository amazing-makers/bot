import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';

import type { Metadata } from 'next';
import { ColorSchemeScript, MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { AMAKERS_BRAND } from '@amakers/ui';

export const metadata: Metadata = {
    title: 'Amakers Admin',
    description: '슈퍼관리자 대시보드',
};

const theme = createTheme({
    primaryColor: AMAKERS_BRAND.primaryColor,
    defaultRadius: AMAKERS_BRAND.radius,
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ko" suppressHydrationWarning>
            <head>
                <ColorSchemeScript />
            </head>
            <body>
                <MantineProvider theme={theme}>
                    <Notifications position="top-right" />
                    {children}
                </MantineProvider>
            </body>
        </html>
    );
}
