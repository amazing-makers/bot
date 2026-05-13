'use client';

import { useState } from 'react';
import { Modal, Stack, TextInput, Textarea, MultiSelect, Button, Group, Text } from '@mantine/core';
import { IconBookmark } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

const TAG_OPTIONS = [
    { value: 'instagram', label: '인스타그램' },
    { value: 'coupang', label: '쿠팡' },
    { value: 'naver', label: '네이버' },
    { value: 'sns', label: 'SNS 광고' },
    { value: 'card_news', label: '카드뉴스' },
    { value: 'product', label: '상품 광고' },
    { value: 'sale', label: '할인/세일' },
    { value: 'brand', label: '브랜드' },
];

interface Props {
    designId: string;
    defaultTitle?: string;
    opened: boolean;
    onClose: () => void;
    onSaved?: () => void;
}

export default function SaveTemplateModal({ designId, defaultTitle = '', opened, onClose, onSaved }: Props) {
    const [title, setTitle] = useState(defaultTitle);
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!title.trim()) {
            notifications.show({ message: '템플릿 이름을 입력해주세요', color: 'orange' });
            return;
        }
        setSaving(true);
        try {
            const r = await fetch('/api/templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ designId, title: title.trim(), description: description.trim(), tags }),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || '저장 실패');
            notifications.show({ title: '✅ 템플릿 저장됨', message: title, color: 'teal' });
            onClose();
            onSaved?.();
        } catch (e: any) {
            notifications.show({ title: '오류', message: e?.message || '오류', color: 'red' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal opened={opened} onClose={onClose} title="템플릿으로 저장" size="sm">
            <Stack gap="sm">
                <Text size="xs" c="dimmed">
                    현재 디자인을 템플릿으로 저장하면 대시보드에서 언제든지 재사용할 수 있어요.
                </Text>
                <TextInput
                    label="템플릿 이름"
                    placeholder="예: 쿠팡 여름 세일 배너"
                    value={title}
                    onChange={(e) => setTitle(e.currentTarget.value)}
                    required
                />
                <Textarea
                    label="설명 (선택)"
                    placeholder="어떤 광고에 쓰면 좋은지..."
                    value={description}
                    onChange={(e) => setDescription(e.currentTarget.value)}
                    rows={2}
                />
                <MultiSelect
                    label="태그"
                    placeholder="태그 선택"
                    data={TAG_OPTIONS}
                    value={tags}
                    onChange={setTags}
                    clearable
                    searchable
                />
                <Group justify="flex-end" mt="xs">
                    <Button variant="subtle" onClick={onClose}>취소</Button>
                    <Button
                        color="violet"
                        leftSection={<IconBookmark size={14} />}
                        loading={saving}
                        onClick={handleSave}
                    >
                        저장
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
