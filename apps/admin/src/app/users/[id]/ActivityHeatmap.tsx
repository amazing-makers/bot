import { Paper, Group, Text, Stack, Box } from '@mantine/core';
import { IconChartBar } from '@tabler/icons-react';

interface Props {
    /** 24×7 카운트 (요일별 시간대별 활동 횟수) — [day][hour] */
    matrix: number[][];
    totalEvents: number;
    /** 가장 활발한 시간대 정보 */
    peak: { day: string; hour: number; count: number } | null;
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * Phase 36 — 사용자 활동 히트맵 (24시간 × 7요일).
 * 셀 색상: 흰색(0) → 진한 violet(max). 셀 hover 시 카운트 표시.
 */
export default function ActivityHeatmap({ matrix, totalEvents, peak }: Props) {
    const max = Math.max(1, ...matrix.flat());
    const colorFor = (n: number) => {
        if (n === 0) return 'transparent';
        const intensity = Math.min(1, n / max);
        // violet-1 ~ violet-9 비율 대신 직접 alpha 사용
        const alpha = 0.15 + intensity * 0.75;
        return `rgba(124, 58, 237, ${alpha})`;
    };

    return (
        <Paper withBorder p="md" radius="md">
            <Group justify="space-between" mb="sm">
                <Group gap={6}>
                    <IconChartBar size={18} />
                    <Text fw={700}>활동 히트맵 (24h × 7day)</Text>
                </Group>
                <Stack gap={0} align="flex-end">
                    <Text size="xs" c="dimmed">총 캠페인 작성 {totalEvents}건</Text>
                    {peak && (
                        <Text size="xs" fw={600} c="violet.7">
                            🔥 피크: {peak.day} {peak.hour}시 ({peak.count}건)
                        </Text>
                    )}
                </Stack>
            </Group>

            {totalEvents === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py="md">캠페인 작성 이력 없음</Text>
            ) : (
                <Box style={{ overflowX: 'auto' }}>
                    <table style={{ borderCollapse: 'separate', borderSpacing: 2, fontSize: 9 }}>
                        <thead>
                            <tr>
                                <th style={{ width: 28 }} />
                                {Array.from({ length: 24 }, (_, h) => (
                                    <th key={h} style={{ width: 18, color: 'var(--mantine-color-dimmed)', fontWeight: 400 }}>
                                        {h % 3 === 0 ? h : ''}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {DAY_LABELS.map((label, day) => (
                                <tr key={day}>
                                    <td style={{ width: 28, color: 'var(--mantine-color-dimmed)', fontWeight: 600, textAlign: 'right', paddingRight: 4 }}>
                                        {label}
                                    </td>
                                    {Array.from({ length: 24 }, (_, hour) => {
                                        const count = matrix[day]?.[hour] || 0;
                                        return (
                                            <td
                                                key={hour}
                                                title={`${label} ${hour}시: ${count}건`}
                                                style={{
                                                    width: 18,
                                                    height: 18,
                                                    borderRadius: 3,
                                                    background: colorFor(count),
                                                    border: '1px solid var(--mantine-color-default-border)',
                                                }}
                                            />
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Box>
            )}

            <Group gap={6} justify="flex-end" mt="xs">
                <Text size="10px" c="dimmed">적음</Text>
                {[0.15, 0.3, 0.5, 0.7, 0.9].map(a => (
                    <Box
                        key={a}
                        style={{
                            width: 12,
                            height: 12,
                            borderRadius: 2,
                            background: `rgba(124, 58, 237, ${a})`,
                        }}
                    />
                ))}
                <Text size="10px" c="dimmed">많음</Text>
            </Group>
        </Paper>
    );
}
