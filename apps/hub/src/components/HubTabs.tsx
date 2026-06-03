'use client';

import type { ReactNode } from 'react';
import { Tabs, rem } from '@mantine/core';
import { IconSparkles, IconApps, IconBolt } from '@tabler/icons-react';

/** 허브 첫 화면을 카테고리 탭으로 분리 — AI 비서 / 도구 / 자동화. */
export function HubTabs({ agent, tools, automations }: { agent: ReactNode; tools: ReactNode; automations: ReactNode }) {
  const ic = { width: rem(16), height: rem(16) };
  return (
    <Tabs defaultValue="ai" keepMounted={false} variant="pills" radius="md">
      <Tabs.List mb="lg">
        <Tabs.Tab value="ai" leftSection={<IconSparkles style={ic} />}>AI 비서</Tabs.Tab>
        <Tabs.Tab value="tools" leftSection={<IconApps style={ic} />}>도구</Tabs.Tab>
        <Tabs.Tab value="auto" leftSection={<IconBolt style={ic} />}>자동화</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="ai">{agent}</Tabs.Panel>
      <Tabs.Panel value="tools">{tools}</Tabs.Panel>
      <Tabs.Panel value="auto">{automations}</Tabs.Panel>
    </Tabs>
  );
}
