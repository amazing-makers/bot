'use client';

import { useState } from 'react';
import { Box, Group, SegmentedControl, Text, Paper, Image } from '@mantine/core';

/**
 * 모바일 폰 프레임으로 결과 PNG 미리보기.
 *
 * 쿠팡/네이버는 사용자 90%+ 가 모바일 — 합성된 1장 PNG 가 실제 폰에서 어떻게 보이는지 즉시 확인.
 *
 * 기기 옵션:
 *   - iPhone (375px)  : 작은 폰 기준
 *   - Galaxy (412px)  : 중간 폰 기준
 *   - iPad (768px)    : 태블릿 (가끔)
 *
 * 폰 frame 은 CSS 로 — Mantine Box + border-radius + shadow.
 */

const DEVICES = {
    'iPhone (375)':  { width: 375,  label: 'iPhone' },
    'Galaxy (412)':  { width: 412,  label: 'Galaxy' },
    'iPad (768)':    { width: 768,  label: 'iPad' },
} as const;

type DeviceKey = keyof typeof DEVICES;

export default function MobilePreview({
    imageUrl,
    alt,
}: {
    imageUrl: string;
    alt?: string;
}) {
    const [device, setDevice] = useState<DeviceKey>('iPhone (375)');
    const dev = DEVICES[device];

    return (
        <Paper withBorder p="md" radius="md">
            <Group justify="space-between" mb="sm">
                <Text size="sm" fw={700}>📱 실제 폰 미리보기</Text>
                <SegmentedControl
                    size="xs"
                    value={device}
                    onChange={(v) => setDevice(v as DeviceKey)}
                    data={Object.keys(DEVICES).map(k => ({ value: k, label: DEVICES[k as DeviceKey].label }))}
                />
            </Group>

            <Box ta="center" pb="md">
                <Box
                    style={{
                        display: 'inline-block',
                        width: dev.width + 24, // 테두리 12px × 2
                        maxWidth: '100%',
                        borderRadius: 36,
                        border: '12px solid #1a1a1a',
                        boxShadow: '0 24px 48px rgba(0,0,0,0.15)',
                        background: '#1a1a1a',
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    {/* notch */}
                    <Box
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 80,
                            height: 18,
                            background: '#1a1a1a',
                            borderRadius: '0 0 12px 12px',
                            zIndex: 2,
                        }}
                    />
                    {/* image scrollable container */}
                    <Box
                        style={{
                            width: dev.width,
                            maxWidth: '100%',
                            height: Math.min(dev.width * 1.6, 700), // 16:10 mobile aspect
                            overflowY: 'auto',
                            background: '#fff',
                        }}
                    >
                        <Image
                            src={imageUrl}
                            alt={alt || 'mobile preview'}
                            fit="contain"
                            style={{ width: '100%', display: 'block' }}
                        />
                    </Box>
                </Box>
            </Box>

            <Text size="11px" c="dimmed" ta="center">
                ⓘ 위로 스크롤 가능. 실제 쿠팡·네이버 모바일 앱과 동일한 폭 ({dev.width}px).
            </Text>
        </Paper>
    );
}
