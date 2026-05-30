import { SimpleGrid, Card, Group, Text, Badge, ThemeIcon, Stack } from '@mantine/core';
import {
  IconBrandInstagram, IconSpeakerphone, IconNotebook, IconPencil,
  IconLayoutBoard, IconPalette, IconDeviceMobile, IconApps, type IconProps,
} from '@tabler/icons-react';
import type { ComponentType } from 'react';
import { BOT_TOOLS, type BotTool } from '@amakers/types';

const ICONS: Record<string, ComponentType<IconProps>> = {
  instagram: IconBrandInstagram,
  speakerphone: IconSpeakerphone,
  notebook: IconNotebook,
  pencil: IconPencil,
  layout: IconLayoutBoard,
  palette: IconPalette,
  device: IconDeviceMobile,
};

function ToolCard({ tool }: { tool: BotTool }) {
  const Icon = ICONS[tool.icon] ?? IconApps;
  const live = tool.status === 'live';

  const card = (
    <Card
      withBorder
      radius="md"
      padding="lg"
      h="100%"
      style={{ opacity: live ? 1 : 0.65, cursor: live ? 'pointer' : 'default' }}
    >
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <ThemeIcon variant="light" color={tool.color} size={44} radius="md">
            <Icon size={26} />
          </ThemeIcon>
          <Badge color={live ? 'teal' : 'gray'} variant={live ? 'light' : 'outline'} size="sm">
            {live ? '운영중' : '준비중'}
          </Badge>
        </Group>
        <div>
          <Text fw={700} size="lg">{tool.name}</Text>
          <Text c="dimmed" size="sm" mt={4}>{tool.tagline}</Text>
        </div>
      </Stack>
    </Card>
  );

  // 운영중인 도구만 클릭 시 서브도메인으로 이동(SSO). 서버 컴포넌트라 component="a" 사용.
  if (live) {
    return (
      <Card
        component="a"
        href={tool.url}
        withBorder
        radius="md"
        padding="lg"
        h="100%"
        style={{ cursor: 'pointer', textDecoration: 'none' }}
      >
        <Stack gap="sm">
          <Group justify="space-between" align="flex-start">
            <ThemeIcon variant="light" color={tool.color} size={44} radius="md">
              <Icon size={26} />
            </ThemeIcon>
            <Badge color="teal" variant="light" size="sm">운영중</Badge>
          </Group>
          <div>
            <Text fw={700} size="lg" c="var(--mantine-color-text)">{tool.name}</Text>
            <Text c="dimmed" size="sm" mt={4}>{tool.tagline}</Text>
          </div>
        </Stack>
      </Card>
    );
  }
  return card;
}

export function ToolGrid() {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
      {BOT_TOOLS.map((tool) => (
        <ToolCard key={tool.id} tool={tool} />
      ))}
    </SimpleGrid>
  );
}
