import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { listAccounts } from '@/lib/blog-account';
import { hasAnyApiKey } from '@/lib/api-keys';
import { AppShell, AppShellHeader, AppShellMain, Container, Title, Text, Group, ThemeIcon, Anchor, Button, Alert } from '@mantine/core';
import { IconArticle, IconArrowLeft, IconInfoCircle } from '@tabler/icons-react';
import { ComposeForm } from '@/components/ComposeForm';

export const dynamic = 'force-dynamic';

export default async function ComposePage({ searchParams }: { searchParams: Promise<{ date?: string; edit?: string }> }) {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) redirect('/login?callbackUrl=/dashboard/compose');

    const [accounts, hasAiKey] = await Promise.all([listAccounts(userId), hasAnyApiKey(userId)]);
    const options = accounts
        .filter((a) => a.status === 'ACTIVE')
        .map((a) => ({ value: a.id, label: a.siteUrl.replace(/^https?:\/\//, '') }));

    const sp = await searchParams;
    const initialScheduledAt = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? `${sp.date}T09:00` : undefined;

    // ?edit=postId — DRAFT/SCHEDULED 글 수정
    let editPost: { id: string; accountId: string; title: string; content: string; photoUrl: string | null; scheduledAt: string | null } | undefined;
    if (sp.edit) {
        const post = await prisma.blogPost.findFirst({
            where: { id: sp.edit, userId, status: { in: ['DRAFT', 'SCHEDULED'] } },
            select: { id: true, accountId: true, title: true, content: true, photoUrl: true, scheduledAt: true },
        });
        if (post) {
            editPost = {
                id: post.id, accountId: post.accountId, title: post.title, content: post.content,
                photoUrl: post.photoUrl, scheduledAt: post.scheduledAt ? post.scheduledAt.toISOString() : null,
            };
        }
    }

    return (
        <AppShell header={{ height: 60 }} padding="md">
            <AppShellHeader>
                <Container size="lg" h="100%">
                    <Group h="100%" justify="space-between">
                        <Group gap="xs">
                            <ThemeIcon variant="gradient" gradient={{ from: 'blue', to: 'cyan' }} size="lg" radius="md">
                                <IconArticle size={20} />
                            </ThemeIcon>
                            <Anchor component="a" href="/dashboard" underline="never" c="inherit">
                                <Title order={3}>NaverBlogAuto</Title>
                            </Anchor>
                        </Group>
                        <Button component="a" href="/dashboard" variant="subtle" size="xs" leftSection={<IconArrowLeft size={14} />}>
                            대시보드
                        </Button>
                    </Group>
                </Container>
            </AppShellHeader>

            <AppShellMain>
                <Container size="lg">
                    <Title order={2} mb={4}>{editPost ? '글 수정' : '새 글 작성'}</Title>
                    <Text c="dimmed" size="sm" mb="lg">AI 글쓰기 · AI 이미지 · 마크다운 실시간 미리보기 · 예약</Text>
                    {options.length === 0 ? (
                        <Alert color="blue" variant="light" icon={<IconInfoCircle size={16} />}>
                            먼저 활성 블로그를 연결하세요. <Anchor component="a" href="/dashboard/accounts">블로그 연결 ↗</Anchor>
                        </Alert>
                    ) : (
                        <ComposeForm accounts={options} initialScheduledAt={initialScheduledAt} editPost={editPost} hasAiKey={hasAiKey} />
                    )}
                </Container>
            </AppShellMain>
        </AppShell>
    );
}
