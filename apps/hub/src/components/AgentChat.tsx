'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Paper, Stack, Group, Text, Textarea, Button, ScrollArea, Loader, Image, Badge, Box, ThemeIcon, Alert, Anchor,
} from '@mantine/core';
import { IconSparkles, IconSend, IconRobot, IconUser, IconKey, IconRocket, IconPhoto, IconX } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { agentChat, confirmPublish } from '@/app/actions/agent-chat';
import { ImageUpload } from '@/components/ImageUpload';

type Msg = { role: 'user' | 'assistant'; content: string };

const EXAMPLES = [
  '연결된 내 계정들 보여줘',
  '강아지 일상 사진으로 인스타에 올릴 글 만들어줘',
  '제주도 여행 팁으로 블로그 글 써줘',
];

export function AgentChat({ hasKey }: { hasKey: boolean }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<{ title?: string; markdown?: string; imageUrl?: string } | null>(null);
  const [proposal, setProposal] = useState<any | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [attached, setAttached] = useState<string>('');
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, draft, proposal]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const history: Msg[] = [...messages, { role: 'user', content }];
    setMessages(history);
    setInput('');
    setLoading(true);
    try {
      const res = await agentChat(history, attached || undefined);
      if (!res.ok) {
        setMessages([...history, { role: 'assistant', content: `⚠️ ${res.error || 'AI 오류가 발생했어요.'}` }]);
      } else {
        setMessages([...history, { role: 'assistant', content: res.reply }]);
        if (res.draft) setDraft(res.draft);
        if (res.proposal) setProposal(res.proposal);
      }
    } catch (e: any) {
      setMessages([...history, { role: 'assistant', content: `⚠️ ${e?.message || '요청 처리 중 오류'}` }]);
    } finally {
      setLoading(false);
    }
  }

  async function publish() {
    if (!proposal || publishing) return;
    setPublishing(true);
    try {
      const r = await confirmPublish(proposal);
      if (r.ok) {
        const parts = [
          r.instagram ? `인스타 ${r.instagram}` : '',
          r.blog ? `블로그 ${r.blog}` : '',
          r.tistory ? `티스토리 ${r.tistory}` : '',
        ].filter(Boolean).join(' · ');
        notifications.show({ title: '발행 완료', message: `${parts} 채널에 발행했어요 🎉`, color: 'teal' });
        setMessages((m) => [...m, { role: 'assistant', content: `✅ 발행했어요 — ${parts}` }]);
        setProposal(null);
      } else {
        notifications.show({ title: '발행 실패', message: r.error || '다시 시도해 주세요', color: 'red' });
      }
    } finally {
      setPublishing(false);
    }
  }

  const channelCount =
    (proposal?.instaIds?.length || 0) + (proposal?.blogIds?.length || 0) + (proposal?.tistoryIds?.length || 0);

  return (
    <Paper withBorder radius="lg" p="md" mb="lg" style={{ overflow: 'hidden' }}>
      <Group justify="space-between" mb="sm">
        <Group gap="xs">
          <ThemeIcon variant="light" color="grape" radius="md" size={34}>
            <IconSparkles size={20} />
          </ThemeIcon>
          <div>
            <Text fw={700}>AI 비서</Text>
            <Text size="xs" c="dimmed">말로 시키면 글·이미지 생성부터 발행 준비까지 알아서 해드려요</Text>
          </div>
        </Group>
        <Badge variant="light" color="grape">베타</Badge>
      </Group>

      {!hasKey ? (
        <Alert color="yellow" variant="light" icon={<IconKey size={18} />}>
          AI 비서를 쓰려면 무료 AI 키가 필요해요.{' '}
          <Anchor href="/keys" fw={600}>키 연결하기 →</Anchor>
        </Alert>
      ) : (
        <>
          <ScrollArea h={messages.length ? 320 : 130} viewportRef={viewportRef} offsetScrollbars>
            <Stack gap="sm" px={4}>
              {messages.length === 0 && (
                <Stack gap="xs" py="sm">
                  <Text size="sm" c="dimmed">예를 들어 이렇게 시켜보세요:</Text>
                  <Group gap="xs">
                    {EXAMPLES.map((ex) => (
                      <Button key={ex} size="xs" variant="default" radius="xl" onClick={() => send(ex)}>
                        {ex}
                      </Button>
                    ))}
                  </Group>
                </Stack>
              )}

              {messages.map((m, i) => (
                <Group key={i} align="flex-start" wrap="nowrap" justify={m.role === 'user' ? 'flex-end' : 'flex-start'}>
                  {m.role === 'assistant' && (
                    <ThemeIcon variant="light" color="grape" radius="xl" size={28}><IconRobot size={16} /></ThemeIcon>
                  )}
                  <Paper
                    withBorder={m.role === 'assistant'}
                    bg={m.role === 'user' ? 'blue.6' : undefined}
                    c={m.role === 'user' ? 'white' : undefined}
                    radius="md"
                    p="xs"
                    maw="80%"
                  >
                    <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{m.content}</Text>
                  </Paper>
                  {m.role === 'user' && (
                    <ThemeIcon variant="light" color="blue" radius="xl" size={28}><IconUser size={16} /></ThemeIcon>
                  )}
                </Group>
              ))}

              {loading && (
                <Group gap="xs">
                  <ThemeIcon variant="light" color="grape" radius="xl" size={28}><IconRobot size={16} /></ThemeIcon>
                  <Group gap={6}><Loader size="xs" /><Text size="sm" c="dimmed">생각하는 중…</Text></Group>
                </Group>
              )}

              {draft && (draft.title || draft.imageUrl || draft.markdown) && (
                <Paper withBorder radius="md" p="sm" bg="var(--mantine-color-gray-0)">
                  <Group gap={6} mb={6}><IconPhoto size={15} /><Text size="xs" fw={700} c="dimmed">생성된 초안</Text></Group>
                  {draft.imageUrl && (
                    <Image src={draft.imageUrl} radius="sm" h={150} fit="cover" mb="xs" alt="생성 이미지" />
                  )}
                  {draft.title && <Text fw={600} size="sm">{draft.title}</Text>}
                  {draft.markdown && (
                    <Text size="xs" c="dimmed" lineClamp={4} style={{ whiteSpace: 'pre-wrap' }}>{draft.markdown}</Text>
                  )}
                </Paper>
              )}

              {proposal && channelCount > 0 && (
                <Alert color="teal" variant="light" icon={<IconRocket size={18} />}>
                  <Group justify="space-between" wrap="nowrap">
                    <Text size="sm">
                      발행 준비됨 —{' '}
                      {[
                        proposal.instaIds?.length ? `인스타 ${proposal.instaIds.length}` : '',
                        proposal.blogIds?.length ? `블로그 ${proposal.blogIds.length}` : '',
                        proposal.tistoryIds?.length ? `티스토리 ${proposal.tistoryIds.length}` : '',
                      ].filter(Boolean).join(' · ')} 채널
                    </Text>
                    <Button size="xs" color="teal" loading={publishing} onClick={publish} leftSection={<IconRocket size={14} />}>
                      발행하기
                    </Button>
                  </Group>
                </Alert>
              )}
            </Stack>
          </ScrollArea>

          <Group gap="xs" mt="sm" align="center">
            {attached ? (
              <Group gap={6}>
                <Image src={attached} w={40} h={40} radius="sm" fit="cover" alt="첨부" />
                <Text size="xs" c="dimmed">사진 첨부됨 — AI가 이 사진으로 발행</Text>
                <ThemeIcon variant="subtle" color="gray" size="sm" style={{ cursor: 'pointer' }} onClick={() => setAttached('')}><IconX size={14} /></ThemeIcon>
              </Group>
            ) : (
              <ImageUpload label="사진 첨부" multiple={false} onUploaded={(url) => setAttached(url)} />
            )}
          </Group>

          <Group gap="xs" mt={6} align="flex-end" wrap="nowrap">
            <Textarea
              flex={1}
              autosize
              minRows={1}
              maxRows={4}
              placeholder="예: 가을 감성 카페 사진으로 인스타 글 만들어줘"
              value={input}
              onChange={(e) => setInput(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              disabled={loading}
            />
            <Button onClick={() => send()} loading={loading} leftSection={<IconSend size={16} />}>보내기</Button>
          </Group>
        </>
      )}
    </Paper>
  );
}
