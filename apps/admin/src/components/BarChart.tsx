/**
 * 의존성 없는 inline SVG 바 차트.
 * Recharts/Chart.js 같은 무거운 라이브러리 회피 — admin 첫 화면 빠른 로딩 우선.
 */

interface BarChartProps {
    data: Array<{ label: string; value: number; secondaryValue?: number }>;
    height?: number;
    color?: string;
    secondaryColor?: string;
    formatValue?: (n: number) => string;
}

export default function BarChart({
    data,
    height = 180,
    color = 'var(--mantine-color-blue-5)',
    secondaryColor = 'var(--mantine-color-violet-5)',
    formatValue = (n) => n.toLocaleString(),
}: BarChartProps) {
    if (data.length === 0) {
        return (
            <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mantine-color-dimmed)' }}>
                데이터 없음
            </div>
        );
    }

    const maxValue = Math.max(
        ...data.map(d => Math.max(d.value, d.secondaryValue ?? 0)),
        1, // avoid divide-by-zero
    );
    const barCount = data.length;
    const hasSecondary = data.some(d => d.secondaryValue !== undefined);
    const barsPerGroup = hasSecondary ? 2 : 1;
    const groupGap = 8;
    const innerGap = 2;

    return (
        <div style={{ width: '100%', overflowX: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', height, gap: groupGap, minWidth: barCount * 40 }}>
                {data.map((d, i) => {
                    const h1 = (d.value / maxValue) * (height - 28);
                    const h2 = d.secondaryValue !== undefined ? (d.secondaryValue / maxValue) * (height - 28) : 0;
                    return (
                        <div
                            key={i}
                            style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 4,
                                minWidth: 30,
                            }}
                        >
                            <div style={{ display: 'flex', gap: innerGap, alignItems: 'flex-end', flex: 1, width: '100%', justifyContent: 'center' }}>
                                <div
                                    title={`${d.label}: ${formatValue(d.value)}`}
                                    style={{
                                        width: hasSecondary ? '40%' : '60%',
                                        height: Math.max(h1, 2),
                                        background: color,
                                        borderRadius: '4px 4px 0 0',
                                        transition: 'height 0.3s',
                                    }}
                                />
                                {hasSecondary && (
                                    <div
                                        title={`${d.label} (보조): ${formatValue(d.secondaryValue!)}`}
                                        style={{
                                            width: '40%',
                                            height: Math.max(h2, 2),
                                            background: secondaryColor,
                                            borderRadius: '4px 4px 0 0',
                                            transition: 'height 0.3s',
                                        }}
                                    />
                                )}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--mantine-color-dimmed)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                {d.label}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
