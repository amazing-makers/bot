import { redirect } from 'next/navigation';
import {
  Container, Group, Title, Text, Badge, Card, SimpleGrid, Button, Stack, Table, ThemeIcon, Alert, Anchor, Divider,
} from '@mantine/core';
import { IconCoins, IconArrowLeft, IconInfoCircle } from '@tabler/icons-react';
import { auth } from '@/auth';
import { getBalance, listTransactions, CREDIT_PACKAGES, isStripeConfigured } from '@amakers/billing';
import { startTopup } from '@/app/actions/billing-actions';

export const dynamic = 'force-dynamic';

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const userId = (session.user as any).id as string;
  const [balance, txns] = await Promise.all([getBalance(userId), listTransactions(userId, 30)]);
  const { status } = await searchParams;
  const stripeReady = isStripeConfigured();

  return (
    <Container size="md" py="xl">
      <Group mb="lg">
        <Button component="a" href="/" variant="subtle" color="gray" size="xs" leftSection={<IconArrowLeft size={16} />}>
          허브로
        </Button>
      </Group>

      <Group justify="space-between" align="center" mb="lg">
        <Title order={2}>크레딧</Title>
        <Badge size="xl" variant="light" color="yellow" leftSection={<IconCoins size={16} />}>
          {balance.toLocaleString()} 크레딧
        </Badge>
      </Group>

      {status === 'success' && (
        <Alert color="teal" variant="light" mb="md">결제가 완료됐습니다. 잔액 반영까지 잠시 걸릴 수 있어요.</Alert>
      )}
      {status === 'cancel' && (
        <Alert color="gray" variant="light" mb="md">결제가 취소됐습니다.</Alert>
      )}
      {(status === 'unconfigured' || !stripeReady) && (
        <Alert color="blue" variant="light" icon={<IconInfoCircle size={16} />} mb="md">
          크레딧 충전(결제)은 곧 오픈됩니다. 지금은 가입 보너스·관리자 지급 크레딧으로 모든 도구를 사용할 수 있어요.
        </Alert>
      )}

      <Divider my="lg" label="크레딧 충전" labelPosition="left" />

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="xl">
        {CREDIT_PACKAGES.map((pkg) => (
          <Card key={pkg.id} withBorder radius="md" padding="lg">
            <Stack gap="xs" align="center">
              <ThemeIcon variant="light" color="yellow" size={44} radius="md">
                <IconCoins size={24} />
              </ThemeIcon>
              <Text fw={700} size="lg">{pkg.credits.toLocaleString()}</Text>
              <Text c="dimmed" size="sm">크레딧</Text>
              <Text fw={600}>₩{pkg.priceKrw.toLocaleString()}</Text>
              <form action={startTopup.bind(null, pkg.id)} style={{ width: '100%' }}>
                <Button type="submit" fullWidth mt="xs" disabled={!stripeReady}>
                  충전하기
                </Button>
              </form>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>

      <Divider my="lg" label="사용 내역" labelPosition="left" />

      {txns.length === 0 ? (
        <Text c="dimmed" size="sm" ta="center" py="lg">아직 거래 내역이 없습니다.</Text>
      ) : (
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>일시</Table.Th>
              <Table.Th>도구</Table.Th>
              <Table.Th>구분</Table.Th>
              <Table.Th ta="right">변동</Table.Th>
              <Table.Th ta="right">잔액</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {txns.map((t) => (
              <Table.Tr key={t.id}>
                <Table.Td>{new Date(t.createdAt).toLocaleString('ko-KR')}</Table.Td>
                <Table.Td>{t.bot ?? '-'}</Table.Td>
                <Table.Td>{t.action}</Table.Td>
                <Table.Td ta="right" c={t.delta < 0 ? 'red' : 'teal'}>
                  {t.delta > 0 ? '+' : ''}{t.delta.toLocaleString()}
                </Table.Td>
                <Table.Td ta="right">{t.balanceAfter.toLocaleString()}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Container>
  );
}
