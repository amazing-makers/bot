import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';

import type { Metadata } from 'next';
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import Providers from '@/components/Providers';
import AdminShell from '@/components/AdminShell';
import { auth } from '@/auth';
import { isAdminEmail } from '@amakers/auth';

export const metadata: Metadata = {
    title: 'Amakers Admin',
    description: '슈퍼관리자 대시보드',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();
    // 인증된 admin 만 shell 적용. 비인증/비admin 은 layout 없이 raw 렌더 (login 페이지용).
    const isAuthed = session?.user && isAdminEmail(session.user.email, (session.user as any).role);

    return (
        <html lang="ko" {...mantineHtmlProps}>
            <head>
                <ColorSchemeScript defaultColorScheme="auto" />
            </head>
            <body>
                <Providers>
                    {isAuthed ? <AdminShell>{children}</AdminShell> : children}
                </Providers>
            </body>
        </html>
    );
}
