'use client';

import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { SessionProvider } from 'next-auth/react';
import { AMAKERS_BRAND } from '@amakers/ui';

const theme = createTheme({
    primaryColor: AMAKERS_BRAND.primaryColor,
    defaultRadius: AMAKERS_BRAND.radius,
});

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <MantineProvider theme={theme} defaultColorScheme="auto">
                <Notifications position="top-right" />
                {children}
            </MantineProvider>
        </SessionProvider>
    );
}
