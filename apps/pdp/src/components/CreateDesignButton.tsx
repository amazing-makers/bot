'use client';

/**
 * pdpbot 상품 분석 → designbot 광고 디자인 자동 생성 버튼.
 *
 * 클릭 시:
 *   1) designbot /api/designs/from-product 호출 (POST)
 *   2) 성공 시 designbot 에디터로 redirect
 *
 * DESIGNBOT_URL env (client-side) = NEXT_PUBLIC_DESIGNBOT_URL
 * 기본값: http://localhost:3300 (로컬) / https://design.amakers.co.kr (운영)
 */

import { useState } from 'react';
import { Button, Menu, Text } from '@mantine/core';
import { IconBrush, IconChevronDown } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

const DESIGNBOT_URL = process.env.NEXT_PUBLIC_DESIGNBOT_URL || 'http://localhost:3300';

const PRESET_OPTIONS = [
    { key: 'instagram_square', label: '인스타그램 정사각 (1080×1080)' },
    { key: 'instagram_story', label: '인스타그램 스토리 (1080×1920)' },
    { key: 'coupang_main', label: '쿠팡 메인 이미지 (1000×1000)' },
    { key: 'naver_banner', label: '네이버 배너 (750×420)' },
    { key: 'card_news', label: '카드뉴스 (1080×1350)' },
];

interface Props {
    productId: string;
}

export default function CreateDesignButton({ productId }: Props) {
    const [loading, setLoading] = useState(false);

    const handleCreate = async (canvasPreset: string) => {
        setLoading(true);
        try {
            const r = await fetch(`${DESIGNBOT_URL}/api/designs/from-product`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // SSO cookie 공유 (.amakers.co.kr domain)
                body: JSON.stringify({ productId, canvasPreset }),
            });
            const data = await r.json();
            if (!r.ok) {
                if (r.status === 401) {
                    notifications.show({ message: 'designbot 에 먼저 로그인 해주세요', color: 'orange' });
                    window.open(`${DESIGNBOT_URL}/login`, '_blank');
                    return;
                }
                throw new Error(data.error || '디자인 생성 실패');
            }
            notifications.show({ title: '✅ 디자인 생성됨', message: '에디터로 이동합니다', color: 'teal', autoClose: 1500 });
            window.open(`${DESIGNBOT_URL}${data.editorUrl}`, '_blank');
        } catch (e: any) {
            notifications.show({ title: '오류', message: e?.message || '오류', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Menu shadow="md" width={260}>
            <Menu.Target>
                <Button
                    variant="gradient"
                    gradient={{ from: 'pink', to: 'orange' }}
                    leftSection={<IconBrush size={16} />}
                    rightSection={<IconChevronDown size={14} />}
                    loading={loading}
                    size="sm"
                >
                    광고 디자인 만들기
                </Button>
            </Menu.Target>
            <Menu.Dropdown>
                <Menu.Label>
                    <Text size="xs">어떤 사이즈로 만들까요?</Text>
                </Menu.Label>
                {PRESET_OPTIONS.map(opt => (
                    <Menu.Item
                        key={opt.key}
                        onClick={() => handleCreate(opt.key)}
                    >
                        {opt.label}
                    </Menu.Item>
                ))}
            </Menu.Dropdown>
        </Menu>
    );
}
