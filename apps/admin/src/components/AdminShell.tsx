'use client';

import {
    AppShell, Burger, Group, NavLink, Title, UnstyledButton, Text, Menu, Avatar,
    ActionIcon, Stack, Tooltip, useMantineColorScheme, Kbd, Box, Divider,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Spotlight, spotlight } from '@mantine/spotlight';
import '@mantine/spotlight/styles.css';
import {
    IconDashboard, IconUsers, IconCash, IconRobot, IconUsersGroup,
    IconLogout, IconSun, IconMoon, IconSearch, IconMessage, IconFileAnalytics,
    IconShield, IconHistory, IconMail,
} from '@tabler/icons-react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

function DarkModeToggle() {
    const { colorScheme, setColorScheme } = useMantineColorScheme({ keepTransitions: true });
    const isDark = colorScheme === 'dark';
    return (
        <Tooltip label={isDark ? '라이트 모드' : '다크 모드'} withArrow>
            <ActionIcon variant="subtle" size="lg" onClick={() => setColorScheme(isDark ? 'light' : 'dark')}>
                {isDark ? <IconSun size={18} stroke={1.7} /> : <IconMoon size={18} stroke={1.7} />}
            </ActionIcon>
        </Tooltip>
    );
}

function CommandPalette() {
    return (
        <Tooltip label="검색·이동 (Ctrl+K)" withArrow>
            <UnstyledButton
                onClick={() => spotlight.open()}
                style={{
                    padding: '4px 12px',
                    borderRadius: 8,
                    background: 'var(--mantine-color-default-hover)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                }}
            >
                <IconSearch size={14} stroke={1.7} />
                <Text size="xs" c="dimmed">메뉴, 사용자, 리셀러 검색...</Text>
                <Kbd size="xs">Ctrl</Kbd>
                <Kbd size="xs">K</Kbd>
            </UnstyledButton>
        </Tooltip>
    );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const [opened, { toggle }] = useDisclosure();
    const pathname = usePathname();
    const router = useRouter();

    const navItems = [
        { href: '/', label: '🏠 운영 대시보드', icon: IconDashboard, exact: true },
        { href: '/users', label: '👥 사용자 관리', icon: IconUsers },
        { href: '/resellers', label: '🤝 리셀러·파트너', icon: IconUsersGroup },
        { href: '/revenue', label: '💰 매출·정산', icon: IconCash },
        { href: '/feedback', label: '💬 피드백 분석', icon: IconMessage },
        { href: '/broadcast', label: '📣 이메일 브로드캐스트', icon: IconMail },
        { href: '/audit', label: '📜 감사 로그', icon: IconHistory },
        { href: '/bots', label: '🤖 봇 레지스트리', icon: IconRobot },
    ];

    const spotlightActions = navItems.map(n => ({
        id: n.href,
        label: n.label,
        onClick: () => router.push(n.href),
        leftSection: <n.icon size={18} />,
    }));

    return (
        <>
            <Spotlight
                actions={spotlightActions}
                nothingFound="결과 없음"
                highlightQuery
                searchProps={{ leftSection: <IconSearch size={18} />, placeholder: '메뉴 검색...' }}
                shortcut={['mod + K', 'mod + P']}
            />
            <AppShell
                header={{ height: 60 }}
                navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } }}
                padding="md"
            >
                <AppShell.Header>
                    <Group h="100%" px="md" justify="space-between" wrap="nowrap">
                        <Group wrap="nowrap" gap="md">
                            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                            <UnstyledButton component={Link} href="/">
                                <Group gap={6}>
                                    <IconShield size={20} color="var(--mantine-color-violet-6)" />
                                    <Title order={4} style={{
                                        background: 'linear-gradient(135deg, var(--mantine-color-violet-6), var(--mantine-color-pink-6))',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                    }}>
                                        Amakers Admin
                                    </Title>
                                </Group>
                            </UnstyledButton>
                            <Box visibleFrom="md">
                                <CommandPalette />
                            </Box>
                        </Group>

                        <Group gap="xs" wrap="nowrap">
                            <DarkModeToggle />
                            {session?.user && (
                                <Menu shadow="md" width={220} position="bottom-end">
                                    <Menu.Target>
                                        <UnstyledButton>
                                            <Group gap={6}>
                                                <Avatar radius="xl" size="sm" color="violet">
                                                    {(session.user.email || '?').charAt(0).toUpperCase()}
                                                </Avatar>
                                                <Text size="xs" fw={500} visibleFrom="md" c="dimmed">
                                                    {session.user.email}
                                                </Text>
                                            </Group>
                                        </UnstyledButton>
                                    </Menu.Target>
                                    <Menu.Dropdown>
                                        <Menu.Label>슈퍼관리자</Menu.Label>
                                        <Menu.Item leftSection={<IconShield size={14} />}>{session.user.email}</Menu.Item>
                                        <Menu.Divider />
                                        <Menu.Item color="red" leftSection={<IconLogout size={14} />} onClick={() => signOut({ callbackUrl: '/login' })}>
                                            로그아웃
                                        </Menu.Item>
                                    </Menu.Dropdown>
                                </Menu>
                            )}
                        </Group>
                    </Group>
                </AppShell.Header>

                <AppShell.Navbar p="md">
                    <Stack gap="xs">
                        {navItems.map(item => (
                            <NavLink
                                key={item.href}
                                component={Link}
                                href={item.href}
                                label={item.label}
                                leftSection={<item.icon size={18} stroke={1.5} />}
                                active={item.exact ? pathname === item.href : !!pathname && pathname.startsWith(item.href)}
                            />
                        ))}
                    </Stack>

                    <Box mt="auto" pt="md">
                        <Divider mb="xs" />
                        <UnstyledButton onClick={() => spotlight.open()} style={{ width: '100%' }}>
                            <Group gap={8} p="xs" style={{ borderRadius: 8, background: 'var(--mantine-color-default-hover)' }}>
                                <IconSearch size={14} />
                                <Text size="xs" c="dimmed" style={{ flex: 1 }}>빠른 이동...</Text>
                                <Kbd size="xs">⌘K</Kbd>
                            </Group>
                        </UnstyledButton>
                        <Group gap={4} mt="xs" wrap="nowrap">
                            <IconFileAnalytics size={11} color="var(--mantine-color-dimmed)" />
                            <Text size="10px" c="dimmed">v1.0 · Amakers Platform</Text>
                        </Group>
                    </Box>
                </AppShell.Navbar>

                <AppShell.Main>{children}</AppShell.Main>
            </AppShell>
        </>
    );
}
