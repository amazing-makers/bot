'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dayjs, { type Dayjs } from 'dayjs';
import { Group, Title, Button, Paper, Text, Box, Badge, Stack, ActionIcon } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconPlus } from '@tabler/icons-react';

export interface CalendarPost {
    id: string;
    caption: string;
    status: string;
    when: string; // ISO
}

const STATUS_COLOR: Record<string, string> = {
    DRAFT: 'gray', SCHEDULED: 'blue', PUBLISHING: 'yellow', PUBLISHED: 'teal', FAILED: 'red',
};
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function CalendarClient({ posts }: { posts: CalendarPost[] }) {
    const router = useRouter();
    const [month, setMonth] = useState<Dayjs>(dayjs().startOf('month'));

    const byDay = useMemo(() => {
        const m = new Map<string, CalendarPost[]>();
        for (const p of posts) {
            const key = dayjs(p.when).format('YYYY-MM-DD');
            if (!m.has(key)) m.set(key, []);
            m.get(key)!.push(p);
        }
        return m;
    }, [posts]);

    const cells = useMemo(() => {
        const start = month.startOf('month').day(); // 0=Sun
        const daysInMonth = month.daysInMonth();
        const arr: (Dayjs | null)[] = [];
        for (let i = 0; i < start; i++) arr.push(null);
        for (let d = 1; d <= daysInMonth; d++) arr.push(month.date(d));
        while (arr.length % 7 !== 0) arr.push(null);
        return arr;
    }, [month]);

    const today = dayjs().format('YYYY-MM-DD');

    return (
        <Stack gap="md">
            <Group justify="space-between">
                <Group gap="xs">
                    <ActionIcon variant="default" onClick={() => setMonth((m) => m.subtract(1, 'month'))}><IconChevronLeft size={16} /></ActionIcon>
                    <Title order={3} w={140} ta="center">{month.format('YYYY년 M월')}</Title>
                    <ActionIcon variant="default" onClick={() => setMonth((m) => m.add(1, 'month'))}><IconChevronRight size={16} /></ActionIcon>
                    <Button size="xs" variant="subtle" onClick={() => setMonth(dayjs().startOf('month'))}>오늘</Button>
                </Group>
            </Group>

            <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                {WEEKDAYS.map((w, i) => (
                    <Text key={w} ta="center" size="xs" fw={700} c={i === 0 ? 'red' : i === 6 ? 'blue' : 'dimmed'}>{w}</Text>
                ))}
                {cells.map((d, idx) => {
                    if (!d) return <Box key={`e${idx}`} />;
                    const key = d.format('YYYY-MM-DD');
                    const dayPosts = byDay.get(key) || [];
                    const isToday = key === today;
                    return (
                        <Paper
                            key={key}
                            withBorder
                            radius="sm"
                            p={4}
                            style={{ minHeight: 84, cursor: 'pointer', borderColor: isToday ? 'var(--mantine-color-grape-5)' : undefined, background: isToday ? 'var(--mantine-color-grape-0)' : undefined }}
                            onClick={() => router.push(`/dashboard/compose?date=${key}`)}
                        >
                            <Group justify="space-between" gap={2}>
                                <Text size="xs" fw={isToday ? 700 : 400} c={d.day() === 0 ? 'red' : d.day() === 6 ? 'blue' : undefined}>{d.date()}</Text>
                                <IconPlus size={11} color="var(--mantine-color-gray-4)" />
                            </Group>
                            <Stack gap={2} mt={2}>
                                {dayPosts.slice(0, 3).map((p) => (
                                    <Badge key={p.id} size="xs" variant="light" color={STATUS_COLOR[p.status] ?? 'gray'} fullWidth styles={{ label: { overflow: 'hidden', textOverflow: 'ellipsis' } }}>
                                        {p.caption.slice(0, 10) || '(이미지)'}
                                    </Badge>
                                ))}
                                {dayPosts.length > 3 && <Text size="9px" c="dimmed" ta="center">+{dayPosts.length - 3}</Text>}
                            </Stack>
                        </Paper>
                    );
                })}
            </Box>

            <Group gap="md" justify="center">
                {Object.entries({ 예약: 'blue', 발행됨: 'teal', 초안: 'gray', 실패: 'red' }).map(([k, c]) => (
                    <Group key={k} gap={4}><Badge size="xs" variant="light" color={c}>　</Badge><Text size="xs" c="dimmed">{k}</Text></Group>
                ))}
            </Group>
        </Stack>
    );
}
