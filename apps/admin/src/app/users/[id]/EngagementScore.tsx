import { Paper, Group, Text, Stack, Box, Progress, Badge } from '@mantine/core';
import { IconFlame, IconAlertCircle, IconTrendingUp } from '@tabler/icons-react';

interface Props {
    /** 0-100 점수 */
    score: number;
    factors: {
        recencyDays: number; // 마지막 활동 후 일수 (낮을수록 좋음)
        frequencyPerWeek: number; // 주당 캠페인 작성 빈도
        consistencyDays: number; // 30일 중 활동한 일수
        successRate: number; // 0-100
    };
    label: 'cold' | 'warm' | 'hot' | 'champion';
}

const LABEL_INFO: Record<string, { text: string; color: string; emoji: string; description: string }> = {
    cold: { text: 'Cold', color: 'gray', emoji: '🥶', description: '최근 활동 거의 없음' },
    warm: { text: 'Warm', color: 'blue', emoji: '🌡️', description: '간헐적 활동' },
    hot: { text: 'Hot', color: 'orange', emoji: '🔥', description: '꾸준히 활동' },
    champion: { text: 'Champion', color: 'red', emoji: '🏆', description: '최고 활동량' },
};

export default function EngagementScore({ score, factors, label }: Props) {
    const info = LABEL_INFO[label];
    const progressColor = score >= 75 ? 'red' : score >= 50 ? 'orange' : score >= 25 ? 'blue' : 'gray';

    return (
        <Paper withBorder p="md" radius="md">
            <Group gap={6} mb="md">
                <IconFlame size={18} color={`var(--mantine-color-${progressColor}-6)`} />
                <Text fw={700}>Engagement Score</Text>
                <Badge size="md" color={info.color} variant="light">
                    {info.emoji} {info.text}
                </Badge>
                <Text size="xs" c="dimmed">— {info.description}</Text>
            </Group>

            <Group justify="space-between" mb={4}>
                <Text size="xs" c="dimmed">종합 점수</Text>
                <Text fw={800} size="20px" c={`${progressColor}.7`}>{score}/100</Text>
            </Group>
            <Progress value={score} color={progressColor} size="md" radius="md" mb="md" />

            <Stack gap="xs">
                <FactorRow
                    label="최근성"
                    value={`${factors.recencyDays}일 전 활동`}
                    score={Math.max(0, 100 - factors.recencyDays * 3)}
                    description="최근 활동까지 시간 (낮을수록 좋음)"
                />
                <FactorRow
                    label="빈도"
                    value={`주 ${factors.frequencyPerWeek.toFixed(1)}회`}
                    score={Math.min(100, factors.frequencyPerWeek * 20)}
                    description="주당 캠페인 작성 횟수"
                />
                <FactorRow
                    label="꾸준함"
                    value={`30일 중 ${factors.consistencyDays}일`}
                    score={Math.round((factors.consistencyDays / 30) * 100)}
                    description="최근 30일 중 활동한 날 수"
                />
                <FactorRow
                    label="성공률"
                    value={`${factors.successRate}%`}
                    score={factors.successRate}
                    description="발행 시도 중 SUCCESS 비율"
                />
            </Stack>
        </Paper>
    );
}

function FactorRow({ label, value, score, description }: { label: string; value: string; score: number; description: string }) {
    const color = score >= 70 ? 'teal' : score >= 40 ? 'blue' : score >= 20 ? 'orange' : 'gray';
    return (
        <Box>
            <Group justify="space-between" mb={2}>
                <Group gap={6}>
                    <Text size="xs" fw={600}>{label}</Text>
                    <Text size="10px" c="dimmed">{description}</Text>
                </Group>
                <Group gap={4}>
                    <Text size="xs">{value}</Text>
                    <Text size="11px" c="dimmed">({Math.round(score)})</Text>
                </Group>
            </Group>
            <Progress value={score} color={color} size="xs" />
        </Box>
    );
}
