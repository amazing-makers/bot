'use client';

import { useState } from 'react';
import { FileButton, Button, Group, Text } from '@mantine/core';
import { IconUpload } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

/** 파일 선택 → /api/upload(Blob) → onUploaded(url). 여러 장 연속 업로드 가능. */
export function ImageUpload({
  onUploaded,
  label = '이미지 업로드',
  multiple = true,
  size = 'xs',
}: {
  onUploaded: (url: string, name: string) => void;
  label?: string;
  multiple?: boolean;
  size?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function handle(files: File | File[] | null) {
    if (!files) return;
    const list = Array.isArray(files) ? files : [files];
    if (list.length === 0) return;
    setBusy(true);
    let ok = 0;
    for (const f of list) {
      try {
        const fd = new FormData();
        fd.append('file', f);
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const j = await res.json();
        if (res.ok && j.url) {
          onUploaded(j.url, f.name);
          ok++;
        } else {
          notifications.show({ message: `${f.name}: ${j.error || '실패'}`, color: 'red' });
        }
      } catch (e: any) {
        notifications.show({ message: `${f.name}: ${e?.message || '오류'}`, color: 'red' });
      }
    }
    setBusy(false);
    if (ok > 0) notifications.show({ message: `${ok}장 업로드 완료`, color: 'teal' });
  }

  return (
    <Group gap="xs">
      <FileButton onChange={handle} accept="image/png,image/jpeg,image/webp" multiple={multiple}>
        {(props) => (
          <Button {...props} size={size as any} variant="light" leftSection={<IconUpload size={14} />} loading={busy}>
            {label}
          </Button>
        )}
      </FileButton>
      {busy && <Text size="xs" c="dimmed">업로드 중…</Text>}
    </Group>
  );
}
